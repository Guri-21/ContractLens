import React from 'react';
import { AlertTriangle, Check, X, Edit3 } from 'lucide-react';
import { RiskFindingDTO } from '../types';

interface CrossDocumentComparisonProps {
  finding: RiskFindingDTO;
  onAccept: (findingId: string) => void;
  onReject: (findingId: string) => void;
  onEdit: (findingId: string) => void;
}

export const CrossDocumentComparison: React.FC<CrossDocumentComparisonProps> = ({ finding, onAccept, onReject, onEdit }) => {
  const hasComparisonText = finding.comparisonText && finding.comparisonText.sowText && finding.comparisonText.msaText;
  const hasEvidence = finding.evidence && finding.evidence.length >= 2;

  if (!hasComparisonText && !hasEvidence) {
    return null; // Need comparison context
  }

  const sowText = finding.comparisonText?.sowText || (finding.evidence.length > 0 ? finding.evidence[0].quote : '');
  const msaText = finding.comparisonText?.msaText || (finding.evidence.length > 1 ? finding.evidence[1].quote : '');
  const confidence = finding.confidence || 0;

  return (
    <div className="mt-4 border border-legal-border bg-legal-surface relative group shadow-sm transition-all hover:shadow-md">
      
      {/* Dual Pane Legal Comparison */}
      <div className="flex flex-col md:flex-row">
        
        {/* Left Pane: SOW */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-legal-border p-4 relative">
          <div className="flex items-center justify-between mb-3">
             <span className="font-mono text-[10px] uppercase tracking-widest text-legal-meta font-semibold">SOW Document</span>
             <span className="font-mono text-[10px] text-risk-critical bg-risk-critical/10 px-1.5 py-0.5 rounded">Current Text</span>
          </div>
          <p className="font-body text-sm text-legal-text leading-relaxed">
            {sowText}
          </p>
        </div>

        {/* Right Pane: MSA */}
        <div className="flex-1 p-4 relative bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
             <span className="font-mono text-[10px] uppercase tracking-widest text-legal-meta font-semibold">Master Agreement</span>
             <span className="font-mono text-[10px] text-legal-meta bg-gray-200/50 px-1.5 py-0.5 rounded">Reference Text</span>
          </div>
          <p className="font-body text-sm text-legal-text leading-relaxed">
            {msaText}
          </p>
        </div>
      </div>

      {/* The Evidence Layer (AI Reasoning injected between/below) */}
      <div className="border-t border-legal-focus/20 bg-blue-50/30 p-4">
         <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-legal-focus mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
               <div className="flex items-center justify-between mb-1">
                 <span className="font-mono text-xs text-legal-focus font-semibold uppercase tracking-wider">AI Contradiction Analysis</span>
                 {confidence > 0 && (
                   <span className="font-mono text-[10px] text-legal-focus bg-blue-100 px-1.5 py-0.5 rounded-sm">
                     CONF: {confidence.toFixed(1)}%
                   </span>
                 )}
               </div>
               <p className="font-mono text-xs text-legal-text leading-relaxed mb-4">
                 {finding.reason}
               </p>

               {finding.redline && (
                 <div className="mt-3">
                   <span className="font-mono text-[10px] text-redline-add font-bold uppercase tracking-widest block mb-1">Proposed Redline</span>
                   <div className="font-body text-sm bg-redline-addBg border border-redline-add/30 text-legal-text p-2.5 rounded-sm">
                     <span className="text-redline-add line-through mr-2 opacity-70">{sowText}</span>
                     <span className="text-redline-add font-medium">{finding.redline.suggestedText}</span>
                   </div>
                 </div>
               )}
            </div>
         </div>
      </div>
      
      {/* Quiet Actions (Visible on hover) */}
      <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 bg-legal-surface shadow-sm border border-legal-border rounded-md overflow-hidden">
        <button 
          onClick={() => onAccept(finding.id)} 
          className="flex items-center px-2.5 py-1.5 bg-white text-legal-text text-[11px] font-mono font-medium hover:bg-green-50 hover:text-green-800 transition-colors border-r border-legal-border"
          title="Accept Suggestion"
        >
          <Check className="h-3 w-3 mr-1" /> Accept
        </button>
        <button 
          onClick={() => onEdit(finding.id)} 
          className="flex items-center px-2.5 py-1.5 bg-white text-legal-text text-[11px] font-mono font-medium hover:bg-blue-50 hover:text-blue-800 transition-colors border-r border-legal-border"
          title="Edit Manually"
        >
          <Edit3 className="h-3 w-3 mr-1" /> Edit
        </button>
        <button 
          onClick={() => onReject(finding.id)} 
          className="flex items-center px-2.5 py-1.5 bg-white text-legal-text text-[11px] font-mono font-medium hover:bg-red-50 hover:text-red-800 transition-colors"
          title="Reject"
        >
          <X className="h-3 w-3 mr-1" /> Reject
        </button>
      </div>

    </div>
  );
};
