import React, { useState } from 'react';
import { UploadFlow } from './components/UploadFlow';
import { ClauseViewer } from './components/ClauseViewer';
import { AiLegalAssistant } from './components/AiLegalAssistant';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ResultsAnalyticsPanel } from './components/ResultsAnalyticsPanel';
import { ApprovalPanel, DocumentStatus } from './components/ApprovalPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { ClauseDTO, RiskFindingDTO } from './types';
import { ReportExport } from '../reports/ReportExport';

export const ReviewerWorkspace: React.FC = () => {
  const [isUploaded, setIsUploaded] = useState(false);
  const [clauses, setClauses] = useState<ClauseDTO[]>([]);
  const [risks, setRisks] = useState<RiskFindingDTO[]>([]);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('draft');


  if (!isUploaded) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full">
          <UploadFlow onComplete={(data) => {
             setClauses(data.clauses);
             setRisks(data.risks);
             setIsUploaded(true);
          }} />
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-legal-surface border-t border-legal-border font-body">
      
      {/* Left Sidebar: Command Center */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-legal-border bg-legal-bg overflow-y-auto cl-scroll z-20 shadow-[1px_0_10px_rgba(0,0,0,0.03)]">
        <div className="p-4 border-b border-legal-border sticky top-0 bg-legal-bg z-10 flex justify-between items-center shadow-sm">
          <h2 className="font-display font-semibold text-lg text-legal-text">Review Overview</h2>
          <NotificationCenter />
        </div>
        <div className="p-4 space-y-8">
          <ResultsDashboard clauses={clauses} risks={risks} />
          <ResultsAnalyticsPanel clauses={clauses} risks={risks} />
          <ReportExport findings={risks} score={100 - (risks.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').length * 5)} />
        </div>
      </div>

      {/* Center: Main Document Stage */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-legal-surface relative z-10 shadow-inner">
        {documentStatus === 'approved' && (
          <div className="bg-redline-addBg border-b border-redline-add p-2 text-center text-xs font-mono text-redline-add font-bold uppercase tracking-wider flex items-center justify-center">
            <span className="mr-2">🔒 Document Approved — Edits Disabled</span>
          </div>
        )}
        <ClauseViewer clauses={clauses} risks={risks} isLocked={documentStatus === 'approved'} />
        <div className="border-t border-legal-border bg-legal-bg p-4 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <ApprovalPanel 
            status={documentStatus} 
            onUpdateStatus={(newStatus) => setDocumentStatus(newStatus)} 
          />
        </div>
      </div>

      {/* Right Sidebar: AI Assistant */}
      <div className="w-[320px] flex-shrink-0 h-full z-20 border-l border-legal-border bg-legal-surface shadow-[-1px_0_10px_rgba(0,0,0,0.03)]">
        <AiLegalAssistant />
      </div>

    </div>
  );
};

