import type { BuildConstraints } from './constraints';
import type { BuildGraph } from './graph';

export type BuildBranch = {
  id: string;
  name: string;
  baseBranchId: string | null;
  graph: BuildGraph;
  constraints: BuildConstraints;
  createdAt: string;
};

export type BranchComparison = {
  priceDeltaINR: number;
  healthDelta: number;
  devicesAdded: string[];
  devicesRemoved: string[];
  conflictsResolved: string[];
  conflictsIntroduced: string[];
};

export function compareBranches(original: { graph: BuildGraph; totalCostINR: number; health: number; conflicts: string[] }, branch: { graph: BuildGraph; totalCostINR: number; health: number; conflicts: string[] }): BranchComparison {
  const originalIds = new Set(original.graph.nodes.map((node) => node.deviceId));
  const branchIds = new Set(branch.graph.nodes.map((node) => node.deviceId));
  return {
    priceDeltaINR: branch.totalCostINR - original.totalCostINR,
    healthDelta: branch.health - original.health,
    devicesAdded: Array.from(branchIds).filter((id) => !originalIds.has(id)),
    devicesRemoved: Array.from(originalIds).filter((id) => !branchIds.has(id)),
    conflictsResolved: original.conflicts.filter((id) => !branch.conflicts.includes(id)),
    conflictsIntroduced: branch.conflicts.filter((id) => !original.conflicts.includes(id)),
  };
}
