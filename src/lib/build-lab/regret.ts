import { buildLabDevices } from './data';
import { createDefaultConstraints, type BuildConstraints } from './constraints';
import { solveBuildConstraints } from './solver';
import type { BuildGraph } from './graph';

export type FutureScenarioType =
  | 'ADD_SECOND_DISPLAY'
  | 'MOVE_TO_4K'
  | 'MOVE_TO_HIGH_REFRESH'
  | 'SWITCH_TO_WINDOWS'
  | 'SWITCH_TO_MACOS'
  | 'ADD_AI_ML_WORKLOAD'
  | 'ADD_GAMING_WORKLOAD'
  | 'REQUIRE_FASTER_NETWORK'
  | 'REQUIRE_MORE_STORAGE'
  | 'REDUCE_DESK_SPACE'
  | 'INCREASE_POWER_REQUIREMENT';

export type FutureHorizon = 'NOW' | '6_MONTHS' | '12_MONTHS' | '18_MONTHS' | '24_MONTHS';

export type FutureScenario = {
  id: string;
  type: FutureScenarioType;
  horizon: FutureHorizon;
};

export type RegretResult = {
  deviceId: string;
  replacementRiskScore: number;
  deadEndRiskScore: number;
  reusePotentialScore: number;
  upgradeFrictionScore: number;
  estimatedReplacementWasteINR: number;
  reasons: string[];
  triggeredFutureRequirements: string[];
  reusableInFutureScenarios: string[];
  replacementCandidates: string[];
};

function deviceById(id: string) {
  return buildLabDevices.find((device) => device.id === id) ?? null;
}

export function scenarioDelta(scenario: FutureScenario, base: BuildConstraints): Partial<BuildConstraints> {
  switch (scenario.type) {
    case 'ADD_SECOND_DISPLAY':
      return { minExternalDisplays: Math.max(2, (base.minExternalDisplays ?? 1) + 1) };
    case 'MOVE_TO_4K':
      return { targetResolution: '3840x2160' };
    case 'MOVE_TO_HIGH_REFRESH':
      return { minRefreshRateHz: 144 };
    case 'SWITCH_TO_WINDOWS':
      return { primaryOS: 'Windows' };
    case 'SWITCH_TO_MACOS':
      return { primaryOS: 'macOS' };
    case 'ADD_AI_ML_WORKLOAD':
      return { workload: 'AI_ML' };
    case 'ADD_GAMING_WORKLOAD':
      return { workload: 'GAMING' };
    case 'REQUIRE_FASTER_NETWORK':
      return { requiredNetworkStandards: ['Wi-Fi 7'] };
    case 'REQUIRE_MORE_STORAGE':
      return { requiredProtocols: [...base.requiredProtocols, 'NVME'] };
    case 'REDUCE_DESK_SPACE':
      return { maxDeskWidthMm: Math.max(600, (base.maxDeskWidthMm ?? 1200) - 300) };
    case 'INCREASE_POWER_REQUIREMENT':
      return { minimumLaptopChargingW: Math.max(100, (base.minimumLaptopChargingW ?? 65) + 35) };
  }
}

