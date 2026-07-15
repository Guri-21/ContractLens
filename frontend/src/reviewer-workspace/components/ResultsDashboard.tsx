import React from 'react';
import { ClauseDTO, RiskFindingDTO } from '../types';

interface ResultsDashboardProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ clauses, risks }) => {
  const totalClauses = clauses.length;
  const maxPage = clauses.reduce((max, c) => (c.page && c.page > max ? c.page : max), 1);
  const pageCount = maxPage > 1 ? maxPage : 10; 
  
  const highRisks = risks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length;
  const riskScore = Math.min(100, Math.round((highRisks / (totalClauses || 1)) * 100 * 2.5));
  const complianceScore = 100 - riskScore;
  
  const uploadTime = new Date().toLocaleDateString();
  const documentName = clauses.length > 0 ? clauses[0].documentName : "Unknown Document";

  return (
    <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-4">
      <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-3 border-b border-legal-border pb-1">Document Profile</h3>
      
      <div className="mb-4">
         <div className="text-xl font-display font-semibold text-legal-text truncate" title={documentName}>{documentName}</div>
         <div className="font-mono text-xs text-legal-meta mt-1">Processed: {uploadTime} • {pageCount} Pages • {totalClauses} Clauses</div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-legal-border/50">
        <div>
          <div className="font-mono text-[10px] text-legal-meta uppercase mb-1">Risk Score</div>
          <div className={`text-2xl font-display font-bold ${riskScore > 50 ? 'text-risk-critical' : 'text-risk-medium'}`}>
            {riskScore}<span className="text-sm font-normal text-legal-meta">/100</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-legal-meta uppercase mb-1">Compliance</div>
          <div className="text-2xl font-display font-bold text-green-700">
            {complianceScore}<span className="text-sm font-normal text-legal-meta">/100</span>
          </div>
        </div>
      </div>
    </div>
  );
};
