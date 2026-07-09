import { buildLabDevices } from './data';
import { evaluateCompatibility, evaluateBuildHealth } from './compatibility';
import { addEdge, addNode, createEmptyBuildGraph, type BuildGraph } from './graph';
import type { BuildConstraints, ConstraintCheck } from './constraints';
import type { CompatibilityResult } from './types';

export type SolverStrategy = 'Cheapest' | 'Balanced' | 'Future-proof';

export type SolverResult = {
  satisfiable: boolean;
  selectedDeviceIds: string[];
  hardViolations: ConstraintCheck[];
  softTradeoffs: ConstraintCheck[];
  totalCostINR: number;
  scoreBreakdown: {
    compatibility: number;
    performanceFit: number;
    upgradeability: number;
    budgetFit: number;
    overall: number;
  };
  decisionTrace: string[];
  rankedAlternatives: RankedBuild[];
  unsatisfiedConstraints: ConstraintCheck[];
  conflictRadar: Conflict[];
  graph: BuildGraph;
  strategy: SolverStrategy;
};

export type Conflict = {
  id: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  category: 'CONNECTOR' | 'DISPLAY' | 'POWER' | 'BANDWIDTH' | 'OS' | 'BUDGET' | 'PHYSICAL_FIT' | 'DEPENDENCY' | 'UPGRADE_PATH';
  title: string;
  explanation: string;
  rootCause: string;
  involvedDeviceIds: string[];
  affectedConstraintIds: string[];
  suggestedFixIds: string[];
  confidence: number;
};

export type RankedBuild = {
  strategy: SolverStrategy;
  totalCostINR: number;
  score: number;
  deviceIds: string[];
  constraintsSatisfied: number;
  warnings: number;
  explanation: string;
  graph: BuildGraph;
};

function deviceById(deviceId: string) {
  return buildLabDevices.find((device) => device.id === deviceId) ?? null;
}

function buildGraphFromIds(deviceIds: string[]) {
  let graph = createEmptyBuildGraph();
  for (const id of deviceIds) graph = addNode(graph, id);
  const laptop = buildLabDevices.find((device) => device.category === 'LAPTOP');
  const monitor = buildLabDevices.find((device) => device.category === 'MONITOR');
  if (laptop && monitor && deviceIds.includes(laptop.id) && deviceIds.includes(monitor.id)) {
    graph = addEdge(graph, laptop.id, monitor.id, 'USB_C', 'valid');
  }
  return graph;
}

function scoreBuild(deviceIds: string[], constraints: BuildConstraints) {
  const graph = buildGraphFromIds(deviceIds);
  const hostOs = constraints.primaryOS === 'ANY' ? 'Windows' : constraints.primaryOS;
  const compatibility = evaluateCompatibility(graph, buildLabDevices, hostOs);
  const health = evaluateBuildHealth(graph, buildLabDevices, compatibility);
  const totalCostINR = deviceIds.reduce((sum, id) => sum + (deviceById(id)?.price ?? 0), 0);
  const countSatisfied = constraints.requiredDeviceCategories.filter((category) => deviceIds.some((id) => deviceById(id)?.category === category)).length;
  const constraintSignals = compatibility.filter((item) => item.severity !== 'INFO').length;
  const constraintsSatisfied = Math.max(0, countSatisfied - constraintSignals);
  const warnings = compatibility.filter((item) => item.severity === 'WARNING').length;
  const score = Math.max(0, Math.min(100, Math.round(health.overall - Math.max(0, totalCostINR / 100000 - 10) - warnings * 3)));
  return { graph, compatibility, health, totalCostINR, constraintsSatisfied, warnings, score, selectedDeviceIds: deviceIds };
}

function makeConstraint(constraintId: string, type: 'HARD' | 'SOFT', status: 'SATISFIED' | 'VIOLATED' | 'PARTIAL', explanation: string, involvedDeviceIds: string[], numericImpact?: number): ConstraintCheck {
  return { constraintId, type, status, explanation, involvedDeviceIds, numericImpact };
}

