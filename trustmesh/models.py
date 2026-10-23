"""Data models for TrustMesh Multi-Agent Verification Architecture."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Literal

InsuranceType = Literal[
    'Motor Insurance',
    'Health Insurance',
    'Commercial Property',
    'Homeowners Insurance',
    'Travel Insurance',
    'Marine Cargo',
]

PolicyStatus = Literal['Active', 'Expired', 'Suspended', 'Pending Renewal']
ClaimStatus = Literal['Under Review', 'Submitted', 'Verified', 'Approved', 'Rejected', 'Human Review Required']
AgentId = Literal['agent_a', 'agent_b', 'agent_c', 'agent_d', 'agent_e']
HandoffId = Literal['A_TO_B', 'B_TO_C', 'C_TO_D', 'D_TO_E']

ErrorCategory = Literal[
    'DATA_LOSS',
    'DATA_MANIPULATION',
    'DATA_CORRUPTION',
    'SEMANTIC_INCONSISTENCY',
    'INCORRECT_CALCULATIONS',
    'DUPLICATE_OR_REPLAY',
    'UNAUTHORIZED_TRANSFORMATION',
    'STALE_OUT_OF_ORDER',
    'PARTIAL_FAILED_HANDOFF',
    'MISLEADING_OUTPUT',
    'UNAUTHORIZED_ACCESS',
    'CLEAN_VERIFIED',
]

Severity = Literal['info', 'warning', 'high', 'critical']
VerificationStatus = Literal['VERIFIED', 'WARNING', 'BLOCKED', 'RECOVERY', 'HUMAN_REVIEW', 'NOT_RUN']


@dataclass
class InsuranceClaim:
    claim_id: str
    customer_name: str
    policy_number: str
    insurance_type: InsuranceType
    incident_date: str
    claim_submission_date: str
    reported_damage: str
    estimated_repair_cost: float
    policy_coverage_limit: float
    policy_status: PolicyStatus
    deductible: float
    previous_related_claims: int
    original_claim_amount: float
    expected_eligible_amount: float
    initial_claim_status: ClaimStatus
    customer_id: Optional[str] = None
    vehicle_number: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    location: Optional[str] = None
    policy_start_date: Optional[str] = None
    policy_end_date: Optional[str] = None
    annual_premium: Optional[float] = None
    vehicle_model: Optional[str] = None
    repair_garage_or_hospital: Optional[str] = None
    itemized_expenses: Optional[List[Dict[str, Any]]] = None
    evidence_documents: Optional[List[str]] = None
    risk_notes: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class FieldComparison:
    field: str
    original_value: Any
    received_value: Any
    change_type: Literal['unchanged', 'modified', 'missing', 'added', 'type_mismatch', 'invalid']
    is_authorized: bool
    status: Literal['pass', 'warning', 'fail']
    detail: Optional[str] = None


@dataclass
class RecalculationCheck:
    expected: float
    actual: float
    formula: str
    difference: float


@dataclass
class VerificationResult:
    handoff_id: HandoffId
    source_agent: AgentId
    dest_agent: AgentId
    claim_id: str
    message_id: str
    source_version: int
    dest_version: int
    timestamp: str
    status: VerificationStatus
    severity: Severity
    issues: List[str]
    field_comparisons: List[FieldComparison]
    source_hash: str
    received_hash: str
    hash_match: bool
    required_action: str
    audit_event_id: str
    recalculation: Optional[RecalculationCheck] = None
    is_recovered: bool = False
    recovery_attempt: int = 0


@dataclass
class AuditEvent:
    event_id: str
    timestamp: str
    claim_id: str
    event_type: str
    severity: Severity
    status: str
    reason: str
    action_taken: str
    previous_hash: str
    hash: str
    test_case_id: Optional[str] = None
    source_agent: Optional[AgentId] = None
    dest_agent: Optional[AgentId] = None
    affected_field: Optional[str] = None
    original_value: Optional[Any] = None
    received_value: Optional[Any] = None


@dataclass
class TestCase:
    id: str
    name: str
    claim_id: str
    error_category: ErrorCategory
    error_description: str
    affected_handoff: HandoffId
    source_agent: AgentId
    dest_agent: AgentId
    severity: Severity
    expected_status: VerificationStatus
    expected_detection: str
    expected_action: str
    affected_field: Optional[str] = None
    original_value: Optional[Any] = None
    injected_value: Optional[Any] = None
    is_recoverable: bool = False
    simulated_timeout: bool = False


@dataclass
class FinalDecision:
    status: Literal['APPROVED', 'REJECTED', 'HUMAN_REVIEW', 'BLOCKED']
    summary: str
    evidence: List[str]
    risk_score: int
    recommended_payout: float
