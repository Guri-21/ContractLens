import React, { useState } from 'react';
import { Check, X, Edit2, Lock, Unlock } from 'lucide-react';

export type DocumentStatus = 'draft' | 'approved' | 'needs_revision' | 'rejected';

interface ApprovalPanelProps {
  status: DocumentStatus;
  onUpdateStatus: (newStatus: DocumentStatus, comment?: string) => void;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ status, onUpdateStatus }) => {
  const [comment, setComment] = useState('');

  if (status === 'approved') {
    return (
      <div className="flex items-center justify-between p-4 bg-legal-bg border border-legal-border rounded-sm">
        <div className="flex items-center text-legal-text">
          <Lock className="w-5 h-5 mr-3 text-redline-add" />
          <div>
            <h4 className="font-mono text-xs uppercase font-bold tracking-widest text-legal-text">Document Locked</h4>
            <p className="font-body text-xs text-legal-meta mt-0.5">Editing disabled to preserve final approved state.</p>
          </div>
        </div>
        <button
          onClick={() => onUpdateStatus('draft')}
          className="flex items-center px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-legal-text bg-legal-surface border border-legal-border hover:bg-gray-50 transition-colors"
        >
          <Unlock className="w-3.5 h-3.5 mr-2" />
          Re-open
        </button>
      </div>
    );
  }

  return (
    <div className="bg-legal-surface border border-legal-border p-5 rounded-sm">
      <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest border-b border-legal-border pb-2 mb-4">Final Sign-off</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add reviewer comments for audit trail..."
        className="w-full h-20 p-3 text-sm font-body text-legal-text bg-legal-bg border border-legal-border rounded-sm focus:ring-1 focus:ring-legal-focus focus:border-legal-focus mb-4 resize-none placeholder:font-mono placeholder:text-xs placeholder:tracking-wide"
      />
      <div className="flex space-x-3">
        <button
          onClick={() => onUpdateStatus('approved', comment)}
          className="flex-1 flex justify-center items-center px-4 py-2 bg-legal-surface border border-legal-border text-legal-text font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-green-50 hover:text-green-800 transition-colors"
        >
          <Check className="w-4 h-4 mr-2" /> Approve
        </button>
        <button
          onClick={() => onUpdateStatus('needs_revision', comment)}
          className="flex-1 flex justify-center items-center px-4 py-2 bg-legal-surface border border-legal-border text-legal-text font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-blue-50 hover:text-legal-focus transition-colors"
        >
          <Edit2 className="w-4 h-4 mr-2" /> Needs Revision
        </button>
        <button
          onClick={() => onUpdateStatus('rejected', comment)}
          className="flex-1 flex justify-center items-center px-4 py-2 bg-legal-surface border border-legal-border text-legal-text font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-risk-critical transition-colors"
        >
          <X className="w-4 h-4 mr-2" /> Reject
        </button>
      </div>
      
      {status !== 'draft' && (
        <div className="mt-4 pt-3 border-t border-legal-border flex items-center justify-between">
          <span className="font-mono text-[10px] text-legal-meta uppercase">Current Status</span>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-legal-focus">{status.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  );
};
