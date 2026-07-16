import React from 'react';
import { ClauseDTO, RiskFindingDTO } from '../types';
import { Scale, FileX, AlertTriangle, Globe, DollarSign, Activity } from 'lucide-react';
import { getFinancialImpactItems, getIndianLawExposure } from '../analysisInsights';

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
  const indianLawExposure = getIndianLawExposure(risks);

  const topRisky = [...risks]
    .filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high')
    .slice(0, 3);

  const financialItems = getFinancialImpactItems(clauses, risks);

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
              <div className="font-mono text-[9px] uppercase text-legal-meta mt-1">Critical</div>
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
          <Scale className="w-3 h-3 mr-1.5 text-legal-focus" /> Indian Laws Breached / Exposed
        </h3>
        {indianLawExposure.risks.length === 0 ? (
          <p className="font-mono text-[10px] text-green-700">No Indian-law exposure detected.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-display font-bold text-risk-high">{indianLawExposure.risks.length}</div>
              <p className="font-mono text-[10px] text-legal-meta leading-tight">
                Indian-law {indianLawExposure.risks.length === 1 ? 'risk is' : 'risks are'} detected in current findings.
              </p>
            </div>
            <p className="font-mono text-[10px] text-legal-meta">
              {indianLawExposure.laws.length} likely breached/exposed {indianLawExposure.laws.length === 1 ? 'law' : 'laws'} mapped.
            </p>
            {indianLawExposure.laws.length > 0 ? (
              <ul className="space-y-2">
                {indianLawExposure.laws.slice(0, 4).map((law) => (
                  <li key={law.name} className="border border-risk-high/20 bg-risk-high/5 p-2 text-sm text-legal-text">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="font-body text-risk-high">{law.name}</strong>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-legal-meta">
                      {law.count} {law.count === 1 ? 'risk' : 'risks'}
                    </span>
                  </div>
                  <div className="mt-1 inline-flex border border-risk-high/20 bg-white/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-risk-high">
                    {law.source === 'exact' ? 'exact source' : 'inferred'}
                  </div>
                  {law.section && (
                    <p className="mt-1 font-mono text-[10px] text-legal-meta">{law.section}</p>
                  )}
                  {law.basis && (
                    <p className="mt-1 text-xs leading-snug text-legal-meta">{law.basis}</p>
                  )}
                </li>
              ))}
            </ul>
            ) : (
              <p className="font-mono text-[10px] text-amber-800">No exact statute name was extracted yet.</p>
            )}
            {indianLawExposure.unmappedRiskCount > 0 && (
              <p className="font-mono text-[10px] text-amber-800">
                {indianLawExposure.unmappedRiskCount} Indian-law {indianLawExposure.unmappedRiskCount === 1 ? 'risk needs' : 'risks need'} exact statute mapping.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Country Law Compliance */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <Globe className="w-3 h-3 mr-1.5 text-legal-focus" /> Indian Law Compliance
        </h3>
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-display font-bold text-legal-text">
            {indianLawExposure.risks.length === 0 ? '100%' : `${Math.round(((clauses.length - indianLawExposure.risks.length) / (clauses.length || 1)) * 100)}%`}
          </div>
          <div>
            <p className="font-mono text-[10px] text-legal-meta leading-tight">
              <strong>{indianLawExposure.risks.length}</strong> local law risks detected.<br/>
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <DollarSign className="w-3 h-3 mr-1.5 text-legal-focus" /> Financial Impact Summary
        </h3>
        {financialItems.length === 0 ? (
          <p className="font-mono text-[10px] text-legal-meta">No specific financial clauses identified.</p>
        ) : (
          <ul className="space-y-2">
            {financialItems.slice(0, 4).map(item => (
              <li key={item.id} className="text-sm font-body text-legal-text bg-legal-bg border border-legal-border p-2 rounded-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong className="capitalize">{item.label}:</strong>
                  <span className="font-mono text-[9px] uppercase text-legal-meta">{item.source}</span>
                </div>
                <p className="mt-1 line-clamp-2">{item.text}</p>
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
