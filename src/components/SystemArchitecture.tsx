import React from 'react';
import {
  Database,
  ArrowRight,
  ShieldCheck,
  FileText,
  UserCheck,
  Wrench,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { HandoffId } from '../types/trustmesh';

interface SystemArchitectureProps {
  onSelectHandoff?: (handoff: HandoffId) => void;
  onNavigateTab?: (tab: any) => void;
  activeHandoff?: HandoffId;
}

export const SystemArchitecture: React.FC<SystemArchitectureProps> = ({
  onSelectHandoff,
  onNavigateTab,
  activeHandoff,
}) => {
  const steps = [
    {
      type: 'dataset',
      id: 'dataset',
      title: 'Insurance Dataset',
      subtitle: '30+ claims & test records',
      icon: Database,
      action: () => onNavigateTab && onNavigateTab('dataset'),
    },
    {
      type: 'agent',
      id: 'agent_a',
      title: 'Agent A',
      subtitle: 'Claim Intake',
      icon: FileText,
      action: () => onNavigateTab && onNavigateTab('pipeline'),
    },
    {
      type: 'checkpoint',
      id: 'A_TO_B' as HandoffId,
      title: 'TrustMesh CP 1',
      subtitle: 'Intake Integrity',
      icon: ShieldCheck,
      action: () => onSelectHandoff && onSelectHandoff('A_TO_B'),
    },
    {
      type: 'agent',
      id: 'agent_b',
      title: 'Agent B',
      subtitle: 'Policy Verification',
      icon: UserCheck,
      action: () => onNavigateTab && onNavigateTab('pipeline'),
    },
    {
      type: 'checkpoint',
      id: 'B_TO_C' as HandoffId,
      title: 'TrustMesh CP 2',
      subtitle: 'Coverage Limits',
      icon: ShieldCheck,
      action: () => onSelectHandoff && onSelectHandoff('B_TO_C'),
    },
    {
      type: 'agent',
      id: 'agent_c',
      title: 'Agent C',
      subtitle: 'Damage Assessment',
      icon: Wrench,
      action: () => onNavigateTab && onNavigateTab('pipeline'),
    },
    {
      type: 'checkpoint',
      id: 'C_TO_D' as HandoffId,
      title: 'TrustMesh CP 3',
      subtitle: 'Calculation Audit',
      icon: ShieldCheck,
      action: () => onSelectHandoff && onSelectHandoff('C_TO_D'),
    },
    {
      type: 'agent',
      id: 'agent_d',
      title: 'Agent D',
      subtitle: 'Fraud & Risk Analysis',
      icon: AlertTriangle,
      action: () => onNavigateTab && onNavigateTab('pipeline'),
    },
    {
      type: 'checkpoint',
      id: 'D_TO_E' as HandoffId,
      title: 'TrustMesh CP 4',
      subtitle: 'Evidence Verification',
      icon: ShieldCheck,
      action: () => onSelectHandoff && onSelectHandoff('D_TO_E'),
    },
    {
      type: 'agent',
      id: 'agent_e',
      title: 'Agent E',
      subtitle: 'Final Decision',
      icon: Award,
      action: () => onNavigateTab && onNavigateTab('pipeline'),
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Multi-Agent TrustMesh Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic zero-trust verification checkpoints sitting directly on inter-agent handoff vectors
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500"></span>
            AI Processing Agent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500"></span>
            TrustMesh Checkpoint
          </span>
        </div>
      </div>

      {/* Pipeline Strip */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-2 min-w-[980px]">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCheckpoint = step.type === 'checkpoint';
            const isDataset = step.type === 'dataset';
            const isActiveHandoff = isCheckpoint && activeHandoff === step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={step.action}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    isActiveHandoff
                      ? 'bg-blue-950/60 border-blue-400 ring-2 ring-blue-500/30'
                      : isCheckpoint
                      ? 'bg-emerald-950/30 border-emerald-800/60 hover:border-emerald-500 hover:bg-emerald-950/50'
                      : isDataset
                      ? 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                      : 'bg-slate-800/80 border-slate-700/80 hover:border-blue-500 hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                      isCheckpoint
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isDataset
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white whitespace-nowrap">
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-400 whitespace-nowrap">
                      {step.subtitle}
                    </div>
                  </div>
                </button>

                {idx < steps.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
