import { buildLabDevices } from './data';
import { addEdge, addNode, removeEdge, removeNode, selectNode, type BuildGraph } from './graph';
import { evaluateBuildHealth, evaluateCompatibility } from './compatibility';
import type { BuildConstraints } from './constraints';
import { solveBuildConstraints, type SolverStrategy } from './solver';
import type { AutoFixPlan } from './autofix';
import type { RecoveryOption } from './simulation';
import type { BuildEdge } from './types';

export type TransactionSource = 'USER' | 'AUTO_FIX' | 'RECOVERY' | 'SOLVER_STRATEGY' | 'BRANCH_APPLY';

export type TransactionOperation =
  | {
      id: string;
      type: 'ADD_DEVICE';
      reason: string;
      source: TransactionSource;
      payload: { deviceId: string; select?: boolean };
      affectedConflictIds?: string[];
      affectedConstraintIds?: string[];
    }
  | {
      id: string;
      type: 'REMOVE_DEVICE';
      reason: string;
      source: TransactionSource;
      payload: { deviceId: string };
      affectedConflictIds?: string[];
      affectedConstraintIds?: string[];
    }
  | {
      id: string;
      type: 'REPLACE_DEVICE';
      reason: string;
      source: TransactionSource;
      payload: { fromDeviceId: string; toDeviceId: string; select?: boolean };
      affectedConflictIds?: string[];
      affectedConstraintIds?: string[];
    }
  | {
      id: string;
      type: 'ADD_EDGE';
      reason: string;
      source: TransactionSource;
      payload: { sourceDeviceId: string; targetDeviceId: string; connection: BuildEdge['connection']; status: BuildEdge['status']; edgeId?: string };
      affectedConflictIds?: string[];
      affectedConstraintIds?: string[];
    }
  | {
      id: string;
      type: 'REMOVE_EDGE';
      reason: string;
      source: TransactionSource;
      payload: { edgeId: string };
      affectedConflictIds?: string[];
      affectedConstraintIds?: string[];
    }
  | {
      id: string;
      type: 'REPLACE_EDGE';
      reason: string;
      source: TransactionSource;
      payload: { edgeId: string; sourceDeviceId: string; targetDeviceId: string; connection: BuildEdge['connection']; status: BuildEdge['status'] };
      affectedConflictIds?: string[];
      affectedConstraintIds?: string[];
    }
  | {
      id: string;
      type: 'UPDATE_CONSTRAINTS';
      reason: string;
      source: TransactionSource;
      payload: { patch: Partial<BuildConstraints> };
      affectedConflictIds?: string[];
      affectedConstraintIds?: string[];
    };

export type BuildTransaction = {
  id: string;
  source: TransactionSource;
  title: string;
  createdAt: string;
  baseRevision: number;
  operations: TransactionOperation[];
  expectedResolvedConflictIds: string[];
  metadata: Record<string, string | number | boolean | null | string[]>;
};

export type BuildSnapshotSummary = {
  revision: number;
  nodeCount: number;
  edgeCount: number;
  deviceIds: string[];
  totalCostINR: number;
  health: number;
  hardViolations: number;
  warnings: number;
  conflicts: string[];
};

export type TransactionValidationResult = {
  valid: boolean;
  reasons: string[];
};

export type AppliedTransactionResult = {
  success: boolean;
  nextGraph: BuildGraph;
  nextConstraints: BuildConstraints;
  appliedOperations: TransactionOperation[];
  rejectedOperations: { operationId: string; reason: string }[];
  validation: TransactionValidationResult;
  inverseTransaction: BuildTransaction | null;
  before: BuildSnapshotSummary;
  after: BuildSnapshotSummary;
  actualResolvedConflictIds: string[];
  actualIntroducedConflictIds: string[];
  healthDelta: number;
  priceDeltaINR: number;
};

export type BuildHistoryEntry = {
  revision: number;
  transaction: BuildTransaction;
  before: BuildSnapshotSummary;
  after: BuildSnapshotSummary;
  beforeGraph: BuildGraph;
  beforeConstraints: BuildConstraints;
  afterGraph: BuildGraph;
  afterConstraints: BuildConstraints;
  inverseTransaction: BuildTransaction;
  actualResolvedConflictIds: string[];
  actualIntroducedConflictIds: string[];
  healthDelta: number;
  priceDeltaINR: number;
};

