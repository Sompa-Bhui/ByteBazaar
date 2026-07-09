import type { BuildDevice, BuildHealthBreakdown, CompatibilityResult, ConnectorType } from './types';
import { getOrphanDevices, type BuildGraph } from './graph';

const connectorPairs: Record<ConnectorType, ConnectorType[]> = {
  USB_C: ['USB_C', 'THUNDERBOLT_4', 'HDMI'],
  THUNDERBOLT_4: ['THUNDERBOLT_4', 'USB_C', 'HDMI', 'DISPLAYPORT'],
  HDMI: ['HDMI'],
  DISPLAYPORT: ['DISPLAYPORT'],
  MINI_DISPLAYPORT: ['MINI_DISPLAYPORT', 'DISPLAYPORT'],
  PCIe: ['PCIe'],
  SATA: ['SATA'],
  NVME: ['NVME'],
  ETHERNET: ['ETHERNET'],
  AUX: ['AUX'],
  POWER_DC: ['POWER_DC', 'BARREL'],
  BARREL: ['BARREL', 'POWER_DC'],
  USB_A: ['USB_A'],
};

function deviceById(devices: BuildDevice[], id: string) {
  return devices.find((device) => device.id === id) ?? null;
}

function hasAny(list: ConnectorType[] | undefined, candidates: ConnectorType[]) {
  return Boolean(list?.some((item) => candidates.includes(item)));
}

export function evaluateCompatibility(graph: BuildGraph, devices: BuildDevice[], hostOs: 'macOS' | 'Windows' | 'Linux' | 'Universal' = 'Windows') {
  const results: CompatibilityResult[] = [];
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const selectedDevices = graph.nodes.map((node) => deviceById(devices, node.deviceId)).filter(Boolean) as BuildDevice[];

  for (const edge of graph.edges) {
    const sourceNode = nodesById.get(edge.sourceId);
    const targetNode = nodesById.get(edge.targetId);
    if (!sourceNode || !targetNode) continue;
    const source = deviceById(devices, sourceNode.deviceId);
    const target = deviceById(devices, targetNode.deviceId);
    if (!source || !target) continue;

    const sourceOutputs = source.capabilities.outputs ?? source.capabilities.ports ?? [];
    const targetInputs = target.capabilities.inputs ?? target.capabilities.ports ?? [];
    const connectorCompatible = targetInputs.some((input) => connectorPairs[edge.connection].includes(input));

    if (!connectorCompatible) {
      results.push({
        id: `connector-${edge.id}`,
        severity: 'ERROR',
        title: `${source.name} cannot connect to ${target.name}`,
        explanation: `The selected connection uses ${edge.connection}, but the source and target do not expose compatible ports.`,
        involvedDeviceIds: [source.id, target.id],
        ruleId: 'connector-compatibility',
        suggestedFix: 'Choose a supported cable or insert a compatible dock/adapter.',
      });
    }

    if (target.category === 'MONITOR') {
      const sourceCanDisplay = hasAny(sourceOutputs, ['HDMI', 'DISPLAYPORT', 'THUNDERBOLT_4', 'USB_C']);
      if (!sourceCanDisplay) {
        results.push({
          id: `display-source-${edge.id}`,
          severity: 'ERROR',
          title: `${source.name} cannot drive ${target.name}`,
          explanation: 'The source device does not provide a display output path.',
          involvedDeviceIds: [source.id, target.id],
          ruleId: 'display-source-path',
          suggestedFix: 'Use a laptop, desktop, dock, or GPU with display output.',
        });
      }
      if (target.capabilities.maxDisplayResolution && source.capabilities.bandwidthGbps !== undefined && source.capabilities.bandwidthGbps < 18) {
        results.push({
          id: `display-bandwidth-${edge.id}`,
          severity: 'WARNING',
          title: `${source.name} may bottleneck ${target.name}`,
          explanation: 'The connection bandwidth may be tight for this display configuration.',
          involvedDeviceIds: [source.id, target.id],
          ruleId: 'display-bandwidth',
          suggestedFix: 'Use Thunderbolt 4 or DisplayPort for higher refresh/resolution headroom.',
        });
      }
      if (target.capabilities.maxDisplayResolution && target.capabilities.maxRefreshHz && target.capabilities.maxRefreshHz > 120 && source.capabilities.bandwidthGbps !== undefined && source.capabilities.bandwidthGbps < 40) {
        results.push({
          id: `high-refresh-${edge.id}`,
          severity: 'WARNING',
          title: `${target.name} is running near bandwidth limits`,
          explanation: `The requested ${target.capabilities.maxRefreshHz}Hz display path may exceed lighter connection types.`,
          involvedDeviceIds: [source.id, target.id],
          ruleId: 'high-refresh-bandwidth',
          suggestedFix: 'Prefer Thunderbolt 4 or DisplayPort when driving high refresh ultrawides.',
        });
      }
    }

    if (target.category === 'DOCK') {
      const requiredPower = target.capabilities.powerOutputW ?? 0;
      const upstreamPower = source.capabilities.powerOutputW ?? 0;
      if (requiredPower > 0 && upstreamPower > 0 && upstreamPower < requiredPower) {
        results.push({
          id: `power-${edge.id}`,
          severity: 'WARNING',
          title: `${target.name} may not charge at full speed`,
          explanation: "The upstream power budget is below the dock's maximum delivery requirement.",
          involvedDeviceIds: [source.id, target.id],
          ruleId: 'power-delivery',
          suggestedFix: 'Use a higher wattage charger or a dock with lower pass-through demand.',
        });
      }
    }

    if (target.category === 'GPU') {
      if (source.category !== 'DESKTOP') {
        results.push({
          id: `gpu-host-${edge.id}`,
          severity: 'ERROR',
          title: `${target.name} requires a desktop host`,
          explanation: 'This external GPU path is only valid through a desktop-class PCIe host in Phase 1.',
          involvedDeviceIds: [source.id, target.id],
          ruleId: 'gpu-host-requirement',
          suggestedFix: 'Attach the GPU to a desktop workstation with a PCIe slot.',
        });
      }
    }
  }

  const orphanIds = getOrphanDevices(graph);
  for (const deviceId of orphanIds) {
    const device = deviceById(devices, deviceId);
    if (!device) continue;
    results.push({
      id: `orphan-${device.id}`,
      severity: 'INFO',
      title: `${device.name} is not connected`,
      explanation: 'This device is present in the build but does not participate in any relationship yet.',
      involvedDeviceIds: [device.id],
      ruleId: 'orphan-device',
    });
  }

  for (const device of selectedDevices) {
    const osSupport = device.capabilities.operatingSystems;
    if (osSupport && !osSupport.includes('Universal') && !osSupport.includes(hostOs)) {
      results.push({
        id: `os-${device.id}`,
        severity: 'WARNING',
        title: `${device.name} may need driver or OS validation`,
        explanation: `This device is marked for ${osSupport.join(', ')} and may not be ideal in a ${hostOs} build.`,
        involvedDeviceIds: [device.id],
        ruleId: 'os-compatibility',
        suggestedFix: 'Verify drivers or choose a device tagged Universal.',
      });
    }
  }

  return results;
}

