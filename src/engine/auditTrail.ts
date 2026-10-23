import { AuditEvent, VerificationResult, TestCase, InsuranceClaim } from '../types/trustmesh';
import { canonicalJsonStringify, quickHashSync } from '../utils/crypto';

const AUDIT_STORAGE_KEY = 'trustmesh_audit_events_v1';
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function createAuditEvent(
  params: Omit<AuditEvent, 'eventId' | 'timestamp' | 'previousHash' | 'hash'>,
  previousEvents: AuditEvent[]
): AuditEvent {
  const previousHash = previousEvents.length > 0
    ? previousEvents[previousEvents.length - 1].hash
    : GENESIS_HASH;

  const eventId = `EV-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const timestamp = new Date().toISOString();

  const coreData = {
    eventId,
    timestamp,
    claimId: params.claimId,
    testCaseId: params.testCaseId,
    sourceAgent: params.sourceAgent,
    destAgent: params.destAgent,
    eventType: params.eventType,
    severity: params.severity,
    status: params.status,
    affectedField: params.affectedField,
    originalValue: params.originalValue,
    receivedValue: params.receivedValue,
    reason: params.reason,
    actionTaken: params.actionTaken,
    previousHash,
  };

  const hash = quickHashSync(canonicalJsonStringify(coreData));

  return {
    ...coreData,
    hash,
  };
}

export function createAuditEventsFromVerification(
  result: VerificationResult,
  claim: InsuranceClaim,
  testCase: TestCase | null,
  previousEvents: AuditEvent[]
): AuditEvent[] {
  const events: AuditEvent[] = [];
  let currentChain = [...previousEvents];

  // 1. Verification Start Event
  const startEvent = createAuditEvent(
    {
      claimId: claim.claim_id,
      testCaseId: testCase?.id,
      sourceAgent: result.sourceAgent,
      destAgent: result.destAgent,
      eventType: 'VERIFICATION_CHECKPOINT_EVALUATED',
      severity: result.severity,
      status: result.status,
      reason: `Evaluated handoff ${result.handoffId} (${result.sourceAgent} → ${result.destAgent}). Hash Match: ${result.hashMatch}`,
      actionTaken: result.requiredAction,
    },
    currentChain
  );
  events.push(startEvent);
  currentChain.push(startEvent);

  // 2. Anomaly Events for Detected Issues
  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      const fieldDiff = result.fieldComparisons.find(f => f.status === 'fail' || f.status === 'warning');
      const anomalyEvent = createAuditEvent(
        {
          claimId: claim.claim_id,
          testCaseId: testCase?.id,
          sourceAgent: result.sourceAgent,
          destAgent: result.destAgent,
          eventType: result.status === 'BLOCKED' ? 'DATA_INTEGRITY_VIOLATION' : 'VERIFICATION_ANOMALY',
          severity: result.severity,
          status: result.status,
          affectedField: fieldDiff?.field,
          originalValue: fieldDiff?.originalValue,
          receivedValue: fieldDiff?.receivedValue,
          reason: issue,
          actionTaken: result.requiredAction,
        },
        currentChain
      );
      events.push(anomalyEvent);
      currentChain.push(anomalyEvent);
    }
  }

  // 3. If Recovered / Retry
  if (result.isRecovered) {
    const recoveryEvent = createAuditEvent(
      {
        claimId: claim.claim_id,
        testCaseId: testCase?.id,
        sourceAgent: result.sourceAgent,
        destAgent: result.destAgent,
        eventType: 'RECOVERY_SUCCEEDED',
        severity: 'info',
        status: 'SUCCESS',
        reason: 'Authorized retry / snapshot recovery succeeded. Payload verified.',
        actionTaken: 'Resumed downstream pipeline execution.',
      },
      currentChain
    );
    events.push(recoveryEvent);
    currentChain.push(recoveryEvent);
  }

  return events;
}

/**
 * Validates the cryptographic tamper-evident hash chain
 */
export function verifyAuditChain(events: AuditEvent[]): {
  isValid: boolean;
  totalEvents: number;
  brokenIndex?: number;
  brokenEventId?: string;
} {
  if (events.length === 0) return { isValid: true, totalEvents: 0 };

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : events[i - 1].hash;

    if (current.previousHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalEvents: events.length,
        brokenIndex: i,
        brokenEventId: current.eventId,
      };
    }

    const { hash, ...coreData } = current;
    const computedHash = quickHashSync(canonicalJsonStringify(coreData));
    if (computedHash !== hash) {
      return {
        isValid: false,
        totalEvents: events.length,
        brokenIndex: i,
        brokenEventId: current.eventId,
      };
    }
  }

  return { isValid: true, totalEvents: events.length };
}

/**
 * Saves audit events to local storage
 */
export function saveAuditEventsToStorage(events: AuditEvent[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(events));
    }
  } catch (e) {
    console.error('Failed to save audit events to storage', e);
  }
}

/**
 * Loads audit events from local storage, with seed events if empty
 */
export function loadAuditEventsFromStorage(): AuditEvent[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load audit events from storage', e);
  }

  return generateInitialAuditSeed();
}

/**
 * Generates initial seed audit events for realistic demonstration on first visit
 */
export function generateInitialAuditSeed(): AuditEvent[] {
  const seed: AuditEvent[] = [];
  
  const ev1 = createAuditEvent(
    {
      claimId: 'CLM-2026-001',
      testCaseId: 'TM-TEST-001',
      sourceAgent: 'agent_a',
      destAgent: 'agent_b',
      eventType: 'SIMULATION_INITIALIZED',
      severity: 'info',
      status: 'INITIATED',
      reason: 'TrustMesh monitoring session started for Rahul Sharma motor claim.',
      actionTaken: 'Initialized handoff checkpoint monitoring.',
    },
    seed
  );
  seed.push(ev1);

  const ev2 = createAuditEvent(
    {
      claimId: 'CLM-2026-001',
      testCaseId: 'TM-TEST-001',
      sourceAgent: 'agent_a',
      destAgent: 'agent_b',
      eventType: 'VERIFICATION_CHECKPOINT_EVALUATED',
      severity: 'info',
      status: 'VERIFIED',
      reason: 'Handoff A_TO_B passed schema validation, required fields check, and canonical hash match.',
      actionTaken: 'Dispatched to Agent B for policy verification.',
    },
    seed
  );
  seed.push(ev2);

  const ev3 = createAuditEvent(
    {
      claimId: 'CLM-2026-001',
      testCaseId: 'TM-TEST-001',
      sourceAgent: 'agent_b',
      destAgent: 'agent_c',
      eventType: 'VERIFICATION_CHECKPOINT_EVALUATED',
      severity: 'info',
      status: 'VERIFIED',
      reason: 'Handoff B_TO_C passed. Verified policy POL-88421 is active; coverage limit ₹1,00,000 unchanged.',
      actionTaken: 'Dispatched to Agent C for damage valuation.',
    },
    seed
  );
  seed.push(ev3);

  return seed;
}

/**
 * Exports audit trail to a downloadable CSV
 */
export function exportAuditTrailToCSV(events: AuditEvent[]): void {
  const headers = [
    'Event ID',
    'Timestamp',
    'Claim ID',
    'Test Case ID',
    'Source Agent',
    'Destination Agent',
    'Event Type',
    'Severity',
    'Status',
    'Affected Field',
    'Original Value',
    'Received Value',
    'Reason',
    'Action Taken',
    'Hash',
  ];

  const rows = events.map(ev => [
    ev.eventId,
    ev.timestamp,
    ev.claimId,
    ev.testCaseId || 'N/A',
    ev.sourceAgent || 'N/A',
    ev.destAgent || 'N/A',
    ev.eventType,
    ev.severity,
    ev.status,
    ev.affectedField || 'N/A',
    JSON.stringify(ev.originalValue ?? ''),
    JSON.stringify(ev.receivedValue ?? ''),
    `"${(ev.reason || '').replace(/"/g, '""')}"`,
    `"${(ev.actionTaken || '').replace(/"/g, '""')}"`,
    ev.hash,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trustmesh_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports audit trail as comprehensive JSON report
 */
export function exportAuditTrailToJSON(events: AuditEvent[]): void {
  const report = {
    report_title: 'TrustMesh Multi-Agent Audit Trail Ledger',
    generated_at: new Date().toISOString(),
    total_events: events.length,
    tamper_evident_status: verifyAuditChain(events).isValid ? 'CHAIN_INTEGRITY_VERIFIED' : 'CHAIN_CORRUPTED',
    events,
  };

  const jsonString = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trustmesh_audit_report_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
