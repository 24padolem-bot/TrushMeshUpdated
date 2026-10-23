import {
  InsuranceClaim,
  TestCase,
  HandoffId,
  AgentId,
  VerificationResult,
} from '../types/trustmesh';
import { runTrustMeshVerification } from './verificationEngine';

export interface PipelineHandoffPayloads {
  outgoing: Record<string, any>;
  incoming: Record<string, any>;
  result: VerificationResult;
}

export interface PipelineExecutionResult {
  handoffs: Record<HandoffId, PipelineHandoffPayloads>;
  finalDecision: {
    status: 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW' | 'BLOCKED';
    summary: string;
    evidence: string[];
    riskScore: number;
    recommendedPayout: number;
  };
  stoppedAtHandoff?: HandoffId;
}

/**
 * Generates Agent A's initial intake payload
 */
export function buildAgentAPayload(claim: InsuranceClaim): Record<string, any> {
  return {
    claim_id: claim.claim_id,
    customer_name: claim.customer_name,
    customer_id: claim.customer_id || 'CUST-8842',
    policy_number: claim.policy_number,
    insurance_type: claim.insurance_type,
    vehicle_number: claim.vehicle_number || 'N/A',
    incident_date: claim.incident_date,
    claim_submission_date: claim.claim_submission_date,
    reported_damage: claim.reported_damage,
    original_claim_amount: claim.original_claim_amount,
    location: claim.location || 'Maharashtra, India',
    intake_timestamp: '2026-10-20T09:30:00.000Z',
    payload_version: 1,
    message_id: `MSG-A-${claim.claim_id}-001`,
  };
}

/**
 * Simulates Agent B's enrichment
 */
export function buildAgentBPayload(
  intakePayload: Record<string, any>,
  claim: InsuranceClaim
): Record<string, any> {
  return {
    ...intakePayload,
    policy_status: claim.policy_status,
    policy_coverage_limit: claim.policy_coverage_limit,
    deductible: claim.deductible,
    previous_related_claims: claim.previous_related_claims,
    policy_verified: claim.policy_status === 'Active',
    policy_verified_at: '2026-10-20T09:31:15.000Z',
    policy_notes: `Policy ${claim.policy_number} in good standing. ${claim.previous_related_claims} prior claims on record.`,
    payload_version: 2,
    message_id: `MSG-B-${claim.claim_id}-002`,
  };
}

/**
 * Simulates Agent C's damage assessment
 */
export function buildAgentCPayload(
  policyPayload: Record<string, any>,
  claim: InsuranceClaim
): Record<string, any> {
  const repairCost = claim.estimated_repair_cost || claim.original_claim_amount;
  const deductible = claim.deductible || 5000;
  const limit = claim.policy_coverage_limit || 100000;
  const eligibleBeforeAdjustments = Math.min(limit, Math.max(0, repairCost - deductible));

  return {
    ...policyPayload,
    estimated_repair_cost: repairCost,
    excluded_expenses: 0,
    eligible_repair_cost: repairCost,
    calculated_eligible_amount: eligibleBeforeAdjustments,
    assessment_basis: 'Authorized garage quote verified against standard repair catalog',
    assessment_completed_at: '2026-10-20T09:33:45.000Z',
    payload_version: 3,
    message_id: `MSG-C-${claim.claim_id}-003`,
  };
}

/**
 * Simulates Agent D's fraud & risk analysis
 */
