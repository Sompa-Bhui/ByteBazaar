const fs = require('fs');
const path = require('path');
const ts = require('typescript');

require.extensions['.ts'] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      isolatedModules: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { buildLabDevices } = require('../src/lib/build-lab/data.ts');
const { addNode, createEmptyBuildGraph, getDownstreamDevices, getOrphanDevices } = require('../src/lib/build-lab/graph.ts');
const { evaluateCompatibility, evaluateBuildHealth } = require('../src/lib/build-lab/compatibility.ts');
const { createDefaultConstraints } = require('../src/lib/build-lab/constraints.ts');
const { solveBuildConstraints } = require('../src/lib/build-lab/solver.ts');
const { generateAutoFixPlans } = require('../src/lib/build-lab/autofix.ts');
const { compareBranches } = require('../src/lib/build-lab/branching.ts');
const { BUILD_LAB_STORAGE_KEYS, resetBuildLabLocalStateStorage, resetCurrentDemoStorage } = require('../src/lib/build-lab/storage.ts');
const {
  applyBuildTransaction,
  redoLastTransaction,
  replayTransactions,
  transactionFromAutoFix,
  transactionFromRecovery,
  transactionFromStrategy,
  undoLastTransaction,
} = require('../src/lib/build-lab/transactions.ts');
const { createDemoScenarios, buildDemoProof, buildScenarioNarrative } = require('../src/lib/build-lab/demo.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findDevice(slug) {
  const device = buildLabDevices.find((item) => item.slug === slug);
  assert(device, `Missing device: ${slug}`);
  return device;
}

const laptop = findDevice('bytebook-air-m3');
const monitor = findDevice('byteview-34-ultrawide');
const dock = findDevice('bytedock-12-in-1');
const dockLite = findDevice('bytedock-lite');
const gpu = findDevice('bytegpu-core-4090');
const charger = findDevice('bytepower-140w');
const cable = findDevice('bytecable-usbc-hdmi');
const devBoard = findDevice('byteboard-dev-kit');

let graph = createEmptyBuildGraph();
graph = addNode(graph, laptop.id);
graph = addNode(graph, monitor.id);
graph = addNode(graph, dock.id);
graph = addNode(graph, dockLite.id);
graph = addNode(graph, gpu.id);
graph = addNode(graph, charger.id);
graph = addNode(graph, cable.id);
graph = addNode(graph, devBoard.id);
graph.edges = [
  { id: 'e1', sourceId: `node-${laptop.id}`, targetId: `node-${monitor.id}`, connection: 'USB_C', status: 'valid' },
  { id: 'e2', sourceId: `node-${charger.id}`, targetId: `node-${dock.id}`, connection: 'USB_C', status: 'warning' },
  { id: 'e5', sourceId: `node-${dockLite.id}`, targetId: `node-${monitor.id}`, connection: 'USB_C', status: 'warning' },
  { id: 'e3', sourceId: `node-${laptop.id}`, targetId: `node-${gpu.id}`, connection: 'USB_C', status: 'error' },
  { id: 'e4', sourceId: `node-${monitor.id}`, targetId: `node-${cable.id}`, connection: 'USB_C', status: 'warning' },
];

const results = evaluateCompatibility(graph, buildLabDevices, 'macOS');
const health = evaluateBuildHealth(graph, buildLabDevices, results);
const baseConstraints = createDefaultConstraints();
baseConstraints.maxBudgetINR = 150000;
baseConstraints.preferredBudgetINR = 120000;
baseConstraints.primaryOS = 'macOS';
baseConstraints.minExternalDisplays = 2;
baseConstraints.minimumLaptopChargingW = 100;
baseConstraints.requiredDeviceCategories = ['LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE'];
baseConstraints.prioritizePerformance = true;
baseConstraints.prioritizeBudget = false;
baseConstraints.prioritizeCompactness = true;

const solver = solveBuildConstraints(graph, baseConstraints, 'Balanced');
const fixes = generateAutoFixPlans(solver.conflictRadar, solver.selectedDeviceIds, baseConstraints);
const branchComparison = compareBranches(
  { graph, totalCostINR: solver.totalCostINR, health: solver.scoreBreakdown.overall, conflicts: solver.conflictRadar.map((item) => item.id) },
  { graph: solver.graph, totalCostINR: solver.totalCostINR + 5000, health: solver.scoreBreakdown.overall - 5, conflicts: solver.conflictRadar.slice(1).map((item) => item.id) },
);

