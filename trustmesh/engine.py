"""TrustMesh Multi-Agent Verification Engine in Python."""

import copy
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from .models import (
    HandoffId, AgentId, VerificationResult, FieldComparison,
    RecalculationCheck, InsuranceClaim, TestCase, VerificationStatus, Severity
)
from .contracts import HANDOFF_DEFINITIONS, AGENT_CONTRACTS
from .crypto import canonical_json_dumps, compute_sha256
from .agents import (
    build_agent_a_payload, build_agent_b_payload,
    build_agent_c_payload, build_agent_d_payload, build_final_decision
)


def run_trustmesh_verification(
    handoff_id: HandoffId,
    source_agent: AgentId,
    dest_agent: AgentId,
    claim_id: str,
    source_payload: Dict[str, Any],
    received_payload: Dict[str, Any],
    message_id: str,
    source_version: int,
    dest_version: int,
    is_retry_attempt: bool = False,
    simulated_network_timeout: bool = False
) -> VerificationResult:
    """Performs TrustMesh 10-point cryptographic & contract verification between agents."""
    handoff_def = HANDOFF_DEFINITIONS[handoff_id]
    source_contract = AGENT_CONTRACTS[source_agent]
    dest_contract = AGENT_CONTRACTS[dest_agent]

    issues: List[str] = []
    field_comparisons: List[FieldComparison] = []
    status: VerificationStatus = 'VERIFIED'
    severity: Severity = 'info'
    required_action = 'Forward verified payload to downstream agent.'
    recalculation: Optional[RecalculationCheck] = None

    # 0. Handle Simulated Network Timeout / Partial Failure
    if simulated_network_timeout and not is_retry_attempt:
        return VerificationResult(
            handoff_id=handoff_id,
            source_agent=source_agent,
            dest_agent=dest_agent,
            claim_id=claim_id,
            message_id=message_id,
            source_version=source_version,
            dest_version=dest_version,
            timestamp=datetime.utcnow().isoformat() + 'Z',
            status='RECOVERY',
            severity='high',
            issues=['Transmission timeout: Connection dropped before destination acknowledgement.'],
            field_comparisons=[],
            source_hash=compute_sha256(canonical_json_dumps(source_payload)),
            received_hash='TIMEOUT_NO_RESPONSE',
            hash_match=False,
            required_action='Initiating automated authorized retry with state snapshot.',
            audit_event_id=f'EV-{int(time.time() * 1000)}',
            is_recovered=False,
            recovery_attempt=1
        )

    # Cryptographic SHA-256 Hashes
    source_canonical = canonical_json_dumps(source_payload)
    received_canonical = canonical_json_dumps(received_payload)
    source_hash = compute_sha256(source_canonical)
    received_hash = compute_sha256(received_canonical)
    hash_match = (source_hash == received_hash)

    # 1. Required Field Validation
    for req_field in handoff_def['required_fields']:
        val = received_payload.get(req_field)
        if val is None or val == '':
            issues.append(f"Data Loss: Required field '{req_field}' is missing in received payload.")
            status = 'BLOCKED'
            severity = 'high'
            required_action = f"Halt workflow. Request state restoration for missing required field '{req_field}'."

    # 2. Field-Level Comparison & Prohibited Modifications Check
    all_keys = sorted(list(set(list(source_payload.keys()) + list(received_payload.keys()))))

    for key in all_keys:
        orig_val = source_payload.get(key)
        rec_val = received_payload.get(key)

        if orig_val is not None and rec_val is None:
            is_req = key in handoff_def['required_fields']
            field_comparisons.append(FieldComparison(
                field=key,
                original_value=orig_val,
                received_value=None,
                change_type='missing',
                is_authorized=False,
                status='fail' if is_req else 'warning',
                detail=f"Field disappeared between {source_contract['code']} and {dest_contract['code']}"
            ))
            if is_req:
                status = 'BLOCKED'
                severity = 'high'
            continue

        if orig_val is None and rec_val is not None:
            is_allowed = key in source_contract['permitted_additions']
            field_comparisons.append(FieldComparison(
                field=key,
                original_value=None,
                received_value=rec_val,
                change_type='added',
                is_authorized=is_allowed,
                status='pass' if is_allowed else 'warning',
                detail='Legitimate enrichment' if is_allowed else 'Unexpected additional field'
            ))
            if not is_allowed and key.startswith('unauthorized_'):
                issues.append(f"Unauthorized Access: Field '{key}' exceeds permitted agent scope.")
                status = 'BLOCKED'
                severity = 'critical'
                required_action = 'Strip unauthorized disclosures before proceeding.'
            continue

        if orig_val != rec_val:
            is_prohibited = key in dest_contract['prohibited_modifications']
            field_comparisons.append(FieldComparison(
                field=key,
                original_value=orig_val,
                received_value=rec_val,
                change_type='modified',
                is_authorized=not is_prohibited,
                status='fail' if is_prohibited else 'warning',
                detail=f"Prohibited modification of '{key}' by downstream agent" if is_prohibited else 'Value modified'
            ))

            if is_prohibited:
                issues.append(f"Unauthorized Transformation: Prohibited mutation of '{key}' from '{orig_val}' to '{rec_val}'.")
                status = 'BLOCKED'
                severity = 'critical'
                required_action = f"Rollback corrupted field '{key}' to cryptographically verified source snapshot."

            if key == 'policy_coverage_limit':
                try:
                    if float(rec_val) > float(orig_val) * 1.5:
                        issues.append(f"Data Manipulation: Coverage limit unexpectedly inflated ({orig_val} -> {rec_val}).")
                        status = 'BLOCKED'
                        severity = 'critical'
                        required_action = 'Block handoff and alert Compliance Officer.'
                except (ValueError, TypeError):
                    pass
        else:
            field_comparisons.append(FieldComparison(
                field=key,
                original_value=orig_val,
                received_value=rec_val,
                change_type='unchanged',
                is_authorized=True,
                status='pass',
                detail='Identical verified match'
            ))

    # 3. Numeric Schema and Type Checks
    for numeric_field in ['original_claim_amount', 'estimated_repair_cost', 'policy_coverage_limit', 'deductible', 'calculated_eligible_amount']:
        if numeric_field in received_payload:
            val = received_payload[numeric_field]
            if not isinstance(val, (int, float)) or (isinstance(val, str) and not val.replace('.', '', 1).isdigit()):
                issues.append(f"Data Corruption: Expected numeric value for '{numeric_field}', received non-numeric: {val}.")
                status = 'BLOCKED'
                severity = 'high'
                required_action = 'Quarantine payload and invoke schema repair.'

    # 4. Independent Mathematical Recalculation Check (Checkpoint 3: C -> D)
    if handoff_id == 'C_TO_D':
        try:
            cost = float(received_payload.get('estimated_repair_cost', 0))
            deductible = float(received_payload.get('deductible', 0))
            limit = float(received_payload.get('policy_coverage_limit', 0))
            expected_payout = min(limit, max(0.0, cost - deductible))
            actual_payout = float(received_payload.get('calculated_eligible_amount', 0))

            diff = abs(actual_payout - expected_payout)
            recalculation = RecalculationCheck(
                expected=expected_payout,
                actual=actual_payout,
                formula='Min(Coverage Limit, Repair Cost - Deductible)',
                difference=diff
            )

            if diff > 1.0:
                issues.append(f"Incorrect Calculation: Downstream eligible amount mismatch (Expected ₹{int(expected_payout):,}, Got ₹{int(actual_payout):,}).")
                status = 'BLOCKED'
                severity = 'high'
                required_action = 'Enforce deterministic formula calculation and re-verify.'
        except Exception:
            pass

    # 5. Semantic Damage Consistency Check
    orig_dmg = str(source_payload.get('reported_damage', '')).lower()
    rec_dmg = str(received_payload.get('reported_damage', '')).lower()
    if orig_dmg and rec_dmg and orig_dmg != rec_dmg:
        if ('front' in orig_dmg and 'rear' in rec_dmg) or ('minor' in orig_dmg and 'total' in rec_dmg):
            issues.append(f"Semantic Inconsistency: Damage description altered across handoff ('{source_payload.get('reported_damage')}' -> '{received_payload.get('reported_damage')}').")
            status = 'HUMAN_REVIEW'
            severity = 'high'
            required_action = 'Flag semantic discrepancy for Human Adjuster appraisal review.'

    # 6. Misleading Output / Evidence Check (Checkpoint 4: D -> E)
    if handoff_id == 'D_TO_E':
        risk_score = received_payload.get('risk_score', 0)
        evidence = received_payload.get('evidence_package', [])
        if risk_score > 60 and (not evidence or len(evidence) == 0):
            issues.append(f"Misleading Output: High risk score ({risk_score}) generated with zero corroborating evidence items.")
            status = 'HUMAN_REVIEW'
            severity = 'high'
            required_action = 'Prevent automatic rejection. Demand evidence package or human reviewer sign-off.'

    # 7. Overall Hash Check
    if not hash_match and status == 'VERIFIED':
        status = 'WARNING'
        severity = 'warning'
        issues.append('Cryptographic Hash Mismatch: Checkpoint hash changed due to permitted field enrichment.')

    return VerificationResult(
        handoff_id=handoff_id,
        source_agent=source_agent,
        dest_agent=dest_agent,
        claim_id=claim_id,
        message_id=message_id,
        source_version=source_version,
        dest_version=dest_version,
        timestamp=datetime.utcnow().isoformat() + 'Z',
        status=status,
        severity=severity,
        issues=issues,
        field_comparisons=field_comparisons,
        source_hash=source_hash,
        received_hash=received_hash,
        hash_match=hash_match,
        required_action=required_action,
        audit_event_id=f'EV-{int(time.time() * 1000)}',
        recalculation=recalculation,
        is_recovered=is_retry_attempt,
        recovery_attempt=1 if is_retry_attempt else 0
    )


