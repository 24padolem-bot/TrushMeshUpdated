import { AgentId, HandoffId, ErrorCategory, Severity } from '../types/trustmesh';

export interface AgentContract {
  id: AgentId;
  code: string;
  name: string;
  role: string;
  responsibility: string;
  permittedAdditions: string[];
  prohibitedModifications: string[];
}

export const AGENT_CONTRACTS: Record<AgentId, AgentContract> = {
  agent_a: {
    id: 'agent_a',
    code: 'Agent A',
    name: 'Claim Intake Agent',
    role: 'Intake & Ingestion',
    responsibility: 'Receives new claim, extracts customer info, reads policy number, claim amount, incident date, and builds original structured record.',
    permittedAdditions: [
      'claim_id',
      'customer_name',
      'customer_id',
      'policy_number',
      'insurance_type',
      'vehicle_number',
      'incident_date',
      'claim_submission_date',
      'reported_damage',
      'original_claim_amount',
      'location',
      'notes',
      'intake_timestamp',
    ],
    prohibitedModifications: [],
  },
  agent_b: {
    id: 'agent_b',
    code: 'Agent B',
    name: 'Policy Verification Agent',
    role: 'Coverage Verification',
    responsibility: 'Checks policy number against policy registry, verifies active status, verifies coverage limit, identifies missing policy clauses.',
    permittedAdditions: [
      'policy_status',
      'policy_coverage_limit',
      'deductible',
      'previous_related_claims',
      'policy_verified',
      'policy_verified_at',
      'policy_notes',
    ],
    // Agent B is strictly prohibited from altering intake facts
    prohibitedModifications: [
      'customer_name',
      'customer_id',
      'policy_number',
      'original_claim_amount',
      'incident_date',
      'reported_damage',
      'vehicle_number',
    ],
  },
  agent_c: {
    id: 'agent_c',
    code: 'Agent C',
    name: 'Damage Assessment Agent',
    role: 'Loss & Repair Valuation',
    responsibility: 'Evaluates reported damage, estimates eligible repair amount, identifies excluded expenses, calculates recommended eligible claim amount.',
    permittedAdditions: [
      'estimated_repair_cost',
      'excluded_expenses',
      'eligible_repair_cost',
      'calculated_eligible_amount',
      'assessment_basis',
      'assessment_completed_at',
    ],
    // Agent C cannot alter policy limits, policy numbers, or customer identity
    prohibitedModifications: [
      'customer_name',
      'policy_number',
      'policy_coverage_limit',
      'policy_status',
      'deductible',
      'original_claim_amount',
      'incident_date',
    ],
  },
  agent_d: {
    id: 'agent_d',
    code: 'Agent D',
    name: 'Fraud & Risk Analysis Agent',
    role: 'Anomaly & Risk Detection',
    responsibility: 'Examines inconsistencies in claim, checks for unusual amounts, suspicious changes, duplicate claim references, produces risk score and rationale.',
    permittedAdditions: [
      'risk_score',
      'risk_level',
      'risk_factors',
      'inconsistency_flags',
      'duplicate_claim_check',
      'risk_analysis_timestamp',
      'evidence_package',
    ],
    // Agent D cannot alter financial calculations or policy terms
    prohibitedModifications: [
      'calculated_eligible_amount',
      'estimated_repair_cost',
      'policy_coverage_limit',
      'original_claim_amount',
      'policy_number',
      'deductible',
    ],
  },
  agent_e: {
    id: 'agent_e',
    code: 'Agent E',
    name: 'Final Decision Agent',
    role: 'Adjudication & Settlement',
    responsibility: 'Receives verified information and previous agents findings, determines approved / rejected / human review, generates decision summary and records evidence.',
    permittedAdditions: [
      'final_decision',
      'decision_rationale',
      'recommended_payout',
      'evidence_summary',
      'decision_timestamp',
      'human_review_reasons',
    ],
    // Agent E cannot retroactively tamper with upstream assessment evidence or amounts
    prohibitedModifications: [
      'risk_score',
      'calculated_eligible_amount',
      'policy_coverage_limit',
      'original_claim_amount',
      'estimated_repair_cost',
    ],
  },
};

