import { MarkerType, type Edge, type Node } from 'reactflow';

import type { ClauseNodeData, GraphEdge, GraphModel } from './graphModel';

export type ClausePresentationNodeData = ClauseNodeData & { dimmed: boolean };

export type UnresolvedEndpointData = {
  targetId: string;
  label: string;
  dimmed: boolean;
};

export type PresentationNodeData = ClausePresentationNodeData | UnresolvedEndpointData;

type EdgeAppearance = {
  label: string;
  className: string;
  dash?: string;
};

const edgeAppearance: Record<GraphEdge['data']['relationship'], EdgeAppearance> = {
  reference: { label: 'REF', className: 'text-legal-meta', dash: '5 5' },
  override: { label: 'OVERRIDES', className: 'text-accent' },
  conflict: { label: 'CONFLICT', className: 'text-risk-critical' },
  unresolved: { label: 'UNRESOLVED', className: 'text-accent', dash: '3 3' },
};

const UNRESOLVED_NODE_WIDTH = 224;
const UNRESOLVED_NODE_HEIGHT = 80;
const UNRESOLVED_NODE_OFFSET = 72;
const UNRESOLVED_NODE_GAP = 24;

export function buildPresentationGraph(
  graphModel: GraphModel,
  focusedElementIds: Set<string> | undefined,
  prefersReducedMotion: boolean,
): { nodes: Node<PresentationNodeData>[]; edges: Edge[] } {
  const unresolvedNodeIds = new Map<string, string>();
  const unresolvedNodes = buildUnresolvedNodes(graphModel, focusedElementIds, unresolvedNodeIds);
  const clauseNodes = graphModel.nodes.map<Node<ClausePresentationNodeData>>((node) => ({
    id: node.id,
    type: 'clause',
    position: node.position,
    data: { ...node.data, dimmed: Boolean(focusedElementIds && !focusedElementIds.has(node.id)) },
    style: { width: node.width, height: node.height },
  }));

  return {
    nodes: [...clauseNodes, ...unresolvedNodes],
    edges: graphModel.edges.map((edge) => toFlowEdge(edge, graphModel, unresolvedNodeIds, focusedElementIds, prefersReducedMotion)),
  };
}

export function getUnresolvedTargets(graphModel: GraphModel, selectedNodeId: string | null): string[] {
  if (!selectedNodeId) return [];

  return [...new Set(graphModel.edges
    .filter((edge) => edge.source === selectedNodeId && edge.data.relationship === 'unresolved')
    .map((edge) => edge.target))];
}

function buildUnresolvedNodes(
  graphModel: GraphModel,
  focusedElementIds: Set<string> | undefined,
  unresolvedNodeIds: Map<string, string>,
): Node<UnresolvedEndpointData>[] {
  const sourceNodeByTargetId = new Map<string, (typeof graphModel.nodes)[number]>();
  const knownNodeIds = new Set(graphModel.nodes.map((node) => node.id));

  for (const edge of graphModel.edges) {
    if (edge.data.relationship === 'unresolved' && !knownNodeIds.has(edge.target)) {
      const sourceNode = graphModel.nodes.find((node) => node.id === edge.source);
      if (sourceNode && !sourceNodeByTargetId.has(edge.target)) {
        sourceNodeByTargetId.set(edge.target, sourceNode);
      }
    }
  }

  return [...sourceNodeByTargetId.entries()].map(([targetId, sourceNode], index) => {
    const id = unresolvedEndpointId(targetId);
    unresolvedNodeIds.set(targetId, id);
    return {
      id,
      type: 'unresolved',
      position: {
        x: sourceNode.position.x + sourceNode.width + UNRESOLVED_NODE_OFFSET,
        y: sourceNode.position.y + index * (UNRESOLVED_NODE_HEIGHT + UNRESOLVED_NODE_GAP),
      },
      data: {
        targetId,
        label: `Missing target: ${targetId}`,
        dimmed: Boolean(focusedElementIds && !focusedElementIds.has(sourceNode.id)),
      },
      draggable: false,
      selectable: false,
      style: { width: UNRESOLVED_NODE_WIDTH, height: UNRESOLVED_NODE_HEIGHT },
    };
  });
}

function toFlowEdge(
  edge: GraphEdge,
  graphModel: GraphModel,
  unresolvedNodeIds: ReadonlyMap<string, string>,
  focusedElementIds: Set<string> | undefined,
  prefersReducedMotion: boolean,
): Edge {
  const appearance = edgeAppearance[edge.data.relationship];
  const sourceNode = graphModel.nodes.find((node) => node.id === edge.source);
  const targetNode = graphModel.nodes.find((node) => node.id === edge.target);
  const target = unresolvedNodeIds.get(edge.target) ?? edge.target;
  const sameDocument = sourceNode?.data.clause.documentId === targetNode?.data.clause.documentId;
  const dimmed = Boolean(focusedElementIds && !focusedElementIds.has(edge.id));

  return {
    id: edge.id,
    source: edge.source,
    target,
    type: sameDocument ? 'smoothstep' : 'default',
    label: appearance.label,
    className: appearance.className,
    animated: edge.data.relationship === 'conflict' && !prefersReducedMotion,
    labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 700, fill: 'currentColor' },
    labelBgStyle: { fill: 'white' },
    style: { stroke: 'currentColor', strokeWidth: edge.data.relationship === 'reference' ? 1.5 : 2, strokeDasharray: appearance.dash, opacity: dimmed ? 0.2 : 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'currentColor' },
  };
}

function unresolvedEndpointId(targetId: string): string {
  return `unresolved--${targetId}`;
}