function dedupeConflicts(items: Conflict[]) {
  const map = new Map<string, Conflict>();
  for (const item of items) {
    const existing = map.get(item.rootCause);
    if (!existing) {
      map.set(item.rootCause, item);
      continue;
    }
    existing.involvedDeviceIds = Array.from(new Set([...existing.involvedDeviceIds, ...item.involvedDeviceIds]));
    existing.affectedConstraintIds = Array.from(new Set([...existing.affectedConstraintIds, ...item.affectedConstraintIds]));
    existing.suggestedFixIds = Array.from(new Set([...existing.suggestedFixIds, ...item.suggestedFixIds]));
    existing.confidence = Math.min(1, Math.max(existing.confidence, item.confidence));
  }
  return Array.from(map.values());
}

function buildConflicts(compatibility: CompatibilityResult[], constraints: BuildConstraints, result: ReturnType<typeof scoreBuild>): Conflict[] {
  const conflicts: Conflict[] = [];
  const monitorCount = result.graph.nodes.filter((node) => deviceById(node.deviceId)?.category === 'MONITOR').length;
  if (constraints.minExternalDisplays && monitorCount < constraints.minExternalDisplays) {
    conflicts.push({
      id: 'conf-display-count',
      severity: 'ERROR',
      category: 'DISPLAY',
      title: 'Not enough external displays',
      explanation: 'The current build does not satisfy the requested external display count.',
      rootCause: 'missing-display-capacity',
      involvedDeviceIds: result.graph.nodes.map((node) => node.deviceId),
      affectedConstraintIds: ['minExternalDisplays'],
      suggestedFixIds: ['fix-add-monitor', 'fix-add-dock'],
      confidence: 0.98,
    });
  }
  if (result.totalCostINR > constraints.maxBudgetINR) {
    conflicts.push({
      id: 'conf-budget',
      severity: 'ERROR',
      category: 'BUDGET',
      title: 'Budget exceeded',
      explanation: `The current build costs ${result.totalCostINR} INR, above the maximum budget.`,
      rootCause: 'budget-overrun',
      involvedDeviceIds: result.selectedDeviceIds,
      affectedConstraintIds: ['maxBudgetINR'],
      suggestedFixIds: ['fix-cheaper-build', 'fix-remove-gpu'],
      confidence: 1,
    });
  }
  const laptop = result.graph.nodes.map((n) => deviceById(n.deviceId)).find((d) => d?.category === 'LAPTOP');
  const charger = result.graph.nodes.map((n) => deviceById(n.deviceId)).find((d) => d?.category === 'POWER' || d?.category === 'DOCK');
  if (laptop && charger && (charger.capabilities.powerOutputW ?? 0) < (constraints.minimumLaptopChargingW ?? 0)) {
    conflicts.push({
      id: 'conf-power',
      severity: 'ERROR',
      category: 'POWER',
      title: 'Insufficient laptop charging power',
      explanation: 'The selected charger or dock cannot deliver the minimum required charging wattage.',
      rootCause: 'insufficient-power-delivery',
      involvedDeviceIds: [laptop.id, charger.id],
      affectedConstraintIds: ['minimumLaptopChargingW'],
      suggestedFixIds: ['fix-higher-wattage-charger'],
      confidence: 0.96,
    });
  }
  if (constraints.primaryOS !== 'ANY' && laptop && laptop.capabilities.operatingSystems && !laptop.capabilities.operatingSystems.includes(constraints.primaryOS) && !laptop.capabilities.operatingSystems.includes('Universal')) {
    conflicts.push({
      id: 'conf-os',
      severity: 'ERROR',
      category: 'OS',
      title: 'Host OS mismatch',
      explanation: 'The selected host device does not support the requested primary operating system.',
      rootCause: 'os-mismatch',
      involvedDeviceIds: [laptop.id],
      affectedConstraintIds: ['primaryOS'],
      suggestedFixIds: ['fix-switch-host-os'],
      confidence: 0.95,
    });
  }

  for (const item of compatibility) {
    if (item.severity === 'INFO') continue;
    const category = item.ruleId.includes('power') ? 'POWER' : item.ruleId.includes('display') ? 'DISPLAY' : item.ruleId.includes('bandwidth') ? 'BANDWIDTH' : item.ruleId.includes('os') ? 'OS' : item.ruleId.includes('connector') ? 'CONNECTOR' : 'DEPENDENCY';
    conflicts.push({
      id: item.id,
      severity: item.severity,
      category,
      title: item.title,
      explanation: item.explanation,
      rootCause: item.ruleId,
      involvedDeviceIds: item.involvedDeviceIds,
      affectedConstraintIds: [],
      suggestedFixIds: item.suggestedFix ? [item.suggestedFix] : [],
      confidence: item.severity === 'ERROR' ? 0.9 : 0.72,
    });
  }

  return dedupeConflicts(conflicts);
}

