import React, { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { AgentPipelineView } from './components/AgentPipelineView';
import { HandoffInspectorView } from './components/HandoffInspectorView';
import { ScenarioLabView } from './components/ScenarioLabView';
import { DatasetLabView } from './components/DatasetLabView';
import { AuditTrailView } from './components/AuditTrailView';
import { TrustAnalyticsView } from './components/TrustAnalyticsView';
import { JudgeDemoMode } from './components/JudgeDemoMode';

import {
  InsuranceClaim,
  TestCase,
  HandoffId,
  VerificationResult,
  AuditEvent,
} from './types/trustmesh';
import { INITIAL_CLAIMS } from './data/initialClaims';
import {
  DETERMINISTIC_TEST_CASES,
  generateProcedureScenario,
} from './data/testCases';
import {
  buildAgentAPayload,
  buildAgentBPayload,
  buildAgentCPayload,
  buildAgentDPayload,
  executeHandoffStep,
  buildFinalDecision,
} from './engine/agentSimulator';
import {
  loadAuditEventsFromStorage,
  saveAuditEventsToStorage,
  createAuditEventsFromVerification,
  createAuditEvent,
} from './engine/auditTrail';

import {
  ROTATION_SCHEDULE,
  getRotationStep,
  getRotationTestCaseForClaim,
} from './data/rotationSchedule';
import {
  bindScenarioToClaim,
} from './data/testCases';

const CLAIMS_STORAGE_KEY = 'trustmesh_claims_dataset_v1';
const SELECTED_CLAIM_KEY = 'trustmesh_selected_claim_id';

export default function App() {
  // Navigation State - Defaults to 'pipeline' so the 5 agents appear on the 1st interface!
  const [activeTab, setActiveTab] = useState<ActiveTab>('pipeline');
  const [isJudgeDemoOpen, setIsJudgeDemoOpen] = useState<boolean>(false);

  // Alternating Scenario Rotation State
  const [rotationIndex, setRotationIndex] = useState<number>(1);
  const [autoCycleScenarios, setAutoCycleScenarios] = useState<boolean>(true);

  // Selected Claim ID State (strictly user-controlled, preserved across runs, scenarios & page reloads)
  const [selectedClaimId, setSelectedClaimId] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(SELECTED_CLAIM_KEY);
        if (stored) return stored;
      }
    } catch (e) {
      console.error('Failed to load selected claim', e);
    }
    return 'CLM-2026-001';
  });

  // Claims Dataset State
  const [claims, setClaims] = useState<InsuranceClaim[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(CLAIMS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load claims from storage', e);
    }
    return INITIAL_CLAIMS;
  });

  // Derived Active Claim from selectedClaimId - single source of truth for all agents!
  const activeClaim: InsuranceClaim =
    claims.find(c => c.claim_id === selectedClaimId) || claims[0];

  // Test Cases State - Default to Run 1: Error (Data Manipulation) bound to current activeClaim
  const [testCases, setTestCases] = useState<TestCase[]>(DETERMINISTIC_TEST_CASES);
  const [activeTestCase, setActiveTestCase] = useState<TestCase | null>(() => {
    const base = DETERMINISTIC_TEST_CASES.find(tc => tc.id === 'TM-TEST-003') || null;
    const initialClaim = INITIAL_CLAIMS.find(c => c.claim_id === 'CLM-2026-001') || INITIAL_CLAIMS[0];
    return base ? bindScenarioToClaim(base, initialClaim) : null;
  });

  // Audit Ledger State
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    return loadAuditEventsFromStorage();
  });

  // Handoff Selection State
  const [inspectedHandoff, setInspectedHandoff] = useState<HandoffId>('B_TO_C');

  // Simulation Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [activeHandoffIndex, setActiveHandoffIndex] = useState<number>(-1);
  const [totalTestsRun, setTotalTestsRun] = useState<number>(1);

  const [handoffResults, setHandoffResults] = useState<Record<HandoffId, VerificationResult | null>>({
    A_TO_B: null,
    B_TO_C: null,
    C_TO_D: null,
    D_TO_E: null,
  });

  const [outgoingPayloads, setOutgoingPayloads] = useState<Record<HandoffId, Record<string, any> | null>>({
    A_TO_B: null,
    B_TO_C: null,
    C_TO_D: null,
    D_TO_E: null,
  });

  const [incomingPayloads, setIncomingPayloads] = useState<Record<HandoffId, Record<string, any> | null>>({
    A_TO_B: null,
    B_TO_C: null,
    C_TO_D: null,
    D_TO_E: null,
  });

  const [finalDecision, setFinalDecision] = useState<{
    status: 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW' | 'BLOCKED';
    summary: string;
    evidence: string[];
    riskScore: number;
    recommendedPayout: number;
  } | null>(null);

  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, { actualStatus: string; passedMatch: boolean }> | null>(null);

  // Save claims & audit events to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
      }
    } catch (e) {
      console.error('Failed to save claims', e);
    }
  }, [claims]);

  useEffect(() => {
    saveAuditEventsToStorage(auditEvents);
  }, [auditEvents]);

  // Persist selectedClaimId to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SELECTED_CLAIM_KEY, selectedClaimId);
      }
    } catch (e) {
      console.error('Failed to save selected claim', e);
    }
  }, [selectedClaimId]);

  // Explicit Claim Selection Handler
  const handleSelectClaim = (claim: InsuranceClaim) => {
    if (isRunning) return; // Dropdown disabled during run, but safety guard here too
    setSelectedClaimId(claim.claim_id);
    handleResetSimulation();
    // Re-bind current active scenario to the newly selected claim so error values match its numbers
    if (activeTestCase) {
      setActiveTestCase(bindScenarioToClaim(activeTestCase, claim));
    }
  };

  // Explicit Test Case Selection Handler
  const handleSelectTestCase = (tc: TestCase | null) => {
    if (tc) {
      setActiveTestCase(bindScenarioToClaim(tc, activeClaim));
    } else {
      setActiveTestCase(null);
    }
    handleResetSimulation();
  };

  // Timer Ref for simulation playback
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handoffsOrder: HandoffId[] = ['A_TO_B', 'B_TO_C', 'C_TO_D', 'D_TO_E'];

  // Simulation execution engine
  const executeSimulationStep = (
    stepIdx: number,
    currentOutgoingPayloads: any,
    currentHandoffResults: any,
    claimToUse: InsuranceClaim = activeClaim,
    testCaseToUse: TestCase | null = activeTestCase
  ) => {
    const handoffId = handoffsOrder[stepIdx];

    // Compute source payload for this step
    let srcPayload: Record<string, any>;
    if (stepIdx === 0) {
      srcPayload = buildAgentAPayload(claimToUse);
    } else if (stepIdx === 1) {
      srcPayload = buildAgentBPayload(currentOutgoingPayloads['A_TO_B'], claimToUse);
    } else if (stepIdx === 2) {
      srcPayload = buildAgentCPayload(currentOutgoingPayloads['B_TO_C'], claimToUse);
    } else {
      srcPayload = buildAgentDPayload(currentOutgoingPayloads['C_TO_D'], claimToUse);
    }

    const { outgoing, incoming, result } = executeHandoffStep(
      handoffId,
      srcPayload,
      testCaseToUse,
      claimToUse
    );

    const updatedOutgoing = { ...currentOutgoingPayloads, [handoffId]: outgoing };
    const updatedIncoming = { ...incomingPayloads, [handoffId]: incoming };
    const updatedResults = { ...currentHandoffResults, [handoffId]: result };

    setOutgoingPayloads(updatedOutgoing);
    setIncomingPayloads(updatedIncoming);
    setHandoffResults(updatedResults);
    setActiveHandoffIndex(stepIdx);
    setInspectedHandoff(handoffId);

    // Append audit events
    setAuditEvents(prev => {
      const newEvs = createAuditEventsFromVerification(result, claimToUse, testCaseToUse, prev);
      return [...prev, ...newEvs];
    });

    // Check if blocked or needs human review halt
    if (result.status === 'BLOCKED') {
      setIsRunning(false);
      setIsCompleted(true);
      const dec = buildFinalDecision(claimToUse, updatedResults, incoming);
      setFinalDecision(dec);
      setTotalTestsRun(c => c + 1);
      return;
    }

    // Check if last step finished
    if (stepIdx === 3) {
      setIsRunning(false);
      setIsCompleted(true);
      const dec = buildFinalDecision(claimToUse, updatedResults, incoming);
      setFinalDecision(dec);
      setTotalTestsRun(c => c + 1);
      return;
    }

    // Continue to next step after delay if running and not paused
    simTimerRef.current = setTimeout(() => {
      executeSimulationStep(stepIdx + 1, updatedOutgoing, updatedResults, claimToUse, testCaseToUse);
    }, 1100);
  };

  const handleRunSimulation = () => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);

    // The user-selected claim is ALWAYS the single source of truth for the entire run!
    // No automatic switching to another claim, ever!
    const claimForThisRun = activeClaim;
    let testCaseForThisRun = activeTestCase;

    // If auto-cycle is enabled, rotate to the scheduled test scenario!
    // Rotates the scenario only (Run 1: Error -> Run 2: Clean Pass -> Run 3: Error...),
    // while keeping the exact claim the user selected!
    if (autoCycleScenarios) {
      const stepInfo = getRotationStep(rotationIndex);
      testCaseForThisRun = getRotationTestCaseForClaim(stepInfo, claimForThisRun, testCases);
      setActiveTestCase(testCaseForThisRun);

      // Advance rotation counter for subsequent runs
      setRotationIndex(prev => prev + 1);
    } else if (testCaseForThisRun) {
      // Ensure scenario is bound to the current claim's fields
      testCaseForThisRun = bindScenarioToClaim(testCaseForThisRun, claimForThisRun);
      setActiveTestCase(testCaseForThisRun);
    }

    // Reset current run
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
    setActiveHandoffIndex(0);
    setFinalDecision(null);

    const emptyResults = { A_TO_B: null, B_TO_C: null, C_TO_D: null, D_TO_E: null };
    const emptyPayloads = { A_TO_B: null, B_TO_C: null, C_TO_D: null, D_TO_E: null };
    setHandoffResults(emptyResults);
    setOutgoingPayloads(emptyPayloads);
    setIncomingPayloads(emptyPayloads);

    // Record simulation start event
    setAuditEvents(prev => [
      ...prev,
      createAuditEvent(
        {
          claimId: claimForThisRun.claim_id,
          testCaseId: testCaseForThisRun?.id,
          sourceAgent: 'agent_a',
          destAgent: 'agent_b',
          eventType: 'SIMULATION_STARTED',
          severity: 'info',
          status: 'INITIATED',
          reason: `Dispatched ${claimForThisRun.customer_name}'s claim (${claimForThisRun.claim_id}, ₹${claimForThisRun.estimated_repair_cost.toLocaleString('en-IN')}) through 5-agent pipeline. Scenario: ${testCaseForThisRun?.name || 'Clean Compliant Pass'}.`,
          actionTaken: 'Began inter-agent verification.',
        },
        prev
      ),
    ]);

    // Start with Step 0 using the run's selected claim & testCase
    executeSimulationStep(0, emptyPayloads, emptyResults, claimForThisRun, testCaseForThisRun);
  };

  const handleStepForward = () => {
    if (isCompleted) return;
    const nextIdx = activeHandoffIndex + 1;
    if (nextIdx > 3) return;

    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setIsPaused(true);
    executeSimulationStep(nextIdx, outgoingPayloads, handoffResults, activeClaim, activeTestCase);
  };

  const handlePause = () => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    const nextIdx = activeHandoffIndex + 1;
    if (nextIdx <= 3) {
      executeSimulationStep(nextIdx, outgoingPayloads, handoffResults, activeClaim, activeTestCase);
    }
  };

  const handleAdvanceScenario = () => {
    const nextIdx = rotationIndex + 1;
    setRotationIndex(nextIdx);
    const stepInfo = getRotationStep(nextIdx);
    // Preserves activeClaim without changing the claim!
    const nextTestCase = getRotationTestCaseForClaim(stepInfo, activeClaim, testCases);
    setActiveTestCase(nextTestCase);
    handleResetSimulation();
  };

  const handleResetSimulation = () => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    setActiveHandoffIndex(-1);
    setFinalDecision(null);
    setHandoffResults({ A_TO_B: null, B_TO_C: null, C_TO_D: null, D_TO_E: null });
    setOutgoingPayloads({ A_TO_B: null, B_TO_C: null, C_TO_D: null, D_TO_E: null });
    setIncomingPayloads({ A_TO_B: null, B_TO_C: null, C_TO_D: null, D_TO_E: null });
  };

  // State Recovery simulation
  const handleSimulateRecovery = (handoffId: HandoffId) => {
    const srcPayload = outgoingPayloads[handoffId];
    if (!srcPayload) return;

    // Execute handoff with recovery flag
    const { outgoing, incoming, result } = executeHandoffStep(
      handoffId,
      srcPayload,
      activeTestCase,
      activeClaim,
      { isRetry: true }
    );

    const updatedOutgoing = { ...outgoingPayloads, [handoffId]: outgoing };
    const updatedIncoming = { ...incomingPayloads, [handoffId]: incoming };
    const updatedResults = { ...handoffResults, [handoffId]: result };

    setOutgoingPayloads(updatedOutgoing);
    setIncomingPayloads(updatedIncoming);
    setHandoffResults(updatedResults);

    setAuditEvents(prev => {
      const newEvs = createAuditEventsFromVerification(result, activeClaim, activeTestCase, prev);
      return [...prev, ...newEvs];
    });

    // Continue simulation from this handoff
    const nextIdx = handoffsOrder.indexOf(handoffId) + 1;
    if (nextIdx <= 3) {
      setIsRunning(true);
      executeSimulationStep(nextIdx, updatedOutgoing, updatedResults);
    } else {
      setIsCompleted(true);
      const dec = buildFinalDecision(activeClaim, updatedResults, incoming);
      setFinalDecision(dec);
    }
  };

  // Scenario Generation Handlers
  const handleGenerateRandomScenario = () => {
    const newCase = generateProcedureScenario(activeClaim);
    setTestCases(prev => [newCase, ...prev]);
    setActiveTestCase(newCase);
    handleResetSimulation();
  };

  const handleGenerateBatch = () => {
    const newCases: TestCase[] = [];
    for (let i = 0; i < 10; i++) {
      const claimToUse = claims[i % claims.length];
      newCases.push(generateProcedureScenario(claimToUse));
    }
    setTestCases(prev => [...newCases, ...prev]);
  };

  const handleRunBenchmark = () => {
    const results: Record<string, { actualStatus: string; passedMatch: boolean }> = {};
    for (const tc of testCases) {
      const srcPayload = buildAgentAPayload(activeClaim);
      const stepRes = executeHandoffStep(tc.affectedHandoff, srcPayload, tc, activeClaim);
      const status = stepRes.result.status;
      results[tc.id] = {
        actualStatus: status,
        passedMatch: status === tc.expectedStatus || status === 'BLOCKED',
      };
    }
    setBenchmarkResults(results);
  };

  // Dataset Management Handlers
  const handleAddClaim = (claim: InsuranceClaim) => {
    setClaims(prev => [claim, ...prev]);
    setSelectedClaimId(claim.claim_id);
  };

  const handleUpdateClaim = (claim: InsuranceClaim) => {
    setClaims(prev => prev.map(c => (c.claim_id === claim.claim_id ? claim : c)));
  };

  const handleDeleteClaim = (claimId: string) => {
    if (claims.length <= 1) return;
    const remaining = claims.filter(c => c.claim_id !== claimId);
    setClaims(remaining);
    if (selectedClaimId === claimId && remaining.length > 0) {
      setSelectedClaimId(remaining[0].claim_id);
    }
  };

  const handleResetClaims = () => {
    setClaims(INITIAL_CLAIMS);
    setSelectedClaimId(INITIAL_CLAIMS[0].claim_id);
  };

  const handleGenerateRandomClaim = () => {
    const newId = `CLM-2026-${String(claims.length + 1).padStart(3, '0')}`;
    const names = ['Kavita Rao', 'Vikram Batra', 'Aparna Nair', 'Nikhil Joshi', 'Deepa Venkat'];
    const types: InsuranceClaim['insurance_type'][] = ['Motor Insurance', 'Health Insurance', 'Commercial Property'];
    const repair = Math.floor(25000 + Math.random() * 80000);
    const limit = 250000;
    const ded = 5000;

    const newClaim: InsuranceClaim = {
      claim_id: newId,
      customer_name: names[Math.floor(Math.random() * names.length)],
      customer_id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      policy_number: `POL-${Math.floor(10000 + Math.random() * 90000)}`,
      insurance_type: types[Math.floor(Math.random() * types.length)],
      vehicle_number: 'MH02AB9912',
      incident_date: '2026-10-12',
      claim_submission_date: '2026-10-15',
      reported_damage: 'Front bumper & grill cosmetic damage',
      estimated_repair_cost: repair,
      policy_coverage_limit: limit,
      policy_status: 'Active',
      deductible: ded,
      previous_related_claims: 0,
      original_claim_amount: repair,
      expected_eligible_amount: Math.min(limit, repair - ded),
      initial_claim_status: 'Under Review',
      location: 'Nagpur, Maharashtra',
    };

    setClaims(prev => [newClaim, ...prev]);
    setSelectedClaimId(newClaim.claim_id);
  };

  const handleClearAuditHistory = () => {
    setAuditEvents([]);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('trustmesh_audit_events_v1');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Universal Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenJudgeDemo={() => setIsJudgeDemoOpen(true)}
        onQuickRun={handleRunSimulation}
        onReset={handleResetSimulation}
        isSimulating={isRunning}
        nextRunLabel={getRotationStep(rotationIndex).badge}
        runCount={rotationIndex}
      />

      {/* Main Viewport Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'pipeline' && (
          <AgentPipelineView
            claim={activeClaim}
            testCase={activeTestCase}
            onSelectClaim={handleSelectClaim}
            onSelectTestCase={handleSelectTestCase}
            allClaims={claims}
            allTestCases={testCases}
            isRunning={isRunning}
            isPaused={isPaused}
            isCompleted={isCompleted}
            activeHandoffIndex={activeHandoffIndex}
            handoffResults={handoffResults}
            outgoingPayloads={outgoingPayloads}
            incomingPayloads={incomingPayloads}
            finalDecision={finalDecision}
            onRunSimulation={handleRunSimulation}
            onPauseSimulation={handlePause}
            onResumeSimulation={handleResume}
            onStepForward={handleStepForward}
            onResetSimulation={handleResetSimulation}
            onGenerateRandomScenario={handleGenerateRandomScenario}
            onInspectHandoff={hId => {
              setInspectedHandoff(hId);
              setActiveTab('inspector');
            }}
            onSimulateRecovery={handleSimulateRecovery}
            autoCycleScenarios={autoCycleScenarios}
            onToggleAutoCycle={setAutoCycleScenarios}
            onAdvanceScenario={handleAdvanceScenario}
            rotationLabel={getRotationStep(rotationIndex).label}
            nextRotationLabel={getRotationStep(rotationIndex + 1).label}
            rotationNumber={rotationIndex}
            onNavigateTab={setActiveTab}
          />
        )}


        {activeTab === 'inspector' && (
          <HandoffInspectorView
            activeHandoff={inspectedHandoff}
            onSelectHandoff={setInspectedHandoff}
            handoffResults={handoffResults}
            outgoingPayloads={outgoingPayloads}
            incomingPayloads={incomingPayloads}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioLabView
            testCases={testCases}
            activeTestCase={activeTestCase}
            onSelectTestCase={handleSelectTestCase}
            onGenerateRandom={handleGenerateRandomScenario}
            onGenerateBatch={handleGenerateBatch}
            onRunBenchmark={handleRunBenchmark}
            activeClaim={activeClaim}
            benchmarkResults={benchmarkResults}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetLabView
            claims={claims}
            activeClaim={activeClaim}
            onSelectClaim={handleSelectClaim}
            onAddClaim={handleAddClaim}
            onUpdateClaim={handleUpdateClaim}
            onDeleteClaim={handleDeleteClaim}
            onResetClaims={handleResetClaims}
            onGenerateRandomClaim={handleGenerateRandomClaim}
            onGenerateScenarioFromClaim={c => {
              handleSelectClaim(c);
              const tc = generateProcedureScenario(c);
              setTestCases(prev => [tc, ...prev]);
              setActiveTestCase(tc);
              setActiveTab('pipeline');
            }}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView
            events={auditEvents}
            onClearAuditHistory={handleClearAuditHistory}
          />
        )}

        {activeTab === 'analytics' && (
          <TrustAnalyticsView
            events={auditEvents}
            handoffResults={handoffResults}
            totalTestsRun={totalTestsRun}
          />
        )}
      </main>

      {/* Judge Demo Guided Modal */}
      <JudgeDemoMode
        isOpen={isJudgeDemoOpen}
        onClose={() => setIsJudgeDemoOpen(false)}
        claim={activeClaim}
        testCase={activeTestCase}
        onSelectTestCase={handleSelectTestCase}
        onRunCleanDemo={() => {
          setActiveTestCase(null);
          handleRunSimulation();
        }}
        onRunErrorDemo={tc => {
          handleSelectTestCase(tc);
          handleRunSimulation();
        }}
        onSimulateRecovery={handleSimulateRecovery}
        handoffResults={handoffResults}
        finalDecision={finalDecision}
        onInspectHandoff={hId => {
          setInspectedHandoff(hId);
          setActiveTab('inspector');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">TrustMesh</span>
          <span>·</span>
          <span>Multi-Agent AI Verification &amp; Audit Layer</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>Simulation Mode: Deterministic Client Engine</span>
          <span>·</span>
          <span>SHA-256 Canonical Checkpoints</span>
        </div>
      </footer>
    </div>
  );
}
