import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertTriangle } from 'lucide-react';

import type { ClauseDTO, RiskFindingDTO } from '../reviewer-workspace/types';
import { ClauseNode } from './dependency-graph/ClauseNode';
import { DocumentLaneHeaders } from './dependency-graph/DocumentLaneHeaders';
import { EvidenceInspector } from './dependency-graph/EvidenceInspector';
import { GraphLegend } from './dependency-graph/GraphLegend';
import { GraphToolbar } from './dependency-graph/GraphToolbar';
import { UnresolvedEndpoint } from './dependency-graph/UnresolvedEndpoint';
import {
  buildGraphModel,
  filterGraphModel,
  getFocusedElementIds,
  type ClauseNodeData,
  type DocumentLane,
  type GraphEdge,
  type GraphFilters,
} from './dependency-graph/graphModel';
import { buildPresentationGraph, getUnresolvedTargets } from './dependency-graph/graphPresentation';

interface DependencyGraphProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
}

const nodeTypes: NodeTypes = { clause: ClauseNode, laneHeader: DocumentLaneHeaders, unresolved: UnresolvedEndpoint };
const LANE_HEADER_HEIGHT = 64;
const LANE_HEADER_Y = -LANE_HEADER_HEIGHT - 16;

export function DependencyGraph({ clauses, risks }: DependencyGraphProps) {
  const graphShellRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<GraphFilters>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const graphModel = useMemo(() => buildGraphModel(clauses, risks), [clauses, risks]);
  const filteredGraphModel = useMemo(() => filterGraphModel(graphModel, filters), [filters, graphModel]);
  const focusedElementIds = useMemo(
    () => selectedNodeId ? getFocusedElementIds(filteredGraphModel, selectedNodeId) : undefined,
    [filteredGraphModel, selectedNodeId],
  );

  const presentation = useMemo(
    () => buildPresentationGraph(filteredGraphModel, focusedElementIds, prefersReducedMotion),
    [filteredGraphModel, focusedElementIds, prefersReducedMotion],
  );
  const laneHeaderNodes = useMemo(() => filteredGraphModel.lanes.map<Node<DocumentLane>>((lane) => ({
    id: lane.id,
    type: 'laneHeader',
    position: { x: lane.x, y: LANE_HEADER_Y },
    data: lane,
    draggable: false,
    selectable: false,
    connectable: false,
    style: { width: lane.width, height: LANE_HEADER_HEIGHT },
  })), [filteredGraphModel.lanes]);
  const flowNodes = useMemo(() => [...laneHeaderNodes, ...presentation.nodes], [laneHeaderNodes, presentation.nodes]);
  const selectedNode = filteredGraphModel.nodes.find((node) => node.id === selectedNodeId);
  const linkedClauses = useMemo(
    () => getLinkedClauses(filteredGraphModel.edges, filteredGraphModel.nodes, selectedNodeId),
    [filteredGraphModel.edges, filteredGraphModel.nodes, selectedNodeId],
  );
  const unresolvedTargets = useMemo(
    () => getUnresolvedTargets(filteredGraphModel, selectedNodeId),
    [filteredGraphModel, selectedNodeId],
  );
  const activeFilterCount = countActiveFilters(filters);

  const clearFocus = useCallback(() => setSelectedNodeId(null), []);
  const fitGraph = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.24, duration: prefersReducedMotion ? 0 : 240 });
  }, [prefersReducedMotion, reactFlowInstance]);
  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (node.type === 'clause') {
      setSelectedNodeId(node.id);
    }
  };
  const toggleFullscreen = useCallback(() => {
    const graphShell = graphShellRef.current;
    if (!graphShell) return;

    if (document.fullscreenElement === graphShell) {
      void document.exitFullscreen();
      return;
    }

    void graphShell.requestFullscreen();
  }, []);

  useEffect(() => {
    if (selectedNodeId && !filteredGraphModel.nodes.some((node) => node.id === selectedNodeId)) {
      clearFocus();
    }
  }, [clearFocus, filteredGraphModel.nodes, selectedNodeId]);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(document.fullscreenElement === graphShellRef.current);
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  useEffect(() => {
    if (!reactFlowInstance || !focusedElementIds) return;

    const focusedNodes = presentation.nodes.filter((node) => (
      focusedElementIds.has(node.id)
      || ('targetId' in node.data && focusedElementIds.has(node.data.targetId))
    ));
    if (focusedNodes.length > 0) {
      reactFlowInstance.fitView({ nodes: focusedNodes, padding: 0.38, duration: prefersReducedMotion ? 0 : 240 });
    }
  }, [focusedElementIds, prefersReducedMotion, presentation.nodes, reactFlowInstance]);

  return (
    <div ref={graphShellRef} className={`relative flex h-full min-h-[460px] w-full flex-col overflow-hidden bg-legal-bg ${isFullscreen ? 'h-screen min-h-0' : ''}`}>
      <GraphToolbar
        filters={filters}
        lanes={graphModel.lanes}
        activeFilterCount={activeFilterCount}
        hasFocus={Boolean(selectedNodeId)}
        isFullscreen={isFullscreen}
        onFiltersChange={setFilters}
        onFitGraph={fitGraph}
        onClearFocus={clearFocus}
        onToggleFullscreen={toggleFullscreen}
      />
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <GraphLegend />
          {filteredGraphModel.cycleNodeIds.length > 0 && (
            <div className="absolute left-4 top-28 z-10 flex items-center border border-risk-critical/20 bg-risk-critical/10 px-4 py-2 text-risk-critical shadow-md">
              <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest">Circular reference detected</span>
            </div>
          )}
          <ReactFlow
            nodes={flowNodes}
            edges={presentation.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.24 }}
            onInit={setReactFlowInstance}
            onNodeClick={handleNodeClick}
            onPaneClick={clearFocus}
          >
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
            onClose={clearFocus}
            onSelectClause={setSelectedNodeId}
          />
        )}
      </div>
    </div>
  );
}

function countActiveFilters(filters: GraphFilters): number {
  return [
    Boolean(filters.searchQuery?.trim()),
    Boolean(filters.documentIds?.length),
    Boolean(filters.statuses?.length),
    Boolean(filters.relationshipTypes?.length),
  ].filter(Boolean).length;
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
