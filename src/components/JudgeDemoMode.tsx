import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  FileText,
  UserCheck,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  InsuranceClaim,
  TestCase,
  HandoffId,
  VerificationResult,
} from '../types/trustmesh';
import { formatINR } from '../utils/crypto';
import { DETERMINISTIC_TEST_CASES } from '../data/testCases';
import { HANDOFF_DEFINITIONS } from '../engine/contracts';

interface JudgeDemoModeProps {
  isOpen: boolean;
  onClose: () => void;
  claim: InsuranceClaim;
  testCase: TestCase | null;
  onSelectTestCase: (tc: TestCase | null) => void;
  onRunCleanDemo: () => void;
  onRunErrorDemo: (tc: TestCase) => void;
  onSimulateRecovery: (handoffId: HandoffId) => void;
  handoffResults: Record<HandoffId, VerificationResult | null>;
  finalDecision: any;
  onInspectHandoff: (handoffId: HandoffId) => void;
}

export const JudgeDemoMode: React.FC<JudgeDemoModeProps> = ({
  isOpen,
  onClose,
  claim,
  testCase,
  onSelectTestCase,
  onRunCleanDemo,
  onRunErrorDemo,
  onSimulateRecovery,
  handoffResults,
  finalDecision,
  onInspectHandoff,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (!isOpen) return null;

  // Selected demo error scenario (defaults to Coverage Limit Inflation or Missing Policy)
  const defaultErrorCase = DETERMINISTIC_TEST_CASES.find(tc => tc.id === 'TM-TEST-003') || DETERMINISTIC_TEST_CASES[2];

  const steps = [
    {
      number: 1,
      title: 'Introduce the Insurance Claim & Multi-Agent Architecture',
      description: 'Establish the real-world problem: five autonomous AI agents processing an insurance claim without mutual verification.',
    },
    {
      number: 2,
      title: 'Demonstrate Normal Compliant Workflow',
      description: 'Execute a clean baseline run. Observe all 4 TrustMesh checkpoints verifying data integrity, calculations, and contract rules.',
    },
    {
      number: 3,
      title: 'Generate and Arm an Error Scenario',
      description: 'Introduce an adversarial or accidental handoff fault: unauthorized policy limit manipulation from ₹1,00,000 to ₹10,00,000.',
    },
    {
      number: 4,
      title: 'Run Multi-Agent Pipeline Under Fault Injection',
      description: 'Dispatch the claim through the agent chain and watch TrustMesh checkpoints continuously inspect payload transmissions.',
    },
    {
      number: 5,
      title: 'Reveal Inter-Agent Handoff Error at Checkpoint',
      description: 'TrustMesh halts transmission at Checkpoint 2. Inspect the exact field-level deviation between outgoing and incoming data.',
    },
    {
      number: 6,
      title: 'Demonstrate TrustMesh Active Intervention',
      description: 'Evaluate how the deterministic verification rules blocked unauthorized inflation, preventing catastrophic downstream settlement error.',
    },
    {
      number: 7,
      title: 'Inspect Cryptographic Audit Trail',
      description: 'Examine the immutable, hash-linked audit block recording the violation, timestamp, source agent, and intervention reason.',
    },
    {
      number: 8,
      title: 'Demonstrate Automated State Recovery',
      description: 'Restore the verified baseline payload snapshot from Agent B and retry the handoff without deleting the incident audit trail.',
    },
    {
      number: 9,
      title: 'Review Final Adjudication Verdict',
      description: 'Agent E makes a safe, evidence-corroborated settlement decision at the correct payout amount of ₹43,000.',
    },
    {
      number: 10,
      title: 'Business & Regulatory Impact Summary',
      description: 'Compare multi-agent system safety with versus without TrustMesh, showing loss prevention, auditability, and compliance.',
    },
  ];

  const nextStep = () => {
    if (currentStep < 10) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Judge Presentation &amp; Technical Demonstration Mode</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
                  Step {currentStep} of 10
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                A 10-step guided live presentation walk-through for evaluators
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Dots Bar */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto">
          {steps.map(s => (
            <button
              key={s.number}
              onClick={() => setCurrentStep(s.number)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                currentStep === s.number
                  ? 'bg-blue-600 text-white font-bold'
                  : currentStep > s.number
                  ? 'text-emerald-400 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{s.number}.</span>
              <span className="hidden sm:inline truncate max-w-[70px]">
                {s.title.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Step Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-300">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span className="text-blue-400 font-mono">0{currentStep}.</span>
              {steps[currentStep - 1].title}
            </h3>
            <p className="text-slate-400 text-xs">
              {steps[currentStep - 1].description}
            </p>
          </div>

          {/* STEP 1: Introduce Claim */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Demonstration Case: {claim.claim_id} ({claim.customer_name})
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Policy Number</span>
                    <span className="text-white font-bold">{claim.policy_number}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Claim Amount</span>
                    <span className="text-white font-bold">{formatINR(claim.original_claim_amount)}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Coverage Limit</span>
                    <span className="text-white font-bold">{formatINR(claim.policy_coverage_limit)}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Deductible</span>
                    <span className="text-white font-bold">{formatINR(claim.deductible)}</span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs pt-1">
                  Damage Reported: <strong>{claim.reported_damage}</strong> in {claim.location}. Expected eligible payout before adjustments: <strong>{formatINR(claim.expected_eligible_amount)}</strong>.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white">The Five Monitored AI Agents:</div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-blue-400 block">Agent A</strong>
                    <span>Claim Intake</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-blue-400 block">Agent B</strong>
                    <span>Policy Verify</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-blue-400 block">Agent C</strong>
                    <span>Damage Assess</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-blue-400 block">Agent D</strong>
                    <span>Fraud &amp; Risk</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-blue-400 block">Agent E</strong>
                    <span>Final Decision</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Show Normal Workflow */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-300 mb-3">
                  In a clean run, all inter-agent handoffs satisfy schema definitions, authorized transformations, and arithmetic contracts.
                </p>
                <button
                  onClick={onRunCleanDemo}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Clean Baseline Simulation</span>
                </button>
              </div>

              {/* Status matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['A_TO_B', 'B_TO_C', 'C_TO_D', 'D_TO_E'] as HandoffId[]).map((hId, i) => {
                  const res = handoffResults[hId];
                  return (
                    <div key={hId} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-mono">CP {i + 1}: {hId}</div>
                      <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{res?.status || 'VERIFIED'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Generate New Error Scenario */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Armed Test Scenario: {defaultErrorCase.name}
                </div>
                <p className="text-xs text-slate-300">
                  {defaultErrorCase.errorDescription}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Target Checkpoint</span>
                    <span className="text-white font-bold">{defaultErrorCase.affectedHandoff}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Original Limit</span>
                    <span className="text-emerald-400 font-bold">{formatINR(defaultErrorCase.originalValue)}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Injected Malicious Limit</span>
                    <span className="text-rose-400 font-bold">{formatINR(defaultErrorCase.injectedValue)}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectTestCase(defaultErrorCase)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Arm This Scenario for Live Testing</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Run Simulation */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300">
                  Now click "Trigger Fault Run" to start the simulation under the injected fault condition.
                </p>
                <button
                  onClick={() => onRunErrorDemo(defaultErrorCase)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Trigger Fault Run in Pipeline</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Reveal the Error */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="bg-rose-950/40 p-4 rounded-xl border border-rose-500 text-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-rose-300">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  Checkpoint 2 Halted: Unauthorized Mutation Detected
                </div>
                <p className="text-xs">
                  Agent B transferred the claim with an unexpected coverage limit change:
                  original value was <strong>₹1,00,000</strong>, but incoming payload asserted <strong>₹10,00,000</strong>.
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => {
                      onInspectHandoff('B_TO_C');
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 cursor-pointer"
                  >
                    <span>Open Side-by-Side Handoff Inspector</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Show TrustMesh Intervention */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Deterministic Contract Defense
                </div>
                <p className="text-slate-300 leading-relaxed">
                  TrustMesh applied the role-based contract for Agent B:
                  <code>policy_coverage_limit</code> is marked as a <strong>prohibited modification</strong>.
                  The transmission was immediately <strong>BLOCKED</strong> before reaching Agent C, preventing the damage assessor from using an inflated ceiling.
                </p>
              </div>
            </div>
          )}

          {/* STEP 7: Inspect Audit Trail */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-slate-400 text-[10px] uppercase">Immutable Cryptographic Event Block</div>
                <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-1">
                  <div><span className="text-slate-500">Event Type:</span> <strong className="text-rose-400">DATA_INTEGRITY_VIOLATION</strong></div>
                  <div><span className="text-slate-500">Target Field:</span> <code>policy_coverage_limit</code></div>
                  <div><span className="text-slate-500">Original Baseline:</span> ₹1,00,000</div>
                  <div><span className="text-slate-500">Received Value:</span> ₹10,00,000</div>
                  <div><span className="text-slate-500">Action:</span> Block unauthorized mutation. Preserve original verified limit.</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Demonstrate Recovery */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Automated Snapshot Recovery
                </div>
                <p className="text-xs text-slate-300">
                  TrustMesh can restore the baseline verified state snapshot from Agent B and resume processing without destroying the historical failure record in the audit trail.
                </p>
                <button
                  onClick={() => onSimulateRecovery('B_TO_C')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Execute State Recovery &amp; Complete Run</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 9: Final Outcome */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500 text-emerald-100 space-y-2">
                <div className="text-sm font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  Safe Adjudication Achieved
                </div>
                <p className="text-xs leading-relaxed">
                  Following TrustMesh recovery, Agent E correctly approved the claim for <strong>₹43,000</strong> (Repair cost ₹48,000 - ₹5,000 deductible), respecting the genuine ₹1,00,000 coverage limit.
                </p>
              </div>
            </div>
          )}

          {/* STEP 10: System Impact & Value */}
          {currentStep === 10 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-800/80 space-y-2">
                  <div className="text-rose-300 font-bold flex items-center gap-1.5 text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    Without TrustMesh
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    <li>Silent data manipulation goes undetected between agents.</li>
                    <li>Agent C accepts false ₹10,00,000 coverage ceiling.</li>
                    <li>Potential fraudulent payout or audit failure.</li>
                    <li>Zero cryptographic accountability across agent handoffs.</li>
                  </ul>
                </div>

                <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/80 space-y-2">
                  <div className="text-emerald-300 font-bold flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    With TrustMesh
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    <li>Immediate deterministic detection at Checkpoint 2.</li>
                    <li>Unauthorized modification halted and quarantined.</li>
                    <li>Loss prevention: ₹9,00,000 exposure averted.</li>
                    <li>Cryptographically chained, tamper-evident audit trail.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Step</span>
          </button>

          <div className="text-xs text-slate-500 font-mono">
            Step {currentStep} of 10
          </div>

          {currentStep < 10 ? (
            <button
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <span>Finish Demo Walkthrough</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
