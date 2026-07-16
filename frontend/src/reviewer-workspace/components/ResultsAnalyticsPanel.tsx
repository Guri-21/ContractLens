import React from 'react';
import { ClauseDTO, RiskFindingDTO } from '../types';
import { Scale, FileX, AlertTriangle, Globe, DollarSign, Activity } from 'lucide-react';

interface ResultsAnalyticsPanelProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
}

export const ResultsAnalyticsPanel: React.FC<ResultsAnalyticsPanelProps> = ({ clauses, risks }) => {
  const riskCounts = {
    low: risks.filter(r => r.riskLevel === 'low').length,
    medium: risks.filter(r => r.riskLevel === 'medium').length,
    high: risks.filter(r => r.riskLevel === 'high').length,
    critical: risks.filter(r => r.riskLevel === 'critical').length,
  };

  const missingClauses = risks.filter(r => r.contradictionType === 'missing_clause');
  const indianLawRisks = risks.filter(isIndianLawRisk);
  const endangeredIndianLaws = getEndangeredIndianLaws(indianLawRisks);

  const topRisky = [...risks]
    .filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high')
    .slice(0, 3);

  const countryViolations = risks.filter(r => 
    r.reason.toLowerCase().includes('country') || 
    r.reason.toLowerCase().includes('law') ||
    r.contradictionType === 'country_law_violation'
  );

  const financialClauses = clauses.filter(c => 
    c.clauseType === 'Payment Terms' || 
    c.clauseType === 'Liability' || 
    c.text.includes('$') || 
    c.text.toLowerCase().includes('payment')
  );

  return (
    <div className="space-y-4">
      {/* Processing Stats */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <Activity className="w-3 h-3 mr-1.5 text-legal-focus" /> Processing Stats
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xl font-display font-bold text-legal-text">{clauses.length}</div>
            <div className="font-mono text-[9px] uppercase text-legal-meta mt-1">Clauses Extracted</div>
          </div>
          <div>
            <div className="text-xl font-display font-bold text-legal-text">{risks.length}</div>
            <div className="font-mono text-[9px] uppercase text-legal-meta mt-1">Total Findings</div>
          </div>
        </div>
      </div>

      {/* Risk Distribution Card */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1">Risk Distribution</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xl font-display font-bold text-risk-critical">{riskCounts.critical}</div>
            <div className="font-mono text-[9px] uppercase text-legal-meta mt-1">Criticl</div>
          </div>
          <div>
            <div className="text-xl font-display font-bold text-risk-high">{riskCounts.high}</div>
            <div className="font-mono text-[9px] uppercase text-legal-meta mt-1">High</div>
          </div>
          <div>
            <div className="text-xl font-display font-bold text-risk-medium">{riskCounts.medium}</div>
            <div className="font-mono text-[9px] uppercase text-legal-meta mt-1">Med</div>
          </div>
          <div>
            <div className="text-xl font-display font-bold text-risk-low">{riskCounts.low}</div>
            <div className="font-mono text-[9px] uppercase text-legal-meta mt-1">Low</div>
          </div>
        </div>
      </div>

      {/* Indian Law Exposure */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <Scale className="w-3 h-3 mr-1.5 text-legal-focus" /> Indian Laws at Risk
        </h3>
        {endangeredIndianLaws.length === 0 ? (
          <p className="font-mono text-[10px] text-green-700">No Indian-law exposure detected.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-display font-bold text-risk-high">{endangeredIndianLaws.length}</div>
              <p className="font-mono text-[10px] text-legal-meta leading-tight">
                Indian {endangeredIndianLaws.length === 1 ? 'law is' : 'laws are'} exposed by current findings.
              </p>
            </div>
            <ul className="space-y-2">
              {endangeredIndianLaws.slice(0, 4).map((law) => (
                <li key={law.name} className="border border-risk-high/20 bg-risk-high/5 p-2 text-sm text-legal-text">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="font-body text-risk-high">{law.name}</strong>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-legal-meta">
                      {law.count} {law.count === 1 ? 'risk' : 'risks'}
                    </span>
                  </div>
                  {law.section && (
                    <p className="mt-1 font-mono text-[10px] text-legal-meta">{law.section}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Country Law Compliance */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <Globe className="w-3 h-3 mr-1.5 text-legal-focus" /> Country Law Compliance
        </h3>
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-display font-bold text-legal-text">
            {countryViolations.length === 0 ? '100%' : `${Math.round(((clauses.length - countryViolations.length) / (clauses.length || 1)) * 100)}%`}
          </div>
          <div>
            <p className="font-mono text-[10px] text-legal-meta leading-tight">
              <strong>{countryViolations.length}</strong> local law risks detected.<br/>
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <DollarSign className="w-3 h-3 mr-1.5 text-legal-focus" /> Financial Impact Summary
        </h3>
        {financialClauses.length === 0 ? (
          <p className="font-mono text-[10px] text-legal-meta">No specific financial clauses identified.</p>
        ) : (
          <ul className="space-y-2">
            {financialClauses.slice(0, 3).map(c => (
              <li key={c.id} className="text-sm font-body text-legal-text bg-legal-bg border border-legal-border p-2 rounded-sm truncate">
                <strong>{c.clauseType || 'Financials'}:</strong> {c.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top Risky Clauses */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <AlertTriangle className="w-3 h-3 mr-1.5 text-risk-high" /> Top Risky Clauses
        </h3>
        {topRisky.length === 0 ? (
          <p className="font-mono text-[10px] text-green-700">No high or critical risks detected.</p>
        ) : (
          <ul className="space-y-2">
            {topRisky.map(r => {
              const c = clauses.find(cl => cl.id === r.clauseId);
              return (
                <li key={r.id} className="text-sm font-body text-legal-text bg-risk-high/5 border border-risk-high/20 p-2 rounded-sm">
                  <span className="font-bold text-risk-high text-xs mr-2 uppercase">{r.riskLevel}</span>
                  {c ? c.title || c.clauseType || 'Clause' : r.clauseId}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Missing Clauses */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <FileX className="w-3 h-3 mr-1.5 text-risk-critical" /> Missing Clauses
        </h3>
        {missingClauses.length === 0 ? (
          <p className="font-mono text-[10px] text-green-700">No missing clauses detected.</p>
        ) : (
          <ul className="space-y-2">
            {missingClauses.map(m => (
              <li key={m.id} className="text-sm font-body text-legal-text bg-risk-critical/5 border border-risk-critical/10 p-2 rounded-sm">
                {m.reason}
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
};

function isIndianLawRisk(risk: RiskFindingDTO): boolean {
  const text = [
    risk.reason,
    risk.playbookRuleViolated || '',
    ...(risk.evidence || []).flatMap(evidence => [evidence.documentName, evidence.section || '', evidence.quote]),
  ].join(' ').toLowerCase();

  return (
    risk.contradictionType === 'country_law_violation' ||
    text.includes('india') ||
    text.includes('indian') ||
    text.includes('act,') ||
    text.includes('companies act') ||
    text.includes('contract act') ||
    text.includes('arbitration') ||
    text.includes('dpdp') ||
    text.includes('digital personal data protection')
  );
}

function getEndangeredIndianLaws(risks: RiskFindingDTO[]): Array<{ name: string; section?: string; count: number }> {
  const laws = new Map<string, { name: string; section?: string; count: number }>();

  risks.forEach((risk) => {
    const extracted = extractIndianLawReference(risk);
    const current = laws.get(extracted.name);
    if (current) {
      current.count += 1;
      current.section ||= extracted.section;
      return;
    }
    laws.set(extracted.name, { ...extracted, count: 1 });
  });

  return [...laws.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function extractIndianLawReference(risk: RiskFindingDTO): { name: string; section?: string } {
  const source = [
    risk.playbookRuleViolated || '',
    risk.reason,
    ...(risk.evidence || []).flatMap(evidence => [evidence.section || '', evidence.documentName, evidence.quote]),
  ].join(' ');

  const knownActs = [
    'Indian Contract Act, 1872',
    'Companies Act, 2013',
    'Arbitration and Conciliation Act, 1996',
    'Specific Relief Act, 1963',
    'Limitation Act, 1963',
    'Information Technology Act, 2000',
    'Digital Personal Data Protection Act, 2023',
    'DPDP Act, 2023',
    'Commercial Courts Act, 2015',
    'Indian Stamp Act, 1899',
    'Sale of Goods Act, 1930',
    'Competition Act, 2002',
  ];

  const name = knownActs.find((act) => source.toLowerCase().includes(act.toLowerCase()))
    || source.match(/([A-Z][A-Za-z ]+ Act,\s*\d{4})/)?.[1]
    || 'Indian statutory corpus';
  const section = source.match(/(?:section|sec\.?|s\.)\s*[\dA-Za-z.-]+(?:\([\w\d]+\))?/i)?.[0];

  return { name, section };
}
