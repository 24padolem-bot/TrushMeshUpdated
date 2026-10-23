import { TestCase, InsuranceClaim, ErrorCategory, Severity, VerificationStatus } from '../types/trustmesh';

export const DETERMINISTIC_TEST_CASES: TestCase[] = [
  // 1. Clean Baseline Case
  {
    id: 'TM-TEST-001',
    name: 'Clean Compliant Claim Handoff',
    claimId: 'CLM-2026-001',
    errorCategory: 'CLEAN_VERIFIED',
    errorDescription: 'Normal end-to-end handoff across all five agents. All schemas, calculations, and transformation rules strictly match contracts.',
    affectedHandoff: 'A_TO_B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    severity: 'info',
    expectedStatus: 'VERIFIED',
    expectedDetection: 'All 10 TrustMesh verification checks pass without anomalies.',
    expectedAction: 'Allow continuous pipeline execution to Agent E decision.',
  },

  // 2. Data Loss: Missing Policy Number (Prompt Test Case 1)
  {
    id: 'TM-TEST-002',
    name: 'Data Loss: Missing Policy Number',
    claimId: 'CLM-2026-001',
    errorCategory: 'DATA_LOSS',
    errorDescription: 'Agent A dispatches claim intake record, but the mandatory policy_number field is dropped in transit before Agent B receives it.',
    affectedHandoff: 'A_TO_B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    affectedField: 'policy_number',
    originalValue: 'POL-88421',
    injectedValue: undefined,
    severity: 'high',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Missing required field policy_number detected at Checkpoint 1.',
    expectedAction: 'Block workflow. Request state recovery from Agent A snapshot.',
    isRecoverable: true,
  },

  // 3. Data Manipulation: Coverage Limit Inflation (Prompt Test Case 2)
  {
    id: 'TM-TEST-003',
    name: 'Data Manipulation: Coverage Limit 10x Inflation',
    claimId: 'CLM-2026-001',
    errorCategory: 'DATA_MANIPULATION',
    errorDescription: 'Policy coverage limit unexpectedly changes from ₹1,00,000 to ₹10,00,000 during transfer from Agent B to Agent C.',
    affectedHandoff: 'B_TO_C',
    sourceAgent: 'agent_b',
    destAgent: 'agent_c',
    affectedField: 'policy_coverage_limit',
    originalValue: 100000,
    injectedValue: 1000000,
    severity: 'critical',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Field-level comparison flags unauthorized modification of policy_coverage_limit.',
    expectedAction: 'Block unauthorized change. Preserve original verified limit of ₹1,00,000.',
    isRecoverable: true,
  },

  // 4. Incorrect Calculation: Deductible Arithmetic Error (Prompt Test Case 3)
  {
    id: 'TM-TEST-004',
    name: 'Incorrect Calculation: Arithmetic Mismatch',
    claimId: 'CLM-2026-001',
    errorCategory: 'INCORRECT_CALCULATIONS',
    errorDescription: 'Agent C calculates eligible amount as ₹35,000 instead of ₹43,000 (Repair ₹48,000 minus Deductible ₹5,000).',
    affectedHandoff: 'C_TO_D',
    sourceAgent: 'agent_c',
    destAgent: 'agent_d',
    affectedField: 'calculated_eligible_amount',
    originalValue: 43000,
    injectedValue: 35000,
    severity: 'high',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Independent audit engine recalculates expected ₹43,000 and identifies arithmetic mismatch of ₹8,000.',
    expectedAction: 'Halt workflow and enforce verified recalculated amount of ₹43,000.',
    isRecoverable: true,
  },

  // 5. Data Loss: Missing Risk Findings in Decision Payload (Prompt Test Case 4)
  {
    id: 'TM-TEST-005',
    name: 'Data Loss: Missing Risk Findings at Decision Stage',
    claimId: 'CLM-2026-001',
    errorCategory: 'DATA_LOSS',
    errorDescription: 'Risk findings and risk_score are completely stripped when passing from Agent D to Agent E.',
    affectedHandoff: 'D_TO_E',
    sourceAgent: 'agent_d',
    destAgent: 'agent_e',
    affectedField: 'risk_score',
    originalValue: 18,
    injectedValue: undefined,
    severity: 'high',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Required risk assessment payload missing at Checkpoint 4.',
    expectedAction: 'Prevent decision that requires findings. Request missing evidence.',
    isRecoverable: true,
  },

  // 6. Data Corruption: Non-Numeric Claim Amount
  {
    id: 'TM-TEST-006',
    name: 'Data Corruption: Non-Numeric String Amount',
    claimId: 'CLM-2026-001',
    errorCategory: 'DATA_CORRUPTION',
    errorDescription: 'Original numeric claim amount (48000) is corrupted into string "FORTY_EIGHT_THOUSAND_RUPEES".',
    affectedHandoff: 'A_TO_B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    affectedField: 'original_claim_amount',
    originalValue: 48000,
    injectedValue: 'FORTY_EIGHT_THOUSAND_RUPEES',
    severity: 'high',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Schema type validator rejects non-numeric string for financial amount.',
    expectedAction: 'Reject corrupted packet and request clean payload re-transmission.',
    isRecoverable: true,
  },

  // 7. Semantic Inconsistency: Damage Location Contradiction
  {
    id: 'TM-TEST-007',
    name: 'Semantic Inconsistency: Front vs Rear Damage Conflict',
    claimId: 'CLM-2026-001',
    errorCategory: 'SEMANTIC_INCONSISTENCY',
    errorDescription: 'Agent A reported front bumper and headlight damage, but payload reaching Agent C claims rear bumper and trunk damage.',
    affectedHandoff: 'B_TO_C',
    sourceAgent: 'agent_b',
    destAgent: 'agent_c',
    affectedField: 'reported_damage',
    originalValue: 'Front bumper and headlight damage',
    injectedValue: 'Rear bumper collision and trunk collapse',
    severity: 'high',
    expectedStatus: 'HUMAN_REVIEW',
    expectedDetection: 'Semantic fact comparison identifies contradictory vehicle damage descriptions.',
    expectedAction: 'Route claim for human adjuster review to verify original incident photographs.',
    isRecoverable: false,
  },

  // 8. Data Manipulation: Deductible Zeroed Out
  {
    id: 'TM-TEST-008',
    name: 'Data Manipulation: Deductible Wiped to Zero',
    claimId: 'CLM-2026-001',
    errorCategory: 'DATA_MANIPULATION',
    errorDescription: 'Mandatory policy deductible of ₹5,000 is modified to ₹0 between Agent B and Agent C to artificially inflate payout.',
    affectedHandoff: 'B_TO_C',
    sourceAgent: 'agent_b',
    destAgent: 'agent_c',
    affectedField: 'deductible',
    originalValue: 5000,
    injectedValue: 0,
    severity: 'critical',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Unauthorized mutation detected in policy deductible field.',
    expectedAction: 'Block unauthorized modification and restore ₹5,000 deductible contract.',
    isRecoverable: true,
  },

  // 9. Unauthorized Transformation: Agent B Altering Customer Identity
  {
    id: 'TM-TEST-009',
    name: 'Unauthorized Transformation: Customer Name Tampered',
    claimId: 'CLM-2026-001',
    errorCategory: 'UNAUTHORIZED_TRANSFORMATION',
    errorDescription: 'Agent B alters customer name from "Rahul Sharma" to "Vikas Agrawal" in breach of role-based transformation contract.',
    affectedHandoff: 'A_TO_B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    affectedField: 'customer_name',
    originalValue: 'Rahul Sharma',
    injectedValue: 'Vikas Agrawal',
    severity: 'critical',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Role-based transformation contract violation: Agent B prohibited from modifying customer identity.',
    expectedAction: 'Block transformation. Record security event and lock claim.',
    isRecoverable: true,
  },

  // 10. Duplicate / Replay Attack
  {
    id: 'TM-TEST-010',
    name: 'Duplicate / Replay: Repeated Message Dispatch',
    claimId: 'CLM-2026-001',
    errorCategory: 'DUPLICATE_OR_REPLAY',
    errorDescription: 'An identical claim intake message is re-delivered with a duplicate message ID after earlier processing.',
    affectedHandoff: 'A_TO_B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    affectedField: 'is_duplicate_replay',
    originalValue: false,
    injectedValue: true,
    severity: 'warning',
    expectedStatus: 'WARNING',
    expectedDetection: 'Replay detector flags previously processed message identifier and timestamp.',
    expectedAction: 'Apply idempotent replay policy: deduplicate and confirm previous state.',
    isRecoverable: true,
  },

  // 11. Partial / Failed Handoff: Network Timeout with Recovery (Prompt Test Case 8)
  {
    id: 'TM-TEST-011',
    name: 'Partial / Failed Handoff: Network Timeout & Retry',
    claimId: 'CLM-2026-001',
    errorCategory: 'PARTIAL_FAILED_HANDOFF',
    errorDescription: 'Agent C times out and fails to acknowledge transmission from Agent B. TrustMesh initiates authorized retry and recovers.',
    affectedHandoff: 'B_TO_C',
    sourceAgent: 'agent_b',
    destAgent: 'agent_c',
    severity: 'high',
    expectedStatus: 'RECOVERY',
    expectedDetection: 'Endpoint timeout detected at Checkpoint 2.',
    expectedAction: 'Record transmission failure, trigger automated retry with verified snapshot, and verify recovery.',
    isRecoverable: true,
    simulatedTimeout: true,
  },

  // 12. Misleading / Unsupported Output: High Risk Without Evidence (Prompt Section 4.J)
  {
    id: 'TM-TEST-012',
    name: 'Unsupported Output: High Risk Score Without Corroboration',
    claimId: 'CLM-2026-001',
    errorCategory: 'MISLEADING_OUTPUT',
    errorDescription: 'Agent D outputs an alarming risk score of 88/100, but provides an empty evidence package with zero rationale.',
    affectedHandoff: 'D_TO_E',
    sourceAgent: 'agent_d',
    destAgent: 'agent_e',
    affectedField: 'risk_score',
    originalValue: 18,
    injectedValue: 88,
    severity: 'high',
    expectedStatus: 'HUMAN_REVIEW',
    expectedDetection: 'Evidence presence check fails: high risk score unsupported by factual findings.',
    expectedAction: 'Prevent automated rejection. Route case for human adjuster review.',
    isRecoverable: false,
  },

  // 13. Data Corruption: Invalid Incident Date
  {
    id: 'TM-TEST-013',
    name: 'Data Corruption: Malformed Incident Date',
    claimId: 'CLM-2026-001',
    errorCategory: 'DATA_CORRUPTION',
    errorDescription: 'Incident date field is corrupted to "2026-99-99", failing ISO calendar validation.',
    affectedHandoff: 'A_TO_B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    affectedField: 'incident_date',
    originalValue: '2026-10-18',
    injectedValue: '2026-99-99',
    severity: 'high',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Temporal schema validation rejects impossible calendar date.',
    expectedAction: 'Halt handoff and request date correction.',
    isRecoverable: true,
  },

  // 14. Unauthorized Access / PII Disclosure
  {
    id: 'TM-TEST-014',
    name: 'Unauthorized Disclosure: Leaked Biometric Data',
    claimId: 'CLM-2026-001',
    errorCategory: 'UNAUTHORIZED_ACCESS',
    errorDescription: 'Downstream payload incorporates unnecessary personal biometric credentials (unauthorized_biometric_hash).',
    affectedHandoff: 'C_TO_D',
    sourceAgent: 'agent_c',
    destAgent: 'agent_d',
    affectedField: 'unauthorized_biometric_hash',
    originalValue: undefined,
    injectedValue: 'BIO_SHA256_9948271AFFE',
    severity: 'critical',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Data privacy perimeter breach: unauthorized field outside agent scope.',
    expectedAction: 'Strip sensitive attributes before downstream propagation.',
    isRecoverable: true,
  },

  // 15. Stale / Out-of-Order Data
  {
    id: 'TM-TEST-015',
    name: 'Stale Data: Reverting to Deprecated Payload Version',
    claimId: 'CLM-2026-001',
    errorCategory: 'STALE_OUT_OF_ORDER',
    errorDescription: 'Agent C receives a stale snapshot marked v0.8 timestamped prior to intake submission.',
    affectedHandoff: 'B_TO_C',
    sourceAgent: 'agent_b',
    destAgent: 'agent_c',
    affectedField: 'payload_version',
    originalValue: 2,
    injectedValue: 0.8,
    severity: 'warning',
    expectedStatus: 'WARNING',
    expectedDetection: 'Monotonic version check flags out-of-sequence payload arrival.',
    expectedAction: 'Quarantine stale packet and request current active version.',
    isRecoverable: true,
  },

  // 16. Multi-Error Scenario: Missing Policy + Incomplete Damage Assessment (Prompt Test Case 5)
  {
    id: 'TM-TEST-016',
    name: 'Multi-Error Cascade: Missing Policy & Damaged Assessment',
    claimId: 'CLM-2026-001',
    errorCategory: 'DATA_LOSS',
    errorDescription: 'Cascading failure: Policy number is dropped at Checkpoint 1, followed by missing repair estimation at Checkpoint 3.',
    affectedHandoff: 'A_TO_B',
    sourceAgent: 'agent_a',
    destAgent: 'agent_b',
    affectedField: 'policy_number',
    originalValue: 'POL-88421',
    injectedValue: undefined,
    severity: 'high',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Detects initial error at Checkpoint 1, isolates causality, prevents misattributing root cause to Agent C.',
    expectedAction: 'Block at primary failure point to prevent compounding downstream state corruption.',
    isMultiError: true,
    secondaryErrors: [
      {
        handoffId: 'C_TO_D',
        field: 'estimated_repair_cost',
        injectedValue: undefined,
        description: 'Missing damage assessment figures.',
      },
    ],
  },
];

