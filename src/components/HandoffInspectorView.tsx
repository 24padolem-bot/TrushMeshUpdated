import React, { useState } from 'react';
import {
  HandoffId,
  VerificationResult,
  FieldComparison,
} from '../types/trustmesh';
import { HANDOFF_DEFINITIONS, AGENT_CONTRACTS } from '../engine/contracts';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Hash,
  Eye,
  Info,
} from 'lucide-react';
import { formatINR } from '../utils/crypto';

interface HandoffInspectorViewProps {
  activeHandoff: HandoffId;
  onSelectHandoff: (handoffId: HandoffId) => void;
  handoffResults: Record<HandoffId, VerificationResult | null>;
  outgoingPayloads: Record<HandoffId, Record<string, any> | null>;
  incomingPayloads: Record<HandoffId, Record<string, any> | null>;
}

export const HandoffInspectorView: React.FC<HandoffInspectorViewProps> = ({
  activeHandoff,
  onSelectHandoff,
  handoffResults,
  outgoingPayloads,
  incomingPayloads,
}) => {
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const handoffDef = HANDOFF_DEFINITIONS[activeHandoff];
  const sourceAgentDef = AGENT_CONTRACTS[handoffDef.sourceAgent];
  const destAgentDef = AGENT_CONTRACTS[handoffDef.destAgent];

  const result = handoffResults[activeHandoff];
  const outgoing = outgoingPayloads[activeHandoff] || {};
  const incoming = incomingPayloads[activeHandoff] || {};

  const handleCopy = (text: string, isLeft: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLeft) {
      setCopiedLeft(true);
      setTimeout(() => setCopiedLeft(false), 2000);
    } else {
      setCopiedRight(true);
      setTimeout(() => setCopiedRight(false), 2000);
    }
  };

  const handoffs: HandoffId[] = ['A_TO_B', 'B_TO_C', 'C_TO_D', 'D_TO_E'];

  return (
    <div className="space-y-6">
      {/* Top Handoff Selector Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              Before-and-After Handoff Inspector
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side payload comparison, canonical SHA-256 integrity hashes, and field-level contract audit
            </p>
          </div>

          {/* Segmented Handoff Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
            {handoffs.map((hId, index) => {
              const def = HANDOFF_DEFINITIONS[hId];
              const res = handoffResults[hId];
              const isSelected = activeHandoff === hId;

              return (
                <button
                  key={hId}
                  onClick={() => onSelectHandoff(hId)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>
                    CP {index + 1}: {def.name}
                  </span>
                  {res && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        res.status === 'VERIFIED'
                          ? 'bg-emerald-400'
                          : res.status === 'BLOCKED'
                          ? 'bg-rose-400'
                          : 'bg-amber-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checkpoint Status Banner */}
      {result ? (
        <div
          className={`rounded-xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            result.status === 'VERIFIED'
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
              : result.status === 'BLOCKED'
              ? 'bg-rose-950/40 border-rose-500 text-rose-200'
              : 'bg-amber-950/30 border-amber-500/50 text-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {result.status === 'VERIFIED' ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider">
                  Checkpoint {handoffDef.checkpointNumber}: {result.status.replace('_', ' ')}
                </span>
                <span className="text-xs opacity-75 font-mono">[{handoffDef.name}]</span>
              </div>
              <p className="text-xs mt-1 opacity-90">
                {result.issues.length > 0
                  ? result.issues.join(' · ')
                  : 'All contractual fields, types, and mathematical invariants verified without deviation.'}
              </p>
              <div className="mt-2 text-xs font-semibold">
                Action Taken: <span className="opacity-95">{result.requiredAction}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono bg-slate-900/60 p-2.5 rounded-lg border border-white/10 shrink-0">
            <div>
              <div className="text-[10px] text-slate-400">Canonical Integrity</div>
              <div className="font-semibold text-white">
                {result.hashMatch ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SHA-256 Match
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Hash Deviation
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          <span>
            This checkpoint has not executed in the current session. Run the simulation to capture live payload handoffs.
          </span>
        </div>
      )}

      {/* Side-by-Side Payload Diffs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel: Outgoing Payload (Source) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                OUTGOING DATA — {sourceAgentDef.code} ({sourceAgentDef.name})
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-sm">
                Payload Snapshot SHA-256: {result?.sourceHash || '—'}
              </div>
            </div>
            <button
              onClick={() => handleCopy(JSON.stringify(outgoing, null, 2), true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Copy JSON"
            >
              {copiedLeft ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-4 flex-1">
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-xs overflow-x-auto max-h-[380px]">
              <pre className="text-slate-300">
                {Object.keys(outgoing).length > 0
                  ? JSON.stringify(outgoing, null, 2)
                  : '// No outgoing payload recorded yet. Click "Run Simulation".'}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Panel: Incoming Payload (Destination) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                INCOMING DATA — {destAgentDef.code} ({destAgentDef.name})
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-sm">
                Received Payload SHA-256: {result?.receivedHash || '—'}
              </div>
            </div>
            <button
              onClick={() => handleCopy(JSON.stringify(incoming, null, 2), false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Copy JSON"
            >
              {copiedRight ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-4 flex-1">
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-xs overflow-x-auto max-h-[380px]">
              <pre className="text-slate-300">
                {Object.keys(incoming).length > 0
                  ? JSON.stringify(incoming, null, 2)
                  : '// No incoming payload recorded yet.'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Field-Level Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Field-Level Contract & Transformation Comparison Table
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditing changes against contractual permission policies and mathematical invariants
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {result?.fieldComparisons.length || 0} fields evaluated
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Field Name</th>
                <th className="py-2.5 px-4">Original Value</th>
                <th className="py-2.5 px-4">Received Value</th>
                <th className="py-2.5 px-4">Change Type</th>
                <th className="py-2.5 px-4">Authorized?</th>
                <th className="py-2.5 px-4">Verification Result</th>
                <th className="py-2.5 px-4">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {result?.fieldComparisons && result.fieldComparisons.length > 0 ? (
                result.fieldComparisons.map((fc, i) => {
                  const isFail = fc.status === 'fail';
                  const isWarning = fc.status === 'warning';
                  const isUnchanged = fc.changeType === 'unchanged';

                  return (
                    <tr
                      key={i}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isFail
                          ? 'bg-rose-950/20'
                          : isWarning
                          ? 'bg-amber-950/10'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-200">
                        {fc.field}
                      </td>

                      <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">
                        {fc.originalValue !== null && fc.originalValue !== undefined
                          ? typeof fc.originalValue === 'number' && fc.field.includes('amount') || fc.field.includes('cost') || fc.field.includes('limit') || fc.field.includes('deductible')
                            ? formatINR(fc.originalValue)
                            : JSON.stringify(fc.originalValue)
                          : <span className="text-slate-600 italic">None</span>}
                      </td>

                      <td className="py-2.5 px-4 max-w-xs truncate">
                        {fc.receivedValue !== null && fc.receivedValue !== undefined ? (
                          <span
                            className={
                              isFail
                                ? 'text-rose-400 font-bold'
                                : isWarning
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }
                          >
                            {typeof fc.receivedValue === 'number' && fc.field.includes('amount') || fc.field.includes('cost') || fc.field.includes('limit') || fc.field.includes('deductible')
                              ? formatINR(fc.receivedValue)
                              : JSON.stringify(fc.receivedValue)}
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold italic">Missing / Dropped</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4">
                        <span
                          className={`capitalize ${
                            fc.changeType === 'unchanged'
                              ? 'text-slate-400'
                              : fc.changeType === 'modified'
                              ? 'text-amber-300 font-semibold'
                              : fc.changeType === 'missing'
                              ? 'text-rose-400 font-bold'
                              : fc.changeType === 'invalid'
                              ? 'text-rose-400 font-bold'
                              : 'text-blue-300'
                          }`}
                        >
                          {fc.changeType}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        {fc.isAuthorized ? (
                          <span className="text-emerald-400 font-semibold">Yes</span>
                        ) : (
                          <span className="text-rose-400 font-bold">Prohibited Violation</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4">
                        {fc.status === 'pass' ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                          </span>
                        ) : fc.status === 'warning' ? (
                          <span className="text-amber-400 flex items-center gap-1 font-sans font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 font-sans font-bold">
                            <XCircle className="w-3.5 h-3.5" /> Blocked
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-slate-400 font-sans text-[11px]">
                        {fc.detail || (isUnchanged ? 'Forward verified' : 'Audit recorded')}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No field comparison data for this checkpoint. Run the simulation to evaluate handoffs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recalculation Discrepancy Box (if calculation mismatch occurred) */}
      {result?.recalculation && (
        <div className="bg-amber-950/30 border border-amber-600/60 rounded-xl p-4 text-xs text-amber-200">
          <div className="font-bold flex items-center gap-2 text-sm text-amber-300 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Independent Arithmetic Recalculation Audit Discrepancy
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-lg border border-amber-900 font-mono">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Independent Expected Result</div>
              <div className="text-base font-bold text-emerald-400">
                {formatINR(result.recalculation.expected)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Agent Calculated Output</div>
              <div className="text-base font-bold text-rose-400">
                {formatINR(result.recalculation.actual)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Arithmetic Variance</div>
              <div className="text-base font-bold text-amber-300">
                {formatINR(Math.abs(result.recalculation.difference))}
              </div>
            </div>
          </div>
          <p className="mt-2 text-slate-300 text-[11px]">
            Formula Evaluated: <code className="text-amber-300">{result.recalculation.formula}</code>. Actual insurance settlement rules vary with policy terms and sub-limits; this calculation serves as the deterministic demonstration baseline.
          </p>
        </div>
      )}
    </div>
  );
};
