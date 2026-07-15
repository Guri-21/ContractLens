import React, { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, MarkerType, NodeMouseHandler, MiniMap, Panel } from 'reactflow';
import 'reactflow/dist/style.css';
import { ClauseDTO, RiskFindingDTO } from '../reviewer-workspace/types';
import { AlertTriangle, X, GitBranch, Info } from 'lucide-react';

export type EdgeKind = 'references' | 'overrides' | 'conflicts_with' | 'parent_of';

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: 'clause' | 'document';
  clauseType?: string;
  documentName?: string;
  sectionNumber?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface DependencyGraphProps {
  clauses?: ClauseDTO[];
  risks?: RiskFindingDTO[];
  graphData?: GraphData;
  height?: number;
}

const edgeStyles: Record<EdgeKind, Partial<Edge>> = {
  references: {
    animated: true,
    style: { stroke: '#1E3A8A', strokeWidth: 1.5, strokeDasharray: '5 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#1E3A8A' },
    labelStyle: { fill: '#1E3A8A', fontSize: 10 },
    labelBgStyle: { fill: '#F3F4F6', fillOpacity: 0.9 },
  },
  overrides: {
    animated: false,
    style: { stroke: '#9E1B1B', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#9E1B1B' },
    labelStyle: { fill: '#9E1B1B', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#FEF2F2', fillOpacity: 0.95 },
  },
  conflicts_with: {
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '8 3' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    labelStyle: { fill: '#92400e', fontSize: 10 },
    labelBgStyle: { fill: '#fffbeb', fillOpacity: 0.9 },
  },
  parent_of: {
    animated: false,
    style: { stroke: '#d1d5db', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d1d5db' },
  },
};

function detectCycles(nodes: Node[], edges: Edge[]): string[][] {
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    if (adj.has(e.source)) adj.get(e.source)!.push(e.target);
  });

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  const dfs = (nodeId: string, path: string[]): void => {
    if (stack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    for (const neighbor of adj.get(nodeId) || []) {
      dfs(neighbor, [...path]);
    }

    stack.delete(nodeId);
  };

  for (const node of nodes) {
    if (!visited.has(node.id)) dfs(node.id, []);
  }

  return cycles;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ clauses = [], risks = [], graphData, height = 400 }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes, edges, cycles } = useMemo(() => {
    let nodes: Node[] = [];
    let edges: Edge[] = [];

    if (graphData) {
      const COLS = 3;
      nodes = graphData.nodes.map((n, i) => ({
        id: n.id,
        position: { x: (i % COLS) * 280 + 40, y: Math.floor(i / COLS) * 160 + 40 },
        data: {
          label: (
            <div className="p-3 border border-legal-border rounded-sm bg-legal-surface shadow-sm w-48 text-left group hover:border-legal-focus transition-colors">
              <div className="font-mono text-[10px] uppercase font-semibold text-legal-meta border-b border-legal-border pb-1 mb-2 truncate">
                {n.kind === 'document' ? '📄 ' : '§ '}{n.documentName || n.label}
              </div>
              <div className="font-display text-sm font-semibold text-legal-text truncate">{n.label}</div>
              {n.clauseType && (
                <div className="text-[10px] text-legal-meta font-mono mt-1 truncate">{n.clauseType}</div>
              )}
            </div>
          ),
        },
        style: { background: 'transparent', border: 'none', padding: 0 },
      }));

      edges = graphData.edges.map((e) => ({
        id: `${e.kind}-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label,
        ...edgeStyles[e.kind],
      } as Edge));
    } else if (clauses.length > 0) {
      nodes = clauses.map((clause, index) => ({
        id: clause.id,
        position: { x: (index % 3) * 250 + 40, y: Math.floor(index / 3) * 150 + 40 },
        data: { 
          label: (
            <div className="p-3 border border-legal-border rounded-sm bg-legal-surface shadow-sm w-48 text-left group hover:border-legal-focus transition-colors">
              <div className="font-mono text-[10px] uppercase font-semibold text-legal-meta border-b border-legal-border pb-1 mb-2 truncate">
                {clause.documentName} {clause.sectionNumber ? `• S.${clause.sectionNumber}` : ''}
              </div>
              <div className="font-display text-sm font-semibold text-legal-text truncate">{clause.title || clause.clauseType}</div>
            </div>
          )
        },
        style: { background: 'transparent', border: 'none', padding: 0 }
      }));

      const seen = new Set<string>();
      const addEdge = (source: string, target: string, kind: EdgeKind, label?: string) => {
        const edgeId = `${kind}-${source}-${target}`;
        if (seen.has(edgeId) || source === target) return;
        seen.add(edgeId);
        edges.push({
          id: edgeId,
          source,
          target,
          label,
          ...edgeStyles[kind],
        } as Edge);
      };

      clauses.forEach(clause => {
        clause.references.forEach(refId => addEdge(clause.id, refId, 'references', 'REF'));
        clause.overrides.forEach(ovId => addEdge(clause.id, ovId, 'overrides', 'OVERRIDE'));
      });
    }

    const cycles = detectCycles(nodes, edges);
    return { nodes, edges, cycles };
  }, [clauses, graphData]);

  const hasCycle = cycles.length > 0;

  if (nodes.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center border border-dashed border-legal-border rounded-sm bg-legal-bg text-legal-meta">
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-mono uppercase tracking-widest">No relationships to display</p>
        </div>
      </div>
    );
  }

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedNodeId(node.id);
  };

  const selectedClause = clauses.find(c => c.id === selectedNodeId);
  const selectedRisks = risks.filter(r => r.clauseId === selectedNodeId && r.contradictionType);
  const incomingEdges = edges.filter(e => e.target === selectedNodeId);
  const outgoingEdges = edges.filter(e => e.source === selectedNodeId);

  return (
    <div className="flex h-full w-full relative border border-legal-border rounded-sm bg-legal-bg overflow-hidden" style={{ minHeight: height }}>
      {hasCycle && (
        <div className="absolute top-4 left-4 z-10 bg-risk-critical/10 text-risk-critical px-4 py-2 rounded-sm shadow-md border border-risk-critical/20 flex flex-col">
          <div className="flex items-center mb-1">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="font-mono text-xs uppercase font-bold tracking-widest">Circular Reference Detected ({cycles.length})</span>
          </div>
          <p className="text-[10px] font-mono opacity-80 pl-6">
            {cycles.map((c, i) => (
              <span key={i} className="block">
                {c.join(' → ')} → {c[0]}
              </span>
            ))}
          </p>
        </div>
      )}
      
      <div className="flex-1 relative h-full w-full">
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.2 }} onNodeClick={handleNodeClick}>
          <Background color="#cbd5e1" gap={20} />
          <Controls className="font-mono border border-legal-border bg-legal-surface shadow-sm rounded-sm" />
          <MiniMap nodeColor={() => '#1E3A8A'} maskColor="rgba(255,255,255,0.7)" style={{ bottom: 12, left: 12 }} />
          
          <Panel position="top-right">
            <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm px-3 py-2.5 text-[10px] font-mono uppercase space-y-2">
              <div className="flex items-center gap-1.5 text-legal-meta font-bold mb-1 border-b border-legal-border pb-1">
                <Info className="w-3 h-3" /> Legend
              </div>
              <LegendRow color="#1E3A8A" dash label="References" />
              <LegendRow color="#9E1B1B" label="Overrides" thick />
              <LegendRow color="#f59e0b" dash label="Conflicts With" />
              <LegendRow color="#d1d5db" label="Contains (Doc→Clause)" />
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {selectedClause && (
        <div className="w-80 bg-legal-surface border-l border-legal-border shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-20 flex flex-col h-full overflow-y-auto">
          <div className="p-4 border-b border-legal-border flex justify-between items-center bg-legal-bg sticky top-0">
            <h3 className="font-mono text-xs font-semibold text-legal-text uppercase tracking-widest truncate pr-2">Node Details</h3>
            <button onClick={() => setSelectedNodeId(null)} className="text-legal-meta hover:text-legal-text transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-5 space-y-6">
            <div>
              <h4 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest border-b border-legal-border pb-1 mb-2">Clause text</h4>
              <p className="font-body text-sm text-legal-text leading-relaxed line-clamp-6" title={selectedClause.text}>{selectedClause.text}</p>
            </div>

            <div>
              <h4 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest border-b border-legal-border pb-1 mb-3">Relationships</h4>
              <div className="font-mono text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-legal-meta uppercase">Incoming Links</span>
                  <span className="font-bold bg-legal-bg border border-legal-border px-2 py-0.5 rounded-sm">{incomingEdges.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-legal-meta uppercase">Outgoing Links</span>
                  <span className="font-bold bg-legal-bg border border-legal-border px-2 py-0.5 rounded-sm">{outgoingEdges.length}</span>
                </div>
              </div>
            </div>

            {selectedRisks.length > 0 && (
              <div>
                <h4 className="font-mono text-[10px] text-risk-critical uppercase tracking-widest border-b border-risk-critical/20 pb-1 mb-3 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Contradictions
                </h4>
                <div className="space-y-3">
                  {selectedRisks.map(r => (
                    <div key={r.id} className="bg-risk-critical/5 p-3 rounded-sm border border-risk-critical/20 text-xs">
                      <strong className="font-mono text-[10px] text-risk-critical uppercase tracking-widest block mb-1">{r.contradictionType?.replace('_', ' ')}</strong>
                      <span className="font-body text-legal-text leading-relaxed">{r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LegendRow: React.FC<{ color: string; label: string; dash?: boolean; thick?: boolean; }> = ({ color, label, dash, thick }) => (
  <div className="flex items-center gap-2">
    <svg width="28" height="10">
      <line x1="0" y1="5" x2="24" y2="5" stroke={color} strokeWidth={thick ? 2.5 : 1.5} strokeDasharray={dash ? '5 3' : undefined} />
      <polygon points="24,2 28,5 24,8" fill={color} />
    </svg>
    <span className="text-legal-meta">{label}</span>
  </div>
);

export default DependencyGraph;
