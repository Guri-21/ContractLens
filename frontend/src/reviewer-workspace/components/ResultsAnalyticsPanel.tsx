import React from 'react';
import { ClauseDTO, RiskFindingDTO } from '../types';
import { Target, FileX, AlertTriangle, Globe, DollarSign, Activity } from 'lucide-react';

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
  const playbookViolations = risks.filter(r => r.contradictionType === 'playbook_violation');
  const playbookCompliantCount = clauses.length - playbookViolations.length; 

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

      {/* Playbook Compliance */}
      <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
        <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1 flex items-center">
          <Target className="w-3 h-3 mr-1.5 text-legal-focus" /> Playbook Compliance
        </h3>
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-display font-bold text-legal-text">
            {Math.round((playbookCompliantCount / (clauses.length || 1)) * 100)}%
          </div>
          <div>
            <p className="font-mono text-[10px] text-legal-meta leading-tight">
              <strong>{playbookViolations.length}</strong> rules violated.<br/>
              {clauses.length} clauses evaluated.
            </p>
          </div>
        </div>
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