def execute_handoff_step(
    handoff_id: HandoffId,
    source_payload: Dict[str, Any],
    test_case: Optional[TestCase],
    claim: InsuranceClaim,
    is_retry: bool = False
) -> Tuple[Dict[str, Any], Dict[str, Any], VerificationResult]:
    """Applies error injection if test case targets this handoff, then verifies transmission."""
    dest_payload = copy.deepcopy(source_payload)

    # Apply error injection if active test case matches this handoff
    if test_case and test_case.affected_handoff == handoff_id and not is_retry:
        cat = test_case.error_category
        field = test_case.affected_field
        val = test_case.injected_value

        if cat == 'DATA_LOSS' and field:
            dest_payload.pop(field, None)
        elif cat in ('DATA_MANIPULATION', 'DATA_CORRUPTION', 'UNAUTHORIZED_TRANSFORMATION') and field:
            dest_payload[field] = val
        elif cat == 'INCORRECT_CALCULATIONS':
            dest_payload['calculated_eligible_amount'] = val if val is not None else 999999
        elif cat == 'SEMANTIC_INCONSISTENCY':
            dest_payload['reported_damage'] = 'Rear bumper total smash and shattered windshield'
        elif cat == 'MISLEADING_OUTPUT':
            dest_payload['risk_score'] = 94
            dest_payload['evidence_package'] = []
        elif cat == 'UNAUTHORIZED_ACCESS':
            dest_payload['unauthorized_internal_credit_score'] = 820
            dest_payload['unauthorized_bank_account_pin'] = '9812'

    handoff_def = HANDOFF_DEFINITIONS[handoff_id]
    result = run_trustmesh_verification(
        handoff_id=handoff_id,
        source_agent=handoff_def['source_agent'],
        dest_agent=handoff_def['dest_agent'],
        claim_id=claim.claim_id,
        source_payload=source_payload,
        received_payload=dest_payload,
        message_id=source_payload.get('message_id', f'MSG-{handoff_id}'),
        source_version=source_payload.get('payload_version', 1),
        dest_version=source_payload.get('payload_version', 1) + 1,
        is_retry_attempt=is_retry,
        simulated_network_timeout=(test_case and test_case.affected_handoff == handoff_id and test_case.simulated_timeout and not is_retry)
    )

    return source_payload, dest_payload, result


