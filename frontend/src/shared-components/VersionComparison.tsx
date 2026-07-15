import React from 'react';
import { ClauseDTO } from '../reviewer-workspace/types';

interface VersionComparisonProps {
  clause: ClauseDTO;
}

export const VersionComparison: React.FC<VersionComparisonProps> = ({ clause }) => {
  if (!clause.versionHistory || clause.versionHistory.length <= 1) {
    return (
      <div className="font-mono text-[10px] text-legal-meta uppercase tracking-widest text-center py-8">
        No edit history available for this clause.
      </div>
    );
  }

  const sortedVersions = [...clause.versionHistory].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="space-y-6">
      <h3 className="font-display text-xl font-semibold text-legal-text mb-4">Version History</h3>
      {sortedVersions.map((v, index) => {
        const previousVersion = sortedVersions[index + 1];
        
        return (
          <div key={v.versionNumber} className="bg-legal-surface border border-legal-border rounded-sm shadow-sm">
            <div className="flex items-center justify-between p-3 border-b border-legal-border bg-legal-bg">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-[10px] font-bold bg-legal-focus text-white px-1.5 py-0.5 rounded-sm">
                  v{v.versionNumber}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-legal-meta font-bold">
                  {v.changeType.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="font-mono text-[10px] text-legal-meta">
                {v.editedAt} {v.editedBy ? `by ${v.editedBy}` : ''}
              </div>
            </div>

            <div className="p-4">
               {previousVersion && previousVersion.text !== v.text ? (
                 <div className="space-y-3 font-body text-sm leading-relaxed">
                   <div className="bg-redline-removeBg text-redline-remove p-3 border-l-2 border-redline-remove line-through opacity-80">
                     {previousVersion.text}
                   </div>
                   <div className="bg-redline-addBg text-redline-add p-3 border-l-2 border-redline-add font-medium">
                     {v.text}
                   </div>
                 </div>
               ) : (
                 <p className="font-body text-sm text-legal-text leading-relaxed p-2">{v.text}</p>
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
