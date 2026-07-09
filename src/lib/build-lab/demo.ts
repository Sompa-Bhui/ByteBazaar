import { buildLabDevices } from './data';
import { addEdge, addNode, createEmptyBuildGraph, selectNode, type BuildGraph } from './graph';
import { createDefaultConstraints, type BuildConstraints } from './constraints';
import type { FutureHorizon, FutureScenario } from './regret';
import { solveBuildConstraints } from './solver';
import { evaluateRegret } from './regret';
import { buildTimeline } from './timeline';
import type { BuildTransaction } from './transactions';
import type { AutoFixPlan } from './autofix';

export type DemoScenarioId = 'MAC_DUAL_DISPLAY' | 'UNDERPOWERED_DOCK' | 'CHEAP_NOW_EXPENSIVE_LATER';

export type DemoScenario = {
  id: DemoScenarioId;
  title: string;
  description: string;
  graph: BuildGraph;
  constraints: BuildConstraints;
  futureHorizon: FutureHorizon;
  futureScenarios: FutureScenario[];
  transaction: BuildTransaction | null;
  autoFixPlan: AutoFixPlan | null;
  solverId: string;
};

function buildGraph(ids: string[], edges: Array<{ source: string; target: string; connection: BuildGraph['edges'][number]['connection']; status: BuildGraph['edges'][number]['status'] }>) {
  let graph = createEmptyBuildGraph();
  for (const id of ids) graph = addNode(graph, id);
  for (const edge of edges) graph = addEdge(graph, edge.source, edge.target, edge.connection, edge.status);
  if (ids[0]) graph = selectNode(graph, ids[0]);
  return graph;
}

export function createDemoScenarios(): DemoScenario[] {
  const macDualGraph = buildGraph(['bytebook-pro-x', 'byteview-34', 'bytedock-12', 'bytekeys-pro-75', 'bytemouse-ergo-x'], [
    { source: 'bytebook-pro-x', target: 'byteview-34', connection: 'USB_C', status: 'warning' },
    { source: 'bytebook-pro-x', target: 'bytedock-12', connection: 'USB_C', status: 'valid' },
  ]);
  const dockGraph = buildGraph(['bytebook-pro-x', 'bytedock-lite', 'byteview-27-pro', 'bytekeys-pro-75'], [
    { source: 'bytebook-pro-x', target: 'bytedock-lite', connection: 'USB_C', status: 'warning' },
    { source: 'bytedock-lite', target: 'byteview-27-pro', connection: 'HDMI', status: 'warning' },
  ]);
  const cheapGraph = buildGraph(['bytebook-pro-x', 'byteview-27-pro', 'bytekeys-pro-75', 'bytemouse-ergo-x', 'bytedock-lite'], [
    { source: 'bytebook-pro-x', target: 'byteview-27-pro', connection: 'USB_C', status: 'valid' },
    { source: 'bytebook-pro-x', target: 'bytedock-lite', connection: 'USB_C', status: 'warning' },
  ]);

  const base = createDefaultConstraints();

  return [
    {
      id: 'MAC_DUAL_DISPLAY',
      title: 'MacBook Dual Display Problem',
      description: 'A MacBook build with a display path that highlights a real conflict and fix path.',
      graph: macDualGraph,
      constraints: { ...base, primaryOS: 'macOS', minExternalDisplays: 2, targetResolution: '3440x1440' },
      futureHorizon: 'NOW',
      futureScenarios: [{ id: 'd1', type: 'ADD_SECOND_DISPLAY', horizon: 'NOW' }],
      transaction: null,
      autoFixPlan: null,
      solverId: 'solver-mac',
    },
    {
      id: 'UNDERPOWERED_DOCK',
      title: 'Underpowered Dock',
      description: 'A dock path that makes power delivery the central conflict.',
      graph: dockGraph,
      constraints: { ...base, primaryOS: 'Windows', minimumLaptopChargingW: 120 },
      futureHorizon: 'NOW',
      futureScenarios: [{ id: 'd2', type: 'INCREASE_POWER_REQUIREMENT', horizon: 'NOW' }],
      transaction: null,
      autoFixPlan: null,
      solverId: 'solver-dock',
    },
    {
      id: 'CHEAP_NOW_EXPENSIVE_LATER',
      title: 'Cheap Now, Expensive Later',
      description: 'A valid low-cost build with future regret tradeoffs.',
      graph: cheapGraph,
      constraints: { ...base, primaryOS: 'ANY', prioritizeBudget: true },
      futureHorizon: '24_MONTHS',
      futureScenarios: [
        { id: 'f1', type: 'MOVE_TO_4K', horizon: '24_MONTHS' },
        { id: 'f2', type: 'ADD_SECOND_DISPLAY', horizon: '24_MONTHS' },
        { id: 'f3', type: 'INCREASE_POWER_REQUIREMENT', horizon: '24_MONTHS' },
      ],
      transaction: null,
      autoFixPlan: null,
      solverId: 'solver-cheap',
    },
  ];
}

export function buildDemoProof(graph: BuildGraph, constraints: BuildConstraints) {
  const solver = solveBuildConstraints(graph, constraints);
  return {
    health: solver.scoreBreakdown.overall,
    price: graph.nodes.reduce((sum, node) => sum + (buildLabDevices.find((item) => item.id === node.deviceId)?.price ?? 0), 0),
    hardViolations: solver.hardViolations.length,
    warnings: solver.softTradeoffs.length,
    conflicts: solver.conflictRadar.length,
    solver,
  };
}

export function buildScenarioNarrative(graph: BuildGraph, constraints: BuildConstraints, scenarios: FutureScenario[]) {
  return {
    regret: evaluateRegret(graph, constraints, scenarios),
    timeline: buildTimeline(graph, constraints, scenarios),
  };
}
