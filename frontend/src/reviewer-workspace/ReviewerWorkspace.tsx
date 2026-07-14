import React, { useState } from 'react';
import { UploadFlow } from './components/UploadFlow';
import { ClauseViewer } from './components/ClauseViewer';
import { AiLegalAssistant } from './components/AiLegalAssistant';
import { ClauseDTO, RiskFindingDTO } from './types';

export const ReviewerWorkspace: React.FC = () => {
  const [isUploaded, setIsUploaded] = useState(false);
  const [clauses, setClauses] = useState<ClauseDTO[]>([]);
  const [risks, setRisks] = useState<RiskFindingDTO[]>([]);


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
    <div className="flex h-[calc(100vh-160px)] overflow-hidden bg-gray-100 rounded-lg shadow-sm">
      {/* Main Clause Viewer Area (Takes up 75% width) */}
      <div className="flex-1 min-w-0 flex flex-col h-full shadow-lg z-10 relative">
        <ClauseViewer clauses={clauses} risks={risks} />
      </div>

      {/* AI Assistant Chat Panel (Takes up 25% width) */}
      <div className="w-1/4 min-w-[300px] h-full shadow-xl z-20">
        <AiLegalAssistant />
      </div>
    </div>
  );
};

