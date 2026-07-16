import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertTriangle } from 'lucide-react';

import type { ClauseDTO, RiskFindingDTO } from '../reviewer-workspace/types';
import { ClauseNode } from './dependency-graph/ClauseNode';
import { EvidenceInspector } from './dependency-graph/EvidenceInspector';
import { GraphLegend } from './dependency-graph/GraphLegend';
import {
  buildGraphModel,
  getFocusedElementIds,
  type ClauseNodeData,
  type GraphEdge,
} from './dependency-graph/graphModel';

interface DependencyGraphProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
}

type PresentationNodeData = ClauseNodeData & { dimmed: boolean };

const nodeTypes: NodeTypes = { clause: ClauseNode };

type EdgeAppearance = {
  label: string;
  color: string;
  dash?: string;
};

const edgeAppearance: Record<GraphEdge['data']['relationship'], EdgeAppearance> = {
  reference: { label: 'REF', color: '#64748B', dash: '5 5' },
  override: { label: 'OVERRIDES', color: '#B45309' },
  conflict: { label: 'CONFLICT', color: '#DC2626' },
  unresolved: { label: 'UNRESOLVED', color: '#B45309', dash: '3 3' },
} as const;

export function DependencyGraph({ clauses, risks }: DependencyGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const graphModel = useMemo(() => buildGraphModel(clauses, risks), [clauses, risks]);
  const focusedElementIds = useMemo(
    () => selectedNodeId ? getFocusedElementIds(graphModel, selectedNodeId) : undefined,
    [graphModel, selectedNodeId],
  );

  const nodes = useMemo<Node<PresentationNodeData>[]>(() => graphModel.nodes.map((node) => ({
    id: node.id,
    type: 'clause',
    position: node.position,
    data: { ...node.data, dimmed: Boolean(focusedElementIds && !focusedElementIds.has(node.id)) },
    style: { width: node.width, height: node.height },
  })), [focusedElementIds, graphModel.nodes]);

  const edges = useMemo<Edge[]>(() => graphModel.edges.map((edge) => toFlowEdge(edge, graphModel, focusedElementIds, prefersReducedMotion)), [focusedElementIds, graphModel, prefersReducedMotion]);
  const selectedNode = graphModel.nodes.find((node) => node.id === selectedNodeId);
  const linkedClauses = useMemo(() => getLinkedClauses(graphModel.edges, graphModel.nodes, selectedNodeId), [graphModel.edges, graphModel.nodes, selectedNodeId]);

  const handleNodeClick: NodeMouseHandler = (_, node) => setSelectedNodeId(node.id);

  return (
    <div className="relative flex h-full min-h-[460px] w-full overflow-hidden bg-slate-50">
      <GraphLegend />
      {graphModel.cycleNodeIds.length > 0 && (
        <div className="absolute left-4 top-28 z-10 flex items-center border border-risk-critical/20 bg-risk-critical/10 px-4 py-2 text-risk-critical shadow-md">
          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Circular reference detected</span>
        </div>
      )}

      <div className="relative min-w-0 flex-1">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.24 }} onNodeClick={handleNodeClick}>
          <Background color="#dbe3ef" gap={24} />
          <Controls className="rounded-sm border border-legal-border bg-white font-mono shadow-sm" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <EvidenceInspector
          clause={selectedNode.data.clause}
          risks={selectedNode.data.risks}
          linkedClauses={linkedClauses}
          onClose={() => setSelectedNodeId(null)}
          onSelectClause={setSelectedNodeId}
        />
      )}
    </div>
  );
}

function toFlowEdge(
  edge: GraphEdge,
  graphModel: ReturnType<typeof buildGraphModel>,
  focusedElementIds: Set<string> | undefined,
  prefersReducedMotion: boolean,
): Edge {
  const appearance = edgeAppearance[edge.data.relationship];
  const sourceNode = graphModel.nodes.find((node) => node.id === edge.source);
  const targetNode = graphModel.nodes.find((node) => node.id === edge.target);
  const sameDocument = sourceNode?.data.clause.documentId === targetNode?.data.clause.documentId;
  const dimmed = Boolean(focusedElementIds && !focusedElementIds.has(edge.id));

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: sameDocument ? 'smoothstep' : 'default',
    label: appearance.label,
    animated: edge.data.relationship === 'conflict' && !prefersReducedMotion,
    labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 700, fill: appearance.color },
    labelBgStyle: { fill: '#F8FAFC' },
    style: { stroke: appearance.color, strokeWidth: edge.data.relationship === 'reference' ? 1.5 : 2, strokeDasharray: appearance.dash, opacity: dimmed ? 0.2 : 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: appearance.color },
  };
}

function getLinkedClauses(
  edges: readonly GraphEdge[],
  nodes: readonly { id: string; data: ClauseNodeData }[],
  selectedNodeId: string | null,
): ClauseDTO[] {
  if (!selectedNodeId) return [];

  const clausesById = new Map(nodes.map((node) => [node.id, node.data.clause]));
  const linkedIds = new Set(edges.flatMap((edge) => {
    if (edge.source === selectedNodeId) return [edge.target];
    if (edge.target === selectedNodeId) return [edge.source];
    return [];
  }));

  return [...linkedIds].flatMap((id) => {
    const clause = clausesById.get(id);
    return clause ? [clause] : [];
  });
}

function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}