export function buildAgentDPayload(
  assessmentPayload: Record<string, any>,
  claim: InsuranceClaim
): Record<string, any> {
  // Baseline deterministic risk evaluation
  let riskScore = 18;
  const riskFactors: string[] = [];

  if (claim.previous_related_claims >= 2) {
    riskScore += 25;
    riskFactors.push(`Multiple prior claims (${claim.previous_related_claims}) within 12 months.`);
  }

  const daysBetweenIncidentAndClaim = Math.floor(
    (new Date(claim.claim_submission_date).getTime() - new Date(claim.incident_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysBetweenIncidentAndClaim > 14) {
    riskScore += 20;
    riskFactors.push(`Noticeable delay of ${daysBetweenIncidentAndClaim} days before filing claim.`);
  }

  if (riskFactors.length === 0) {
    riskFactors.push('Nominal claim frequency and consistent documentation verified.');
  }

  const riskLevel = riskScore < 35 ? 'Low' : riskScore < 70 ? 'Medium' : 'High';

  return {
    ...assessmentPayload,
    risk_score: riskScore,
    risk_level: riskLevel,
    risk_factors: riskFactors,
    duplicate_claim_check: 'Passed - No active duplicates found in registry',
    inconsistency_flags: [],
    evidence_package: [
      'Incident photographs verified with GPS metadata',
      'Policy coverage active at incident timestamp',
      'Authorized dealer repair invoice catalog match',
    ],
    risk_analysis_timestamp: '2026-10-20T09:35:10.000Z',
    payload_version: 4,
    message_id: `MSG-D-${claim.claim_id}-004`,
  };
}

/**
 * Applies a test case modification to a payload dynamically adapted to the active person's claim
 */
export function applyInjectedError(
  payload: Record<string, any>,
  testCase: TestCase,
  currentHandoff: HandoffId,
  claim?: InsuranceClaim
): Record<string, any> {
  const corrupted = { ...payload };

  // Check primary error
  if (testCase.affectedHandoff === currentHandoff) {
    if (testCase.affectedField) {
      if (testCase.injectedValue === undefined) {
        delete corrupted[testCase.affectedField];
      } else {
        // Dynamically scale/adapt injected value to the active person's real figures if needed
        if (testCase.errorCategory === 'DATA_MANIPULATION' && testCase.affectedField === 'policy_coverage_limit') {
          const baseLimit = Number(corrupted.policy_coverage_limit || claim?.policy_coverage_limit || 100000);
          corrupted[testCase.affectedField] = baseLimit * 10;
        } else if (testCase.errorCategory === 'INCORRECT_CALCULATIONS' && testCase.affectedField === 'calculated_eligible_amount') {
          const baseEligible = Number(corrupted.calculated_eligible_amount || claim?.expected_eligible_amount || 40000);
          corrupted[testCase.affectedField] = Math.max(1000, baseEligible - 8000);
        } else if (testCase.errorCategory === 'UNAUTHORIZED_TRANSFORMATION' && testCase.affectedField === 'customer_name') {
          corrupted[testCase.affectedField] = 'Vikas Agrawal';
        } else if (testCase.errorCategory === 'SEMANTIC_INCONSISTENCY' && testCase.affectedField === 'reported_damage') {
          corrupted[testCase.affectedField] = 'Rear bumper and rear axle collapse';
        } else {
          corrupted[testCase.affectedField] = testCase.injectedValue;
        }
      }
    }
  }

  // Check secondary errors for multi-error scenarios
  if (testCase.isMultiError && testCase.secondaryErrors) {
    for (const sec of testCase.secondaryErrors) {
      if (sec.handoffId === currentHandoff) {
        if (sec.injectedValue === undefined) {
          delete corrupted[sec.field];
        } else {
          corrupted[sec.field] = sec.injectedValue;
        }
      }
    }
  }

  return corrupted;
}

/**
 * Evaluates handoff step by step
 */
export function executeHandoffStep(
  handoffId: HandoffId,
  sourcePayload: Record<string, any>,
  testCase: TestCase | null,
  claim: InsuranceClaim,
  options?: { isRetry?: boolean }
): PipelineHandoffPayloads {
  const outgoing = { ...sourcePayload };
  let incoming = { ...sourcePayload };

  const isCurrentHandoffAffected = testCase?.affectedHandoff === handoffId;
  const isTimeout = isCurrentHandoffAffected && testCase?.simulatedTimeout && !options?.isRetry;

  if (testCase && !options?.isRetry) {
    incoming = applyInjectedError(outgoing, testCase, handoffId, claim);
  }

  let sourceAgent: AgentId = 'agent_a';
  let destAgent: AgentId = 'agent_b';
  let sourceVersion = 1;
  let destVersion = 1;

  switch (handoffId) {
    case 'A_TO_B':
      sourceAgent = 'agent_a';
      destAgent = 'agent_b';
      sourceVersion = 1;
      destVersion = incoming.payload_version ?? 1;
      break;
    case 'B_TO_C':
      sourceAgent = 'agent_b';
      destAgent = 'agent_c';
      sourceVersion = 2;
      destVersion = incoming.payload_version ?? 2;
      break;
    case 'C_TO_D':
      sourceAgent = 'agent_c';
      destAgent = 'agent_d';
      sourceVersion = 3;
      destVersion = incoming.payload_version ?? 3;
      break;
    case 'D_TO_E':
      sourceAgent = 'agent_d';
      destAgent = 'agent_e';
      sourceVersion = 4;
      destVersion = incoming.payload_version ?? 4;
      break;
  }

  const result = runTrustMeshVerification({
    handoffId,
    sourceAgent,
    destAgent,
    claimId: claim.claim_id,
    sourcePayload: outgoing,
    receivedPayload: incoming,
    messageId: incoming.message_id || `MSG-${handoffId}-${claim.claim_id}`,
    sourceVersion,
    destVersion,
    isRetryAttempt: options?.isRetry,
    simulatedNetworkTimeout: isTimeout,
  });

  return {
    outgoing,
    incoming,
    result,
  };
}

/**
 * Simulates Agent E's final decision
 */
export function buildFinalDecision(
  claim: InsuranceClaim,
  handoffResults: Record<HandoffId, VerificationResult | null>,
  finalPayload: Record<string, any>
) {
  // If any checkpoint is BLOCKED, pipeline cannot approve!
  const blockedHandoff = Object.values(handoffResults).find(r => r?.status === 'BLOCKED');
  if (blockedHandoff) {
    return {
      status: 'BLOCKED' as const,
      summary: `Claim processing halted at Checkpoint ${blockedHandoff.handoffId}. TrustMesh detected critical data integrity violation.`,
      evidence: blockedHandoff.issues,
      riskScore: finalPayload.risk_score || 0,
      recommendedPayout: 0,
    };
  }

  const reviewHandoff = Object.values(handoffResults).find(r => r?.status === 'HUMAN_REVIEW');
  if (reviewHandoff) {
    return {
      status: 'HUMAN_REVIEW' as const,
      summary: `Sent to Senior Claims Adjuster for Human Review: ${reviewHandoff.issues.join('; ')}`,
      evidence: [
        ...reviewHandoff.issues,
        'Claim held in trust quarantine pending human corroboration.',
      ],
      riskScore: finalPayload.risk_score || 75,
      recommendedPayout: finalPayload.calculated_eligible_amount || claim.expected_eligible_amount,
    };
  }

  const riskScore = Number(finalPayload.risk_score || 18);
  const eligibleAmount = Number(finalPayload.calculated_eligible_amount || claim.expected_eligible_amount);

  if (riskScore >= 75) {
    // Human Review triggered by high risk
    return {
      status: 'HUMAN_REVIEW' as const,
      summary: `High anomaly score (${riskScore}/100) requires manual adjuster sign-off.`,
      evidence: finalPayload.risk_factors || ['Elevated risk indices flagged by Agent D'],
      riskScore,
      recommendedPayout: eligibleAmount,
    };
  }

  return {
    status: 'APPROVED' as const,
    summary: `Claim ${claim.claim_id} fully verified across all 4 TrustMesh checkpoints. Recommended payout: ₹${eligibleAmount.toLocaleString('en-IN')}.`,
    evidence: [
      `Policy ${claim.policy_number} active with limit ₹${claim.policy_coverage_limit.toLocaleString('en-IN')}`,
      `Repair cost ₹${(claim.estimated_repair_cost || claim.original_claim_amount).toLocaleString('en-IN')} minus deductible ₹${claim.deductible.toLocaleString('en-IN')}`,
      `Risk score nominal (${riskScore}/100 - Low Risk)`,
      `All inter-agent handoff payload hashes verified cryptographically`,
    ],
    riskScore,
    recommendedPayout: eligibleAmount,
  };
}
