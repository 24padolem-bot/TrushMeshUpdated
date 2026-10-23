import { ErrorCategory, TestCase, InsuranceClaim } from '../types/trustmesh';
import { DETERMINISTIC_TEST_CASES, bindScenarioToClaim } from './testCases';

export interface ScenarioRotationStep {
  runIndex: number;
  mode: 'ERROR' | 'CLEAN';
  testCaseId: string | null;
  label: string;
  badge: string;
  description: string;
  category: ErrorCategory;
}

export const ROTATION_SCHEDULE: ScenarioRotationStep[] = [
  // Run 1: Error (Data Manipulation)
  {
    runIndex: 1,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-003',
    label: 'Run 1: Data Manipulation Error',
    badge: '1st Run: Error (Manipulation)',
    description: 'Policy coverage limit unexpectedly inflated 10x at Checkpoint 2 (Agent B → Agent C).',
    category: 'DATA_MANIPULATION',
  },
  // Run 2: Clean Pass
  {
    runIndex: 2,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 2: Successfully Passed',
    badge: '2nd Run: Clean Passed',
    description: 'Clean compliant execution across all 5 agents. All 4 TrustMesh checkpoints verified green with matching SHA-256 hashes.',
    category: 'CLEAN_VERIFIED',
  },
  // Run 3: Error (Incorrect Calculations)
  {
    runIndex: 3,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-004',
    label: 'Run 3: Incorrect Calculation Error',
    badge: '3rd Run: Error (Calculation)',
    description: 'Agent C calculates payout with arithmetic discrepancy (Repair cost minus Deductible mismatch) at Checkpoint 3.',
    category: 'INCORRECT_CALCULATIONS',
  },
  // Run 4: Clean Pass
  {
    runIndex: 4,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 4: Successfully Passed',
    badge: '4th Run: Clean Passed',
    description: 'Clean compliant execution. All contractual requirements and damage appraisals pass verification without issues.',
    category: 'CLEAN_VERIFIED',
  },
  // Run 5: Error (Data Loss)
  {
    runIndex: 5,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-002',
    label: 'Run 5: Data Loss Error (Missing Policy)',
    badge: '5th Run: Error (Data Loss)',
    description: 'Mandatory policy_number disappears during transmission from Agent A to Agent B at Checkpoint 1.',
    category: 'DATA_LOSS',
  },
  // Run 6: Clean Pass
  {
    runIndex: 6,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 6: Successfully Passed',
    badge: '6th Run: Clean Passed',
    description: 'Clean compliant run. Successfully approved after verifying active policy status and applying deductible.',
    category: 'CLEAN_VERIFIED',
  },
  // Run 7: Error (Network Timeout with Auto-Recovery)
  {
    runIndex: 7,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-011',
    label: 'Run 7: Network Timeout & Retry Recovery',
    badge: '7th Run: Error (Timeout/Retry)',
    description: 'Agent C endpoint times out at Checkpoint 2. TrustMesh detects connection drop and initiates state snapshot retry.',
    category: 'PARTIAL_FAILED_HANDOFF',
  },
  // Run 8: Clean Pass
  {
    runIndex: 8,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 8: Successfully Passed',
    badge: '8th Run: Clean Passed',
    description: 'Clean compliant run. All hashes verified and itemized claims validated without deviation.',
    category: 'CLEAN_VERIFIED',
  },
  // Run 9: Error (Semantic Inconsistency)
  {
    runIndex: 9,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-007',
    label: 'Run 9: Semantic Inconsistency Error',
    badge: '9th Run: Error (Semantic)',
    description: 'Reported damage description contradicts across handoff (front damage transformed to rear damage). Routed to Human Review.',
    category: 'SEMANTIC_INCONSISTENCY',
  },
  // Run 10: Clean Pass
  {
    runIndex: 10,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 10: Successfully Passed',
    badge: '10th Run: Clean Passed',
    description: 'Clean compliant run. Passed all checkpoints and verified against policy terms.',
    category: 'CLEAN_VERIFIED',
  },
  // Run 11: Error (Misleading Output / Unsupported Risk)
  {
    runIndex: 11,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-012',
    label: 'Run 11: Unsupported Risk Score (Human Review)',
    badge: '11th Run: Error (No Evidence)',
    description: 'Agent D outputs an elevated risk score with zero evidence items. TrustMesh prevents auto-rejection and demands Human Review.',
    category: 'MISLEADING_OUTPUT',
  },
  // Run 12: Clean Pass
  {
    runIndex: 12,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 12: Successfully Passed',
    badge: '12th Run: Clean Passed',
    description: 'Clean compliant run. All hashes and evidence packages verified.',
    category: 'CLEAN_VERIFIED',
  },
  // Run 13: Error (Data Corruption)
  {
    runIndex: 13,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-006',
    label: 'Run 13: Data Corruption (Non-Numeric Amount)',
    badge: '13th Run: Error (Corruption)',
    description: 'Numeric claim amount corrupted into non-numeric string at Checkpoint 1 (Agent A → Agent B).',
    category: 'DATA_CORRUPTION',
  },
  // Run 14: Clean Pass
  {
    runIndex: 14,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 14: Successfully Passed',
    badge: '14th Run: Clean Passed',
    description: 'Clean compliant run. All checkpoints pass verification.',
    category: 'CLEAN_VERIFIED',
  },
  // Run 15: Error (Unauthorized Transformation)
  {
    runIndex: 15,
    mode: 'ERROR',
    testCaseId: 'TM-TEST-009',
    label: 'Run 15: Unauthorized Transformation (Name Tamper)',
    badge: '15th Run: Error (Unauthorized)',
    description: 'Agent B illegally mutates customer identity in breach of RBAC transformation contract.',
    category: 'UNAUTHORIZED_TRANSFORMATION',
  },
  // Run 16: Clean Pass
  {
    runIndex: 16,
    mode: 'CLEAN',
    testCaseId: null,
    label: 'Run 16: Successfully Passed',
    badge: '16th Run: Clean Passed',
    description: 'Clean compliant run. Full end-to-end verification verified.',
    category: 'CLEAN_VERIFIED',
  },
];

export function getRotationStep(index: number): ScenarioRotationStep {
  const normIdx = ((index - 1) % ROTATION_SCHEDULE.length + ROTATION_SCHEDULE.length) % ROTATION_SCHEDULE.length;
  const item = ROTATION_SCHEDULE[normIdx];
  return {
    ...item,
    runIndex: index,
    label: item.mode === 'ERROR' ? `Run ${index}: ${item.label.replace(/^Run \d+: /, '')}` : `Run ${index}: Successfully Passed`,
    badge: item.mode === 'ERROR' ? `Run #${index}: Error (${item.category.replace('_', ' ')})` : `Run #${index}: Clean Passed`,
  };
}

/**
 * Builds or adapts the test case for the selected claim based on rotation step.
 * Crucially, does NOT change the user's selected claim!
 */
export function getRotationTestCaseForClaim(
  step: ScenarioRotationStep,
  claim: InsuranceClaim,
  testCases: TestCase[]
): TestCase | null {
  if (step.mode === 'CLEAN' || !step.testCaseId) {
    return null;
  }
  const baseTestCase = testCases.find(tc => tc.id === step.testCaseId) || DETERMINISTIC_TEST_CASES.find(tc => tc.id === step.testCaseId);
  if (!baseTestCase) {
    return null;
  }
  return bindScenarioToClaim(baseTestCase, claim);
}