export interface HandoffDefinition {
  id: HandoffId;
  name: string;
  sourceAgent: AgentId;
  destAgent: AgentId;
  checkpointNumber: number;
  checkpointTitle: string;
  description: string;
  requiredFields: string[];
}

export const HANDOFF_DEFINITIONS: Record<HandoffId, HandoffDefinition> = {
  A_TO_B: {
    id: 'A_TO_B',
    name: 'Agent A → Agent B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    checkpointNumber: 1,
    checkpointTitle: 'Intake to Verification Checkpoint',
    description: 'Monitors transfer of original claim intake data to policy verification. Ensures customer identity, policy number, claim amount, and incident date are intact.',
    requiredFields: [
      'claim_id',
      'customer_name',
      'policy_number',
      'insurance_type',
      'incident_date',
      'claim_submission_date',
      'reported_damage',
      'original_claim_amount',
    ],
  },
  B_TO_C: {
    id: 'B_TO_C',
    name: 'Agent B → Agent C',
    sourceAgent: 'agent_b',
    destAgent: 'agent_c',
    checkpointNumber: 2,
    checkpointTitle: 'Policy to Damage Assessment Checkpoint',
    description: 'Monitors transfer of verified policy coverage to damage estimation. Prevents unauthorized alteration of coverage limit, policy status, or deductible.',
    requiredFields: [
      'claim_id',
      'policy_number',
      'policy_status',
      'policy_coverage_limit',
      'deductible',
      'original_claim_amount',
      'reported_damage',
    ],
  },
  C_TO_D: {
    id: 'C_TO_D',
    name: 'Agent C → Agent D',
    sourceAgent: 'agent_c',
    destAgent: 'agent_d',
    checkpointNumber: 3,
    checkpointTitle: 'Assessment to Risk Analysis Checkpoint',
    description: 'Monitors damage valuation transfer to fraud analytics. Recalculates eligible claim amounts independently and detects loss of assessment data.',
    requiredFields: [
      'claim_id',
      'estimated_repair_cost',
      'calculated_eligible_amount',
      'policy_coverage_limit',
      'deductible',
      'reported_damage',
    ],
  },
  D_TO_E: {
    id: 'D_TO_E',
    name: 'Agent D → Agent E',
    sourceAgent: 'agent_d',
    destAgent: 'agent_e',
    checkpointNumber: 4,
    checkpointTitle: 'Risk Analysis to Decision Checkpoint',
    description: 'Monitors fraud findings transfer to adjudication. Validates that risk scores are supported by evidence and prevents unsupported automatic rejections.',
    requiredFields: [
      'claim_id',
      'risk_score',
      'risk_level',
      'calculated_eligible_amount',
      'policy_status',
    ],
  },
};

export interface ErrorCategoryInfo {
  category: ErrorCategory;
  label: string;
  description: string;
  defaultSeverity: Severity;
  mitigation: string;
}

