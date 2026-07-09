import { solveBuildConstraints } from './solver';
import type { BuildGraph } from './graph';
import type { BuildConstraints } from './constraints';
import { compareFutureCost, evaluateRegret, type FutureScenario, type FutureHorizon } from './regret';

export type TimelineStep = {
  horizon: FutureHorizon;
  activeConstraints: BuildConstraints;
  reusableDeviceIds: string[];
  insufficientDeviceIds: string[];
  requiredAdditions: string[];
  requiredReplacements: string[];
  projectedTotalSpendINR: number;
  replacementWasteINR: number;
  healthScore: number;
  conflicts: string[];
  decisionTrace: string[];
};

export function buildTimeline(graph: BuildGraph, constraints: BuildConstraints, scenarios: FutureScenario[]): TimelineStep[] {
  const horizons: FutureHorizon[] = ['NOW', '6_MONTHS', '12_MONTHS', '18_MONTHS', '24_MONTHS'];
  return horizons.map((horizon) => {
    const active = scenarios.filter((scenario) => horizonRank(scenario.horizon) <= horizonRank(horizon));
    const activeConstraints = active.reduce<BuildConstraints>((current, scenario) => ({ ...current, ...scenarioToConstraintDelta(scenario, current) }), { ...constraints });
    const solved = solveBuildConstraints(graph, activeConstraints);
    const regret = evaluateRegret(graph, activeConstraints, active);
    const comparison = compareFutureCost(graph, constraints, active);
    const currentCost = solved.totalCostINR;
    return {
      horizon,
      activeConstraints,
      reusableDeviceIds: solved.selectedDeviceIds.filter((deviceId) => regret.some((item) => item.deviceId === deviceId && item.reusePotentialScore >= 50)),
      insufficientDeviceIds: solved.unsatisfiedConstraints.map((item) => item.constraintId),
      requiredAdditions: solved.conflictRadar.filter((item) => item.category === 'DISPLAY' || item.category === 'POWER').flatMap((item) => item.suggestedFixIds),
      requiredReplacements: regret.filter((item) => item.deadEndRiskScore >= 50).map((item) => item.deviceId),
      projectedTotalSpendINR: currentCost,
      replacementWasteINR: Object.values(comparison).find((item) => item.initialSpend === constraints.maxBudgetINR) ? 0 : regret.reduce((sum, item) => sum + item.estimatedReplacementWasteINR, 0),
      healthScore: solved.scoreBreakdown.overall,
      conflicts: solved.conflictRadar.map((item) => item.id),
      decisionTrace: solved.decisionTrace,
    };
  });
}

function horizonRank(horizon: FutureHorizon) {
  return horizon === 'NOW' ? 0 : horizon === '6_MONTHS' ? 1 : horizon === '12_MONTHS' ? 2 : horizon === '18_MONTHS' ? 3 : 4;
}

function scenarioToConstraintDelta(scenario: FutureScenario, current: BuildConstraints): Partial<BuildConstraints> {
  switch (scenario.type) {
    case 'ADD_SECOND_DISPLAY':
      return { minExternalDisplays: Math.max(current.minExternalDisplays ?? 0, 2) };
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
      return { requiredProtocols: [...current.requiredProtocols, 'NVME'] };
    case 'REDUCE_DESK_SPACE':
      return { maxDeskWidthMm: Math.max(600, (current.maxDeskWidthMm ?? 1200) - 300) };
    case 'INCREASE_POWER_REQUIREMENT':
      return { minimumLaptopChargingW: Math.max(100, (current.minimumLaptopChargingW ?? 65) + 35) };
  }
}