/**
 * Procedural Test Case Generator:
 * Generates an authentic test scenario dynamically based on any selected claim and error category.
 */
export function generateProcedureScenario(
  claim: InsuranceClaim,
  categoryChoice?: ErrorCategory,
  handoffChoice?: TestCase['affectedHandoff']
): TestCase {
  const categories: ErrorCategory[] = [
    'DATA_LOSS',
    'DATA_MANIPULATION',
    'DATA_CORRUPTION',
    'SEMANTIC_INCONSISTENCY',
    'INCORRECT_CALCULATIONS',
    'UNAUTHORIZED_TRANSFORMATION',
    'PARTIAL_FAILED_HANDOFF',
    'MISLEADING_OUTPUT',
    'CLEAN_VERIFIED',
  ];

  const selectedCategory = categoryChoice || categories[Math.floor(Math.random() * categories.length)];
  const randomSeed = Math.floor(Math.random() * 9000 + 1000);
  const testId = `TM-TEST-PROC-${randomSeed}`;

  if (selectedCategory === 'CLEAN_VERIFIED') {
    return {
      id: testId,
      name: `Clean Verified Run (${claim.claim_id})`,
      claimId: claim.claim_id,
      errorCategory: 'CLEAN_VERIFIED',
      errorDescription: `Full end-to-end verification of ${claim.customer_name}'s ${claim.insurance_type} claim. All handoffs adhere to contracts.`,
      affectedHandoff: 'A_TO_B',
      sourceAgent: 'agent_a',
      destAgent: 'agent_b',
      severity: 'info',
      expectedStatus: 'VERIFIED',
      expectedDetection: 'All checkpoints pass canonical hashing, schema, and business rule verification.',
      expectedAction: 'Forward without impediment.',
    };
  }

  if (selectedCategory === 'DATA_LOSS') {
    const fieldsToDrop = [
      { handoff: 'A_TO_B' as const, src: 'agent_a' as const, dst: 'agent_b' as const, field: 'policy_number', orig: claim.policy_number },
      { handoff: 'A_TO_B' as const, src: 'agent_a' as const, dst: 'agent_b' as const, field: 'incident_date', orig: claim.incident_date },
      { handoff: 'B_TO_C' as const, src: 'agent_b' as const, dst: 'agent_c' as const, field: 'policy_coverage_limit', orig: claim.policy_coverage_limit },
      { handoff: 'C_TO_D' as const, src: 'agent_c' as const, dst: 'agent_d' as const, field: 'calculated_eligible_amount', orig: claim.expected_eligible_amount },
    ];
    const target = fieldsToDrop[Math.floor(Math.random() * fieldsToDrop.length)];
    return {
      id: testId,
      name: `Procedural Data Loss: Missing ${target.field}`,
      claimId: claim.claim_id,
      errorCategory: 'DATA_LOSS',
      errorDescription: `During transfer at ${target.handoff}, the required field '${target.field}' is lost from payload.`,
      affectedHandoff: target.handoff,
      sourceAgent: target.src,
      destAgent: target.dst,
      affectedField: target.field,
      originalValue: target.orig,
      injectedValue: undefined,
      severity: 'high',
      expectedStatus: 'BLOCKED',
      expectedDetection: `Required field validation flags missing '${target.field}'.`,
      expectedAction: 'Halt workflow. Request state recovery from source snapshot.',
      isRecoverable: true,
    };
  }

  if (selectedCategory === 'DATA_MANIPULATION') {
    const inflatedLimit = claim.policy_coverage_limit * 10;
    return {
      id: testId,
      name: `Procedural Data Manipulation: Coverage Limit Inflation`,
      claimId: claim.claim_id,
      errorCategory: 'DATA_MANIPULATION',
      errorDescription: `Coverage limit for ${claim.customer_name} altered from ₹${claim.policy_coverage_limit.toLocaleString('en-IN')} to ₹${inflatedLimit.toLocaleString('en-IN')}.`,
      affectedHandoff: 'B_TO_C',
      sourceAgent: 'agent_b',
      destAgent: 'agent_c',
      affectedField: 'policy_coverage_limit',
      originalValue: claim.policy_coverage_limit,
      injectedValue: inflatedLimit,
      severity: 'critical',
      expectedStatus: 'BLOCKED',
      expectedDetection: 'Field-level diff flags unauthorized mutation of policy_coverage_limit.',
      expectedAction: 'Block unauthorized change. Preserve original verified limit.',
      isRecoverable: true,
    };
  }

  if (selectedCategory === 'INCORRECT_CALCULATIONS') {
    const errorCalc = Math.max(1000, claim.expected_eligible_amount - 12000);
    return {
      id: testId,
      name: `Procedural Calculation Error: Eligible Amount Discrepancy`,
      claimId: claim.claim_id,
      errorCategory: 'INCORRECT_CALCULATIONS',
      errorDescription: `Damage assessment calculated payout as ₹${errorCalc.toLocaleString('en-IN')} instead of verified ₹${claim.expected_eligible_amount.toLocaleString('en-IN')}.`,
      affectedHandoff: 'C_TO_D',
      sourceAgent: 'agent_c',
      destAgent: 'agent_d',
      affectedField: 'calculated_eligible_amount',
      originalValue: claim.expected_eligible_amount,
      injectedValue: errorCalc,
      severity: 'high',
      expectedStatus: 'BLOCKED',
      expectedDetection: 'Independent recalculation formula flags arithmetic discrepancy.',
      expectedAction: 'Enforce verified calculated eligible amount.',
      isRecoverable: true,
    };
  }

  if (selectedCategory === 'DATA_CORRUPTION') {
    return {
      id: testId,
      name: `Procedural Data Corruption: Invalid Incident Date Format`,
      claimId: claim.claim_id,
      errorCategory: 'DATA_CORRUPTION',
      errorDescription: `Incident date field mutated into corrupted string "2026-99-99" during transmission.`,
      affectedHandoff: 'A_TO_B',
      sourceAgent: 'agent_a',
      destAgent: 'agent_b',
      affectedField: 'incident_date',
      originalValue: claim.incident_date,
      injectedValue: '2026-99-99',
      severity: 'high',
      expectedStatus: 'BLOCKED',
      expectedDetection: 'Schema validator identifies malformed calendar date.',
      expectedAction: 'Reject corrupted payload and request re-transmission.',
      isRecoverable: true,
    };
  }

  if (selectedCategory === 'SEMANTIC_INCONSISTENCY') {
    return {
      id: testId,
      name: `Procedural Semantic Inconsistency: Conflicting Damage Description`,
      claimId: claim.claim_id,
      errorCategory: 'SEMANTIC_INCONSISTENCY',
      errorDescription: `Original damage reported as "${claim.reported_damage}", but incoming payload states conflicting rear structural collapse.`,
      affectedHandoff: 'B_TO_C',
      sourceAgent: 'agent_b',
      destAgent: 'agent_c',
      affectedField: 'reported_damage',
      originalValue: claim.reported_damage,
      injectedValue: 'Rear bumper and rear axle collapse',
      severity: 'high',
      expectedStatus: 'HUMAN_REVIEW',
      expectedDetection: 'Semantic contradiction detected between intake description and assessment request.',
      expectedAction: 'Route to human adjuster for photo evidence inspection.',
      isRecoverable: false,
    };
  }

  if (selectedCategory === 'PARTIAL_FAILED_HANDOFF') {
    return {
      id: testId,
      name: `Procedural Network Failure: Transmission Timeout & Recovery`,
      claimId: claim.claim_id,
      errorCategory: 'PARTIAL_FAILED_HANDOFF',
      errorDescription: `Agent C fails to acknowledge receipt of payload from Agent B. TrustMesh detects dropped link and initiates snapshot retry.`,
      affectedHandoff: 'B_TO_C',
      sourceAgent: 'agent_b',
      destAgent: 'agent_c',
      severity: 'high',
      expectedStatus: 'RECOVERY',
      expectedDetection: 'Transmission timeout detected at Checkpoint 2.',
      expectedAction: 'Trigger automated retry with verified snapshot.',
      isRecoverable: true,
      simulatedTimeout: true,
    };
  }

  // Fallback to Data Manipulation on Deductible
  return {
    id: testId,
    name: `Procedural Manipulation: Deductible Removal`,
    claimId: claim.claim_id,
    errorCategory: 'DATA_MANIPULATION',
    errorDescription: `Deductible of ₹${claim.deductible.toLocaleString('en-IN')} modified to ₹0 during transfer.`,
    affectedHandoff: 'B_TO_C',
    sourceAgent: 'agent_b',
    destAgent: 'agent_c',
    affectedField: 'deductible',
    originalValue: claim.deductible,
    injectedValue: 0,
    severity: 'critical',
    expectedStatus: 'BLOCKED',
    expectedDetection: 'Unauthorized mutation of contract deductible.',
    expectedAction: 'Restore contract deductible and block downstream execution.',
    isRecoverable: true,
  };
}

