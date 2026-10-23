/**
 * Cryptographic & hashing utilities for TrustMesh
 * Demonstrates deterministic canonical payload hashing and hash-linked audit logging.
 */

export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalJsonStringify(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const keyValues = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalJsonStringify(obj[key]);
  });

  return '{' + keyValues.join(',') + '}';
}

/**
 * Calculates a SHA-256 hash using the standard Web Crypto API.
 * Falls back to a deterministic fnv-inspired hex hash if crypto.subtle is unavailable.
 */
export async function computeSha256(input: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto SHA-256 failed, using fallback:', e);
  }

  // Deterministic fallback hash
  return fallbackHash(input);
}

/**
 * Synchronous hash generator for immediate UI rendering
 */
export function quickHashSync(input: string): string {
  return fallbackHash(input);
}

function fallbackHash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  const p2 = (4294967296 * (2097151 & h1) + (h2 >>> 0)).toString(16).padStart(16, '0');
  return (p1 + p2 + p1 + p2).substring(0, 64);
}

/**
 * Formats Indian Currency (e.g. ₹48,000, ₹1,00,000)
 */
export function formatINR(val: number | string | undefined | null): string {
  if (val === undefined || val === null || isNaN(Number(val))) {
    return '₹0';
  }
  const num = Number(val);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats a clean ISO or human date
 */
export function formatDate(val: string | undefined): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toISOString().split('T')[0];
  } catch {
    return String(val);
  }
}