export function evaluateRegret(graph: BuildGraph, constraints: BuildConstraints, futureScenarios: FutureScenario[]): RegretResult[] {
  const current = graph.nodes.map((node) => node.deviceId);
  return current.map((deviceId) => {
    const device = deviceById(deviceId)!;
    const futureBreakers: string[] = [];
    const reusable: string[] = [];
    const reasons: string[] = [];
    let replacementRisk = 0;
    let deadEndRisk = 0;
    let reuse = 40 + Math.min(30, device.scoreWeight / 3);
    const friction = 100 - reuse;

    for (const scenario of futureScenarios) {
      const delta = scenarioDelta(scenario, constraints);
      const future = { ...createDefaultConstraints(), ...constraints, ...delta };
      const result = solveBuildConstraints(graph, future);
      const incompatible = result.unsatisfiedConstraints.length > 0 || result.conflictRadar.some((item) => item.severity === 'ERROR');
      if (incompatible) {
        replacementRisk += scenario.horizon === 'NOW' ? 0 : scenario.horizon === '6_MONTHS' ? 8 : scenario.horizon === '12_MONTHS' ? 14 : scenario.horizon === '18_MONTHS' ? 20 : 24;
        deadEndRisk += scenario.horizon === 'NOW' ? 0 : 10;
        futureBreakers.push(`${scenario.type}@${scenario.horizon}`);
        reasons.push(`${scenario.type} at ${scenario.horizon} creates a replacement path.`);
      } else {
        reusable.push(`${scenario.type}@${scenario.horizon}`);
        reuse += 8;
      }
    }

    const replacementCandidates = buildLabDevices
      .filter((candidate) => candidate.category === device.category || candidate.capabilities.compatibilityTags?.includes('upgradeable'))
      .filter((candidate) => candidate.id !== device.id)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
      .map((item) => item.id);

    const estimatedReplacementWasteINR = Math.max(0, Math.round(device.price * (replacementRisk / 100) * 0.6));

    return {
      deviceId,
      replacementRiskScore: Math.min(100, Math.round(replacementRisk + friction / 4)),
      deadEndRiskScore: Math.min(100, Math.round(deadEndRisk + (replacementCandidates.length === 0 ? 20 : 0))),
      reusePotentialScore: Math.min(100, Math.round(reuse)),
      upgradeFrictionScore: Math.min(100, Math.round(friction + (replacementCandidates.length ? 0 : 12))),
      estimatedReplacementWasteINR,
      reasons,
      triggeredFutureRequirements: futureBreakers,
      reusableInFutureScenarios: reusable,
      replacementCandidates,
    };
  });
}

export function compareFutureCost(graph: BuildGraph, constraints: BuildConstraints, futureScenarios: FutureScenario[]) {
  const current = solveBuildConstraints(graph, constraints);
  const horizonCosts: Record<FutureHorizon, { initialSpend: number; total24MonthSpend: number; replacementWaste: number; replacements: number; reuseRate: number; finalHealth: number }> = {
    NOW: { initialSpend: current.totalCostINR, total24MonthSpend: current.totalCostINR, replacementWaste: 0, replacements: 0, reuseRate: 100, finalHealth: current.scoreBreakdown.overall },
    '6_MONTHS': { initialSpend: current.totalCostINR, total24MonthSpend: current.totalCostINR, replacementWaste: 0, replacements: 0, reuseRate: 100, finalHealth: current.scoreBreakdown.overall },
    '12_MONTHS': { initialSpend: current.totalCostINR, total24MonthSpend: current.totalCostINR, replacementWaste: 0, replacements: 0, reuseRate: 100, finalHealth: current.scoreBreakdown.overall },
    '18_MONTHS': { initialSpend: current.totalCostINR, total24MonthSpend: current.totalCostINR, replacementWaste: 0, replacements: 0, reuseRate: 100, finalHealth: current.scoreBreakdown.overall },
    '24_MONTHS': { initialSpend: current.totalCostINR, total24MonthSpend: current.totalCostINR, replacementWaste: 0, replacements: 0, reuseRate: 100, finalHealth: current.scoreBreakdown.overall },
  };

  for (const scenario of futureScenarios) {
    const delta = scenarioDelta(scenario, constraints);
    const future = { ...constraints, ...delta };
    const result = solveBuildConstraints(graph, future);
    const waste = evaluateRegret(graph, constraints, [scenario]).reduce((sum, item) => sum + item.estimatedReplacementWasteINR, 0);
    horizonCosts[scenario.horizon] = {
      initialSpend: current.totalCostINR,
      total24MonthSpend: current.totalCostINR + Math.max(0, result.totalCostINR - current.totalCostINR),
      replacementWaste: waste,
      replacements: result.unsatisfiedConstraints.length ? 1 : 0,
      reuseRate: Math.max(0, 100 - evaluateRegret(graph, constraints, [scenario]).reduce((sum, item) => sum + item.replacementRiskScore, 0) / Math.max(1, graph.nodes.length)),
      finalHealth: result.scoreBreakdown.overall,
    };
  }

  return horizonCosts;
}