function buildConstraintChecks(constraints: BuildConstraints, result: ReturnType<typeof scoreBuild>): { hard: ConstraintCheck[]; soft: ConstraintCheck[] } {
  const hard: ConstraintCheck[] = [];
  const soft: ConstraintCheck[] = [];
  const selectedCategories = new Set(result.graph.nodes.map((node) => deviceById(node.deviceId)?.category).filter(Boolean) as string[]);

  if (result.totalCostINR > constraints.maxBudgetINR) hard.push(makeConstraint('maxBudgetINR', 'HARD', 'VIOLATED', 'Budget limit exceeded.', result.selectedDeviceIds, result.totalCostINR - constraints.maxBudgetINR));
  else hard.push(makeConstraint('maxBudgetINR', 'HARD', 'SATISFIED', 'Build stays within the maximum budget.', result.selectedDeviceIds, constraints.maxBudgetINR - result.totalCostINR));

  if (constraints.preferredBudgetINR && result.totalCostINR > constraints.preferredBudgetINR) soft.push(makeConstraint('preferredBudgetINR', 'SOFT', 'PARTIAL', 'Preferred budget exceeded but max budget is still respected.', result.selectedDeviceIds, result.totalCostINR - constraints.preferredBudgetINR));
  else if (constraints.preferredBudgetINR) soft.push(makeConstraint('preferredBudgetINR', 'SOFT', 'SATISFIED', 'Build is inside preferred budget.', result.selectedDeviceIds, constraints.preferredBudgetINR - result.totalCostINR));

  for (const category of constraints.requiredDeviceCategories) {
    const ok = selectedCategories.has(category);
    hard.push(makeConstraint(`required:${category}`, 'HARD', ok ? 'SATISFIED' : 'VIOLATED', ok ? `${category} present.` : `${category} is missing from the build.`, result.selectedDeviceIds));
  }

  if (constraints.minExternalDisplays) {
    const count = result.graph.nodes.filter((node) => deviceById(node.deviceId)?.category === 'MONITOR').length;
    hard.push(makeConstraint('minExternalDisplays', 'HARD', count >= constraints.minExternalDisplays ? 'SATISFIED' : 'VIOLATED', count >= constraints.minExternalDisplays ? 'Display count satisfied.' : 'Not enough displays.', result.selectedDeviceIds, count - constraints.minExternalDisplays));
  }

  if (constraints.maxDeskWidthMm && constraints.maxDeskDepthMm) {
    const aggregateWidth = result.graph.nodes.reduce((sum, node) => sum + ((deviceById(node.deviceId)?.capabilities.dimensionsMm?.width ?? 320)), 0);
    const aggregateDepth = result.graph.nodes.reduce((sum, node) => Math.max(sum, deviceById(node.deviceId)?.capabilities.dimensionsMm?.depth ?? 240), 0);
    const fit = aggregateWidth <= constraints.maxDeskWidthMm && aggregateDepth <= constraints.maxDeskDepthMm;
    hard.push(makeConstraint('deskFit', 'HARD', fit ? 'SATISFIED' : 'VIOLATED', fit ? 'Devices fit within desk bounds.' : 'Desk dimensions exceeded.', result.selectedDeviceIds, aggregateWidth - (constraints.maxDeskWidthMm ?? 0)));
  }

  const idealWorkload = constraints.prioritizePerformance ? 'AI_ML' : constraints.prioritizeBudget ? 'GENERAL_PRODUCTIVITY' : constraints.prioritizeCompactness ? 'FRONTEND_DEV' : constraints.workload;
  soft.push(makeConstraint('workload-fit', 'SOFT', idealWorkload === constraints.workload ? 'SATISFIED' : 'PARTIAL', 'Workload target mapped to the current build.', result.selectedDeviceIds));
  return { hard, soft };
}

