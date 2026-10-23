import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Clock,
  Layers,
  FileCheck,
  AlertCircle,
  HelpCircle,
  UserCheck,
  FileText,
  Wrench,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  InsuranceClaim,
  TestCase,
  HandoffId,
  VerificationResult,
  AgentId,
} from '../types/trustmesh';
import { AGENT_CONTRACTS, HANDOFF_DEFINITIONS } from '../engine/contracts';
import { formatINR } from '../utils/crypto';

interface AgentPipelineViewProps {
  claim: InsuranceClaim;
  testCase: TestCase | null;
  onSelectClaim: (claim: InsuranceClaim) => void;
  onSelectTestCase: (testCase: TestCase | null) => void;
  allClaims: InsuranceClaim[];
  allTestCases: TestCase[];
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  activeHandoffIndex: number;
  handoffResults: Record<HandoffId, VerificationResult | null>;
  outgoingPayloads: Record<HandoffId, Record<string, any> | null>;
  incomingPayloads: Record<HandoffId, Record<string, any> | null>;
  finalDecision: {
    status: 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW' | 'BLOCKED';
    summary: string;
    evidence: string[];
    riskScore: number;
    recommendedPayout: number;
  } | null;
  onRunSimulation: () => void;
  onPauseSimulation: () => void;
  onResumeSimulation: () => void;
  onStepForward: () => void;
  onResetSimulation: () => void;
  onGenerateRandomScenario: () => void;
  onInspectHandoff: (handoffId: HandoffId) => void;
  onSimulateRecovery: (handoffId: HandoffId) => void;
  autoCycleScenarios?: boolean;
  onToggleAutoCycle?: (val: boolean) => void;
  onAdvanceScenario?: () => void;
  rotationLabel?: string;
  nextRotationLabel?: string;
  rotationNumber?: number;
  onNavigateTab?: (tab: any) => void;
}

