import {
  HandoffId,
  AgentId,
  VerificationStatus,
  Severity,
  VerificationResult,
  FieldComparison,
} from '../types/trustmesh';
import {
  HANDOFF_DEFINITIONS,
  AGENT_CONTRACTS,
} from './contracts';
import { canonicalJsonStringify, quickHashSync } from '../utils/crypto';

export interface VerificationContext {
  handoffId: HandoffId;
  sourceAgent: AgentId;
  destAgent: AgentId;
  claimId: string;
  sourcePayload: Record<string, any>;
  receivedPayload: Record<string, any>;
  messageId: string;
  sourceVersion: number;
  destVersion: number;
  isRetryAttempt?: boolean;
  simulatedNetworkTimeout?: boolean;
}

export function runTrustMeshVerification(ctx: VerificationContext): VerificationResult {
  const {
    handoffId,
    sourceAgent,
    destAgent,
    claimId,
    sourcePayload,
    receivedPayload,
    messageId,
    sourceVersion,
    destVersion,
    isRetryAttempt,
    simulatedNetworkTimeout,
  } = ctx;

  const handoffDef = HANDOFF_DEFINITIONS[handoffId];
  const sourceContract = AGENT_CONTRACTS[sourceAgent];
  const destContract = AGENT_CONTRACTS[destAgent];

  const issues: string[] = [];
  const fieldComparisons: FieldComparison[] = [];
  let status: VerificationStatus = 'VERIFIED';
  let severity: Severity = 'info';
  let requiredAction = 'Forward verified payload to downstream agent.';

  // 0. Handle Simulated Network Timeout / Partial Failure
  if (simulatedNetworkTimeout && !isRetryAttempt) {
    return {
      handoffId,
      sourceAgent,
      destAgent,
      claimId,
      messageId,
      sourceVersion,
      destVersion,
      timestamp: new Date().toISOString(),
      status: 'RECOVERY',
      severity: 'high',
      issues: ['Transmission timeout: Connection dropped before destination acknowledgement.'],
      fieldComparisons: [],
      sourceHash: quickHashSync(canonicalJsonStringify(sourcePayload)),
      receivedHash: 'TIMEOUT_NO_RESPONSE',
      hashMatch: false,
      requiredAction: 'Initiating automated authorized retry with state snapshot.',
      auditEventId: `EV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recoveryAttempt: 1,
    };
  }

  // Canonical SHA-256 Hashes
  const sourceCanonical = canonicalJsonStringify(sourcePayload);
  const receivedCanonical = canonicalJsonStringify(receivedPayload);
  const sourceHash = quickHashSync(sourceCanonical);
  const receivedHash = quickHashSync(receivedCanonical);
  const hashMatch = sourceHash === receivedHash;

  // 1. Required Field Validation
  for (const requiredField of handoffDef.requiredFields) {
    const valInDest = receivedPayload[requiredField];
    if (valInDest === undefined || valInDest === null || valInDest === '') {
      issues.push(`Data Loss: Required field '${requiredField}' is missing in received payload.`);
      status = 'BLOCKED';
      severity = 'high';
      requiredAction = `Halt workflow. Request state restoration for missing required field '${requiredField}'.`;
    }
  }

  // 2. Field-Level Comparison & Prohibited Modifications Check
  const allKeys = Array.from(new Set([...Object.keys(sourcePayload), ...Object.keys(receivedPayload)]));

  for (const key of allKeys) {
    const origVal = sourcePayload[key];
    const recVal = receivedPayload[key];

    // Missing in received
    if (origVal !== undefined && recVal === undefined) {
      const isReq = handoffDef.requiredFields.includes(key);
      fieldComparisons.push({
        field: key,
        originalValue: origVal,
        receivedValue: null,
        changeType: 'missing',
        isAuthorized: false,
        status: isReq ? 'fail' : 'warning',
        detail: `Field disappeared between ${sourceContract.code} and ${destContract.code}`,
      });
      if (isReq) {
        status = 'BLOCKED';
        severity = 'high';
      }
      continue;
    }

    // Unexpected additional field in received
    if (origVal === undefined && recVal !== undefined) {
      const isAllowedBySource = sourceContract.permittedAdditions.includes(key);
      fieldComparisons.push({
        field: key,
        originalValue: null,
        receivedValue: recVal,
        changeType: 'added',
        isAuthorized: isAllowedBySource,
        status: isAllowedBySource ? 'pass' : 'warning',
        detail: isAllowedBySource ? 'Legitimate enrichment' : 'Unexpected additional field',
      });
      if (!isAllowedBySource && key.startsWith('unauthorized_')) {
        issues.push(`Unauthorized Access: Field '${key}' exceeds permitted agent scope.`);
        status = 'BLOCKED';
        severity = 'critical';
        requiredAction = 'Strip unauthorized disclosures before proceeding.';
      }
      continue;
    }

    // Both defined - check if modified
    const isOrigNum = typeof origVal === 'number';
    const isRecNum = typeof recVal === 'number';
    const areValuesEqual = JSON.stringify(origVal) === JSON.stringify(recVal);

    if (areValuesEqual) {
      fieldComparisons.push({
        field: key,
        originalValue: origVal,
        receivedValue: recVal,
        changeType: 'unchanged',
        isAuthorized: true,
        status: 'pass',
      });
    } else {
      // Value modified! Check if authorized or prohibited
      const isProhibited = sourceContract.prohibitedModifications.includes(key) ||
                           (sourceAgent !== 'agent_a' && (key === 'claim_id' || key === 'policy_number' || key === 'customer_name'));

      // Check if data corruption occurred (e.g., number became non-numeric string or invalid date)
      let isCorrupted = false;
      let corruptionReason = '';

      if (isOrigNum && typeof recVal === 'string' && isNaN(Number(recVal))) {
        isCorrupted = true;
        corruptionReason = `Numeric field '${key}' corrupted into non-numeric string "${recVal}"`;
      } else if (key.includes('date') && typeof recVal === 'string' && (recVal.includes('99') || isNaN(Date.parse(recVal)))) {
        isCorrupted = true;
        corruptionReason = `Date field '${key}' contains invalid timestamp representation "${recVal}"`;
      } else if (key === 'currency' && recVal !== 'INR') {
        isCorrupted = true;
        corruptionReason = `Currency mutation detected: expected INR, received "${recVal}"`;
      }

      if (isCorrupted) {
        issues.push(`Data Corruption: ${corruptionReason}`);
        fieldComparisons.push({
          field: key,
          originalValue: origVal,
          receivedValue: recVal,
          changeType: 'invalid',
          isAuthorized: false,
          status: 'fail',
          detail: corruptionReason,
        });
        status = 'BLOCKED';
        severity = 'high';
        requiredAction = 'Reject corrupted packet and request clean payload re-transmission.';
      } else if (isProhibited || key === 'policy_coverage_limit' || key === 'original_claim_amount' || key === 'deductible') {
        // Unauthorized alteration / manipulation!
        const issueMsg = `Data Manipulation: '${key}' was modified from ${JSON.stringify(origVal)} to ${JSON.stringify(recVal)} without authorization.`;
        issues.push(issueMsg);
        fieldComparisons.push({
          field: key,
          originalValue: origVal,
          receivedValue: recVal,
          changeType: 'modified',
          isAuthorized: false,
          status: 'fail',
          detail: `Unauthorized modification violates contract for ${sourceContract.code}`,
        });
        status = 'BLOCKED';
        severity = 'critical';
        requiredAction = `Block unauthorized mutation. Rollback '${key}' to baseline verified value.`;
      } else {
        // Authorized or tolerated modification
        fieldComparisons.push({
          field: key,
          originalValue: origVal,
          receivedValue: recVal,
          changeType: 'modified',
          isAuthorized: true,
          status: 'pass',
          detail: 'Permitted state transformation',
        });
      }
    }
  }

  // 3. Semantic Inconsistency Checks
  // E.g. Damage location changed, or policy status contradictory
  if (receivedPayload.reported_damage && sourcePayload.reported_damage) {
    const srcDmg = String(sourcePayload.reported_damage).toLowerCase();
    const recDmg = String(receivedPayload.reported_damage).toLowerCase();
    if (srcDmg.includes('front') && recDmg.includes('rear') && !srcDmg.includes('rear')) {
      issues.push(`Semantic Inconsistency: Source reported front damage ("${sourcePayload.reported_damage}"), but received payload asserts rear damage ("${receivedPayload.reported_damage}").`);
      status = 'HUMAN_REVIEW';
      severity = 'high';
      requiredAction = 'Hold claim for human adjuster review due to conflicting damage claims.';
    }
  }

  if (receivedPayload.policy_status && sourcePayload.policy_status) {
    if (sourcePayload.policy_status === 'Expired' && receivedPayload.policy_status === 'Active') {
      issues.push('Semantic Inconsistency: Policy status changed from Expired to Active across handoff.');
      status = 'BLOCKED';
      severity = 'critical';
      requiredAction = 'Block handoff. Policy expiration verified in master registry cannot be bypassed.';
    }
  }

  // 4. Independent Calculation Validation (Handoff C->D & D->E)
  let recalculation: VerificationResult['recalculation'] = undefined;
  if (handoffId === 'C_TO_D' || handoffId === 'D_TO_E') {
    const repairCost = Number(receivedPayload.estimated_repair_cost ?? receivedPayload.original_claim_amount ?? 0);
    const deductible = Number(receivedPayload.deductible ?? 0);
    const limit = Number(receivedPayload.policy_coverage_limit ?? 100000);
    const actualEligible = Number(receivedPayload.calculated_eligible_amount ?? receivedPayload.expected_eligible_amount ?? 0);

    // Baseline Simplified Formula: min(limit, max(0, repairCost - deductible))
    const expectedEligible = Math.min(limit, Math.max(0, repairCost - deductible));

    if (actualEligible !== expectedEligible && actualEligible > 0) {
      const diff = actualEligible - expectedEligible;
      recalculation = {
        expected: expectedEligible,
        actual: actualEligible,
        formula: `Min(Coverage Limit ₹${limit}, Repair Cost ₹${repairCost} - Deductible ₹${deductible})`,
        difference: diff,
      };
      issues.push(`Incorrect Calculation: Claim eligible amount calculated as ₹${actualEligible}, but independent audit expects ₹${expectedEligible} (Difference: ₹${Math.abs(diff)}).`);
      status = 'BLOCKED';
      severity = 'high';
      requiredAction = `Flag arithmetic discrepancy. Enforce verified recalculation of ₹${expectedEligible}.`;
    }
  }

  // 5. Version, Timestamp & Replay Validation
  if (destVersion < sourceVersion) {
    issues.push(`Stale / Out-of-Order: Received payload version v${destVersion} is older than source v${sourceVersion}.`);
    status = 'WARNING';
    severity = 'warning';
    requiredAction = 'Quarantine stale packet and request latest sequence state.';
  }

  if (receivedPayload.is_duplicate_replay) {
    issues.push(`Duplicate or Replay: Message ID ${messageId} was previously processed at checkpoint.`);
    status = 'WARNING';
    severity = 'warning';
    requiredAction = 'Replay handling policy: Deduplicate message and confirm idempotent state.';
  }

  // 6. Evidence Presence Check (Handoff D->E)
  if (handoffId === 'D_TO_E') {
    const riskScore = Number(receivedPayload.risk_score ?? 0);
    const evidenceList = receivedPayload.evidence_package || receivedPayload.risk_factors || [];

    if (riskScore >= 70 && (!Array.isArray(evidenceList) || evidenceList.length === 0)) {
      issues.push(`Misleading / Unsupported Output: Agent D assigned a high risk score (${riskScore}/100) with zero corroborated evidence entries.`);
      // Per system rule: Agent E must not auto-reject purely on high risk without evidence; unresolved goes to Human Review
      status = 'HUMAN_REVIEW';
      severity = 'high';
      requiredAction = 'Route to Senior Adjuster for Human Review. Automatic rejection prohibited without evidence.';
    }
  }

  // If hash differs but no prohibited issue was caught, evaluate if it's legitimate enrichment
  if (!hashMatch && issues.length === 0) {
    // Legitimate enrichments like Agent B adding policy verification, or Agent C adding repair estimate
    status = 'VERIFIED';
    severity = 'info';
    requiredAction = 'Payload verified. Authorized enrichments confirmed against contract.';
  }

  return {
    handoffId,
    sourceAgent,
    destAgent,
    claimId,
    messageId,
    sourceVersion,
    destVersion,
    timestamp: new Date().toISOString(),
    status,
    severity,
    issues,
    fieldComparisons,
    sourceHash,
    receivedHash,
    hashMatch,
    requiredAction,
    auditEventId: `EV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recalculation,
    isRecovered: isRetryAttempt,
  };
}
