/**
 * DependencyGraph.tsx — shared-components
 *
 * Renders a clause-relationship graph using React Flow.
 * Edge kinds mirror GraphEdgeKind from backend/app/intelligence/types.py:
 *   - "references"      → blue dashed arrow
 *   - "overrides"       → red solid arrow (triggered by "notwithstanding",
 *                         "supersedes", "shall prevail", etc.)
 *   - "conflicts_with"  → amber animated arrow (from high/critical findings)
 *   - "parent_of"       → gray thin arrow (document → clause containment)
 *
 * Cycle detection is done client-side on the rendered edge set, and
 * surfaces a visible warning banner — not just a console.log.
 *
 * Props accept either raw ClauseDTO[] (auto-derives edges from
 * references/overrides arrays) OR a pre-computed GraphData object
 * (when the backend intelligence layer is wired up via a real API).
 *
 * Branch: gurnoor-citation-graph-ui
 *
 * TODO: when backend/app/api/analyze.py starts returning a `graph` field
 * in its response, swap `clauses` prop for `graphData` prop so the
 * backend-computed edges (including conflict edges from findings) are used
 * directly instead of the client-side derivation here.
 */

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  MarkerType,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ClauseDTO } from '../reviewer-workspace/types';
import { AlertTriangle, GitBranch, Info } from 'lucide-react';

// ── Edge kind constants — keep in sync with GraphEdgeKind in backend ──
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

/** Pre-computed graph from the backend intelligence layer. */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface DependencyGraphProps {
  /** Raw clauses — graph edges are derived from .references and .overrides arrays. */
  clauses?: ClauseDTO[];
  /** Pre-computed graph from the backend — used when API is wired. */
  graphData?: GraphData;
  /** Height of the graph container. Defaults to 500px. */
  height?: number;
}

// ── Edge style map ────────────────────────────────────────────────

const edgeStyles: Record<EdgeKind, Partial<Edge>> = {
  references: {
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '5 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    labelStyle: { fill: '#6366f1', fontSize: 10 },
    labelBgStyle: { fill: '#eef2ff', fillOpacity: 0.9 },
  },
  overrides: {
    animated: false,
    style: { stroke: '#ef4444', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    labelStyle: { fill: '#ef4444', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#fef2f2', fillOpacity: 0.95 },
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

// ── Cycle detection (DFS) ─────────────────────────────────────────

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
      // Found a cycle — capture the cycle portion of the path
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

// ── Derive graph from raw clauses ─────────────────────────────────

function clausesToGraph(clauses: ClauseDTO[]): { nodes: Node[]; edges: Edge[] } {
  const COLS = 3;
  const H_GAP = 280;
  const V_GAP = 160;

  const nodes: Node[] = clauses.map((clause, i) => ({
    id: clause.id,
    position: { x: (i % COLS) * H_GAP + 40, y: Math.floor(i / COLS) * V_GAP + 40 },
    data: {
      label: (
        <div className="p-2 rounded bg-white shadow-sm border border-indigo-100 w-48 text-left">
          <div className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider mb-0.5 truncate">
            {clause.documentType} — {clause.documentName}
          </div>
          <div className="text-xs font-bold text-gray-800 truncate">
            {clause.sectionNumber ? `§${clause.sectionNumber} ` : ''}
            {clause.title || clause.clauseType || clause.id.slice(0, 8)}
          </div>
          {clause.clauseType && (
            <div className="mt-1 text-[10px] text-indigo-400 font-mono truncate">
              {clause.clauseType}
            </div>
          )}
        </div>
      ),
    },
    style: { background: 'transparent', border: 'none', padding: 0 },
  }));

  const edges: Edge[] = [];
  const seen = new Set<string>();

  const addEdge = (
    source: string,
    target: string,
    kind: EdgeKind,
    label?: string,
  ) => {
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

  clauses.forEach((clause) => {
    clause.references.forEach((refId) => addEdge(clause.id, refId, 'references', 'ref'));
    clause.overrides.forEach((ovId) => addEdge(clause.id, ovId, 'overrides', 'overrides'));
  });

  return { nodes, edges };
}

// ── Main component ────────────────────────────────────────────────

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  clauses,
  graphData,
  height = 500,
}) => {
  const { nodes, edges, cycles } = useMemo(() => {
    let nodes: Node[];
    let edges: Edge[];

    if (graphData) {
      // Use pre-computed backend graph data
      const COLS = 3;
      nodes = graphData.nodes.map((n, i) => ({
        id: n.id,
        position: { x: (i % COLS) * 280 + 40, y: Math.floor(i / COLS) * 160 + 40 },
        data: {
          label: (
            <div className="p-2 rounded bg-white shadow-sm border border-indigo-100 w-48 text-left">
              <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider truncate">
                {n.kind === 'document' ? '📄 ' : '§ '}{n.documentName || n.label}
              </div>
              <div className="text-xs font-bold text-gray-800 truncate">{n.label}</div>
              {n.clauseType && (
                <div className="text-[10px] text-indigo-400 font-mono">{n.clauseType}</div>
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
    } else if (clauses && clauses.length > 0) {
      ({ nodes, edges } = clausesToGraph(clauses));
    } else {
      return { nodes: [], edges: [], cycles: [] };
    }

    const cycles = detectCycles(nodes, edges);
    return { nodes, edges, cycles };
  }, [clauses, graphData]);

  const hasCycle = cycles.length > 0;

  if (nodes.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400"
      >
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No clause relationships to display</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className="relative border border-gray-200 rounded-xl bg-gray-50 overflow-hidden"
    >
      {/* Cycle warning banner */}
      {hasCycle && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">
              Circular reference detected ({cycles.length} cycle{cycles.length > 1 ? 's' : ''})
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {cycles.map((c, i) => (
                <span key={i} className="mr-3 font-mono">
                  {c.join(' → ')} → {c[0]}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.2 }}>
        <Background color="#d1d5db" gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={() => '#6366f1'}
          maskColor="rgba(255,255,255,0.7)"
          style={{ bottom: 12, right: 12 }}
        />

        {/* Legend panel */}
        <Panel position="top-right">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2.5 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-gray-500 font-semibold mb-1">
              <Info className="w-3 h-3" /> Legend
            </div>
            <LegendRow color="#6366f1" dash label="references" />
            <LegendRow color="#ef4444" label="overrides" thick />
            <LegendRow color="#f59e0b" dash label="conflicts with" />
            <LegendRow color="#d1d5db" label="contains (doc→clause)" />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// ── Legend helper ─────────────────────────────────────────────────

const LegendRow: React.FC<{
  color: string;
  label: string;
  dash?: boolean;
  thick?: boolean;
}> = ({ color, label, dash, thick }) => (
  <div className="flex items-center gap-2">
    <svg width="28" height="10">
      <line
        x1="0"
        y1="5"
        x2="24"
        y2="5"
        stroke={color}
        strokeWidth={thick ? 2.5 : 1.5}
        strokeDasharray={dash ? '5 3' : undefined}
      />
      <polygon points="24,2 28,5 24,8" fill={color} />
    </svg>
    <span className="text-gray-600">{label}</span>
  </div>
);

export default DependencyGraph;
