import type { BuildEdge, BuildNode, BuildStateV1 } from './types';

export type BuildGraph = {
  nodes: BuildNode[];
  edges: BuildEdge[];
};

export function createEmptyBuildGraph(): BuildGraph {
  return { nodes: [], edges: [] };
}

export function addNode(graph: BuildGraph, deviceId: string): BuildGraph {
  if (graph.nodes.some((node) => node.deviceId === deviceId)) return graph;
  return {
    nodes: [...graph.nodes, { id: `node-${deviceId}`, deviceId, selected: false }],
    edges: graph.edges,
  };
}

export function removeNode(graph: BuildGraph, deviceId: string): BuildGraph {
  const node = graph.nodes.find((item) => item.deviceId === deviceId);
  if (!node) return graph;
  return {
    nodes: graph.nodes.filter((item) => item.deviceId !== deviceId),
    edges: graph.edges.filter((edge) => edge.sourceId !== node.id && edge.targetId !== node.id),
  };
}

export function selectNode(graph: BuildGraph, deviceId: string | null): BuildGraph {
  return {
    nodes: graph.nodes.map((node) => ({ ...node, selected: node.deviceId === deviceId })),
    edges: graph.edges,
  };
}

export function addEdge(graph: BuildGraph, sourceDeviceId: string, targetDeviceId: string, connection: BuildEdge['connection'], status: BuildEdge['status']): BuildGraph {
  const source = graph.nodes.find((node) => node.deviceId === sourceDeviceId);
  const target = graph.nodes.find((node) => node.deviceId === targetDeviceId);
  if (!source || !target) return graph;
  const nextEdge: BuildEdge = {
    id: `edge-${source.id}-${target.id}-${connection}`,
    sourceId: source.id,
    targetId: target.id,
    connection,
    status,
  };
  return { nodes: graph.nodes, edges: [...graph.edges.filter((edge) => edge.id !== nextEdge.id), nextEdge] };
}

export function removeEdge(graph: BuildGraph, edgeId: string): BuildGraph {
  return { nodes: graph.nodes, edges: graph.edges.filter((edge) => edge.id !== edgeId) };
}

export function getDependencies(graph: BuildGraph, deviceId: string): string[] {
  const node = graph.nodes.find((item) => item.deviceId === deviceId);
  if (!node) return [];
  return graph.edges.filter((edge) => edge.sourceId === node.id).map((edge) => edge.targetId);
}

export function getDownstreamDevices(graph: BuildGraph, deviceId: string): string[] {
  const node = graph.nodes.find((item) => item.deviceId === deviceId);
  if (!node) return [];
  const next = new Set<string>();
  const walk = (sourceId: string) => {
    for (const edge of graph.edges.filter((item) => item.sourceId === sourceId)) {
      if (next.has(edge.targetId)) continue;
      next.add(edge.targetId);
      walk(edge.targetId);
    }
  };
  walk(node.id);
  return Array.from(next);
}

export function getOrphanDevices(graph: BuildGraph): string[] {
  const connected = new Set<string>();
  graph.edges.forEach((edge) => {
    connected.add(edge.sourceId);
    connected.add(edge.targetId);
  });
  return graph.nodes.filter((node) => !connected.has(node.id)).map((node) => node.deviceId);
}

export function toBuildState(graph: BuildGraph, selectedDeviceId: string | null): BuildStateV1 {
  return {
    version: 1,
    selectedDeviceId,
    deviceIds: graph.nodes.map((node) => node.deviceId),
  };
}

export function fromBuildState(state: BuildStateV1 | null | undefined): { deviceIds: string[]; selectedDeviceId: string | null } {
  if (!state || state.version !== 1) {
    return { deviceIds: [], selectedDeviceId: null };
  }
  return { deviceIds: state.deviceIds ?? [], selectedDeviceId: state.selectedDeviceId ?? null };
}
