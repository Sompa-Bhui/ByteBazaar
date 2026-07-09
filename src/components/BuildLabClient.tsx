'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from './ui/Button';
import { Card } from './ui/Cards';
import { SectionHeading } from './ui/SectionHeading';
import { buildLabDevices, catalogFilters } from '@/lib/build-lab/data';
import { addEdge, addNode, createEmptyBuildGraph, fromBuildState, getDependencies, getDownstreamDevices, getOrphanDevices, removeNode, selectNode, toBuildState, type BuildGraph } from '@/lib/build-lab/graph';
import { buildWhyScore, evaluateBuildHealth, evaluateCompatibility, getSelectedDevice } from '@/lib/build-lab/compatibility';
import type { BuildDevice, CompatibilityResult, ConnectorType } from '@/lib/build-lab/types';
import { formatINR } from '@/lib/format';
import { createDefaultConstraints, type BuildConstraints, type Workload } from '@/lib/build-lab/constraints';
import { solveBuildConstraints, type SolverResult, type Conflict } from '@/lib/build-lab/solver';
import { generateAutoFixPlans, type AutoFixPlan } from '@/lib/build-lab/autofix';
import { compareBranches, type BuildBranch, type BranchComparison } from '@/lib/build-lab/branching';
import { buildTimeline } from '@/lib/build-lab/timeline';
import { simulateFailure, computeCriticality, criticalityLevel, type FailureEventType, type SimulationResult } from '@/lib/build-lab/simulation';
import { evaluateRegret, type FutureScenario, type FutureHorizon } from '@/lib/build-lab/regret';
import { BUILD_LAB_STORAGE_KEYS, isBuildLabIntroDismissed, resetBuildLabLocalStateStorage, resetCurrentDemoStorage } from '@/lib/build-lab/storage';
import {
  applyBuildTransaction,
  redoLastTransaction,
  replayTransactions,
  transactionFromAutoFix,
  transactionFromRecovery,
  transactionFromStrategy,
  type AppliedTransactionResult,
  type BuildHistoryEntry,
  type BuildMutationState,
  type BuildTransaction,
  undoLastTransaction,
} from '@/lib/build-lab/transactions';
import { ProofPanel } from './build-lab/ProofPanel';
import { TransactionDiff } from './build-lab/TransactionDiff';
import { TraceViewer, type TraceViewerStep } from './build-lab/TraceViewer';

const STORAGE_KEY = BUILD_LAB_STORAGE_KEYS.state;
const INTRO_KEY = BUILD_LAB_STORAGE_KEYS.intro;
const ACTIVE_DEMO_KEY = BUILD_LAB_STORAGE_KEYS.activeDemo;

type PersistedState = {
  version: 4;
  build: ReturnType<typeof toBuildState>;
  constraints: BuildConstraints;
  revision: number;
  history: BuildHistoryEntry[];
  redoStack: BuildHistoryEntry[];
  branches: BuildBranch[];
  activeBranchId: string | null;
  mode: 'BUILD' | 'SOLVE' | 'SIMULATE' | 'FUTURE' | 'HISTORY';
  futureHorizon: FutureHorizon;
};

const workloadOptions: Workload[] = ['FRONTEND_DEV', 'BACKEND_DEV', 'MOBILE_DEV', 'AI_ML', 'VIDEO_EDITING', 'GAMING', 'GENERAL_PRODUCTIVITY'];
const buildLabFieldClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-800 dark:[color-scheme:dark] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 dark:disabled:bg-slate-900 dark:disabled:text-slate-500';
const buildLabSelectClassName = `${buildLabFieldClassName} pr-10`;