export type BuildMutationState = {
  graph: BuildGraph;
  constraints: BuildConstraints;
  revision: number;
  history: BuildHistoryEntry[];
  redoStack: BuildHistoryEntry[];
};

export type BuildMutationOutcome =
  | { stale: false; state: BuildMutationState; result: AppliedTransactionResult }
  | { stale: true; state: BuildMutationState; result: null; rejectionReason: string };

function deviceById(deviceId: string) {
  return buildLabDevices.find((device) => device.id === deviceId) ?? null;
}

function cloneGraph(graph: BuildGraph): BuildGraph {
  return {
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

function edgeIdFor(sourceDeviceId: string, targetDeviceId: string, connection: BuildEdge['connection']) {
  return `edge-node-${sourceDeviceId}-node-${targetDeviceId}-${connection}`;
}

function summarize(graph: BuildGraph, constraints: BuildConstraints, revision: number): BuildSnapshotSummary {
  const hostOs = constraints.primaryOS === 'ANY' ? 'Windows' : constraints.primaryOS;
  const compatibility = evaluateCompatibility(graph, buildLabDevices, hostOs);
  const health = evaluateBuildHealth(graph, buildLabDevices, compatibility);
  const solver = solveBuildConstraints(graph, constraints);
  return {
    revision,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    deviceIds: graph.nodes.map((node) => node.deviceId),
    totalCostINR: graph.nodes.reduce((sum, node) => sum + (deviceById(node.deviceId)?.price ?? 0), 0),
    health: health.overall,
    hardViolations: solver.hardViolations.length,
    warnings: compatibility.filter((item) => item.severity === 'WARNING').length,
    conflicts: solver.conflictRadar.map((item) => item.id),
  };
}

function validateOperation(operation: TransactionOperation, graph: BuildGraph, constraints: BuildConstraints): string | null {
  switch (operation.type) {
    case 'ADD_DEVICE':
      if (!deviceById(operation.payload.deviceId)) return `Unknown device ${operation.payload.deviceId}.`;
      if (graph.nodes.some((node) => node.deviceId === operation.payload.deviceId)) return `Device ${operation.payload.deviceId} already exists in the build.`;
      return null;
    case 'REMOVE_DEVICE':
      if (!graph.nodes.some((node) => node.deviceId === operation.payload.deviceId)) return `Device ${operation.payload.deviceId} does not exist in the build.`;
      return null;
    case 'REPLACE_DEVICE':
      if (!graph.nodes.some((node) => node.deviceId === operation.payload.fromDeviceId)) return `Replacement source ${operation.payload.fromDeviceId} does not exist in the build.`;
      if (!deviceById(operation.payload.toDeviceId)) return `Replacement target ${operation.payload.toDeviceId} does not exist in the catalog.`;
      if (constraints.excludedDeviceIds.includes(operation.payload.toDeviceId)) return `Replacement target ${operation.payload.toDeviceId} is excluded.`;
      return null;
    case 'ADD_EDGE':
      if (!graph.nodes.some((node) => node.deviceId === operation.payload.sourceDeviceId)) return `Source device ${operation.payload.sourceDeviceId} does not exist in the build.`;
      if (!graph.nodes.some((node) => node.deviceId === operation.payload.targetDeviceId)) return `Target device ${operation.payload.targetDeviceId} does not exist in the build.`;
      return null;
    case 'REMOVE_EDGE':
      if (!graph.edges.some((edge) => edge.id === operation.payload.edgeId)) return `Edge ${operation.payload.edgeId} does not exist in the build.`;
      return null;
    case 'REPLACE_EDGE':
      if (!graph.edges.some((edge) => edge.id === operation.payload.edgeId)) return `Edge ${operation.payload.edgeId} does not exist in the build.`;
      return null;
    case 'UPDATE_CONSTRAINTS':
      return null;
  }
}

function applyOperation(graph: BuildGraph, constraints: BuildConstraints, operation: TransactionOperation) {
  let nextGraph = cloneGraph(graph);
  let nextConstraints = { ...constraints };
  switch (operation.type) {
    case 'ADD_DEVICE':
      nextGraph = addNode(nextGraph, operation.payload.deviceId);
      if (operation.payload.select) nextGraph = selectNode(nextGraph, operation.payload.deviceId);
      break;
    case 'REMOVE_DEVICE':
      nextGraph = removeNode(nextGraph, operation.payload.deviceId);
      break;
    case 'REPLACE_DEVICE':
      nextGraph = removeNode(nextGraph, operation.payload.fromDeviceId);
      nextGraph = addNode(nextGraph, operation.payload.toDeviceId);
      if (operation.payload.select) nextGraph = selectNode(nextGraph, operation.payload.toDeviceId);
      break;
    case 'ADD_EDGE':
      nextGraph = addEdge(nextGraph, operation.payload.sourceDeviceId, operation.payload.targetDeviceId, operation.payload.connection, operation.payload.status);
      break;
    case 'REMOVE_EDGE':
      nextGraph = removeEdge(nextGraph, operation.payload.edgeId);
      break;
    case 'REPLACE_EDGE':
      nextGraph = removeEdge(nextGraph, operation.payload.edgeId);
      nextGraph = addEdge(nextGraph, operation.payload.sourceDeviceId, operation.payload.targetDeviceId, operation.payload.connection, operation.payload.status);
      break;
    case 'UPDATE_CONSTRAINTS':
      nextConstraints = { ...nextConstraints, ...operation.payload.patch };
      break;
  }
  return { graph: nextGraph, constraints: nextConstraints };
}

function buildInverseOperation(operation: TransactionOperation, beforeGraph: BuildGraph, beforeConstraints: BuildConstraints): TransactionOperation {
  switch (operation.type) {
    case 'ADD_DEVICE':
      return { id: `${operation.id}:inverse`, type: 'REMOVE_DEVICE', reason: `Undo ${operation.reason}`, source: operation.source, payload: { deviceId: operation.payload.deviceId } };
    case 'REMOVE_DEVICE':
      return { id: `${operation.id}:inverse`, type: 'ADD_DEVICE', reason: `Undo ${operation.reason}`, source: operation.source, payload: { deviceId: operation.payload.deviceId } };
    case 'REPLACE_DEVICE':
      return { id: `${operation.id}:inverse`, type: 'REPLACE_DEVICE', reason: `Undo ${operation.reason}`, source: operation.source, payload: { fromDeviceId: operation.payload.toDeviceId, toDeviceId: operation.payload.fromDeviceId, select: operation.payload.select } };
    case 'ADD_EDGE':
      return {
        id: `${operation.id}:inverse`,
        type: 'REMOVE_EDGE',
        reason: `Undo ${operation.reason}`,
        source: operation.source,
        payload: { edgeId: operation.payload.edgeId ?? edgeIdFor(operation.payload.sourceDeviceId, operation.payload.targetDeviceId, operation.payload.connection) },
      };
    case 'REMOVE_EDGE': {
      const edge = beforeGraph.edges.find((item) => item.id === operation.payload.edgeId);
      if (!edge) {
        return { id: `${operation.id}:inverse`, type: 'ADD_EDGE', reason: `Undo ${operation.reason}`, source: operation.source, payload: { sourceDeviceId: '', targetDeviceId: '', connection: 'USB_C', status: 'valid', edgeId: '' } };
      }
      const sourceDeviceId = beforeGraph.nodes.find((node) => node.id === edge.sourceId)?.deviceId ?? '';
      const targetDeviceId = beforeGraph.nodes.find((node) => node.id === edge.targetId)?.deviceId ?? '';
      return { id: `${operation.id}:inverse`, type: 'ADD_EDGE', reason: `Undo ${operation.reason}`, source: operation.source, payload: { sourceDeviceId, targetDeviceId, connection: edge.connection, status: edge.status, edgeId: edge.id } };
    }
    case 'REPLACE_EDGE':
      return { id: `${operation.id}:inverse`, type: 'REPLACE_EDGE', reason: `Undo ${operation.reason}`, source: operation.source, payload: { edgeId: operation.payload.edgeId, sourceDeviceId: operation.payload.targetDeviceId, targetDeviceId: operation.payload.sourceDeviceId, connection: operation.payload.connection, status: operation.payload.status } };
    case 'UPDATE_CONSTRAINTS': {
      const patch = Object.fromEntries(Object.keys(operation.payload.patch).map((key) => [key, beforeConstraints[key as keyof BuildConstraints]])) as Partial<BuildConstraints>;
      return { id: `${operation.id}:inverse`, type: 'UPDATE_CONSTRAINTS', reason: `Undo ${operation.reason}`, source: operation.source, payload: { patch } };
    }
  }
}

function createInverseTransaction(transaction: BuildTransaction, beforeGraph: BuildGraph, beforeConstraints: BuildConstraints): BuildTransaction {
  return {
    id: `${transaction.id}:inverse`,
    source: transaction.source,
    title: `Undo ${transaction.title}`,
    createdAt: transaction.createdAt,
    baseRevision: transaction.baseRevision + 1,
    operations: [...transaction.operations].reverse().map((operation) => buildInverseOperation(operation, beforeGraph, beforeConstraints)),
    expectedResolvedConflictIds: [],
    metadata: { replayOf: transaction.id },
  };
}

export function applyBuildTransaction(state: BuildMutationState, transaction: BuildTransaction): BuildMutationOutcome {
  if (transaction.baseRevision !== state.revision) {
    return { stale: true, state, result: null, rejectionReason: 'The build changed after this preview was generated. Recompute the plan.' };
  }

  let workingGraph = cloneGraph(state.graph);
  let workingConstraints = { ...state.constraints };
  const rejectedOperations: { operationId: string; reason: string }[] = [];
  const appliedOperations: TransactionOperation[] = [];

  for (const operation of transaction.operations) {
    const reason = validateOperation(operation, workingGraph, workingConstraints);
    if (reason) {
      rejectedOperations.push({ operationId: operation.id, reason });
      const summary = summarize(state.graph, state.constraints, state.revision);
      return {
        stale: false,
        state,
        result: {
          success: false,
          nextGraph: state.graph,
          nextConstraints: state.constraints,
          appliedOperations: [],
          rejectedOperations,
          validation: { valid: false, reasons: [reason] },
          inverseTransaction: null,
          before: summary,
          after: summary,
          actualResolvedConflictIds: [],
          actualIntroducedConflictIds: [],
          healthDelta: 0,
          priceDeltaINR: 0,
        },
      };
    }
    const next = applyOperation(workingGraph, workingConstraints, operation);
    workingGraph = next.graph;
    workingConstraints = next.constraints;
    appliedOperations.push(operation);
  }

  const before = summarize(state.graph, state.constraints, state.revision);
  const after = summarize(workingGraph, workingConstraints, state.revision + 1);
  const hostOs = workingConstraints.primaryOS === 'ANY' ? 'Windows' : workingConstraints.primaryOS;
  const compatibility = evaluateCompatibility(workingGraph, buildLabDevices, hostOs);
  const health = evaluateBuildHealth(workingGraph, buildLabDevices, compatibility);
  const actualResolvedConflictIds = before.conflicts.filter((id) => !after.conflicts.includes(id));
  const actualIntroducedConflictIds = after.conflicts.filter((id) => !before.conflicts.includes(id));
  const verificationIssues: string[] = [];
  const beforeHardViolations = before.hardViolations;
  const afterHardViolations = after.hardViolations;
  if (afterHardViolations > beforeHardViolations) verificationIssues.push('Post-validation introduced a worse hard violation.');
  if (health.overall < before.health - 25) verificationIssues.push('Post-validation health regressed beyond acceptable bounds.');
  for (const expected of transaction.expectedResolvedConflictIds) {
    if (!actualResolvedConflictIds.includes(expected)) verificationIssues.push(`Expected conflict ${expected} was not resolved.`);
  }

  if (verificationIssues.length) {
    return {
      stale: false,
      state,
      result: {
        success: false,
        nextGraph: state.graph,
        nextConstraints: state.constraints,
        appliedOperations: [],
        rejectedOperations: rejectedOperations.length ? rejectedOperations : transaction.operations.map((operation) => ({ operationId: operation.id, reason: 'Transaction rejected during verification.' })),
        validation: { valid: false, reasons: verificationIssues },
        inverseTransaction: null,
        before,
        after,
        actualResolvedConflictIds,
        actualIntroducedConflictIds,
        healthDelta: after.health - before.health,
        priceDeltaINR: after.totalCostINR - before.totalCostINR,
      },
    };
  }

  const inverseTransaction = createInverseTransaction(transaction, state.graph, state.constraints);
  const nextState: BuildMutationState = {
    graph: workingGraph,
    constraints: workingConstraints,
    revision: state.revision + 1,
    history: [
      ...state.history,
      {
        revision: state.revision + 1,
        transaction,
        before,
        after,
        beforeGraph: state.graph,
        beforeConstraints: state.constraints,
        afterGraph: workingGraph,
        afterConstraints: workingConstraints,
        inverseTransaction,
        actualResolvedConflictIds,
        actualIntroducedConflictIds,
        healthDelta: after.health - before.health,
        priceDeltaINR: after.totalCostINR - before.totalCostINR,
      },
    ],
    redoStack: [],
  };

  return {
    stale: false,
    state: nextState,
    result: {
      success: true,
      nextGraph: workingGraph,
      nextConstraints: workingConstraints,
      appliedOperations,
      rejectedOperations: [],
      validation: { valid: true, reasons: [] },
      inverseTransaction,
      before,
      after,
      actualResolvedConflictIds,
      actualIntroducedConflictIds,
      healthDelta: after.health - before.health,
      priceDeltaINR: after.totalCostINR - before.totalCostINR,
    },
  };
}

export function undoLastTransaction(state: BuildMutationState) {
  const historyEntry = state.history[state.history.length - 1];
  if (!historyEntry) return { state, result: null };
  const nextState: BuildMutationState = {
    graph: historyEntry.beforeGraph,
    constraints: historyEntry.beforeConstraints,
    revision: Math.max(0, state.revision - 1),
    history: state.history.slice(0, -1),
    redoStack: [historyEntry, ...state.redoStack],
  };
  return {
    state: nextState,
    result: {
      success: true,
      nextGraph: historyEntry.beforeGraph,
      nextConstraints: historyEntry.beforeConstraints,
      appliedOperations: historyEntry.inverseTransaction.operations,
      rejectedOperations: [],
      validation: { valid: true, reasons: [] },
      inverseTransaction: historyEntry.transaction,
      before: historyEntry.after,
      after: historyEntry.before,
      actualResolvedConflictIds: historyEntry.actualIntroducedConflictIds,
      actualIntroducedConflictIds: historyEntry.actualResolvedConflictIds,
      healthDelta: -historyEntry.healthDelta,
      priceDeltaINR: -historyEntry.priceDeltaINR,
    },
  };
}

export function redoLastTransaction(state: BuildMutationState) {
  const redoEntry = state.redoStack[0];
  if (!redoEntry) return { state, result: null };
  const nextState: BuildMutationState = {
    graph: redoEntry.afterGraph,
    constraints: redoEntry.afterConstraints,
    revision: state.revision + 1,
    history: [...state.history, redoEntry],
    redoStack: state.redoStack.slice(1),
  };
  return {
    state: nextState,
    result: {
      success: true,
      nextGraph: redoEntry.afterGraph,
      nextConstraints: redoEntry.afterConstraints,
      appliedOperations: redoEntry.transaction.operations,
      rejectedOperations: [],
      validation: { valid: true, reasons: [] },
      inverseTransaction: redoEntry.inverseTransaction,
      before: redoEntry.before,
      after: redoEntry.after,
      actualResolvedConflictIds: redoEntry.actualResolvedConflictIds,
      actualIntroducedConflictIds: redoEntry.actualIntroducedConflictIds,
      healthDelta: redoEntry.healthDelta,
      priceDeltaINR: redoEntry.priceDeltaINR,
    },
  };
}

export function transactionFromAutoFix(plan: AutoFixPlan, revision: number): BuildTransaction {
  return {
    id: plan.id,
    source: 'AUTO_FIX',
    title: plan.title,
    createdAt: new Date().toISOString(),
    baseRevision: revision,
    operations: plan.operations.map((operation, index) => {
      switch (operation.type) {
        case 'add-device':
          return { id: `${plan.id}:op-${index}`, type: 'ADD_DEVICE', reason: plan.explanation, source: 'AUTO_FIX', payload: { deviceId: operation.deviceId, select: true }, affectedConflictIds: plan.conflictsResolved };
        case 'remove-device':
          return { id: `${plan.id}:op-${index}`, type: 'REMOVE_DEVICE', reason: plan.explanation, source: 'AUTO_FIX', payload: { deviceId: operation.deviceId }, affectedConflictIds: plan.conflictsResolved };
        case 'replace-device':
          return { id: `${plan.id}:op-${index}`, type: 'REPLACE_DEVICE', reason: plan.explanation, source: 'AUTO_FIX', payload: { fromDeviceId: operation.fromDeviceId, toDeviceId: operation.toDeviceId, select: true }, affectedConflictIds: plan.conflictsResolved };
        case 'replace-edge':
          return { id: `${plan.id}:op-${index}`, type: 'REPLACE_EDGE', reason: plan.explanation, source: 'AUTO_FIX', payload: { edgeId: (operation as { edgeId?: string }).edgeId ?? edgeIdFor(operation.fromDeviceId, operation.toDeviceId, operation.connection as BuildEdge['connection']), sourceDeviceId: operation.fromDeviceId, targetDeviceId: operation.toDeviceId, connection: operation.connection as BuildEdge['connection'], status: 'valid' }, affectedConflictIds: plan.conflictsResolved };
        case 'downgrade-requirement':
          return { id: `${plan.id}:op-${index}`, type: 'UPDATE_CONSTRAINTS', reason: operation.explanation, source: 'AUTO_FIX', payload: { patch: {} }, affectedConflictIds: plan.conflictsResolved };
      }
    }),
    expectedResolvedConflictIds: plan.conflictsResolved,
    metadata: { selectedDeviceIds: [] },
  };
}

export function transactionFromRecovery(option: RecoveryOption, revision: number): BuildTransaction {
  return {
    id: option.id,
    source: 'RECOVERY',
    title: option.title,
    createdAt: new Date().toISOString(),
    baseRevision: revision,
    operations: option.operations.map((operation, index) => {
      if (operation.startsWith('replace ')) {
        const [, fromDeviceId, , toDeviceId] = operation.split(' ');
        return {
          id: `${option.id}:op-${index}`,
          type: 'REPLACE_DEVICE',
          reason: option.title,
          source: 'RECOVERY',
          payload: { fromDeviceId: fromDeviceId ?? '', toDeviceId: toDeviceId ?? '', select: true },
        };
      }
      if (operation.startsWith('remove ')) {
        const [, deviceId] = operation.split(' ');
        return {
          id: `${option.id}:op-${index}`,
          type: 'REMOVE_DEVICE',
          reason: option.title,
          source: 'RECOVERY',
          payload: { deviceId: deviceId ?? '' },
        };
      }
      return {
        id: `${option.id}:op-${index}`,
        type: 'UPDATE_CONSTRAINTS',
        reason: option.title,
        source: 'RECOVERY',
        payload: { patch: {} },
      };
    }),
    expectedResolvedConflictIds: [],
    metadata: { unresolvedImpacts: option.unresolvedImpacts },
  };
}

export function transactionFromStrategy(strategy: SolverStrategy, graph: BuildGraph, constraints: BuildConstraints, revision: number) {
  const solver = solveBuildConstraints(graph, constraints, strategy);
  const existing = new Set(graph.nodes.map((node) => node.deviceId));
  const next = new Set(solver.graph.nodes.map((node) => node.deviceId));
  const operations: TransactionOperation[] = [];
  for (const deviceId of existing) {
    if (!next.has(deviceId)) {
      operations.push({ id: `${strategy}:remove-${deviceId}`, type: 'REMOVE_DEVICE', reason: `Apply ${strategy} strategy`, source: 'SOLVER_STRATEGY', payload: { deviceId } });
    }
  }
  for (const deviceId of next) {
    if (!existing.has(deviceId)) {
      operations.push({ id: `${strategy}:add-${deviceId}`, type: 'ADD_DEVICE', reason: `Apply ${strategy} strategy`, source: 'SOLVER_STRATEGY', payload: { deviceId } });
    }
  }
  return {
    transaction: {
      id: `strategy-${strategy.toLowerCase()}`,
      source: 'SOLVER_STRATEGY' as const,
      title: `${strategy} strategy`,
      createdAt: new Date().toISOString(),
      baseRevision: revision,
      operations,
      expectedResolvedConflictIds: solver.conflictRadar.map((item) => item.id),
      metadata: { strategy },
    },
    solver,
  };
}

export function replayTransactions(initial: BuildMutationState, transactions: BuildTransaction[]) {
  let state = initial;
  for (const transaction of transactions) {
    const applied = applyBuildTransaction(state, transaction);
    if (applied.stale || !applied.result.success) {
      return { state, success: false, failedTransactionId: transaction.id };
    }
    state = applied.state;
  }
  return { state, success: true, failedTransactionId: null };
}