export const ERROR_CATEGORIES: Record<ErrorCategory, ErrorCategoryInfo> = {
  DATA_LOSS: {
    category: 'DATA_LOSS',
    label: 'Data Loss',
    description: 'One or more required fields disappear during transfer between agents (e.g., missing policy number or incident date).',
    defaultSeverity: 'high',
    mitigation: 'Compare required fields in outgoing/incoming payloads, block affected workflow or request state restoration.',
  },
  DATA_MANIPULATION: {
    category: 'DATA_MANIPULATION',
    label: 'Data Manipulation',
    description: 'Field values are altered in-transit without authorization (e.g., coverage limit inflated from ₹1L to ₹10L).',
    defaultSeverity: 'critical',
    mitigation: 'Identify unexpected modifications against snapshot baseline, block unauthorized changes, preserve verified values.',
  },
  DATA_CORRUPTION: {
    category: 'DATA_CORRUPTION',
    label: 'Data Corruption',
    description: 'Payload schema, types, or syntax corrupted (e.g., non-numeric string for amount, invalid date, truncated ID).',
    defaultSeverity: 'high',
    mitigation: 'Validate schema and data types strictly, halt pipeline progression on type violations.',
  },
  SEMANTIC_INCONSISTENCY: {
    category: 'SEMANTIC_INCONSISTENCY',
    label: 'Semantic Inconsistency',
    description: 'Business facts contradict across agents (e.g., front bumper damage reported by A, rear bumper received by C).',
    defaultSeverity: 'high',
    mitigation: 'Cross-agent fact comparison, explain semantic contradiction, route for human review or clarification.',
  },
  INCORRECT_CALCULATIONS: {
    category: 'INCORRECT_CALCULATIONS',
    label: 'Incorrect Calculations',
    description: 'Mathematical error in downstream valuation (e.g., eligible claim amount miscalculated or coverage limit exceeded).',
    defaultSeverity: 'high',
    mitigation: 'Independent recalculation: Eligible = Min(Coverage Limit, Repair Cost - Deductible). Flag arithmetic mismatch.',
  },
  DUPLICATE_OR_REPLAY: {
    category: 'DUPLICATE_OR_REPLAY',
    label: 'Duplicate / Replay',
    description: 'The same claim payload or an older version is re-delivered or replayed after newer version.',
    defaultSeverity: 'warning',
    mitigation: 'Compare message IDs, version numbers, and timestamps; reject stale replays while handling idempotent retries.',
  },
  UNAUTHORIZED_TRANSFORMATION: {
    category: 'UNAUTHORIZED_TRANSFORMATION',
    label: 'Unauthorized Transformation',
    description: 'An agent mutates a field outside its permitted contractual role (e.g., Agent B changing customer identity).',
    defaultSeverity: 'critical',
    mitigation: 'Apply field-level RBAC transformation contracts, record before/after, block prohibited writes.',
  },
  STALE_OUT_OF_ORDER: {
    category: 'STALE_OUT_OF_ORDER',
    label: 'Stale / Out-of-Order Data',
    description: 'A message arrives with an outdated version or timestamp superseded by newer processed state.',
    defaultSeverity: 'warning',
    mitigation: 'Quarantine out-of-order payloads, enforce monotonic sequence numbering and timestamp validation.',
  },
  PARTIAL_FAILED_HANDOFF: {
    category: 'PARTIAL_FAILED_HANDOFF',
    label: 'Partial / Failed Handoff',
    description: 'Network timeout, dropped payload, or partial transmission failure between agent endpoints.',
    defaultSeverity: 'high',
    mitigation: 'Display failed handoff, record failure event, initiate automated authorized retry with exponential backoff.',
  },
  MISLEADING_OUTPUT: {
    category: 'MISLEADING_OUTPUT',
    label: 'Misleading / Unsupported Output',
    description: 'An agent outputs a consequential claim (like high risk) without supporting evidence or reasoning.',
    defaultSeverity: 'high',
    mitigation: 'Evidence-presence check: prevent uncorroborated rejections, route directly to human adjuster review.',
  },
  UNAUTHORIZED_ACCESS: {
    category: 'UNAUTHORIZED_ACCESS',
    label: 'Unauthorized Access / Disclosure',
    description: 'A payload exposes sensitive data fields outside an agent’s need-to-know scope or unknown sender.',
    defaultSeverity: 'high',
    mitigation: 'Simulate identity and data boundary enforcement; strip unauthorized fields or block transfer.',
  },
  CLEAN_VERIFIED: {
    category: 'CLEAN_VERIFIED',
    label: 'Clean Verified Handoff',
    description: 'All 10 TrustMesh validation checks pass without errors. Data integrity and schema intact.',
    defaultSeverity: 'info',
    mitigation: 'Allow pipeline to proceed smoothly to next agent checkpoint with verified tamper-evident stamp.',
  },
};
