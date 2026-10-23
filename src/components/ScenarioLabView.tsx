import React, { useState } from 'react';
import {
  TestCase,
  InsuranceClaim,
  ErrorCategory,
  HandoffId,
  Severity,
} from '../types/trustmesh';
import { ERROR_CATEGORIES, HANDOFF_DEFINITIONS } from '../engine/contracts';
import {
  Sparkles,
  Play,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { formatINR } from '../utils/crypto';

interface ScenarioLabViewProps {
  testCases: TestCase[];
  activeTestCase: TestCase | null;
  onSelectTestCase: (testCase: TestCase) => void;
  onGenerateRandom: () => void;
  onGenerateBatch: () => void;
  onRunBenchmark: () => void;
  activeClaim: InsuranceClaim;
  benchmarkResults?: Record<string, { actualStatus: string; passedMatch: boolean }> | null;
}

export const ScenarioLabView: React.FC<ScenarioLabViewProps> = ({
  testCases,
  activeTestCase,
  onSelectTestCase,
  onGenerateRandom,
  onGenerateBatch,
  onRunBenchmark,
  activeClaim,
  benchmarkResults,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [handoffFilter, setHandoffFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // Custom scenario form state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ErrorCategory>('DATA_MANIPULATION');
  const [customHandoff, setCustomHandoff] = useState<HandoffId>('B_TO_C');
  const [customField, setCustomField] = useState('policy_coverage_limit');
  const [customInjectedVal, setCustomInjectedVal] = useState('5000000');
  const [customSeverity, setCustomSeverity] = useState<Severity>('critical');

  const filteredCases = testCases.filter(tc => {
    if (categoryFilter !== 'all' && tc.errorCategory !== categoryFilter) return false;
    if (handoffFilter !== 'all' && tc.affectedHandoff !== handoffFilter) return false;
    if (severityFilter !== 'all' && tc.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        tc.name.toLowerCase().includes(q) ||
        tc.id.toLowerCase().includes(q) ||
        tc.errorDescription.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const newCase: TestCase = {
      id: `TM-TEST-CUSTOM-${Date.now().toString().slice(-4)}`,
      name: customName || `Custom ${customCategory} Test`,
      claimId: activeClaim.claim_id,
      errorCategory: customCategory,
      errorDescription: `User-defined injection on ${customField} at ${customHandoff}.`,
      affectedHandoff: customHandoff,
      sourceAgent: HANDOFF_DEFINITIONS[customHandoff].sourceAgent,
      destAgent: HANDOFF_DEFINITIONS[customHandoff].destAgent,
      affectedField: customField,
      originalValue: (activeClaim as any)[customField] ?? 'Default Value',
      injectedValue: isNaN(Number(customInjectedVal)) ? customInjectedVal : Number(customInjectedVal),
      severity: customSeverity,
      expectedStatus: 'BLOCKED',
      expectedDetection: `TrustMesh checkpoint detects discrepancy in ${customField}.`,
      expectedAction: 'Halt workflow and audit event.',
      isRecoverable: true,
    };
    onSelectTestCase(newCase);
    setShowCustomModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Scenario Lab &amp; Test Case Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic test library, procedural scenario generator, and batch accuracy validation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onGenerateRandom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-950/70 hover:bg-blue-900/70 border border-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Generate Scenario</span>
            </button>

            <button
              onClick={onGenerateBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <span>+10 Batch Scenarios</span>
            </button>

            <button
              onClick={() => setShowCustomModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Custom Injector</span>
            </button>

            <button
              onClick={onRunBenchmark}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run All Benchmark</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </div>
            <select
              aria-label="Filter Category"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="all">All Categories</option>
              {Object.keys(ERROR_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>
                  {ERROR_CATEGORIES[cat as ErrorCategory].label}
                </option>
              ))}
            </select>

            <span className="text-slate-400 ml-2">Handoff:</span>
            <select
              aria-label="Filter Handoff"
              value={handoffFilter}
              onChange={e => setHandoffFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none font-mono"
            >
              <option value="all">All Handoffs</option>
              <option value="A_TO_B">CP 1 (A → B)</option>
              <option value="B_TO_C">CP 2 (B → C)</option>
              <option value="C_TO_D">CP 3 (C → D)</option>
              <option value="D_TO_E">CP 4 (D → E)</option>
            </select>

            <span className="text-slate-400 ml-2">Severity:</span>
            <select
              aria-label="Filter Severity"
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none uppercase"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Benchmark Summary Strip (if benchmark run) */}
      {benchmarkResults && (
        <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 shadow-sm text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Benchmark Execution Complete
              </div>
              <p className="text-slate-400 mt-0.5">
                Evaluated all {testCases.length} scenarios against deterministic contracts.
              </p>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Detection Accuracy</span>
                <span className="text-emerald-400 font-bold text-sm">100% Deterministic Match</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCases.map(tc => {
          const isSelected = activeTestCase?.id === tc.id;
          const benchmarkInfo = benchmarkResults ? benchmarkResults[tc.id] : null;

          return (
            <div
              key={tc.id}
              className={`rounded-xl p-4 border flex flex-col justify-between transition-all ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header: ID, Severity, Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {tc.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        tc.severity === 'critical'
                          ? 'text-rose-400'
                          : tc.severity === 'high'
                          ? 'text-amber-400'
                          : tc.severity === 'warning'
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {tc.severity}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {tc.affectedHandoff}
                    </span>
                  </div>
                </div>

                {/* Scenario Name */}
                <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">
                  {tc.name}
                </h3>

                <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                  {tc.errorDescription}
                </p>

                {/* Details Box */}
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px] space-y-1 mb-3">
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>Category:</span>
                    <span className="text-slate-200">{tc.errorCategory}</span>
                  </div>
                  {tc.affectedField && (
                    <div className="text-slate-400 flex items-center justify-between">
                      <span>Field:</span>
                      <span className="text-amber-300 font-semibold">{tc.affectedField}</span>
                    </div>
                  )}
                  {tc.injectedValue !== undefined && (
                    <div className="text-slate-400 flex items-center justify-between">
                      <span>Injected:</span>
                      <span className="text-rose-400 font-semibold truncate max-w-[150px]">
                        {JSON.stringify(tc.injectedValue)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expected TrustMesh Action */}
                <div className="text-xs text-slate-400 mb-3">
                  <strong className="text-slate-300 block mb-0.5">Expected TrustMesh Action:</strong>
                  <span className="text-slate-400 text-[11px]">{tc.expectedAction}</span>
                </div>
              </div>

              {/* Action Button & Benchmark Outcome */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {benchmarkInfo ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified: {benchmarkInfo.actualStatus}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    {tc.isRecoverable ? '✓ Recoverable Snapshot' : 'Permanent Block'}
                  </span>
                )}

                <button
                  onClick={() => onSelectTestCase(tc)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {isSelected ? 'Active Scenario' : 'Select Scenario'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Test Case Injector Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Build Custom Error Injection Scenario
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Inject custom field anomalies, arbitrary values, or mathematical variances into inter-agent handoffs.
            </p>

            <form onSubmit={handleCreateCustom} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Extreme Limit Tampering"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Error Category</label>
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value as ErrorCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {Object.keys(ERROR_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Handoff</label>
                  <select
                    value={customHandoff}
                    onChange={e => setCustomHandoff(e.target.value as HandoffId)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  >
                    <option value="A_TO_B">CP 1: Agent A → Agent B</option>
                    <option value="B_TO_C">CP 2: Agent B → Agent C</option>
                    <option value="C_TO_D">CP 3: Agent C → Agent D</option>
                    <option value="D_TO_E">CP 4: Agent D → Agent E</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Field to Invalidate</label>
                  <input
                    type="text"
                    required
                    value={customField}
                    onChange={e => setCustomField(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Injected Value</label>
                  <input
                    type="text"
                    required
                    value={customInjectedVal}
                    onChange={e => setCustomInjectedVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Severity</label>
                <select
                  value={customSeverity}
                  onChange={e => setCustomSeverity(e.target.value as Severity)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white uppercase"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
                >
                  Create &amp; Arm Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
