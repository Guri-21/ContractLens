import React from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import type { ReviewerDecision } from '../reviewerDecisions';
import { decisionLabel } from '../reviewerDecisions';

interface RedlineViewProps {
  originalText: string;
  suggestedText: string;
  onAccept: () => void;
  onReject: () => void;
  onModify: () => void;
  decision?: ReviewerDecision;
}

export const RedlineView: React.FC<RedlineViewProps> = ({
  originalText,
  suggestedText,
  onAccept,
  onReject,
  onModify,
  decision,
}) => {
  // A very basic simulated diff (in a real app, use a diff library like diff-match-patch)
  // Here we just show the original struck through and the new one highlighted.
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
      <div className="bg-amber-50/50 border-b border-gray-100 px-4 py-3 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-amber-800 flex items-center">
          <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
          AI Suggested Rewording
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={onReject}
            disabled={decision === 'rejected'}
            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <X className="h-3 w-3 mr-1" /> {decision === 'rejected' ? 'Rejected' : 'Reject'}
          </button>
          <button
            onClick={onModify}
            disabled={decision === 'modified'}
            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Edit2 className="h-3 w-3 mr-1" /> {decision === 'modified' ? 'Modifying' : 'Modify'}
          </button>
          <button
            onClick={onAccept}
            disabled={decision === 'accepted'}
            className="inline-flex items-center px-2 py-1 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Check className="h-3 w-3 mr-1" /> {decision === 'accepted' ? 'Accepted' : 'Accept'}
          </button>
        </div>
      </div>
      {decision && (
        <div className="border-b border-legal-border bg-legal-bg px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-legal-focus">
          {decisionLabel(decision)}
        </div>
      )}
      
      <div className="p-4 text-sm leading-relaxed text-gray-800 space-y-4">
        <div className="bg-red-50 p-3 rounded border border-red-100">
          <span className="text-xs font-semibold text-red-600 block mb-1 uppercase tracking-wider">Original</span>
          <span className="line-through text-red-800 opacity-80">{originalText}</span>
        </div>
        <div className="bg-green-50 p-3 rounded border border-green-100">
          <span className="text-xs font-semibold text-green-600 block mb-1 uppercase tracking-wider">Suggested</span>
          <span className="text-green-800 font-medium">{suggestedText}</span>
        </div>
      </div>
    </div>
  );
};