const mutationBase = { graph, constraints: baseConstraints, revision: 0, history: [], redoStack: [] };
const autoFixTx = transactionFromAutoFix(fixes[0], 0);
const validTx = {
  id: 'tx-relax-constraints',
  source: 'USER',
  title: 'Relax constraints',
  createdAt: '2026-07-09T00:00:00.000Z',
  baseRevision: 0,
  operations: [
    { id: 'op-relax', type: 'UPDATE_CONSTRAINTS', reason: 'Relax unsupported requirements for the sample build', source: 'USER', payload: { patch: { maxBudgetINR: 1000000, preferredBudgetINR: 1000000, minExternalDisplays: 1, requiredDeviceCategories: ['LAPTOP', 'MONITOR'] } } },
  ],
  expectedResolvedConflictIds: [],
  metadata: {},
};
const applied = applyBuildTransaction(mutationBase, validTx);
const stale = applyBuildTransaction(mutationBase, { ...validTx, baseRevision: 1 });
const undo = applied.result.success ? undoLastTransaction(applied.state) : { state: applied.state, result: null };
const redo = undo.result ? redoLastTransaction(undo.state) : { state: undo.state, result: null };
const replay = replayTransactions(mutationBase, [validTx]);
const strategyTx = transactionFromStrategy('Balanced', graph, baseConstraints, 0);
const strategyTx2 = transactionFromStrategy('Balanced', graph, baseConstraints, 0);
const recoveryTx = transactionFromRecovery(
  {
    id: 'rec-1',
    title: 'Recover dock',
    operations: ['replace dock-1 with dock-2'],
    recoveredCapabilities: ['DOCK'],
    unresolvedImpacts: [],
    costDeltaINR: 0,
    healthRecovery: 5,
    newConflicts: [],
    tradeoffs: [],
  },
  0,
);
const demoScenariosA = createDemoScenarios();
const demoScenariosB = createDemoScenarios();
const demoProof = buildDemoProof(demoScenariosA[0].graph, demoScenariosA[0].constraints);
const demoNarrative = buildScenarioNarrative(demoScenariosA[2].graph, demoScenariosA[2].constraints, demoScenariosA[2].futureScenarios);
const fakeStorage = {
  data: new Map([
    [BUILD_LAB_STORAGE_KEYS.state, 'state'],
    [BUILD_LAB_STORAGE_KEYS.intro, '1'],
    [BUILD_LAB_STORAGE_KEYS.activeDemo, 'demo'],
    ['unrelated', 'keep'],
  ]),
  removeItem(key) {
    this.data.delete(key);
  },
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  },
};
resetCurrentDemoStorage(fakeStorage);
resetBuildLabLocalStateStorage(fakeStorage);

assert(results.some((item) => item.severity === 'ERROR'), 'Expected at least one compatibility error');
assert(results.some((item) => item.severity === 'WARNING'), 'Expected at least one compatibility warning');
assert(results.some((item) => item.ruleId === 'orphan-device'), 'Expected orphan detection to run');
assert(health.overall >= 0 && health.overall <= 100, 'Overall health must be bounded');
assert(getDownstreamDevices(graph, laptop.id).length >= 1, 'Downstream dependency lookup failed');
assert(getOrphanDevices(graph).includes(devBoard.id), 'Expected orphan device detection');
assert(solver.hardViolations.length >= 1, 'Expected hard constraint rejection');
assert(solver.softTradeoffs.length >= 1, 'Expected soft tradeoff');
assert(solver.conflictRadar.some((item) => item.category === 'DISPLAY'), 'Expected multi-display conflict');
assert(solver.conflictRadar.some((item) => item.category === 'POWER'), 'Expected power conflict');
assert(solver.decisionTrace.length >= 3, 'Expected ordered decision trace');
assert(fixes.length >= 1, 'Expected at least one auto-fix plan');
assert(branchComparison.priceDeltaINR === 5000, 'Expected branch comparison delta');
assert(autoFixTx.operations.length >= 1, 'Expected auto-fix adapter to produce operations');
assert(applied.result.success, 'Expected valid transaction to commit');
assert(applied.state.revision === 1, 'Expected revision increment after commit');
assert(stale.stale, 'Expected stale transaction rejection');
assert(undo.result && undo.state.revision === 0, 'Expected undo to restore previous revision');
assert(redo.result && redo.state.revision === 1, 'Expected redo to restore committed revision');
assert(replay.success && replay.state.revision === 1, 'Expected replay to reconstruct committed state');
assert(JSON.stringify(strategyTx.transaction.operations) === JSON.stringify(strategyTx2.transaction.operations), 'Expected strategy transaction diff');
assert(recoveryTx.operations.length > 0, 'Expected recovery transaction diff');
assert(JSON.stringify(demoScenariosA) === JSON.stringify(demoScenariosB), 'Expected demo scenarios to be deterministic');
assert(demoProof.health >= 0 && demoProof.price >= 0, 'Expected proof values to be derived from actual data');
assert(demoNarrative.timeline.length >= 1, 'Expected future narrative timeline');
assert(!fakeStorage.data.has(BUILD_LAB_STORAGE_KEYS.state) && !fakeStorage.data.has(BUILD_LAB_STORAGE_KEYS.intro) && !fakeStorage.data.has(BUILD_LAB_STORAGE_KEYS.activeDemo), 'Expected Build Lab storage reset');
assert(fakeStorage.data.has('unrelated'), 'Expected unrelated storage to be preserved by helper logic');

console.log('Build Lab tests passed.');
