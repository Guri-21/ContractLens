import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { ClauseDTO } from '../reviewer-workspace/types';
import { AlertTriangle } from 'lucide-react';

interface DependencyGraphProps {
  clauses: ClauseDTO[];
}

function detectCycle(nodes: Node[], edges: Edge[]): boolean {
  const adjList = new Map<string, string[]>();
  nodes.forEach(n => adjList.set(n.id, []));
  edges.forEach(e => {
    if (adjList.has(e.source)) {
      adjList.get(e.source)!.push(e.target);
    }
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const isCyclic = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (isCyclic(neighbor)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (isCyclic(node.id)) return true;
  }
  return false;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ clauses }) => {
  const { nodes, edges, hasCycle } = useMemo(() => {
    const nodes: Node[] = clauses.map((clause, index) => ({
      id: clause.id,
      position: { x: (index % 3) * 250, y: Math.floor(index / 3) * 150 },
      data: { 
        label: (
          <div className="p-2 border border-indigo-200 rounded bg-white shadow-sm w-48 text-left">
            <div className="font-bold text-xs text-indigo-800 border-b border-indigo-100 pb-1 mb-1 truncate">
              {clause.documentName} {clause.sectionNumber ? `- Sec ${clause.sectionNumber}` : ''}
            </div>
            <div className="text-xs text-gray-700 truncate">{clause.title || clause.clauseType}</div>
          </div>
        )
      },
      style: { background: 'transparent', border: 'none', padding: 0 }
    }));

    const edges: Edge[] = [];
    clauses.forEach(clause => {
      clause.references.forEach(refId => {
        edges.push({
          id: `e-${clause.id}-${refId}`,
          source: clause.id,
          target: refId,
          label: 'references',
          animated: true,
          style: { stroke: '#6366f1' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
        });
      });
      clause.overrides.forEach(ovId => {
        edges.push({
          id: `e-ov-${clause.id}-${ovId}`,
          source: clause.id,
          target: ovId,
          label: 'overrides',
          animated: false,
          style: { stroke: '#ef4444', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }
        });
      });
    });

    const hasCycle = detectCycle(nodes, edges);

    return { nodes, edges, hasCycle };
  }, [clauses]);

  return (
    <div className="h-full w-full relative border border-gray-200 rounded-lg bg-gray-50 overflow-hidden min-h-[400px]">
      {hasCycle && (
        <div className="absolute top-4 left-4 z-10 bg-red-100 text-red-800 px-4 py-2 rounded shadow-md border border-red-300 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm">Circular reference detected!</span>
        </div>
      )}
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#ccc" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};
