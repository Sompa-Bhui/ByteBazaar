import type { BuildConstraints } from './constraints';
import type { BuildGraph } from './graph';
import { removeNode, removeEdge } from './graph';
import { buildLabDevices } from './data';
import { evaluateCompatibility, evaluateBuildHealth } from './compatibility';
import type { CompatibilityResult } from './types';
import { solveBuildConstraints, type Conflict } from './solver';

export type FailureEventType =
  | 'DEVICE_REMOVED'
  | 'DEVICE_FAILED'
  | 'CONNECTION_REMOVED'
  | 'CONNECTION_DEGRADED'
  | 'POWER_LOSS'
  | 'BANDWIDTH_DEGRADED'
  | 'HOST_UNAVAILABLE';

export type FailureEvent = {
  type: FailureEventType;
  targetDeviceId?: string;
  targetEdgeId?: string;
  degradation?: number;
};

export type SimulationResult = {
  impactedDeviceIds: string[];
  directlyImpactedDeviceIds: string[];
  transitivelyImpactedDeviceIds: string[];
  brokenDependencyPaths: string[][];
  newlyOrphanedDeviceIds: string[];
  newCompatibilityConflicts: CompatibilityResult[];
  newlyViolatedConstraintIds: string[];
  healthBefore: number;
  healthAfter: number;
  healthDelta: number;
  criticalityScore: number;
  recoveryOptions: RecoveryOption[];
  propagationTrace: string[];
  graphAfter: BuildGraph;
};

export type RecoveryOption = {
  id: string;
  title: string;
  operations: string[];
  recoveredCapabilities: string[];
  unresolvedImpacts: string[];
  costDeltaINR: number;
  healthRecovery: number;
  newConflicts: string[];
  tradeoffs: string[];
};

function deviceById(id?: string) {
  return buildLabDevices.find((device) => device.id === id) ?? null;
}

export function simulateFailure(graph: BuildGraph, event: FailureEvent, constraints: BuildConstraints) {
  let nextGraph = {
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };

  const trace: string[] = [];
  const directlyImpacted: string[] = [];
  const transitivelyImpacted: string[] = [];
  const brokenPaths: string[][] = [];

  if (event.type === 'DEVICE_REMOVED' || event.type === 'DEVICE_FAILED' || event.type === 'HOST_UNAVAILABLE') {
    if (event.targetDeviceId) {
      directlyImpacted.push(event.targetDeviceId);
      trace.push(`Device ${event.targetDeviceId} removed from active graph.`);
      nextGraph = removeNode(nextGraph, event.targetDeviceId);
    }
  }

  if ((event.type === 'CONNECTION_REMOVED' || event.type === 'CONNECTION_DEGRADED' || event.type === 'POWER_LOSS' || event.type === 'BANDWIDTH_DEGRADED') && event.targetEdgeId) {
    nextGraph = removeEdge(nextGraph, event.targetEdgeId);
    trace.push(`Connection ${event.targetEdgeId} removed from active graph.`);
  }

  const sourceId = event.targetDeviceId ?? null;
  if (sourceId) {
    const sourceNode = graph.nodes.find((node) => node.deviceId === sourceId);
    if (sourceNode) {
      const visit = (nodeId: string, path: string[], seen: Set<string>) => {
        for (const edge of graph.edges.filter((item) => item.sourceId === nodeId)) {
          if (seen.has(edge.targetId)) continue;
          seen.add(edge.targetId);
          const targetNode = graph.nodes.find((node) => node.id === edge.targetId);
          if (targetNode) {
            transitivelyImpacted.push(targetNode.deviceId);
            brokenPaths.push([...path, targetNode.deviceId]);
            trace.push(`Propagation from ${nodeId} to ${targetNode.deviceId}.`);
            visit(targetNode.id, [...path, targetNode.deviceId], seen);
          }
        }
      };
      visit(sourceNode.id, [sourceId], new Set([sourceNode.id]));
    }
  }

  const resultCompatibility = evaluateCompatibility(nextGraph, buildLabDevices, constraints.primaryOS === 'ANY' ? 'Windows' : constraints.primaryOS);
  const beforeHealth = evaluateBuildHealth(graph, buildLabDevices, evaluateCompatibility(graph, buildLabDevices, constraints.primaryOS === 'ANY' ? 'Windows' : constraints.primaryOS)).overall;
  const afterHealth = evaluateBuildHealth(nextGraph, buildLabDevices, resultCompatibility).overall;
  const solverBefore = solveBuildConstraints(graph, constraints);
  const solverAfter = solveBuildConstraints(nextGraph, constraints);

  const newlyOrphaned = nextGraph.nodes.filter((node) => !nextGraph.edges.some((edge) => edge.sourceId === node.id || edge.targetId === node.id)).map((node) => node.deviceId);
  const impacted = Array.from(new Set([...directlyImpacted, ...transitivelyImpacted]));
  const criticalityScore = computeCriticality(graph, event.targetDeviceId, constraints);
  const recoveryOptions = buildRecoveryOptions(graph, event, constraints, solverAfter.conflictRadar, afterHealth);

  return {
    impactedDeviceIds: impacted,
    directlyImpactedDeviceIds: Array.from(new Set(directlyImpacted)),
    transitivelyImpactedDeviceIds: Array.from(new Set(transitivelyImpacted)),
    brokenDependencyPaths: brokenPaths,
    newlyOrphanedDeviceIds: newlyOrphaned,
    newCompatibilityConflicts: resultCompatibility.filter((item) => item.severity !== 'INFO'),
    newlyViolatedConstraintIds: solverAfter.unsatisfiedConstraints.map((item) => item.constraintId).filter((id) => !solverBefore.unsatisfiedConstraints.some((item) => item.constraintId === id)),
    healthBefore: beforeHealth,
    healthAfter: afterHealth,
    healthDelta: afterHealth - beforeHealth,
    criticalityScore,
    recoveryOptions,
    propagationTrace: trace,
    graphAfter: nextGraph,
  } satisfies SimulationResult;
}

