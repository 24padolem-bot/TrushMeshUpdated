"""Agent payload builders and adjudication logic for TrustMesh in Python."""

from typing import Dict, Any, List
from .models import InsuranceClaim, FinalDecision


def build_agent_a_payload(claim: InsuranceClaim) -> Dict[str, Any]:
    """Agent A: Claim Intake Agent creates original structured intake payload."""
    return {
        'claim_id': claim.claim_id,
        'customer_name': claim.customer_name,
        'customer_id': claim.customer_id or 'CUST-8842',
        'policy_number': claim.policy_number,
        'insurance_type': claim.insurance_type,
        'vehicle_number': claim.vehicle_number or 'N/A',
        'incident_date': claim.incident_date,
        'claim_submission_date': claim.claim_submission_date,
        'reported_damage': claim.reported_damage,
        'original_claim_amount': claim.original_claim_amount,
        'location': claim.location or 'Maharashtra, India',
        'intake_timestamp': '2026-10-20T09:30:00.000Z',
        'payload_version': 1,
        'message_id': f'MSG-A-{claim.claim_id}-001',
    }


def build_agent_b_payload(intake_payload: Dict[str, Any], claim: InsuranceClaim) -> Dict[str, Any]:
    """Agent B: Policy Verification Agent validates coverage and enriches policy clauses."""
    return {
        **intake_payload,
        'policy_status': claim.policy_status,
        'policy_coverage_limit': claim.policy_coverage_limit,
        'deductible': claim.deductible,
        'previous_related_claims': claim.previous_related_claims,
        'policy_verified': claim.policy_status == 'Active',
        'policy_verified_at': '2026-10-20T09:31:15.000Z',
        'policy_notes': f'Policy {claim.policy_number} in good standing. {claim.previous_related_claims} prior claims on record.',
        'payload_version': 2,
        'message_id': f'MSG-B-{claim.claim_id}-002',
    }


def build_agent_c_payload(policy_payload: Dict[str, Any], claim: InsuranceClaim) -> Dict[str, Any]:
    """Agent C: Damage Assessment Agent validates repair costs and calculates eligible payout."""
    repair_cost = float(claim.estimated_repair_cost or claim.original_claim_amount)
    deductible = float(claim.deductible or 5000)
    limit = float(claim.policy_coverage_limit or 100000)
    eligible = min(limit, max(0.0, repair_cost - deductible))

    return {
        **policy_payload,
        'estimated_repair_cost': repair_cost,
        'excluded_expenses': 0,
        'eligible_repair_cost': repair_cost,
        'calculated_eligible_amount': eligible,
        'assessment_basis': 'Authorized garage quote verified against standard repair catalog',
        'assessment_completed_at': '2026-10-20T09:33:45.000Z',
        'payload_version': 3,
        'message_id': f'MSG-C-{claim.claim_id}-003',
    }


def build_agent_d_payload(assessment_payload: Dict[str, Any], claim: InsuranceClaim) -> Dict[str, Any]:
    """Agent D: Fraud & Risk Analysis Agent computes risk score and evidence package."""
    risk_score = 18
    risk_factors: List[str] = []

    if claim.previous_related_claims >= 2:
        risk_score += 25
        risk_factors.append(f'Multiple prior claims ({claim.previous_related_claims}) within 12 months.')

    evidence_package = [
        f'Verified policy status: {claim.policy_status}',
        f'Reported damage description: {claim.reported_damage}',
        f'Deductible ₹{int(claim.deductible):,} applied against repair estimate ₹{int(claim.estimated_repair_cost):,}',
        'No duplicate claim hash match in 365-day ledger registry'
    ]

    risk_level = 'LOW' if risk_score < 30 else ('MEDIUM' if risk_score < 60 else 'HIGH')

    return {
        **assessment_payload,
        'risk_score': risk_score,
        'risk_level': risk_level,
        'risk_factors': risk_factors,
        'inconsistency_flags': [],
        'duplicate_claim_check': 'PASS',
        'risk_analysis_timestamp': '2026-10-20T09:35:10.000Z',
        'evidence_package': evidence_package,
        'payload_version': 4,
        'message_id': f'MSG-D-{claim.claim_id}-004',
    }


def build_final_decision(claim: InsuranceClaim, handoff_results: Dict[str, Any], last_payload: Dict[str, Any]) -> FinalDecision:
    """Agent E: Final Decision Agent synthesizes verification results and recommends settlement."""
    has_blocked = any(res and getattr(res, 'status', res.get('status') if isinstance(res, dict) else None) == 'BLOCKED' for res in handoff_results.values() if res)
    has_warning = any(res and getattr(res, 'status', res.get('status') if isinstance(res, dict) else None) == 'WARNING' for res in handoff_results.values() if res)
    has_human_review = any(res and getattr(res, 'status', res.get('status') if isinstance(res, dict) else None) == 'HUMAN_REVIEW' for res in handoff_results.values() if res)

    if has_blocked:
        return FinalDecision(
            status='BLOCKED',
            summary='Automated settlement halted by TrustMesh. Critical data integrity failure detected.',
            evidence=[
                f'Claim {claim.claim_id} for {claim.customer_name}',
                'TrustMesh verification checkpoint raised a blocking security violation',
                'Payload quarantined to protect insurer against unauthorized execution'
            ],
            risk_score=95,
            recommended_payout=0.0
        )

    if has_human_review or has_warning:
        payout = float(last_payload.get('calculated_eligible_amount', claim.expected_eligible_amount))
        return FinalDecision(
            status='HUMAN_REVIEW',
            summary='Elevated risk discrepancy identified. Routed for Senior Adjuster manual review.',
            evidence=[
                f'Claim {claim.claim_id} - Potential semantic or evidence gap detected',
                f'Proposed eligible amount: ₹{int(payout):,}',
                'Verification logged to immutable audit ledger'
            ],
            risk_score=int(last_payload.get('risk_score', 65)),
            recommended_payout=payout
        )

    payout = float(last_payload.get('calculated_eligible_amount', claim.expected_eligible_amount))
    return FinalDecision(
        status='APPROVED',
        summary=f'Claim {claim.claim_id} fully verified across all 5 agents and 4 TrustMesh checkpoints.',
        evidence=[
            f'Policy {claim.policy_number} confirmed Active',
            f'Repair estimate ₹{int(claim.estimated_repair_cost):,} verified against coverage limits',
            f'Statutory deductible ₹{int(claim.deductible):,} correctly deducted',
            'All cryptographic SHA-256 checkpoint hashes matched without discrepancies'
        ],
        risk_score=int(last_payload.get('risk_score', 18)),
        recommended_payout=payout
    )
