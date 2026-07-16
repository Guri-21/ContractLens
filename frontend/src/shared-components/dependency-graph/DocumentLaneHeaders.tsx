import type { NodeProps } from 'reactflow';

import type { DocumentLane } from './graphModel';

export function DocumentLaneHeaders({ data }: NodeProps<DocumentLane>) {
  return (
    <article className="pointer-events-none h-full border border-legal-border bg-legal-surface px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-legal-meta">{data.documentType}</p>
        <p className="font-mono text-[10px] text-legal-meta">{data.clauseCount} {data.clauseCount === 1 ? 'clause' : 'clauses'}</p>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-legal-text" title={data.documentName}>{shortDocumentName(data.documentName)}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-risk-high">{data.riskCount} {data.riskCount === 1 ? 'risk' : 'risks'}</p>
    </article>
  );
}

function shortDocumentName(documentName: string): string {
  return documentName.split(/[\\/]/).pop() ?? documentName;
}