export const AgentPipelineView: React.FC<AgentPipelineViewProps> = ({
  claim,
  testCase,
  onSelectClaim,
  onSelectTestCase,
  allClaims,
  allTestCases,
  isRunning,
  isPaused,
  isCompleted,
  activeHandoffIndex,
  handoffResults,
  outgoingPayloads,
  incomingPayloads,
  finalDecision,
  onRunSimulation,
  onPauseSimulation,
  onResumeSimulation,
  onStepForward,
  onResetSimulation,
  onGenerateRandomScenario,
  onInspectHandoff,
  onSimulateRecovery,
  autoCycleScenarios = true,
  onToggleAutoCycle,
  onAdvanceScenario,
  rotationLabel,
  nextRotationLabel,
  rotationNumber = 1,
  onNavigateTab,
}) => {
  const handoffs: HandoffId[] = ['A_TO_B', 'B_TO_C', 'C_TO_D', 'D_TO_E'];

  const agents: Array<{ id: AgentId; icon: any }> = [
    { id: 'agent_a', icon: FileText },
    { id: 'agent_b', icon: UserCheck },
    { id: 'agent_c', icon: Wrench },
    { id: 'agent_d', icon: AlertTriangle },
    { id: 'agent_e', icon: Award },
  ];

  // Derive agent status based on simulation progress
  const getAgentStatus = (agentIndex: number) => {
    if (activeHandoffIndex === -1 && !isCompleted) return 'idle';
    if (isRunning && activeHandoffIndex === agentIndex) return 'processing';
    
    // If a handoff before this agent failed and blocked, downstream agents are idle/halted
    for (let i = 0; i < agentIndex; i++) {
      const hId = handoffs[i];
      const res = handoffResults[hId];
      if (res?.status === 'BLOCKED') return 'idle';
    }

    if (agentIndex <= activeHandoffIndex || isCompleted) {
      // Check if this agent had issues associated
      const outgoingHandoff = handoffs[agentIndex];
      const incomingHandoff = agentIndex > 0 ? handoffs[agentIndex - 1] : null;

      const hasBlock =
        (incomingHandoff && handoffResults[incomingHandoff]?.status === 'BLOCKED') ||
        (outgoingHandoff && handoffResults[outgoingHandoff]?.status === 'BLOCKED');
      if (hasBlock) return 'blocked';

      const hasWarning =
        (incomingHandoff && handoffResults[incomingHandoff]?.status === 'WARNING') ||
        (outgoingHandoff && handoffResults[outgoingHandoff]?.status === 'WARNING');
      if (hasWarning) return 'warning';

      return 'verified';
    }

    return 'idle';
  };

  const getCheckpointStatus = (hId: HandoffId, index: number) => {
    const res = handoffResults[hId];
    if (!res) {
      if (isRunning && activeHandoffIndex === index) return 'processing';
      return 'not_run';
    }
    return res.status;
  };

  return (
    <div className="space-y-6">
      {/* Simulation Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Claim & Scenario Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Claim:</span>
              <select
                aria-label="Select Claim"
                value={claim.claim_id}
                onChange={e => {
                  const c = allClaims.find(item => item.claim_id === e.target.value);
                  if (c) onSelectClaim(c);
                }}
                disabled={isRunning}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              >
                {allClaims.map(c => (
                  <option key={c.claim_id} value={c.claim_id}>
                    {c.claim_id} · {c.customer_name} ({formatINR(c.original_claim_amount)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Scenario:</span>
              <select
                aria-label="Select Scenario"
                value={testCase?.id || ''}
                onChange={e => {
                  const tc = allTestCases.find(item => item.id === e.target.value) || null;
                  onSelectTestCase(tc);
                }}
                disabled={isRunning}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[280px] truncate"
              >
                <option value="">Clean Compliant Run (No Errors)</option>
                {allTestCases.map(tc => (
                  <option key={tc.id} value={tc.id}>
                    {tc.name} [{tc.errorCategory}]
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onGenerateRandomScenario}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Random Scenario</span>
            </button>
          </div>

          {/* Interactive Controls */}
          <div className="flex items-center gap-2">
            {!isRunning || isPaused ? (
              <button
                onClick={isPaused ? onResumeSimulation : onRunSimulation}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isPaused ? 'Resume' : 'Run Simulation'}</span>
              </button>
            ) : (
              <button
                onClick={onPauseSimulation}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/70 hover:bg-amber-900/70 border border-amber-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={onStepForward}
              disabled={isRunning && !isPaused}
              title="Execute next single handoff step"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step Forward</span>
            </button>

            <button
              onClick={onResetSimulation}
              title="Reset simulation to initial idle state"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Active Scenario Banner */}
        {testCase && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Injected Test Case:
              </span>
              <span className="text-slate-200 font-medium">{testCase.name}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">{testCase.errorDescription}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-slate-400">
                Target: <strong className="text-slate-300">{testCase.affectedHandoff}</strong>
              </span>
              <span className="text-slate-400">
                Severity: <strong className="text-amber-300 uppercase">{testCase.severity}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Five-Agent Pipeline with Interspersed TrustMesh Checkpoints */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[1100px] flex items-stretch gap-3">
          {agents.map((agentItem, idx) => {
            const agentDef = AGENT_CONTRACTS[agentItem.id];
            const AgentIcon = agentItem.icon;
            const status = getAgentStatus(idx);
            const handoffBefore = idx > 0 ? handoffs[idx - 1] : null;
            const resBefore = handoffBefore ? handoffResults[handoffBefore] : null;
            const cpStatus = handoffBefore ? getCheckpointStatus(handoffBefore, idx - 1) : null;

            return (
              <React.Fragment key={agentItem.id}>
                {/* TrustMesh Checkpoint (between agents) */}
                {idx > 0 && handoffBefore && (
                  <div className="flex flex-col items-center justify-center shrink-0 w-36 px-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                      Checkpoint {idx}
                    </div>

                    <div
                      className={`w-full p-2.5 rounded-lg border text-center transition-all ${
                        cpStatus === 'VERIFIED'
                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                          : cpStatus === 'BLOCKED'
                          ? 'bg-rose-950/50 border-rose-500 shadow-sm shadow-rose-500/20 animate-pulse'
                          : cpStatus === 'WARNING'
                          ? 'bg-amber-950/40 border-amber-500/60'
                          : cpStatus === 'HUMAN_REVIEW'
                          ? 'bg-purple-950/40 border-purple-500/60'
                          : cpStatus === 'RECOVERY'
                          ? 'bg-blue-950/40 border-blue-500/60'
                          : cpStatus === 'processing'
                          ? 'bg-blue-950/40 border-blue-500 animate-pulse'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1.5">
                        {cpStatus === 'VERIFIED' && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                        {cpStatus === 'BLOCKED' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                        {cpStatus === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {cpStatus === 'HUMAN_REVIEW' && <UserCheck className="w-4 h-4 text-purple-400" />}
                        {cpStatus === 'RECOVERY' && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
                        {cpStatus === 'processing' && <Clock className="w-4 h-4 text-blue-400 animate-spin" />}
                        {cpStatus === 'not_run' && <HelpCircle className="w-4 h-4 text-slate-600" />}

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            cpStatus === 'VERIFIED'
                              ? 'text-emerald-300'
                              : cpStatus === 'BLOCKED'
                              ? 'text-rose-300'
                              : cpStatus === 'WARNING'
                              ? 'text-amber-300'
                              : cpStatus === 'HUMAN_REVIEW'
                              ? 'text-purple-300'
                              : cpStatus === 'RECOVERY'
                              ? 'text-blue-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {cpStatus ? cpStatus.replace('_', ' ') : 'NOT RUN'}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 truncate mb-2">
                        {resBefore ? (
                          resBefore.hashMatch ? (
                            <span className="text-emerald-400">SHA-256 Match</span>
                          ) : (
                            <span className="text-amber-400">Diff Detected</span>
                          )
                        ) : (
                          'Awaiting Data'
                        )}
                      </div>

                      <button
                        onClick={() => onInspectHandoff(handoffBefore)}
                        className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>

                      {/* If Blocked or Recovery, show Retry/Recover button */}
                      {(resBefore?.status === 'BLOCKED' || resBefore?.status === 'RECOVERY') && testCase?.isRecoverable && (
                        <button
                          onClick={() => onSimulateRecovery(handoffBefore)}
                          className="mt-1.5 w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950 hover:bg-emerald-900 rounded border border-emerald-700 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Recover</span>
                        </button>
                      )}
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 mt-2" />
                  </div>
                )}

                {/* Agent Card */}
                <div
                  className={`flex-1 rounded-xl p-4 border flex flex-col justify-between transition-all ${
                    status === 'processing'
                      ? 'bg-slate-900 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                      : status === 'blocked'
                      ? 'bg-slate-900 border-rose-800/80 shadow-md shadow-rose-950'
                      : status === 'warning'
                      ? 'bg-slate-900 border-amber-700/70'
                      : status === 'verified'
                      ? 'bg-slate-900 border-emerald-900/60'
                      : 'bg-slate-900/70 border-slate-800 opacity-80'
                  }`}
                >
                  <div>
                    {/* Header: Agent Code & Status Indicator */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {agentDef.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            status === 'processing'
                              ? 'bg-blue-400 animate-pulse'
                              : status === 'blocked'
                              ? 'bg-rose-500'
                              : status === 'warning'
                              ? 'bg-amber-400'
                              : status === 'verified'
                              ? 'bg-emerald-400'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span className="text-[10px] font-semibold capitalize text-slate-400">
                          {status}
                        </span>
                      </div>
                    </div>

                    {/* Agent Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
                        <AgentIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {agentDef.name}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-3 mb-3">
                      {agentDef.responsibility}
                    </p>
                  </div>

                  {/* Summary Footer */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="bg-slate-950/70 p-2 rounded border border-slate-800/60 font-mono text-[11px] text-slate-300">
                      {idx === 0 && (
                        <div>
                          <div>Claim: {claim.claim_id}</div>
                          <div>Amount: {formatINR(claim.original_claim_amount)}</div>
                        </div>
                      )}
                      {idx === 1 && (
                        <div>
                          <div>Policy: {claim.policy_number}</div>
                          <div>Limit: {formatINR(claim.policy_coverage_limit)}</div>
                        </div>
                      )}
                      {idx === 2 && (
                        <div>
                          <div>Repair: {formatINR(claim.estimated_repair_cost || claim.original_claim_amount)}</div>
                          <div>Eligible: {formatINR(claim.expected_eligible_amount)}</div>
                        </div>
                      )}
                      {idx === 3 && (
                        <div>
                          <div>Risk: Low (18/100)</div>
                          <div>Duplicates: None</div>
                        </div>
                      )}
                      {idx === 4 && (
                        <div>
                          <div>Status: {finalDecision?.status || 'Pending'}</div>
                          <div>Decision: {finalDecision ? formatINR(finalDecision.recommendedPayout) : '—'}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Permitted Writes: {agentDef.permittedAdditions.length}</span>
                      <span>Contract: Locked</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Completion Banner / Adjudication Result */}
      {finalDecision && (
        <div
          className={`rounded-xl p-5 border shadow-md transition-all ${
            finalDecision.status === 'APPROVED'
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100'
              : finalDecision.status === 'BLOCKED'
              ? 'bg-rose-950/40 border-rose-500 text-rose-100'
              : 'bg-purple-950/40 border-purple-500 text-purple-100'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {finalDecision.status === 'APPROVED' && (
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                )}
                {finalDecision.status === 'BLOCKED' && (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                )}
                {finalDecision.status === 'HUMAN_REVIEW' && (
                  <UserCheck className="w-5 h-5 text-purple-400" />
                )}
                <h3 className="text-base font-bold tracking-tight">
                  Adjudication Verdict: {finalDecision.status.replace('_', ' ')}
                </h3>
              </div>
              <p className="text-sm opacity-90">{finalDecision.summary}</p>
            </div>

            <div className="flex items-center gap-6 shrink-0 bg-slate-900/60 p-3 rounded-lg border border-white/10">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Approved Payout</div>
                <div className="text-lg font-bold text-white font-mono tabular-nums">
                  {formatINR(finalDecision.recommendedPayout)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Risk Score</div>
                <div className="text-lg font-bold text-white font-mono tabular-nums">
                  {finalDecision.riskScore}/100
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Package */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
              Verified Evidence Package:
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {finalDecision.evidence.map((ev, i) => (
                <li key={i} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-white/5">
                  <span className="text-blue-400">✓</span>
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Claim Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Active Demonstration Insurance Record
          </div>
          <div className="text-slate-400 font-mono">
            {claim.claim_id} · {claim.insurance_type}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Customer Name</div>
            <div className="font-medium text-white truncate">{claim.customer_name}</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Policy Number</div>
            <div className="font-medium text-white font-mono">{claim.policy_number}</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Claim Amount</div>
            <div className="font-medium text-white font-mono tabular-nums">
              {formatINR(claim.original_claim_amount)}
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Coverage Limit</div>
            <div className="font-medium text-white font-mono tabular-nums">
              {formatINR(claim.policy_coverage_limit)}
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Deductible</div>
            <div className="font-medium text-white font-mono tabular-nums">
              {formatINR(claim.deductible)}
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Expected Eligible</div>
            <div className="font-medium text-emerald-400 font-mono tabular-nums">
              {formatINR(claim.expected_eligible_amount)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
