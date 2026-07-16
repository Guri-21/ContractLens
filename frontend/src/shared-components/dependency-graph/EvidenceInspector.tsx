import { CheckCircle2, X } from 'lucide-react';

import type { ClauseDTO, RiskFindingDTO } from '../../reviewer-workspace/types';

type EvidenceInspectorProps = {
  clause: ClauseDTO;
  risks: readonly RiskFindingDTO[];
  linkedClauses: readonly ClauseDTO[];
  unresolvedTargets: readonly string[];
  onClose: () => void;
  onSelectClause: (clauseId: string) => void;
};

export function EvidenceInspector({ clause, risks, linkedClauses, unresolvedTargets, onClose, onSelectClause }: EvidenceInspectorProps) {
  return (
    <aside aria-label="Evidence inspector" className="fixed inset-x-0 bottom-0 z-20 max-h-[72vh] overflow-y-auto border-t border-legal-border bg-legal-surface shadow-[0_-4px_15px_rgba(0,0,0,0.08)] lg:static lg:h-full lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 lg:shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
      <header className="sticky top-0 flex items-center justify-between border-b border-legal-border bg-legal-bg p-4">
        <h2 className="truncate pr-2 font-mono text-xs font-semibold uppercase tracking-widest text-legal-text">Evidence inspector</h2>
        <button type="button" onClick={onClose} aria-label="Close inspector" className="text-legal-meta transition-colors hover:text-legal-text">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="space-y-5 p-5">
        <section>
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-legal-meta">Clause</h3>
          <p className="mt-2 text-sm font-semibold text-legal-text">{clause.title || clause.clauseType || 'Clause'}</p>
          <p className="mt-1 font-mono text-[11px] text-legal-meta">
            {clause.documentName}{clause.sectionNumber ? ` · ${clause.sectionNumber}` : ''}{clause.page ? ` · Page ${clause.page}` : ''}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-legal-text">{clause.text}</p>
        </section>

        <section>
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-legal-meta">Risks</h3>
          {risks.length === 0 ? (
            <div className="mt-2 flex items-center gap-2 border border-redline-add bg-redline-addBg p-3 text-sm text-legal-text">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              No risks detected for this clause.
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              {risks.map((risk) => <RiskEvidence key={risk.id} risk={risk} />)}
            </div>
          )}
        </section>

        {linkedClauses.length > 0 && (
          <section>
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-legal-meta">Linked clauses</h3>
            <div className="mt-2 space-y-2">
              {linkedClauses.map((linkedClause) => (
                <button key={linkedClause.id} type="button" onClick={() => onSelectClause(linkedClause.id)} className="w-full border border-legal-border bg-legal-bg p-2 text-left text-xs text-legal-text transition-colors hover:border-legal-focus">
                  <span className="block truncate font-semibold">{linkedClause.documentName}</span>
                  <span className="block font-mono text-[10px] text-legal-meta">{linkedClause.sectionNumber || 'Unnumbered clause'}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {unresolvedTargets.length > 0 && (
          <section>
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-legal-meta">Missing relationship targets</h3>
            <ul className="mt-2 space-y-2 border border-accent bg-white p-2 text-xs text-legal-text">
              {unresolvedTargets.map((targetId) => <li key={targetId}>Missing target: {targetId}</li>)}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function RiskEvidence({ risk }: { risk: RiskFindingDTO }) {
  const label = risk.status === 'not_evaluated' ? 'Not evaluated' : `${risk.riskLevel} risk`;
  const styles = getRiskEvidenceStyles(risk);

  return (
    <article className={`border p-3 text-xs ${styles.cardClass}`}>
      <p className={`font-mono text-[10px] font-bold uppercase tracking-widest ${styles.labelClass}`}>{label}</p>
      <p className="mt-1 leading-relaxed text-legal-text">{risk.reason}</p>
      {risk.evidence.map((evidence, index) => (
        <blockquote key={`${evidence.documentName}-${index}`} className="mt-3 border-l-2 border-legal-focus pl-3 text-legal-text">
          <p>“{evidence.quote}”</p>
          <footer className="mt-1 font-mono text-[10px] text-legal-meta">
            {evidence.documentName}{evidence.section ? ` · ${evidence.section}` : ''}{evidence.page ? ` · Page ${evidence.page}` : ''}
          </footer>
        </blockquote>
      ))}
      {(risk.missingDocuments?.length ?? 0) > 0 && (
        <div className="mt-3 border border-accent bg-white p-2 text-legal-text">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest">Missing documents</p>
          <ul className="mt-1 list-disc pl-4">
            {risk.missingDocuments?.map((documentName) => <li key={documentName}>{documentName}</li>)}
          </ul>
        </div>
      )}
    </article>
  );
}

function getRiskEvidenceStyles(risk: RiskFindingDTO): { cardClass: string; labelClass: string } {
  if (risk.status === 'not_evaluated') {
    return { cardClass: 'border-accent bg-white text-legal-text', labelClass: 'text-accent' };
  }

  const styles: Record<RiskFindingDTO['riskLevel'], { cardClass: string; labelClass: string }> = {
    low: { cardClass: 'border-risk-low bg-white text-legal-text', labelClass: 'text-risk-low' },
    medium: { cardClass: 'border-risk-medium bg-white text-legal-text', labelClass: 'text-risk-medium' },
    high: { cardClass: 'border-risk-high bg-redline-removeBg text-legal-text', labelClass: 'text-risk-high' },
    critical: { cardClass: 'border-risk-critical bg-redline-removeBg text-legal-text', labelClass: 'text-risk-critical' },
  };

  return styles[risk.riskLevel];
}
