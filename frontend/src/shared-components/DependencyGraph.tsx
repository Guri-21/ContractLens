import React, { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, MarkerType, Node, NodeMouseHandler } from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { ClauseDTO, RiskFindingDTO } from '../reviewer-workspace/types';

interface DependencyGraphProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
}

function detectCycle(nodes: Node[], edges: Edge[]): boolean {
  const adjList = new Map<string, string[]>();
  nodes.forEach(node => adjList.set(node.id, []));
  edges.forEach(edge => {
    if (adjList.has(edge.source)) adjList.get(edge.source)!.push(edge.target);
  });

  const visited = new Set<string>();
  const active = new Set<string>();

  function visit(nodeId: string): boolean {
    if (active.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    active.add(nodeId);
    for (const next of adjList.get(nodeId) || []) {
      if (visit(next)) return true;
    }
    active.delete(nodeId);
    return false;
  }

  return nodes.some(node => visit(node.id));
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ clauses, risks }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes, edges, hasCycle } = useMemo(() => {
    const riskByClause = new Map<string, RiskFindingDTO[]>();
    risks.forEach(risk => {
      const group = riskByClause.get(risk.clauseId) || [];
      group.push(risk);
      riskByClause.set(risk.clauseId, group);
    });

    const nodes: Node[] = clauses.map((clause, index) => ({
      id: clause.id,
      position: { x: (index % 4) * 300, y: Math.floor(index / 4) * 180 },
      data: {
        label: <GraphNodeLabel clause={clause} risks={riskByClause.get(clause.id) || []} />,
      },
      style: { background: 'transparent', border: 'none', padding: 0 },
    }));

    const edges: Edge[] = [];
    clauses.forEach(clause => {
      clause.references.forEach(refId => {
        edges.push({
          id: `ref-${clause.id}-${refId}`,
          source: clause.id,
          target: refId,
          label: 'REF',
          labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 'bold', fill: '#475569' },
          labelBgStyle: { fill: '#F8FAFC' },
          style: { stroke: '#64748B', strokeDasharray: '5 5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748B' },
        });
      });
      clause.overrides.forEach(overrideId => {
        edges.push({
          id: `override-${clause.id}-${overrideId}`,
          source: clause.id,
          target: overrideId,
          label: 'OVERRIDE',
          labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 'bold', fill: '#B45309' },
          labelBgStyle: { fill: '#FEF3C7' },
          style: { stroke: '#D97706', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#D97706' },
        });
      });
    });

    risks
      .filter(risk => risk.contradictionType === 'msa_conflict' && risk.evidence.length > 1)
      .forEach(risk => {
        const sourceClause = clauses.find(clause => clause.id === risk.clauseId);
        if (!sourceClause) return;
        const otherEvidence = risk.evidence.find(evidence => evidence.documentName !== sourceClause.documentName);
        const targetClause = clauses.find(clause =>
          clause.documentName === otherEvidence?.documentName &&
          (!otherEvidence?.section || clause.sectionNumber === otherEvidence.section)
        );
        if (!targetClause) return;
        edges.push({
          id: `conflict-${risk.id}`,
          source: sourceClause.id,
          target: targetClause.id,
          label: 'CONFLICT',
          labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 'bold', fill: '#991B1B' },
          labelBgStyle: { fill: '#FEE2E2' },
          animated: true,
          style: { stroke: '#DC2626', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#DC2626' },
        });
      });

    return { nodes, edges, hasCycle: detectCycle(nodes, edges) };
  }, [clauses, risks]);

  const handleNodeClick: NodeMouseHandler = (_, node) => setSelectedNodeId(node.id);
  const selectedClause = clauses.find(clause => clause.id === selectedNodeId);
  const selectedRisks = risks.filter(risk => risk.clauseId === selectedNodeId);
  const incomingEdges = edges.filter(edge => edge.target === selectedNodeId);
  const outgoingEdges = edges.filter(edge => edge.source === selectedNodeId);

  return (
    <div className="relative flex h-full min-h-[460px] w-full overflow-hidden bg-slate-50">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 rounded-sm border border-legal-border bg-white/95 p-3 shadow-sm">
        <GraphLegendItem className="bg-green-100 border-green-300" label="No risk" />
        <GraphLegendItem className="bg-red-100 border-red-300" label="Risk" />
        <GraphLegendItem className="bg-amber-100 border-amber-300" label="Not evaluated" />
        <GraphLegendItem className="bg-white border-slate-300" label="Reference / override" />
      </div>

      {hasCycle && (
        <div className="absolute left-4 top-20 z-10 flex items-center border border-risk-critical/20 bg-risk-critical/10 px-4 py-2 text-risk-critical shadow-md">
          <AlertTriangle className="mr-2 h-4 w-4" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Circular Reference Detected</span>
        </div>
      )}

      <div className="relative flex-1">
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.24 }} onNodeClick={handleNodeClick}>
          <Background color="#dbe3ef" gap={24} />
          <Controls className="rounded-sm border border-legal-border bg-white font-mono shadow-sm" />
        </ReactFlow>
      </div>

      {selectedClause && (
        <aside className="z-20 flex h-full w-80 flex-col overflow-y-auto border-l border-legal-border bg-legal-surface shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
          <div className="sticky top-0 flex items-center justify-between border-b border-legal-border bg-legal-bg p-4">
            <h3 className="truncate pr-2 font-mono text-xs font-semibold uppercase tracking-widest text-legal-text">Node Details</h3>
            <button onClick={() => setSelectedNodeId(null)} className="text-legal-meta transition-colors hover:text-legal-text">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-6 p-5">
            <div>
              <h4 className="mb-2 border-b border-legal-border pb-1 font-mono text-[10px] uppercase tracking-widest text-legal-meta">Clause text</h4>
              <p className="line-clamp-7 text-sm leading-relaxed text-legal-text" title={selectedClause.text}>{selectedClause.text}</p>
            </div>

            <div>
              <h4 className="mb-3 border-b border-legal-border pb-1 font-mono text-[10px] uppercase tracking-widest text-legal-meta">Relationships</h4>
              <div className="space-y-2 font-mono text-xs">
                <RelationshipCount label="Incoming links" value={incomingEdges.length} />
                <RelationshipCount label="Outgoing links" value={outgoingEdges.length} />
              </div>
            </div>

            {selectedRisks.length > 0 ? (
              <div>
                <h4 className="mb-3 flex items-center border-b border-risk-critical/20 pb-1 font-mono text-[10px] uppercase tracking-widest text-risk-critical">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Risks
                </h4>
                <div className="space-y-3">
                  {selectedRisks.map(risk => (
                    <div key={risk.id} className="border border-risk-critical/20 bg-risk-critical/5 p-3 text-xs">
                      <strong className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-risk-critical">
                        {risk.status === 'not_evaluated' ? 'not evaluated' : risk.riskLevel}
                      </strong>
                      <span className="leading-relaxed text-legal-text">{risk.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="mb-2 h-4 w-4" />
                No risks detected for this clause.
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

function GraphNodeLabel({ clause, risks }: { clause: ClauseDTO; risks: RiskFindingDTO[] }) {
  const hasNotEvaluated = risks.some(risk => risk.status === 'not_evaluated');
  const hasRisk = risks.length > 0;
  const tone = hasNotEvaluated
    ? 'border-amber-300 bg-amber-50 text-amber-950'
    : hasRisk
      ? 'border-red-300 bg-red-50 text-red-950'
      : 'border-green-300 bg-green-50 text-green-950';
  const badge = hasNotEvaluated ? 'Not evaluated' : hasRisk ? 'Risk' : 'No risk';

  return (
    <div className={`w-60 rounded-sm border p-3 text-left shadow-sm transition-colors hover:border-legal-focus ${tone}`}>
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-current/15 pb-1">
        <span className="truncate font-mono text-[10px] font-semibold uppercase">
          {clause.documentType} {clause.sectionNumber ? `S.${clause.sectionNumber}` : ''}
        </span>
        <span className="shrink-0 bg-white/70 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
          {badge}
        </span>
      </div>
      <div className="truncate font-display text-sm font-semibold">{clause.title || clause.clauseType || 'Clause'}</div>
      <div className="mt-1 line-clamp-2 text-xs opacity-80">{clause.text}</div>
    </div>
  );
}

function RelationshipCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="uppercase text-legal-meta">{label}</span>
      <span className="border border-legal-border bg-legal-bg px-2 py-0.5 font-bold">{value}</span>
    </div>
  );
}

function GraphLegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-legal-meta">
      <span className={`h-3 w-3 border ${className}`} />
      {label}
    </span>
  );
}
