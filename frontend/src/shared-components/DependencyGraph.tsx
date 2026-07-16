import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type NodeMouseHandler,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertTriangle } from 'lucide-react';

import type { ClauseDTO, RiskFindingDTO } from '../reviewer-workspace/types';
import { ClauseNode } from './dependency-graph/ClauseNode';
import { EvidenceInspector } from './dependency-graph/EvidenceInspector';
import { GraphLegend } from './dependency-graph/GraphLegend';
import { UnresolvedEndpoint } from './dependency-graph/UnresolvedEndpoint';
import {
  buildGraphModel,
  getFocusedElementIds,
  type ClauseNodeData,
  type GraphEdge,
} from './dependency-graph/graphModel';
import { buildPresentationGraph, getUnresolvedTargets } from './dependency-graph/graphPresentation';

interface DependencyGraphProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
}

const nodeTypes: NodeTypes = { clause: ClauseNode, unresolved: UnresolvedEndpoint };

export function DependencyGraph({ clauses, risks }: DependencyGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const graphModel = useMemo(() => buildGraphModel(clauses, risks), [clauses, risks]);
  const focusedElementIds = useMemo(
    () => selectedNodeId ? getFocusedElementIds(graphModel, selectedNodeId) : undefined,
    [graphModel, selectedNodeId],
  );

  const presentation = useMemo(
    () => buildPresentationGraph(graphModel, focusedElementIds, prefersReducedMotion),
    [focusedElementIds, graphModel, prefersReducedMotion],
  );
  const selectedNode = graphModel.nodes.find((node) => node.id === selectedNodeId);
  const linkedClauses = useMemo(() => getLinkedClauses(graphModel.edges, graphModel.nodes, selectedNodeId), [graphModel.edges, graphModel.nodes, selectedNodeId]);
  const unresolvedTargets = useMemo(() => getUnresolvedTargets(graphModel, selectedNodeId), [graphModel, selectedNodeId]);

  const handleNodeClick: NodeMouseHandler = (_, node) => setSelectedNodeId(node.id);

  return (
    <div className="relative flex h-full min-h-[460px] w-full overflow-hidden bg-legal-bg">
      <GraphLegend />
      {graphModel.cycleNodeIds.length > 0 && (
        <div className="absolute left-4 top-28 z-10 flex items-center border border-risk-critical/20 bg-risk-critical/10 px-4 py-2 text-risk-critical shadow-md">
          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Circular reference detected</span>
        </div>
      )}

      <div className="relative min-w-0 flex-1">
        <ReactFlow nodes={presentation.nodes} edges={presentation.edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.24 }} onNodeClick={handleNodeClick}>
          <Background gap={24} />
          <Controls className="rounded-sm border border-legal-border bg-white font-mono shadow-sm" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <EvidenceInspector
          clause={selectedNode.data.clause}
          risks={selectedNode.data.risks}
          linkedClauses={linkedClauses}
          unresolvedTargets={unresolvedTargets}
          onClose={() => setSelectedNodeId(null)}
          onSelectClause={setSelectedNodeId}
        />
      )}
    </div>
  );
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
