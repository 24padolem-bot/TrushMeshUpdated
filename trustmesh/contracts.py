"""Agent and Handoff Contract Specifications for TrustMesh in Python."""

from typing import Dict, List, Any
from .models import AgentId, HandoffId, ErrorCategory, Severity


AGENT_CONTRACTS: Dict[AgentId, Dict[str, Any]] = {
    'agent_a': {
        'id': 'agent_a',
        'code': 'Agent A',
        'name': 'Claim Intake Agent',
        'role': 'Intake & Ingestion',
        'responsibility': 'Receives new claim, extracts customer info, reads policy number, claim amount, incident date, and builds original structured record.',
        'permitted_additions': [
            'claim_id', 'customer_name', 'customer_id', 'policy_number', 'insurance_type',
            'vehicle_number', 'incident_date', 'claim_submission_date', 'reported_damage',
            'original_claim_amount', 'location', 'notes', 'intake_timestamp'
        ],
        'prohibited_modifications': []
    },
    'agent_b': {
        'id': 'agent_b',
        'code': 'Agent B',
        'name': 'Policy Verification Agent',
        'role': 'Coverage Verification',
        'responsibility': 'Checks policy number against policy registry, verifies active status, verifies coverage limit, identifies missing policy clauses.',
        'permitted_additions': [
            'policy_status', 'policy_coverage_limit', 'deductible', 'previous_related_claims',
            'policy_verified', 'policy_verified_at', 'policy_notes'
        ],
        'prohibited_modifications': [
            'customer_name', 'customer_id', 'policy_number', 'original_claim_amount',
            'incident_date', 'reported_damage', 'vehicle_number'
        ]
    },
    'agent_c': {
        'id': 'agent_c',
        'code': 'Agent C',
        'name': 'Damage Assessment Agent',
        'role': 'Loss & Repair Valuation',
        'responsibility': 'Evaluates reported damage, estimates eligible repair amount, identifies excluded expenses, calculates recommended eligible claim amount.',
        'permitted_additions': [
            'estimated_repair_cost', 'excluded_expenses', 'eligible_repair_cost',
            'calculated_eligible_amount', 'assessment_basis', 'assessment_completed_at'
        ],
        'prohibited_modifications': [
            'customer_name', 'policy_number', 'policy_coverage_limit', 'policy_status',
            'deductible', 'original_claim_amount', 'incident_date'
        ]
    },
    'agent_d': {
        'id': 'agent_d',
        'code': 'Agent D',
        'name': 'Fraud & Risk Analysis Agent',
        'role': 'Anomaly & Risk Detection',
        'responsibility': 'Examines inconsistencies in claim, checks for unusual amounts, suspicious changes, duplicate claim references, produces risk score and rationale.',
        'permitted_additions': [
            'risk_score', 'risk_level', 'risk_factors', 'inconsistency_flags',
            'duplicate_claim_check', 'risk_analysis_timestamp', 'evidence_package'
        ],
        'prohibited_modifications': [
            'calculated_eligible_amount', 'estimated_repair_cost', 'policy_coverage_limit',
            'original_claim_amount', 'policy_number', 'deductible'
        ]
    },
    'agent_e': {
        'id': 'agent_e',
        'code': 'Agent E',
        'name': 'Final Decision Agent',
        'role': 'Adjudication & Settlement',
        'responsibility': 'Receives verified information and previous agents findings, determines approved / rejected / human review, generates decision summary and records evidence.',
        'permitted_additions': [
            'final_decision', 'decision_rationale', 'recommended_payout', 'evidence_summary',
            'decision_timestamp', 'human_review_reasons'
        ],
        'prohibited_modifications': [
            'risk_score', 'calculated_eligible_amount', 'policy_coverage_limit',
            'original_claim_amount', 'estimated_repair_cost'
        ]
    }
}


HANDOFF_DEFINITIONS: Dict[HandoffId, Dict[str, Any]] = {
    'A_TO_B': {
        'id': 'A_TO_B',
        'name': 'Agent A → Agent B',
        'source_agent': 'agent_a',
        'dest_agent': 'agent_b',
        'checkpoint_number': 1,
        'checkpoint_title': 'Intake to Verification Checkpoint',
        'description': 'Monitors transfer of original claim intake data to policy verification. Ensures customer identity, policy number, claim amount, and incident date are intact.',
        'required_fields': [
            'claim_id', 'customer_name', 'policy_number', 'insurance_type',
            'incident_date', 'claim_submission_date', 'reported_damage', 'original_claim_amount'
        ]
    },
    'B_TO_C': {
        'id': 'B_TO_C',
        'name': 'Agent B → Agent C',
        'source_agent': 'agent_b',
        'dest_agent': 'agent_c',
        'checkpoint_number': 2,
        'checkpoint_title': 'Policy to Damage Assessment Checkpoint',
        'description': 'Monitors transfer of verified policy coverage to damage estimation. Prevents unauthorized alteration of coverage limit, policy status, or deductible.',
        'required_fields': [
            'claim_id', 'policy_number', 'policy_status', 'policy_coverage_limit',
            'deductible', 'original_claim_amount', 'reported_damage'
        ]
    },
    'C_TO_D': {
        'id': 'C_TO_D',
        'name': 'Agent C → Agent D',
        'source_agent': 'agent_c',
        'dest_agent': 'agent_d',
        'checkpoint_number': 3,
        'checkpoint_title': 'Assessment to Risk Analysis Checkpoint',
        'description': 'Monitors damage valuation transfer to fraud analytics. Recalculates eligible claim amounts independently and detects loss of assessment data.',
        'required_fields': [
            'claim_id', 'estimated_repair_cost', 'calculated_eligible_amount',
            'policy_coverage_limit', 'deductible', 'reported_damage'
        ]
    },
    'D_TO_E': {
        'id': 'D_TO_E',
        'name': 'Agent D → Agent E',
        'source_agent': 'agent_d',
        'dest_agent': 'agent_e',
        'checkpoint_number': 4,
        'checkpoint_title': 'Risk Analysis to Decision Checkpoint',
        'description': 'Monitors fraud findings transfer to adjudication. Validates that risk scores are supported by evidence and prevents unsupported automatic rejections.',
        'required_fields': [
            'claim_id', 'risk_score', 'risk_level', 'calculated_eligible_amount', 'policy_status'
        ]
    }
}
