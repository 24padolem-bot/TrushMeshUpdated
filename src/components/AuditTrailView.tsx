import React, { useState } from 'react';
import {
  AuditEvent,
  Severity,
  VerificationStatus,
  AgentId,
} from '../types/trustmesh';
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
  RotateCcw,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  exportAuditTrailToCSV,
  exportAuditTrailToJSON,
  verifyAuditChain,
} from '../engine/auditTrail';
import { formatINR } from '../utils/crypto';

interface AuditTrailViewProps {
  events: AuditEvent[];
  onClearAuditHistory: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  events,
  onClearAuditHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Chain verification state
  const [chainVerificationResult, setChainVerificationResult] = useState<{
    tested: boolean;
    isValid: boolean;
    totalEvents: number;
    brokenEventId?: string;
  } | null>(null);

  const handleVerifyChain = () => {
    const res = verifyAuditChain(events);
    setChainVerificationResult({
      tested: true,
      isValid: res.isValid,
      totalEvents: res.totalEvents,
      brokenEventId: res.brokenEventId,
    });
  };

  const filteredEvents = events
    .filter(ev => {
      if (agentFilter !== 'all' && ev.sourceAgent !== agentFilter && ev.destAgent !== agentFilter) return false;
      if (severityFilter !== 'all' && ev.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          ev.eventId.toLowerCase().includes(q) ||
          ev.claimId.toLowerCase().includes(q) ||
          (ev.testCaseId && ev.testCaseId.toLowerCase().includes(q)) ||
          ev.eventType.toLowerCase().includes(q) ||
          ev.reason.toLowerCase().includes(q) ||
          (ev.affectedField && ev.affectedField.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortDesc ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Cryptographic Audit Trail Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hash-linked, tamper-evident record of all inter-agent messages, schema verifications, and intervention actions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerifyChain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verify Hash Chain</span>
            </button>

            <button
              onClick={() => exportAuditTrailToCSV(events)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportAuditTrailToJSON(events)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download JSON Report</span>
            </button>

            <button
              onClick={onClearAuditHistory}
              title="Clear audit ledger history (separate from active simulation reset)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        </div>

        {/* Chain Verification Result Notification */}
        {chainVerificationResult && (
          <div
            className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between ${
              chainVerificationResult.isValid
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {chainVerificationResult.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              )}
              <span>
                {chainVerificationResult.isValid ? (
                  <>
                    <strong>Tamper-Evident Chain Verified:</strong> All {chainVerificationResult.totalEvents} audit blocks cryptographically validated against SHA-256 parent hashes. Chain integrity intact.
                  </>
                ) : (
                  <>
                    <strong>Chain Integrity Violation:</strong> Discrepancy detected at block {chainVerificationResult.brokenEventId}.
                  </>
                )}
              </span>
            </div>
            <button
              onClick={() => setChainVerificationResult(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Agent:</span>
              <select
                aria-label="Filter Agent"
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="all">All Agents</option>
                <option value="agent_a">Agent A (Intake)</option>
                <option value="agent_b">Agent B (Policy)</option>
                <option value="agent_c">Agent C (Damage)</option>
                <option value="agent_d">Agent D (Risk)</option>
                <option value="agent_e">Agent E (Decision)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <span>Severity:</span>
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

            <div className="flex items-center gap-1 text-slate-400">
              <span>Status:</span>
              <select
                aria-label="Filter Status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none uppercase"
              >
                <option value="all">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="BLOCKED">Blocked</option>
                <option value="WARNING">Warning</option>
                <option value="RECOVERY">Recovery</option>
                <option value="HUMAN_REVIEW">Human Review</option>
              </select>
            </div>

            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-800"
            >
              <Clock className="w-3 h-3" />
              <span>{sortDesc ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event ID, claim, reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Events List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Recorded Audit Trail Events ({filteredEvents.length} of {events.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Chain Anchor: Genesis Block <code>0000...0000</code>
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredEvents.length > 0 ? (
            filteredEvents.map(ev => {
              const isExpanded = expandedEventId === ev.eventId;
              const isBlocked = ev.status === 'BLOCKED';
              const isWarning = ev.status === 'WARNING';
              const isVerified = ev.status === 'VERIFIED' || ev.status === 'SUCCESS';

              return (
                <div key={ev.eventId} className="transition-colors hover:bg-slate-800/30">
                  <div
                    onClick={() => setExpandedEventId(isExpanded ? null : ev.eventId)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                        {isBlocked && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                        {isWarning && <ShieldAlert className="w-4 h-4 text-amber-400" />}
                        {!isVerified && !isBlocked && !isWarning && (
                          <FileText className="w-4 h-4 text-blue-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-white">{ev.eventId}</span>
                          <span className="text-slate-600">·</span>
                          <span className="font-mono text-slate-300 font-semibold">{ev.claimId}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 font-semibold uppercase">{ev.eventType}</span>
                          <span className="text-slate-600">·</span>
                          <span
                            className={`font-bold uppercase text-[10px] ${
                              ev.severity === 'critical'
                                ? 'text-rose-400'
                                : ev.severity === 'high'
                                ? 'text-amber-400'
                                : ev.severity === 'warning'
                                ? 'text-yellow-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {ev.severity}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-1 leading-snug">{ev.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                      <div className="text-right">
                        <div className="text-slate-400 text-[10px]">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-slate-500 text-[9px] truncate max-w-[120px]">
                          {ev.hash.slice(0, 16)}...
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Audit Record Breakdown */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-950/60 border-t border-slate-800/60 text-xs space-y-3 font-mono">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Source Agent</span>
                          <span className="text-slate-200 font-semibold">{ev.sourceAgent || 'System Initiator'}</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Destination Agent</span>
                          <span className="text-slate-200 font-semibold">{ev.destAgent || 'Pipeline Monitor'}</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Verification Status</span>
                          <span className="text-slate-200 font-semibold">{ev.status}</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Test Scenario ID</span>
                          <span className="text-slate-200 font-semibold">{ev.testCaseId || 'Baseline Run'}</span>
                        </div>
                      </div>

                      {ev.affectedField && (
                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                          <div className="text-slate-400 text-[10px] uppercase mb-1">Field-Level Discrepancy</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <span className="text-slate-500 text-[10px] block">Target Field</span>
                              <span className="text-amber-300 font-bold">{ev.affectedField}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[10px] block">Original Baseline</span>
                              <span className="text-slate-300">
                                {typeof ev.originalValue === 'number'
                                  ? formatINR(ev.originalValue)
                                  : JSON.stringify(ev.originalValue)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[10px] block">Received Mutation</span>
                              <span className="text-rose-400 font-bold">
                                {typeof ev.receivedValue === 'number'
                                  ? formatINR(ev.receivedValue)
                                  : JSON.stringify(ev.receivedValue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] block mb-0.5">TrustMesh Action Taken:</span>
                        <span className="text-slate-200 font-sans">{ev.actionTaken}</span>
                      </div>

                      {/* Cryptographic Linkage Hashes */}
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 w-28 shrink-0">Parent Hash:</span>
                          <code className="text-slate-400 truncate">{ev.previousHash}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 w-28 shrink-0">Block Hash:</span>
                          <code className="text-emerald-400 font-semibold truncate">{ev.hash}</code>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No audit events matched current search or filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