export function computeCriticality(graph: BuildGraph, deviceId?: string, constraints?: BuildConstraints) {
  if (!deviceId) return 0;
  const node = graph.nodes.find((item) => item.deviceId === deviceId);
  if (!node) return 0;
  const direct = graph.edges.filter((edge) => edge.sourceId === node.id).length;
  const transitive = getTransitive(graph, node.id).length;
  const routes = new Set(graph.edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id).map((edge) => edge.connection)).size;
  const alternatives = Math.max(0, 3 - direct - Math.floor(transitive / 2));
  const hardRisk = constraints?.requiredDeviceCategories.includes(deviceById(deviceId)?.category as never) ? 10 : 0;
  const score = Math.min(100, direct * 16 + transitive * 8 + routes * 7 + hardRisk * 2 + (alternatives === 0 ? 20 : 0));
  return score;
}

export function criticalityLevel(score: number) {
  if (score >= 85) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

function getTransitive(graph: BuildGraph, nodeId: string) {
  const seen = new Set<string>();
  const walk = (current: string) => {
    for (const edge of graph.edges.filter((item) => item.sourceId === current)) {
      if (seen.has(edge.targetId)) continue;
      seen.add(edge.targetId);
      walk(edge.targetId);
    }
  };
  walk(nodeId);
  return Array.from(seen);
}

function buildRecoveryOptions(graph: BuildGraph, event: FailureEvent, constraints: BuildConstraints, conflicts: Conflict[], healthAfter: number): RecoveryOption[] {
  const options: RecoveryOption[] = [];
  if (event.targetDeviceId) {
    const target = deviceById(event.targetDeviceId);
    const alternatives = buildLabDevices.filter((device) => device.id !== event.targetDeviceId).slice(0, 3);
    for (const alt of alternatives) {
      options.push({
        id: `recovery-${alt.id}`,
        title: `Replace with ${alt.name}`,
        operations: [`replace ${event.targetDeviceId} with ${alt.id}`],
        recoveredCapabilities: [target?.category ?? 'DEVICE'],
        unresolvedImpacts: [],
        costDeltaINR: alt.price - (target?.price ?? 0),
        healthRecovery: Math.max(0, healthAfter + 6),
        newConflicts: conflicts.filter((item) => item.severity === 'ERROR').map((item) => item.id).slice(0, 1),
        tradeoffs: ['Potential cost increase', 'New compatibility check required'],
      });
    }
    options.unshift({
      id: 'bypass-degraded',
      title: 'Accept degraded mode',
      operations: ['remove failing dependency', 'retain remaining devices'],
      recoveredCapabilities: [],
      unresolvedImpacts: ['Reduced functionality'],
      costDeltaINR: 0,
      healthRecovery: Math.max(0, healthAfter + 2),
      newConflicts: [],
      tradeoffs: ['Lower capability'],
    });
  }
  return options.slice(0, 4);
}
