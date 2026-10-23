"""Cryptographic and canonical serialization utilities for TrustMesh in Python."""

import hashlib
import json
from typing import Any


def canonical_json_dumps(obj: Any) -> str:
    """Produces deterministic, canonical JSON representation with sorted keys and no extra whitespace."""
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def compute_sha256(data: Any) -> str:
    """Computes standard SHA-256 hex digest for any string or serializable payload."""
    if not isinstance(data, str):
        payload_str = canonical_json_dumps(data)
    else:
        payload_str = data
    return hashlib.sha256(payload_str.encode('utf-8')).hexdigest()


def format_inr(val: Any) -> str:
    """Formats numeric value to Indian Rupee notation (e.g. ₹65,000, ₹1,20,000)."""
    try:
        n = int(float(val))
    except (TypeError, ValueError):
        return "₹0"

    is_negative = n < 0
    s = str(abs(n))
    if len(s) <= 3:
        res = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        res = ",".join(groups) + "," + last3

    prefix = "-₹" if is_negative else "₹"
    return f"{prefix}{res}"