export function evaluateBuildHealth(graph: BuildGraph, devices: BuildDevice[], results: CompatibilityResult[]): BuildHealthBreakdown {
  const errors = results.filter((item) => item.severity === 'ERROR').length;
  const warnings = results.filter((item) => item.severity === 'WARNING').length;
  const validRelationships = graph.edges.filter((edge) => edge.status === 'valid').length;

  const deviceTotal = Math.max(1, graph.nodes.length);
  const compatibility = Math.max(0, 100 - errors * 28 - warnings * 8);
  const performanceFit = Math.max(0, Math.round(devices.reduce((sum, device) => sum + device.scoreWeight, 0) / Math.max(1, deviceTotal)));
  const upgradeability = Math.max(0, 100 - Math.max(0, 3 - validRelationships) * 10 - errors * 5);
  const budget = Math.max(0, 100 - Math.max(0, Math.round(graph.nodes.reduce((sum, node) => sum + (deviceById(devices, node.deviceId)?.price ?? 0), 0) / 100000) - 60));

  const overall = Math.max(0, Math.min(100, Math.round(compatibility * 0.4 + performanceFit * 0.25 + upgradeability * 0.2 + budget * 0.15)));

  return {
    compatibility,
    performanceFit,
    upgradeability,
    budgetFit: budget,
    overall,
    validRelationships,
    warningCount: warnings,
    errorCount: errors,
  };
}

export function buildWhyScore(graph: BuildGraph, results: CompatibilityResult[], health: BuildHealthBreakdown) {
  const conflicts = results.filter((item) => item.severity === 'ERROR').slice(0, 3);
  const warnings = results.filter((item) => item.severity === 'WARNING').slice(0, 3);
  const orphans = results.filter((item) => item.ruleId === 'orphan-device').slice(0, 3);
  return {
    summary: `Overall score ${health.overall} reflects ${health.errorCount} errors, ${health.warningCount} warnings, and ${health.validRelationships} valid connections.`,
    conflicts,
    warnings,
    orphans,
  };
}

export function getSelectedDevice(graph: BuildGraph, devices: BuildDevice[], selectedDeviceId: string | null) {
  if (!selectedDeviceId) return null;
  const node = graph.nodes.find((item) => item.deviceId === selectedDeviceId);
  if (!node) return null;
  return deviceById(devices, selectedDeviceId);
}
