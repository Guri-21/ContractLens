import React, { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';

interface InlineClauseEditorProps {
  initialText: string;
  onCancel: () => void;
  onSave: (newText: string) => void;
}

export const InlineClauseEditor: React.FC<InlineClauseEditorProps> = ({
  initialText,
  onCancel,
  onSave,
}) => {
  const [text, setText] = useState(initialText);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSaveAndAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      onSave(text);
    }, 1500);
  };

  return (
    <div className="bg-legal-bg border border-legal-focus/20 p-5 rounded-sm mb-8 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-mono text-xs uppercase tracking-widest text-legal-focus font-semibold border-b border-legal-focus/20 pb-1">Clause Revision Mode</h4>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-legal-meta">Original Text</span>
          </div>
          <div className="w-full h-48 p-3 text-sm bg-gray-50 border border-legal-border text-legal-meta font-body leading-relaxed overflow-y-auto">
            {initialText}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-legal-focus font-bold">New Revision</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-48 p-3 text-sm border border-legal-focus bg-legal-surface focus:ring-1 focus:ring-legal-focus focus:outline-none font-body text-legal-text resize-none leading-relaxed shadow-inner"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2 mt-5">
        <button
          onClick={onCancel}
          disabled={isAnalyzing}
          className="px-4 py-2 text-[11px] font-mono font-medium text-legal-text bg-legal-surface border border-legal-border hover:bg-gray-50 disabled:opacity-50 uppercase tracking-widest transition-colors"
        >
          Discard
        </button>
        <button
          onClick={handleSaveAndAnalyze}
          disabled={isAnalyzing || text === initialText}
          className="flex items-center px-4 py-2 text-[11px] font-mono font-medium text-white bg-legal-focus hover:bg-blue-900 disabled:opacity-50 uppercase tracking-widest transition-colors"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
              Re-analyzing...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-2" />
              Commit & Analyze
            </>
          )}
        </button>
      </div>
    </div>
  );
};