/**
 * Binds any scenario (deterministic or procedural) directly to the user's currently selected claim.
 * Ensures the currently selected claim is always preserved and its actual data values are used.
 */
export function bindScenarioToClaim(testCase: TestCase, claim: InsuranceClaim): TestCase {
  if (!testCase) return testCase;

  // Clone scenario
  const bound: TestCase = {
    ...testCase,
    claimId: claim.claim_id,
  };

  if (testCase.errorCategory === 'CLEAN_VERIFIED') {
    bound.name = `Clean Compliant Run (${claim.claim_id})`;
    bound.errorDescription = `Normal end-to-end handoff for ${claim.customer_name} (${claim.insurance_type}). All schemas and contracts verified without errors.`;
    return bound;
  }

  // Dynamically adapt values according to the selected claim's actual dataset values
  if (testCase.affectedField === 'policy_coverage_limit') {
    bound.originalValue = claim.policy_coverage_limit;
    bound.injectedValue = claim.policy_coverage_limit * 10;
    bound.errorDescription = `Policy coverage limit for ${claim.customer_name} unexpectedly changes from ₹${claim.policy_coverage_limit.toLocaleString('en-IN')} to ₹${(claim.policy_coverage_limit * 10).toLocaleString('en-IN')} during transfer from Agent B to Agent C.`;
  } else if (testCase.affectedField === 'policy_number') {
    bound.originalValue = claim.policy_number;
    bound.injectedValue = undefined;
    bound.errorDescription = `Agent A dispatches claim record for ${claim.customer_name}, but mandatory policy_number (${claim.policy_number}) is dropped before reaching Agent B.`;
  } else if (testCase.affectedField === 'calculated_eligible_amount') {
    bound.originalValue = claim.expected_eligible_amount;
    const miscalculated = Math.max(1000, claim.expected_eligible_amount - 8000);
    bound.injectedValue = miscalculated;
    bound.errorDescription = `Agent C calculates eligible payout as ₹${miscalculated.toLocaleString('en-IN')} instead of verified ₹${claim.expected_eligible_amount.toLocaleString('en-IN')} (Repair ₹${(claim.estimated_repair_cost || claim.original_claim_amount).toLocaleString('en-IN')} minus Deductible ₹${claim.deductible.toLocaleString('en-IN')}).`;
  } else if (testCase.affectedField === 'deductible') {
    bound.originalValue = claim.deductible;
    bound.injectedValue = 0;
    bound.errorDescription = `Policy deductible of ₹${claim.deductible.toLocaleString('en-IN')} is modified to ₹0 during transfer to artificially inflate settlement.`;
  } else if (testCase.affectedField === 'customer_name') {
    bound.originalValue = claim.customer_name;
    bound.injectedValue = 'Vikas Agrawal';
    bound.errorDescription = `Customer name "${claim.customer_name}" illegally modified to "Vikas Agrawal" in breach of role-based transformation contract.`;
  } else if (testCase.affectedField === 'reported_damage') {
    bound.originalValue = claim.reported_damage;
    bound.injectedValue = 'Rear bumper collision and trunk collapse';
    bound.errorDescription = `Original damage reported as "${claim.reported_damage}", but incoming payload states conflicting rear collision.`;
  } else if (testCase.affectedField === 'original_claim_amount') {
    bound.originalValue = claim.original_claim_amount;
    bound.injectedValue = typeof testCase.injectedValue === 'string' ? testCase.injectedValue : claim.original_claim_amount * 2;
  } else if (testCase.affectedField === 'incident_date') {
    bound.originalValue = claim.incident_date;
    bound.injectedValue = testCase.injectedValue || '2026-99-99';
  } else if (testCase.affectedField && (claim as any)[testCase.affectedField] !== undefined) {
    bound.originalValue = (claim as any)[testCase.affectedField];
  }

  return bound;
}