def execute_full_pipeline(claim: InsuranceClaim, test_case: Optional[TestCase] = None) -> Dict[str, Any]:
    """Runs the complete 5-agent pipeline across all 4 TrustMesh checkpoints for a claim."""
    handoffs_order: List[HandoffId] = ['A_TO_B', 'B_TO_C', 'C_TO_D', 'D_TO_E']
    handoff_results: Dict[str, VerificationResult] = {}
    outgoing_payloads: Dict[str, Dict[str, Any]] = {}
    incoming_payloads: Dict[str, Dict[str, Any]] = {}

    curr_payload = build_agent_a_payload(claim)
    stopped_at = None

    for idx, hid in enumerate(handoffs_order):
        if idx == 0:
            src = build_agent_a_payload(claim)
        elif idx == 1:
            src = build_agent_b_payload(outgoing_payloads['A_TO_B'], claim)
        elif idx == 2:
            src = build_agent_c_payload(outgoing_payloads['B_TO_C'], claim)
        else:
            src = build_agent_d_payload(outgoing_payloads['C_TO_D'], claim)

        outgoing, incoming, result = execute_handoff_step(hid, src, test_case, claim)
        outgoing_payloads[hid] = outgoing
        incoming_payloads[hid] = incoming
        handoff_results[hid] = result
        curr_payload = incoming

        if result.status == 'BLOCKED':
            stopped_at = hid
            break

    final_decision = build_final_decision(claim, handoff_results, curr_payload)

    return {
        'claim': claim,
        'test_case': test_case,
        'handoff_results': handoff_results,
        'outgoing_payloads': outgoing_payloads,
        'incoming_payloads': incoming_payloads,
        'final_decision': final_decision,
        'stopped_at': stopped_at,
        'is_blocked': stopped_at is not None
    }