function buildDecisionTrace(constraints: BuildConstraints, result: ReturnType<typeof scoreBuild>, conflicts: Conflict[]) {
  const steps: string[] = [];
  steps.push(`Primary OS: ${constraints.primaryOS}.`);
  steps.push(`Required displays: ${constraints.minExternalDisplays ?? 0}.`);
  steps.push(`Current build contains ${result.graph.nodes.filter((node) => deviceById(node.deviceId)?.category === 'MONITOR').length} monitors.`);
  if (conflicts.some((item) => item.category === 'POWER')) steps.push('Power path rejected: insufficient delivery for the laptop or dock.');
  if (conflicts.some((item) => item.category === 'DISPLAY')) steps.push('Display candidates filtered by connection, count, or desk fit.');
  if (result.totalCostINR <= constraints.maxBudgetINR) steps.push(`Selected build costs ${result.totalCostINR} INR and remains within budget.`);
  else steps.push(`Selected build exceeds budget by ${result.totalCostINR - constraints.maxBudgetINR} INR.`);
  return steps;
}

function buildAlternatives(result: ReturnType<typeof scoreBuild>, constraints: BuildConstraints): RankedBuild[] {
  const candidates: RankedBuild[] = [
    { strategy: 'Cheapest', ...makeRank(['bytebook-air-m3', 'byteview-27-pro', 'bytekeys-pro-75', 'bytemouse-ergo-x'], constraints, 'Cheapest') },
    { strategy: 'Balanced', ...makeRank(['bytebook-pro-x', 'byteview-34', 'bytedock-12', 'bytekeys-pro-75', 'bytemouse-ergo-x'], constraints, 'Balanced') },
    { strategy: 'Future-proof', ...makeRank(['byteworkstation-z7', 'byteview-34', 'bytedock-12', 'bytegpu-core-4090', 'bytekeys-pro-75'], constraints, 'Future-proof') },
  ];
  return candidates.sort((a, b) => a.totalCostINR - b.totalCostINR || a.strategy.localeCompare(b.strategy));
}

function makeRank(ids: string[], constraints: BuildConstraints, strategy: SolverStrategy) {
  const filtered = ids.filter((id) => !constraints.excludedDeviceIds.includes(id));
  const graph = buildGraphFromIds(filtered);
  const compatibility = evaluateCompatibility(graph, buildLabDevices, constraints.primaryOS === 'ANY' ? 'Windows' : constraints.primaryOS);
  const health = evaluateBuildHealth(graph, buildLabDevices, compatibility);
  const totalCostINR = filtered.reduce((sum, id) => sum + (deviceById(id)?.price ?? 0), 0);
  const constraintsSatisfied = filtered.length;
  return {
    totalCostINR,
    score: health.overall,
    deviceIds: filtered,
    constraintsSatisfied,
    warnings: compatibility.filter((item) => item.severity === 'WARNING').length,
    explanation: `${strategy} selected ${filtered.length} devices with ${health.overall} health.`,
    graph,
  };
}

export function solveBuildConstraints(graph: BuildGraph, constraints: BuildConstraints, strategy: SolverStrategy = 'Balanced'): SolverResult {
  const selectedDeviceIds = graph.nodes.map((node) => node.deviceId);
  const base = scoreBuild(selectedDeviceIds, constraints);
  const hardSoft = buildConstraintChecks(constraints, base);
  const conflictRadar = buildConflicts(base.compatibility, constraints, base);
  const rankedAlternatives = buildAlternatives(base, constraints);
  const satisfiable = hardSoft.hard.every((constraint) => constraint.status === 'SATISFIED');
  const decisionTrace = buildDecisionTrace(constraints, base, conflictRadar);
  return {
    satisfiable,
    selectedDeviceIds,
    hardViolations: hardSoft.hard.filter((constraint) => constraint.status === 'VIOLATED'),
    softTradeoffs: hardSoft.soft.filter((constraint) => constraint.status !== 'SATISFIED'),
    totalCostINR: base.totalCostINR,
    scoreBreakdown: {
      compatibility: base.health.compatibility,
      performanceFit: base.health.performanceFit,
      upgradeability: base.health.upgradeability,
      budgetFit: base.health.budgetFit,
      overall: base.health.overall,
    },
    decisionTrace,
    rankedAlternatives,
    unsatisfiedConstraints: [...hardSoft.hard, ...hardSoft.soft].filter((constraint) => constraint.status !== 'SATISFIED'),
    conflictRadar,
    graph: base.graph,
    strategy,
  };
}
