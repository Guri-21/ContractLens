import React, { useState } from 'react';
import { UploadFlow } from './components/UploadFlow';
import { ClauseViewer } from './components/ClauseViewer';
import { AiLegalAssistant } from './components/AiLegalAssistant';

export const ReviewerWorkspace: React.FC = () => {
  const [isUploaded, setIsUploaded] = useState(false);
  
  // Note: in Vite, env vars are prefixed with VITE_
  // If the var isn't set, we'll default to true for the sake of this standalone demo
  const isMockMode = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

  if (!isUploaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {isMockMode && (
          <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 px-3 py-1 rounded text-xs font-bold shadow-sm border border-amber-200">
            MOCK DATA MODE
          </div>
        )}
        <div className="w-full">
          <UploadFlow onComplete={() => setIsUploaded(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {isMockMode && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-amber-200 z-50">
          RUNNING IN MOCK DATA MODE
        </div>
      )}
      
      {/* Main Clause Viewer Area (Takes up 75% width) */}
      <div className="flex-1 min-w-0 flex flex-col h-full shadow-lg z-10 relative">
        <ClauseViewer />
      </div>

      {/* AI Assistant Chat Panel (Takes up 25% width) */}
      <div className="w-1/4 min-w-[300px] h-full shadow-xl z-20">
        <AiLegalAssistant />
      </div>
    </div>
  );
};
