export type InsuranceType =
  | 'Motor Insurance'
  | 'Health Insurance'
  | 'Commercial Property'
  | 'Homeowners Insurance'
  | 'Travel Insurance'
  | 'Marine Cargo';

export type PolicyStatus = 'Active' | 'Expired' | 'Suspended' | 'Pending Renewal';

export type ClaimStatus = 'Under Review' | 'Submitted' | 'Verified' | 'Approved' | 'Rejected' | 'Human Review Required';

export interface InsuranceClaim {
  claim_id: string;
  customer_name: string;
  customer_id?: string;
  policy_number: string;
  insurance_type: InsuranceType;
  vehicle_number?: string;
  incident_date: string;
  claim_submission_date: string;
  reported_damage: string;
  estimated_repair_cost: number;
  policy_coverage_limit: number;
  policy_status: PolicyStatus;
  deductible: number;
  previous_related_claims: number;
  original_claim_amount: number;
  expected_eligible_amount: number;
  initial_claim_status: ClaimStatus;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  location?: string;
  policy_start_date?: string;
  policy_end_date?: string;
  annual_premium?: number;
  vehicle_model?: string;
  repair_garage_or_hospital?: string;
  itemized_expenses?: { label: string; amount: number; isCovered: boolean }[];
  evidence_documents?: string[];
  risk_notes?: string;
  notes?: string;
}

export type AgentId = 'agent_a' | 'agent_b' | 'agent_c' | 'agent_d' | 'agent_e';

export type HandoffId = 'A_TO_B' | 'B_TO_C' | 'C_TO_D' | 'D_TO_E';

export type ErrorCategory =
  | 'DATA_LOSS'
  | 'DATA_MANIPULATION'
  | 'DATA_CORRUPTION'
  | 'SEMANTIC_INCONSISTENCY'
  | 'INCORRECT_CALCULATIONS'
  | 'DUPLICATE_OR_REPLAY'
  | 'UNAUTHORIZED_TRANSFORMATION'
  | 'STALE_OUT_OF_ORDER'
  | 'PARTIAL_FAILED_HANDOFF'
  | 'MISLEADING_OUTPUT'
  | 'UNAUTHORIZED_ACCESS'
  | 'CLEAN_VERIFIED';

export type Severity = 'info' | 'warning' | 'high' | 'critical';

export type VerificationStatus =
  | 'VERIFIED'
  | 'WARNING'
  | 'BLOCKED'
  | 'RECOVERY'
  | 'HUMAN_REVIEW'
  | 'NOT_RUN';

export interface FieldComparison {
  field: string;
  originalValue: any;
  receivedValue: any;
  changeType: 'unchanged' | 'modified' | 'missing' | 'added' | 'type_mismatch' | 'invalid';
  isAuthorized: boolean;
  status: 'pass' | 'warning' | 'fail';
  detail?: string;
}

export interface VerificationResult {
  handoffId: HandoffId;
  sourceAgent: AgentId;
  destAgent: AgentId;
  claimId: string;
  messageId: string;
  sourceVersion: number;
  destVersion: number;
  timestamp: string;
  status: VerificationStatus;
  severity: Severity;
  issues: string[];
  fieldComparisons: FieldComparison[];
  sourceHash: string;
  receivedHash: string;
  hashMatch: boolean;
  requiredAction: string;
  auditEventId: string;
  recalculation?: {
    expected: number;
    actual: number;
    formula: string;
    difference: number;
  };
  isRecovered?: boolean;
  recoveryAttempt?: number;
}

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  claimId: string;
  testCaseId?: string;
  sourceAgent?: AgentId;
  destAgent?: AgentId;
  eventType: string;
  severity: Severity;
  status: VerificationStatus | 'SUCCESS' | 'FAILED' | 'RETRY' | 'INITIATED';
  affectedField?: string;
  originalValue?: any;
  receivedValue?: any;
  reason: string;
  actionTaken: string;
  previousHash: string;
  hash: string;
}

export interface TestCase {
  id: string;
  name: string;
  claimId: string;
  errorCategory: ErrorCategory;
  errorDescription: string;
  affectedHandoff: HandoffId;
  sourceAgent: AgentId;
  destAgent: AgentId;
  affectedField?: string;
  originalValue?: any;
  injectedValue?: any;
  severity: Severity;
  expectedStatus: VerificationStatus;
  expectedDetection: string;
  expectedAction: string;
  isRecoverable?: boolean;
  simulatedTimeout?: boolean;
  isMultiError?: boolean;
  secondaryErrors?: Array<{
    handoffId: HandoffId;
    field: string;
    injectedValue: any;
    description: string;
  }>;
}

export interface AgentState {
  id: AgentId;
  name: string;
  code: string;
  role: string;
  responsibility: string;
  status: 'idle' | 'processing' | 'verified' | 'warning' | 'blocked';
  currentInputSummary?: string;
  currentOutputSummary?: string;
  issuesCount: number;
  successfulHandoffs: number;
  payload?: Record<string, any>;
}

export interface SimulationState {
  claim: InsuranceClaim;
  testCase: TestCase | null;
  activeHandoffIndex: number; // 0: A->B, 1: B->C, 2: C->D, 3: D->E
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  stepSpeedMs: number;
  handoffResults: Record<HandoffId, VerificationResult | null>;
  outgoingPayloads: Record<HandoffId, Record<string, any> | null>;
  incomingPayloads: Record<HandoffId, Record<string, any> | null>;
  finalDecision?: {
    status: 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW' | 'BLOCKED';
    summary: string;
    evidence: string[];
    riskScore: number;
    recommendedPayout: number;
  };
  recoveryState?: {
    isRecovering: boolean;
    attempt: number;
    handoffId?: HandoffId;
    recoveredSuccessfully?: boolean;
  };
}
