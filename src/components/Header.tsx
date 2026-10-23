import React from 'react';
import {
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export type ActiveTab =
  | 'pipeline'
  | 'inspector'
  | 'scenarios'
  | 'dataset'
  | 'audit'
  | 'analytics';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenJudgeDemo: () => void;
  onQuickRun: () => void;
  onReset: () => void;
  isSimulating: boolean;
  nextRunLabel?: string;
  runCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenJudgeDemo,
  onQuickRun,
  onReset,
  isSimulating,
  nextRunLabel,
  runCount = 1,
}) => {
  const navTabs: { id: ActiveTab; label: string }[] = [
    { id: 'pipeline', label: 'Agent Pipeline' },
    { id: 'inspector', label: 'Handoff Inspector' },
    { id: 'scenarios', label: 'Scenario Lab' },
    { id: 'dataset', label: 'Dataset Lab' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'analytics', label: 'Trust Analytics' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <button
              onClick={() => onTabChange('pipeline')}
              className="text-left group cursor-pointer focus:outline-none"
            >
              <div className="text-lg font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors whitespace-nowrap">
                TrustMesh
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-2">
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onReset}
              title="Reset current simulation state"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onQuickRun}
              disabled={isSimulating}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-blue-400" />
              <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
            </button>

            <button
              onClick={onOpenJudgeDemo}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-md shadow-blue-600/25 transition-all whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Judge Demo Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-slate-800 bg-slate-900">
        {navTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