export default function BuildLabClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [graph, setGraph] = useState<BuildGraph>(createEmptyBuildGraph());
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [constraints, setConstraints] = useState<BuildConstraints>(createDefaultConstraints());
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<BuildHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<BuildHistoryEntry[]>([]);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [autoFixPlan, setAutoFixPlan] = useState<AutoFixPlan | null>(null);
  const [branches, setBranches] = useState<BuildBranch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [mode, setMode] = useState<'BUILD' | 'SOLVE' | 'SIMULATE' | 'FUTURE' | 'HISTORY'>('BUILD');
  const [simulationEvent, setSimulationEvent] = useState<FailureEventType>('DEVICE_REMOVED');
  const [simulationTargetId, setSimulationTargetId] = useState<string>('');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [futureHorizon, setFutureHorizon] = useState<FutureHorizon>('NOW');
  const [lastTransactionResult, setLastTransactionResult] = useState<AppliedTransactionResult | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setShowIntro(!isBuildLabIntroDismissed(window.localStorage));
        return;
      }
      const parsed = JSON.parse(raw) as PersistedState;
      const buildState = fromBuildState(parsed.build as never);
      let nextGraph = createEmptyBuildGraph();
      for (const deviceId of buildState.deviceIds) nextGraph = addNode(nextGraph, deviceId);
      if (buildState.selectedDeviceId) nextGraph = selectNode(nextGraph, buildState.selectedDeviceId);
      setGraph(nextGraph);
      setSelectedDeviceId(buildState.selectedDeviceId);
      setConstraints(parsed.constraints ?? createDefaultConstraints());
      setRevision(parsed.revision ?? 0);
      setHistory(parsed.history ?? []);
      setRedoStack(parsed.redoStack ?? []);
      setBranches(parsed.branches ?? []);
      setActiveBranchId(parsed.activeBranchId ?? null);
      setMode((parsed.mode as PersistedState['mode']) ?? 'BUILD');
      setFutureHorizon(parsed.futureHorizon ?? 'NOW');
      setShowIntro(!isBuildLabIntroDismissed(window.localStorage));
    } catch {
      // ignore malformed payloads
    }
  }, []);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        version: 4,
        build: toBuildState(graph, selectedDeviceId),
        constraints,
        revision,
        history,
        redoStack,
        branches,
        activeBranchId,
        mode,
        futureHorizon,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore persistence failures
    }
  }, [activeBranchId, branches, constraints, futureHorizon, graph, history, mode, redoStack, revision, selectedDeviceId]);

  function dismissIntro() {
    window.localStorage.setItem(INTRO_KEY, '1');
    setShowIntro(false);
  }

  function resetCurrentDemo() {
    const demoId = window.localStorage.getItem(ACTIVE_DEMO_KEY);
    resetCurrentDemoStorage(window.localStorage);
    if (demoId === 'MAC_DUAL_DISPLAY') {
      loadDemoScenario('mac');
      return;
    }
    if (demoId === 'UNDERPOWERED_DOCK') {
      loadDemoScenario('dock');
      return;
    }
    if (demoId === 'CHEAP_NOW_EXPENSIVE_LATER') {
      loadDemoScenario('future');
      return;
    }
  }

  function resetAllBuildLabState() {
    if (!window.confirm('Reset all Build Lab local state? This removes the current graph, constraints, history, branches, and demo state only.')) return;
    resetBuildLabLocalStateStorage(window.localStorage);
    setGraph(createEmptyBuildGraph());
    setSelectedDeviceId(null);
    setConstraints(createDefaultConstraints());
    setRevision(0);
    setHistory([]);
    setRedoStack([]);
    setBranches([]);
    setActiveBranchId(null);
    setMode('BUILD');
    setSimulationResult(null);
    setSimulationTargetId('');
    setAutoFixPlan(null);
    setSolverResult(null);
    setLastTransactionResult(null);
    setShowIntro(true);
  }

  function loadDemoScenario(name: 'mac' | 'dock' | 'future') {
    if (name === 'mac') {
      window.localStorage.setItem(ACTIVE_DEMO_KEY, 'MAC_DUAL_DISPLAY');
      let next = createEmptyBuildGraph();
      for (const id of ['bytebook-pro-x', 'byteview-34', 'bytedock-12', 'bytekeys-pro-75', 'bytemouse-ergo-x']) next = addNode(next, id);
      next = addEdge(next, 'bytebook-pro-x', 'byteview-34', 'USB_C', 'warning');
      next = addEdge(next, 'bytebook-pro-x', 'bytedock-12', 'USB_C', 'valid');
      next = selectNode(next, 'bytebook-pro-x');
      setGraph(next);
      setSelectedDeviceId('bytebook-pro-x');
      setConstraints({ ...createDefaultConstraints(), primaryOS: 'macOS', minExternalDisplays: 2, targetResolution: '3440x1440' });
      setMode('SOLVE');
      setAutoFixPlan(null);
      setSolverResult(null);
      setSimulationResult(null);
      setFutureHorizon('NOW');
      return;
    }
    if (name === 'dock') {
      window.localStorage.setItem(ACTIVE_DEMO_KEY, 'UNDERPOWERED_DOCK');
      let next = createEmptyBuildGraph();
      for (const id of ['bytebook-pro-x', 'bytedock-lite', 'byteview-27-pro', 'bytekeys-pro-75']) next = addNode(next, id);
      next = addEdge(next, 'bytebook-pro-x', 'bytedock-lite', 'USB_C', 'warning');
      next = addEdge(next, 'bytedock-lite', 'byteview-27-pro', 'HDMI', 'warning');
      next = selectNode(next, 'bytedock-lite');
      setGraph(next);
      setSelectedDeviceId('bytedock-lite');
      setConstraints({ ...createDefaultConstraints(), primaryOS: 'Windows', minimumLaptopChargingW: 120 });
      setMode('SIMULATE');
      setSimulationEvent('POWER_LOSS');
      setSimulationTargetId('bytedock-lite');
      setAutoFixPlan(null);
      setSolverResult(null);
      setFutureHorizon('NOW');
      return;
    }
    window.localStorage.setItem(ACTIVE_DEMO_KEY, 'CHEAP_NOW_EXPENSIVE_LATER');
    let next = createEmptyBuildGraph();
    for (const id of ['bytebook-pro-x', 'byteview-27-pro', 'bytekeys-pro-75', 'bytemouse-ergo-x', 'bytedock-lite']) next = addNode(next, id);
    next = addEdge(next, 'bytebook-pro-x', 'byteview-27-pro', 'USB_C', 'valid');
    next = addEdge(next, 'bytebook-pro-x', 'bytedock-lite', 'USB_C', 'warning');
    next = selectNode(next, 'bytebook-pro-x');
    setGraph(next);
    setSelectedDeviceId('bytebook-pro-x');
    setConstraints({ ...createDefaultConstraints(), prioritizeBudget: true });
    setMode('FUTURE');
    setFutureHorizon('24_MONTHS');
    setAutoFixPlan(null);
    setSolverResult(null);
    setSimulationResult(null);
  }

  const visibleDevices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buildLabDevices.filter((device) => {
      const matchesQuery = !q || [device.name, device.brand, device.summary, ...device.tags, ...device.recommendedFor].some((value) => value.toLowerCase().includes(q));
      const matchesCategory = category === 'ALL' || device.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

  const hostOs = constraints.primaryOS === 'ANY' ? 'Windows' : constraints.primaryOS;
  const compatibility = useMemo(() => evaluateCompatibility(graph, buildLabDevices, hostOs), [graph, hostOs]);
  const health = useMemo(() => evaluateBuildHealth(graph, buildLabDevices, compatibility), [compatibility, graph]);
  const scoreNarrative = useMemo(() => buildWhyScore(graph, compatibility, health), [compatibility, graph, health]);
  const selectedDevice = useMemo(() => getSelectedDevice(graph, buildLabDevices, selectedDeviceId), [graph, selectedDeviceId]);
  const orphanDeviceIds = useMemo(() => getOrphanDevices(graph), [graph]);
  const deviceMap = useMemo(() => new Map(buildLabDevices.map((device) => [device.id, device])), []);
  const buildNodes = graph.nodes.map((node, index) => ({ ...node, device: deviceMap.get(node.deviceId)!, x: (index % 2) * 220, y: Math.floor(index / 2) * 150 }));

  function addToBuild(device: BuildDevice) {
    let next = addNode(graph, device.id);
    const existingNodes = next.nodes.filter((node) => node.deviceId !== device.id);
    const firstCompatible = existingNodes.find((node) => {
      const other = deviceMap.get(node.deviceId);
      return other ? guessEdge(device, other) !== null : false;
    });
    if (firstCompatible) {
      const target = deviceMap.get(firstCompatible.deviceId)!;
      const edge = guessEdge(device, target);
      if (edge) next = addEdge(next, device.id, target.id, edge.connection, edge.status);
    }
    next = selectNode(next, device.id);
    setGraph(next);
    setSelectedDeviceId(device.id);
    setSolverResult(null);
    setAutoFixPlan(null);
  }

  function removeFromBuild(deviceId: string) {
    const next = removeNode(graph, deviceId);
    setGraph(next);
    setSelectedDeviceId((current) => (current === deviceId ? next.nodes[0]?.deviceId ?? null : current));
    setSolverResult(null);
  }

  function runSolver() {
    const result = solveBuildConstraints(graph, constraints, 'Balanced');
    setSolverResult(result);
    setAutoFixPlan(generateAutoFixPlans(result.conflictRadar, result.selectedDeviceIds)[0] ?? null);
  }

  function commitTransaction(transaction: BuildTransaction) {
    const mutationState: BuildMutationState = { graph, constraints, revision, history, redoStack };
    const outcome = applyBuildTransaction(mutationState, transaction);
    if (outcome.stale || !outcome.result.success) {
      setLastTransactionResult(outcome.result ?? null);
      return outcome;
    }
    setGraph(outcome.state.graph);
    setConstraints(outcome.state.constraints);
    setRevision(outcome.state.revision);
    setHistory(outcome.state.history);
    setRedoStack(outcome.state.redoStack);
    setLastTransactionResult(outcome.result);
    setSolverResult(null);
    return outcome;
  }

  function applyPreviewedFix() {
    if (!autoFixPlan) return;
    const tx = transactionFromAutoFix(autoFixPlan, revision);
    commitTransaction(tx);
  }

  function applyRecoveryOption(option: SimulationResult['recoveryOptions'][number]) {
    const tx = transactionFromRecovery(option, revision);
    commitTransaction(tx);
  }

  function applyStrategy(strategy: 'Cheapest' | 'Balanced' | 'Future-proof') {
    const { transaction, solver } = transactionFromStrategy(strategy, graph, constraints, revision);
    const outcome = commitTransaction(transaction);
    if (!outcome.stale && outcome.result.success) {
      setSolverResult(solver);
    }
  }

  function undoCommit() {
    const outcome = undoLastTransaction({ graph, constraints, revision, history, redoStack });
    setGraph(outcome.state.graph);
    setConstraints(outcome.state.constraints);
    setRevision(outcome.state.revision);
    setHistory(outcome.state.history);
    setRedoStack(outcome.state.redoStack);
    setLastTransactionResult(outcome.result);
  }

  function redoCommit() {
    const outcome = redoLastTransaction({ graph, constraints, revision, history, redoStack });
    setGraph(outcome.state.graph);
    setConstraints(outcome.state.constraints);
    setRevision(outcome.state.revision);
    setHistory(outcome.state.history);
    setRedoStack(outcome.state.redoStack);
    setLastTransactionResult(outcome.result);
  }

  function runSimulation() {
    if (!simulationTargetId) return;
    const result = simulateFailure(graph, { type: simulationEvent, targetDeviceId: simulationTargetId }, constraints);
    setSimulationResult(result);
  }

  function saveBranch(name: string) {
    const branch: BuildBranch = {
      id: `branch-${Date.now()}`,
      name,
      baseBranchId: activeBranchId,
      graph,
      constraints,
      createdAt: new Date().toISOString(),
    };
    setBranches((current) => [...current, branch]);
    setActiveBranchId(branch.id);
  }

  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;
  const comparison: BranchComparison | null = activeBranch
    ? compareBranches(
        { graph, totalCostINR: solverResult?.totalCostINR ?? 0, health: solverResult?.scoreBreakdown.overall ?? health.overall, conflicts: solverResult?.conflictRadar.map((item) => item.id) ?? [] },
        { graph: activeBranch.graph, totalCostINR: activeBranch.graph.nodes.reduce((sum, node) => sum + (deviceMap.get(node.deviceId)?.price ?? 0), 0), health: solverResult?.scoreBreakdown.overall ?? health.overall, conflicts: [] },
      )
    : null;
  const futureScenarios = useMemo<FutureScenario[]>(
    () => [
      { id: 's1', type: 'ADD_SECOND_DISPLAY', horizon: futureHorizon },
      { id: 's2', type: 'MOVE_TO_4K', horizon: futureHorizon },
      { id: 's3', type: 'INCREASE_POWER_REQUIREMENT', horizon: futureHorizon },
    ],
    [futureHorizon],
  );
  const criticalComponents = useMemo(
    () =>
      graph.nodes
        .map((node) => {
          const score = computeCriticality(graph, node.deviceId, constraints);
          return { device: deviceMap.get(node.deviceId)!, score };
        })
        .sort((a, b) => b.score - a.score),
    [constraints, deviceMap, graph],
  );
  const regretRisk = useMemo(() => evaluateRegret(graph, constraints, futureScenarios), [constraints, futureScenarios, graph]);
  const timeline = useMemo(() => buildTimeline(graph, constraints, futureScenarios), [constraints, futureScenarios, graph]);
  const currentMutationState = { graph, constraints, revision, history, redoStack };
  const autoFixPreviewTransaction = autoFixPlan ? transactionFromAutoFix(autoFixPlan, revision) : null;
  const autoFixPreviewOutcome = autoFixPreviewTransaction ? applyBuildTransaction(currentMutationState, autoFixPreviewTransaction) : null;
  const strategyPreviewResults = (['Cheapest', 'Balanced', 'Future-proof'] as const).map((strategy) => {
    const { transaction, solver } = transactionFromStrategy(strategy, graph, constraints, revision);
    const outcome = applyBuildTransaction(currentMutationState, transaction);
    return { strategy, transaction, solver, outcome };
  });
  const recoveryPreviewOption = simulationResult?.recoveryOptions[0] ?? null;
  const recoveryPreviewTransaction = recoveryPreviewOption ? transactionFromRecovery(recoveryPreviewOption, revision) : null;
  const recoveryPreviewOutcome = recoveryPreviewTransaction ? applyBuildTransaction(currentMutationState, recoveryPreviewTransaction) : null;
  const solverTraceSteps: TraceViewerStep[] = (solverResult?.decisionTrace ?? []).map((step, index) => ({
    id: `solver-${index}`,
    label: step,
    kind: index === 0 ? 'root-cause' : index === (solverResult?.decisionTrace.length ?? 1) - 1 ? 'final-decision' : 'neutral',
  }));
  const simulationTraceSteps: TraceViewerStep[] = (simulationResult?.propagationTrace ?? []).map((step, index) => ({
    id: `simulation-${index}`,
    label: step,
    kind: index === 0 ? 'root-cause' : 'neutral',
  }));
  const futureTraceSteps: TraceViewerStep[] = (timeline[0]?.decisionTrace ?? []).map((step, index) => ({
    id: `future-${index}`,
    label: step,
    kind: index === 0 ? 'root-cause' : index === (timeline[0]?.decisionTrace.length ?? 1) - 1 ? 'final-decision' : 'neutral',
  }));
  const historyTraceSteps: TraceViewerStep[] = lastTransactionResult
    ? lastTransactionResult.validation.reasons.length
      ? lastTransactionResult.validation.reasons.map((reason, index) => ({ id: `history-${index}`, label: reason, kind: index === 0 ? 'rejected' : 'neutral' }))
      : [{ id: 'history-final', label: 'Transaction committed successfully.', kind: 'final-decision' }]
    : [];
  void autoFixPreviewOutcome;
  void strategyPreviewResults;
  void recoveryPreviewOutcome;
  void simulationTraceSteps;
  void futureTraceSteps;
  void historyTraceSteps;
  const hasStrategyResults = Boolean(solverResult?.rankedAlternatives?.length);

  return (
    <div className="container mx-auto py-8 sm:py-10">
      <div className="flex flex-col gap-4">
        <SectionHeading title="Build Lab" subtitle="Map out developer gear, inspect compatibility, and solve constraints before you buy." />
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Phase 2 adds an explainable constraint solver, conflict radar, auto-fix preview, and local what-if branches on top of the existing deterministic graph.
        </p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <Card className="p-4">
            <label className="sr-only" htmlFor="build-search">Search devices</label>
            <input id="build-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices, tags, or workloads" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-950" />
            <div className="mt-3 flex flex-wrap gap-2">
              {(['ALL', ...catalogFilters.categories] as const).map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} className={clsx('rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition', category === item ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300')}>
                  {item.replace('_', ' ')}
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            {visibleDevices.map((device) => (
              <Card key={device.id} className="p-4">
                <div className="flex gap-3">
                  <img src={device.image} alt={device.name} className="h-20 w-20 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{device.category}</p>
                    <h3 className="mt-1 truncate text-base font-semibold text-slate-950 dark:text-white">{device.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{device.summary}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">{formatINR(device.price)}</span>
                      <Button type="button" size="sm" onClick={() => addToBuild(device)}>Add to Build</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </aside>

        <main className="space-y-5">
          <Card className="min-h-[620px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Build graph</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Devices and relationships in a deterministic architecture map.</p>
              </div>
              <div className="text-right text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <div>{graph.nodes.length} nodes</div>
                <div>{graph.edges.length} edges</div>
              </div>
            </div>

            <div className="mt-5 overflow-auto rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
              <div className="relative min-h-[540px] min-w-[720px]">
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 960 540">
                  {graph.edges.map((edge) => {
                    const sourceIndex = graph.nodes.findIndex((node) => node.id === edge.sourceId);
                    const targetIndex = graph.nodes.findIndex((node) => node.id === edge.targetId);
                    const source = buildNodes[sourceIndex];
                    const target = buildNodes[targetIndex];
                    if (!source || !target) return null;
                    const x1 = 112 + source.x;
                    const y1 = 82 + source.y;
                    const x2 = 112 + target.x;
                    const y2 = 82 + target.y;
                    const stroke = edge.status === 'error' ? '#ef4444' : edge.status === 'warning' ? '#f59e0b' : '#22c55e';
                    return <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="3" strokeDasharray={edge.status === 'warning' ? '8 6' : undefined} opacity="0.8" />;
                  })}
                </svg>

                {buildNodes.length === 0 ? (
                  <div className="flex h-[540px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white/75 text-center dark:border-slate-800 dark:bg-slate-950/75">
                    <div>
                      <p className="text-lg font-semibold text-slate-950 dark:text-white">No devices in build yet</p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Add a laptop, monitor, dock, or input device to start the graph.</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative grid grid-cols-2 gap-5 p-4">
                    {buildNodes.map((node) => (
                      <button key={node.id} type="button" onClick={() => setSelectedDeviceId(node.deviceId)} className={clsx('rounded-[1.5rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5', node.selected ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white')} style={{ marginTop: `${node.y}px`, marginLeft: `${node.x}px` }}>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] opacity-70">{node.device.category}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <img src={node.device.image} alt={node.device.name} className="h-14 w-14 rounded-2xl object-cover" />
                          <div>
                            <h3 className="font-semibold">{node.device.name}</h3>
                            <p className="text-sm opacity-80">{formatINR(node.device.price)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Constraint solver</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Hard constraints, soft tradeoffs, and ranked build strategies.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasStrategyResults ? (
                  <>
                    <Button type="button" variant="secondary" onClick={() => applyStrategy('Cheapest')}>
                      Apply Cheapest
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => applyStrategy('Balanced')}>
                      Apply Balanced
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => applyStrategy('Future-proof')}>
                      Apply Future-proof
                    </Button>
                  </>
                ) : null}
                <Button type="button" onClick={runSolver}>
                  Run Solver
                </Button>
              </div>
            </div>
            {!hasStrategyResults ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Run solver first to analyze the build. Strategy actions appear after a successful result.
              </p>
            ) : null}
            {solverResult && !solverResult.rankedAlternatives.length ? (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                No applicable strategy is available for the current build. Adjust constraints and run solver again.
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ConstraintEditor constraints={constraints} onChange={setConstraints} />
              <div className="space-y-3 rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Solver status</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  <span className={clsx('rounded-full px-3 py-1', solverResult?.satisfiable ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300')}>
                    {solverResult?.satisfiable ? 'SATISFIABLE' : 'UNSATISFIABLE'}
                  </span>
                  <Chip>Hard violations: {solverResult?.hardViolations.length ?? 0}</Chip>
                  <Chip>Soft tradeoffs: {solverResult?.softTradeoffs.length ?? 0}</Chip>
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {(solverResult?.decisionTrace ?? ['Run solver to see an ordered decision trace.']).map((step) => <p key={step}>• {step}</p>)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(solverResult?.rankedAlternatives ?? []).map((strategy) => (
                <div key={strategy.strategy} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{strategy.strategy}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatINR(strategy.totalCostINR)}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Health {strategy.score} • {strategy.constraintsSatisfied} constraints satisfied</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{strategy.explanation}</p>
                </div>
              ))}
            </div>
          </Card>
  
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">What-if branches</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Clone the current build locally and compare deltas.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => saveBranch('Baseline')}>Clone current build</Button>
                {branches.length ? (
                  <select value={activeBranchId ?? ''} onChange={(event) => setActiveBranchId(event.target.value || null)} className={`${buildLabFieldClassName} rounded-full px-4 py-2 text-sm`}>
                    <option value="">Select branch</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                ) : null}
              </div>
            </div>
            {activeBranch && comparison ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Metric label="Price delta" value={comparison.priceDeltaINR} />
                <Metric label="Health delta" value={comparison.healthDelta} />
                <Metric label="Devices added" value={comparison.devicesAdded.length} />
                <Metric label="Devices removed" value={comparison.devicesRemoved.length} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Clone the build to create a comparison branch.</p>
            )}
          </Card>
        </main>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Conflict radar</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
              <Chip>Errors: {solverResult?.hardViolations.length ?? compatibility.filter((item) => item.severity === 'ERROR').length}</Chip>
              <Chip>Warnings: {solverResult?.softTradeoffs.length ?? compatibility.filter((item) => item.severity === 'WARNING').length}</Chip>
            </div>
            <div className="mt-4 space-y-3">
              {(solverResult?.conflictRadar ?? compatibility.filter((item) => item.severity !== 'INFO').map((item) => compatibilityToConflict(item))).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-300">No conflicts detected.</p>
              ) : (
                (solverResult?.conflictRadar ?? compatibility.filter((item) => item.severity !== 'INFO').map((item) => compatibilityToConflict(item))).map((conflict) => <ConflictRow key={conflict.id} conflict={conflict} />)
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Build health</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Compatibility" value={solverResult?.scoreBreakdown.compatibility ?? health.compatibility} />
              <Metric label="Performance" value={solverResult?.scoreBreakdown.performanceFit ?? health.performanceFit} />
              <Metric label="Upgradeability" value={solverResult?.scoreBreakdown.upgradeability ?? health.upgradeability} />
              <Metric label="Budget Fit" value={solverResult?.scoreBreakdown.budgetFit ?? health.budgetFit} />
            </div>
            <div className="mt-4 rounded-3xl bg-slate-950 p-5 text-white dark:bg-slate-100 dark:text-slate-950">
              <p className="text-xs uppercase tracking-[0.24em] opacity-70">Overall score</p>
              <p className="mt-2 text-5xl font-semibold">{solverResult?.scoreBreakdown.overall ?? health.overall}</p>
              <p className="mt-3 text-sm opacity-80">{scoreNarrative.summary}</p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Auto-fix preview</h2>
            {autoFixPlan ? (
              <div className="mt-4 space-y-3">
                <p className="font-semibold text-slate-950 dark:text-white">{autoFixPlan.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{autoFixPlan.explanation}</p>
                <div className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                  <div>Price delta: {formatINR(autoFixPlan.priceDeltaINR)}</div>
                  <div>Health delta: {autoFixPlan.healthDelta}</div>
                  <div>Resolved: {autoFixPlan.conflictsResolved.length}</div>
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {autoFixPlan.operations.map((operation, index) => <p key={index}>• {describeOperation(operation)}</p>)}
                </div>
                <Button type="button" variant="secondary" className="w-full" onClick={applyPreviewedFix}>Apply fix</Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Run the solver to preview a ranked repair plan.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Selected device</h2>
            {selectedDevice ? (
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <img src={selectedDevice.image} alt={selectedDevice.name} className="h-16 w-16 rounded-2xl object-cover" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{selectedDevice.category}</p>
                    <h3 className="mt-1 font-semibold text-slate-950 dark:text-white">{selectedDevice.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{selectedDevice.brand}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedDevice.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDevice.tags.map((tag: string) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">{tag}</span>)}
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  <div>Dependencies: {getDependencies(graph, selectedDevice.id).length}</div>
                  <div>Downstream devices: {getDownstreamDevices(graph, selectedDevice.id).length}</div>
                  <div>Orphan status: {orphanDeviceIds.includes(selectedDevice.id) ? 'Orphaned' : 'Connected or chained'}</div>
                </div>
                <Button type="button" variant="secondary" onClick={() => removeFromBuild(selectedDevice.id)} className="w-full">Remove from build</Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Select a node to inspect technical capabilities and fixes.</p>
            )}
          </Card>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['BUILD', 'SOLVE', 'SIMULATE', 'FUTURE', 'HISTORY'] as const).map((item) => (
          <button key={item} type="button" onClick={() => setMode(item)} className={clsx('rounded-full px-4 py-2 text-sm font-semibold transition', mode === item ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
            {item}
          </button>
        ))}
      </div>

      {showIntro ? (
        <Card className="mt-5 border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">First run intro</p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                ByteBazaar Build Lab is an explainable tech architecture engine. It models devices as a graph, detects compatibility conflicts, solves constraints, simulates failures, and verifies fixes before commit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => loadDemoScenario('mac')}>Try a demo scenario</Button>
              <Button type="button" variant="secondary" onClick={resetCurrentDemo}>Reset current demo</Button>
              <Button type="button" variant="secondary" onClick={() => { setGraph(createEmptyBuildGraph()); setSelectedDeviceId(null); setConstraints(createDefaultConstraints()); dismissIntro(); }}>Start from empty build</Button>
              <Button type="button" variant="secondary" onClick={resetAllBuildLabState}>Reset all Build Lab state</Button>
              <Button type="button" variant="secondary" onClick={dismissIntro}>Dismiss</Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Demo Scenarios</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">One-click deterministic paths built from the real graph, solver, simulator, and regret engine.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => loadDemoScenario('mac')}>MacBook Dual Display Problem</Button>
            <Button type="button" variant="secondary" onClick={() => loadDemoScenario('dock')}>Underpowered Dock</Button>
            <Button type="button" variant="secondary" onClick={() => loadDemoScenario('future')}>Cheap Now, Expensive Later</Button>
            <Button type="button" variant="secondary" onClick={resetCurrentDemo}>Reset current demo</Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/80 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/80">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">Revision {revision}</span>
        <Button type="button" variant="secondary" onClick={undoCommit} disabled={!history.length}>Undo</Button>
        <Button type="button" variant="secondary" onClick={redoCommit} disabled={!redoStack.length}>Redo</Button>
        {lastTransactionResult ? (
          <span className={clsx('rounded-full px-3 py-1 font-semibold', lastTransactionResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300')}>
            {lastTransactionResult.success ? `Committed +${lastTransactionResult.healthDelta} health, ${formatINR(lastTransactionResult.priceDeltaINR)}` : lastTransactionResult.validation.reasons[0] ?? 'Rejected'}
          </span>
        ) : null}
      </div>

      {mode === 'SOLVE' ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Critical Components</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Highest-risk devices and their blast radius.</p>
            <div className="mt-4 space-y-3">
              {criticalComponents.slice(0, 4).map(({ device, score }) => (
                <div key={device.id} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{device.name}</p>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{device.category}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-900 dark:text-slate-300">{criticalityLevel(score)} {score}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Blast radius: {getDownstreamDevices(graph, device.id).length} downstream devices.</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">What breaks if I remove this?</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Pick a selected device and simulate failure without mutating the active build.</p>
            <div className="mt-4 flex gap-2">
              <select value={simulationTargetId || selectedDeviceId || ''} onChange={(e) => setSimulationTargetId(e.target.value)} className={`${buildLabFieldClassName} flex-1`}>
                <option value="">Select device</option>
                {graph.nodes.map((node) => (
                  <option key={node.id} value={node.deviceId}>
                    {deviceMap.get(node.deviceId)?.name}
                  </option>
                ))}
              </select>
              <select value={simulationEvent} onChange={(e) => setSimulationEvent(e.target.value as FailureEventType)} className={buildLabSelectClassName}>
                {['DEVICE_REMOVED', 'DEVICE_FAILED', 'CONNECTION_REMOVED', 'CONNECTION_DEGRADED', 'POWER_LOSS', 'BANDWIDTH_DEGRADED', 'HOST_UNAVAILABLE'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <Button type="button" onClick={runSimulation}>Simulate</Button>
            </div>
            {simulationResult ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Before" value={simulationResult.healthBefore} />
                  <Metric label="After" value={simulationResult.healthAfter} />
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">Propagation trace</p>
                  <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                    {simulationResult.propagationTrace.map((step) => <p key={step}>• {step}</p>)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">Recovery options</p>
                  <div className="mt-2 space-y-2">
                    {simulationResult.recoveryOptions.map((option) => (
                      <div key={option.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                        <p className="font-medium">{option.title}</p>
                        <Button type="button" variant="secondary" className="mt-3" onClick={() => applyRecoveryOption(option)}>Apply recovery</Button>
                        <p className="text-slate-500 dark:text-slate-400">Health recovery {option.healthRecovery} • Cost delta {formatINR(option.costDeltaINR)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {mode === 'FUTURE' ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Regret Risk Inspector</h2>
              <select value={futureHorizon} onChange={(e) => setFutureHorizon(e.target.value as FutureHorizon)} className={`${buildLabFieldClassName} rounded-full px-3 py-2 text-sm`}>
                {['NOW', '6_MONTHS', '12_MONTHS', '18_MONTHS', '24_MONTHS'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="mt-4 space-y-3">
              {regretRisk.map((item) => (
                <div key={item.deviceId} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950 dark:text-white">{deviceMap.get(item.deviceId)?.name}</p>
                    <span className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{item.replacementRiskScore}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Replacement waste: {formatINR(item.estimatedReplacementWasteINR)}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.reasons[0] ?? 'No significant regret signals.'}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Build Time Machine</h2>
            <div className="mt-4 space-y-3">
              {timeline.map((step) => (
                <div key={step.horizon} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-950 dark:text-white">{step.horizon}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatINR(step.projectedTotalSpendINR)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Health {step.healthScore} • Waste {formatINR(step.replacementWasteINR)}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reusable devices: {step.reusableDeviceIds.length} • Replacements: {step.requiredReplacements.length}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {mode === 'HISTORY' ? (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">History</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Replayable, deterministic commit log for Build Lab mutations.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const replay = replayTransactions(
                  { graph: createEmptyBuildGraph(), constraints: createDefaultConstraints(), revision: 0, history: [], redoStack: [] },
                  history.map((entry) => entry.transaction),
                );
                if (replay.success) {
                  setGraph(replay.state.graph);
                  setConstraints(replay.state.constraints);
                  setRevision(replay.state.revision);
                  setLastTransactionResult(null);
                }
              }}
            >
              Replay history
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {history.length ? history.slice().reverse().map((entry) => (
              <div key={entry.transaction.id} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">Revision {entry.revision}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{entry.transaction.source}</p>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(entry.transaction.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.transaction.title}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Price delta {formatINR(entry.priceDeltaINR)} · Health delta {entry.healthDelta}</p>
              </div>
            )) : <p className="text-sm text-slate-500 dark:text-slate-300">No committed history yet.</p>}
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <ProofPanel
          title="Current build proof"
          before={{ revision, nodeCount: graph.nodes.length, edgeCount: graph.edges.length, deviceIds: graph.nodes.map((node) => node.deviceId), totalCostINR: graph.nodes.reduce((sum, node) => sum + (deviceMap.get(node.deviceId)?.price ?? 0), 0), health: health.overall, hardViolations: solverResult?.hardViolations.length ?? 0, warnings: solverResult?.softTradeoffs.length ?? 0, conflicts: solverResult?.conflictRadar.map((item) => item.id) ?? compatibility.filter((item) => item.severity !== 'INFO').map((item) => item.id) }}
          after={{ revision, nodeCount: graph.nodes.length, edgeCount: graph.edges.length, deviceIds: graph.nodes.map((node) => node.deviceId), totalCostINR: graph.nodes.reduce((sum, node) => sum + (deviceMap.get(node.deviceId)?.price ?? 0), 0), health: health.overall, hardViolations: solverResult?.hardViolations.length ?? 0, warnings: solverResult?.softTradeoffs.length ?? 0, conflicts: solverResult?.conflictRadar.map((item) => item.id) ?? compatibility.filter((item) => item.severity !== 'INFO').map((item) => item.id) }}
          delta={{ healthDelta: 0, priceDeltaINR: 0, actualResolvedConflictIds: [], actualIntroducedConflictIds: [], devicesAdded: [], devicesRemoved: [] }}
        />
        <TransactionDiff transaction={lastTransactionResult?.inverseTransaction ?? autoFixPreviewTransaction} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800" />
        <TraceViewer title="Current decision trace" steps={solverTraceSteps} emptyLabel="Run the solver to view an ordered trace." />
      </div>
    </div>
  );
}

function ConstraintEditor({ constraints, onChange }: { constraints: BuildConstraints; onChange: (value: BuildConstraints) => void }) {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-950 dark:text-white">Constraints</p>
      <Field label="Max budget INR"><input type="number" value={constraints.maxBudgetINR} onChange={(e) => onChange({ ...constraints, maxBudgetINR: Number(e.target.value) || 0 })} className={buildLabFieldClassName} /></Field>
      <Field label="Preferred budget INR"><input type="number" value={constraints.preferredBudgetINR ?? ''} onChange={(e) => onChange({ ...constraints, preferredBudgetINR: Number(e.target.value) || undefined })} className={buildLabFieldClassName} /></Field>
      <Field label="Desk width mm"><input type="number" value={constraints.maxDeskWidthMm ?? ''} onChange={(e) => onChange({ ...constraints, maxDeskWidthMm: Number(e.target.value) || undefined })} className={buildLabFieldClassName} /></Field>
      <Field label="Desk depth mm"><input type="number" value={constraints.maxDeskDepthMm ?? ''} onChange={(e) => onChange({ ...constraints, maxDeskDepthMm: Number(e.target.value) || undefined })} className={buildLabFieldClassName} /></Field>
      <Field label="Primary OS">
        <select value={constraints.primaryOS} onChange={(e) => onChange({ ...constraints, primaryOS: e.target.value as BuildConstraints['primaryOS'] })} className={buildLabSelectClassName}>
          {['ANY', 'macOS', 'Windows', 'Linux'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="Workload">
        <select value={constraints.workload} onChange={(e) => onChange({ ...constraints, workload: e.target.value as Workload })} className={buildLabSelectClassName}>
          {workloadOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="External displays"><input type="number" value={constraints.minExternalDisplays ?? 0} onChange={(e) => onChange({ ...constraints, minExternalDisplays: Number(e.target.value) || undefined })} className={buildLabFieldClassName} /></Field>
      <Field label="Target resolution"><input value={constraints.targetResolution ?? ''} onChange={(e) => onChange({ ...constraints, targetResolution: e.target.value || undefined })} className={buildLabFieldClassName} /></Field>
      <Field label="Min refresh rate Hz"><input type="number" value={constraints.minRefreshRateHz ?? ''} onChange={(e) => onChange({ ...constraints, minRefreshRateHz: Number(e.target.value) || undefined })} className={buildLabFieldClassName} /></Field>
      <Field label="Min laptop charging W"><input type="number" value={constraints.minimumLaptopChargingW ?? ''} onChange={(e) => onChange({ ...constraints, minimumLaptopChargingW: Number(e.target.value) || undefined })} className={buildLabFieldClassName} /></Field>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          ['prioritizeBudget', 'Budget'],
          ['prioritizePerformance', 'Performance'],
          ['prioritizeUpgradeability', 'Upgrade'],
          ['prioritizeCompactness', 'Compact'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-800">
            <input type="checkbox" checked={constraints[key as keyof BuildConstraints] as boolean} onChange={(e) => onChange({ ...constraints, [key]: e.target.checked } as BuildConstraints)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function ConflictRow({ conflict }: { conflict: Conflict }) {
  const color = conflict.severity === 'ERROR' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
  return (
    <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <p className={clsx('text-xs font-semibold uppercase tracking-[0.24em]', color)}>{conflict.category}</p>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{Math.round(conflict.confidence * 100)}%</p>
      </div>
      <h3 className="mt-2 font-semibold text-slate-950 dark:text-white">{conflict.title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{conflict.rootCause}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{conflict.explanation}</p>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-900 dark:text-slate-300">{children}</span>;
}

function describeOperation(operation: AutoFixPlan['operations'][number]) {
  if (operation.type === 'add-device') return `Add device ${operation.deviceId}`;
  if (operation.type === 'remove-device') return `Remove device ${operation.deviceId}`;
  if (operation.type === 'replace-device') return `Replace ${operation.fromDeviceId} with ${operation.toDeviceId}`;
  if (operation.type === 'replace-edge') return `Replace edge to ${operation.toDeviceId}`;
  return `Downgrade requirement ${operation.constraintId}`;
}

function compatibilityToConflict(item: CompatibilityResult): Conflict {
  return {
    id: item.id,
    severity: item.severity === 'INFO' ? 'INFO' : item.severity,
    category: item.ruleId.includes('power') ? 'POWER' : item.ruleId.includes('display') ? 'DISPLAY' : item.ruleId.includes('bandwidth') ? 'BANDWIDTH' : item.ruleId.includes('os') ? 'OS' : item.ruleId.includes('connector') ? 'CONNECTOR' : 'DEPENDENCY',
    title: item.title,
    explanation: item.explanation,
    rootCause: item.ruleId,
    involvedDeviceIds: item.involvedDeviceIds,
    affectedConstraintIds: [],
    suggestedFixIds: item.suggestedFix ? [item.suggestedFix] : [],
    confidence: item.severity === 'ERROR' ? 0.9 : 0.72,
  };
}

function guessEdge(source: BuildDevice, target: BuildDevice): { connection: ConnectorType; status: 'valid' | 'warning' | 'error' } | null {
  const sourceOutputs = source.capabilities.outputs ?? source.capabilities.ports ?? [];
  const targetInputs = target.capabilities.inputs ?? target.capabilities.ports ?? [];
  const candidates: ConnectorType[] = ['THUNDERBOLT_4', 'USB_C', 'HDMI', 'DISPLAYPORT', 'ETHERNET', 'PCIe', 'USB_A'];
  for (const connection of candidates) {
    if (!sourceOutputs.includes(connection) && !source.capabilities.ports?.includes(connection)) continue;
    if (!targetInputs.includes(connection) && !(connection === 'USB_C' && targetInputs.includes('THUNDERBOLT_4'))) continue;
    const status = source.category === 'LAPTOP' && target.category === 'GPU' ? 'error' : target.category === 'MONITOR' && (source.capabilities.bandwidthGbps ?? 0) < 18 ? 'warning' : 'valid';
    return { connection, status };
  }
  return null;
}
