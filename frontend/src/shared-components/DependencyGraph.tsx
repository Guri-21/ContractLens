import React, { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, MarkerType, NodeMouseHandler } from 'reactflow';
import 'reactflow/dist/style.css';
import { ClauseDTO, RiskFindingDTO } from '../reviewer-workspace/types';
import { AlertTriangle, X } from 'lucide-react';

interface DependencyGraphProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
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

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ clauses, risks }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes, edges, hasCycle } = useMemo(() => {
    const nodes: Node[] = clauses.map((clause, index) => ({
      id: clause.id,
      position: { x: (index % 3) * 250, y: Math.floor(index / 3) * 150 },
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

    const edges: Edge[] = [];
    clauses.forEach(clause => {
      clause.references.forEach(refId => {
        edges.push({
          id: `e-${clause.id}-${refId}`,
          source: clause.id,
          target: refId,
          label: 'REF',
          labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 'bold', fill: '#1E3A8A' },
          labelBgStyle: { fill: '#F3F4F6' },
          animated: true,
          style: { stroke: '#1E3A8A', strokeDasharray: '4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1E3A8A' }
        });
      });
      clause.overrides.forEach(ovId => {
        edges.push({
          id: `e-ov-${clause.id}-${ovId}`,
          source: clause.id,
          target: ovId,
          label: 'OVERRIDE',
          labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 'bold', fill: '#9E1B1B' },
          labelBgStyle: { fill: '#FEF2F2' },
          animated: false,
          style: { stroke: '#9E1B1B', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#9E1B1B' }
        });
      });
    });

    const hasCycle = detectCycle(nodes, edges);

    return { nodes, edges, hasCycle };
  }, [clauses]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedNodeId(node.id);
  };

  const selectedClause = clauses.find(c => c.id === selectedNodeId);
  const selectedRisks = risks.filter(r => r.clauseId === selectedNodeId && r.contradictionType);
  const incomingEdges = edges.filter(e => e.target === selectedNodeId);
  const outgoingEdges = edges.filter(e => e.source === selectedNodeId);

  return (
    <div className="flex h-full w-full relative border border-legal-border rounded-sm bg-legal-bg overflow-hidden min-h-[400px]">
      {hasCycle && (
        <div className="absolute top-4 left-4 z-10 bg-risk-critical/10 text-risk-critical px-4 py-2 rounded-sm shadow-md border border-risk-critical/20 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="font-mono text-xs uppercase font-bold tracking-widest">Circular Reference Detected</span>
        </div>
      )}
      
      <div className="flex-1 relative">
        <ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={handleNodeClick}>
          <Background color="#cbd5e1" gap={20} />
          <Controls className="font-mono border border-legal-border bg-legal-surface shadow-sm rounded-sm" />
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
