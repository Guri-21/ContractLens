import { Handle, Position } from 'reactflow';

import type { ClauseNodeData } from './graphModel';

type ClauseNodeProps = {
  data: ClauseNodeData & { dimmed?: boolean };
  selected: boolean;
};

const statusLabels = {
  safe: 'No risk',
  risk: 'Risk',
  not_evaluated: 'Not evaluated',
} as const;

const statusClasses = {
  safe: 'border-redline-add bg-redline-addBg text-legal-text',
  risk: 'border-risk-high bg-redline-removeBg text-legal-text',
  not_evaluated: 'border-accent bg-white text-legal-text',
} as const;

const riskClasses = {
  low: 'border-risk-low',
  medium: 'border-risk-medium',
  high: 'border-risk-high',
  critical: 'border-risk-critical',
} as const;

export function ClauseNode({ data, selected }: ClauseNodeProps) {
  const { clause, hasOverride, highestRisk, incomingCount, inCycle, outgoingCount, status } = data;
  const title = clause.title || clause.clauseType || 'Clause';
  const sectionLabel = clause.sectionNumber ? `${clause.documentType} ${clause.sectionNumber}` : clause.documentType;
  const stateClasses = [
    statusClasses[status],
    highestRisk && status === 'risk' ? riskClasses[highestRisk] : '',
    hasOverride ? 'border-l-4 border-l-accent' : '',
    inCycle ? 'ring-1 ring-legal-focus ring-offset-1' : '',
    selected ? 'outline outline-2 outline-legal-focus outline-offset-2' : '',
    data.dimmed ? 'opacity-35' : '',
  ].filter(Boolean).join(' ');

  return (
    <article className={`h-40 w-[272px] overflow-hidden rounded-sm border p-3 text-left shadow-sm ${stateClasses}`}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-legal-focus" />
      <header className="flex items-start justify-between gap-2 border-b border-current/15 pb-1.5">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-wide">{sectionLabel}</p>
          <p className="truncate text-[11px] opacity-75" title={clause.documentName}>{clause.documentName}</p>
        </div>
        <span className="shrink-0 border border-current/20 bg-white/70 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
          {statusLabels[status]}
        </span>
      </header>

      <p className="mt-2 truncate font-display text-sm font-semibold" title={title}>{title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-80" title={clause.text}>{clause.text}</p>

      <footer className="mt-2 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-wide opacity-80">
        <span>In {incomingCount}</span>
        <span>Out {outgoingCount}</span>
        {highestRisk && status === 'risk' && <span>{highestRisk}</span>}
        {hasOverride && <span>Overrides</span>}
        {inCycle && <span>Circular</span>}
      </footer>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-legal-focus" />
    </article>
  );
}
