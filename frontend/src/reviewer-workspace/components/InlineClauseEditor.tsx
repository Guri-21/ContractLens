import React, { useState } from 'react';
import { RefreshCw, Save, X } from 'lucide-react';

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
    // Stub the re-analysis call
    setTimeout(() => {
      setIsAnalyzing(false);
      onSave(text);
    }, 1500);
  };

  return (
    <div className="bg-blue-50/30 p-4 rounded-lg border border-blue-200 mt-2">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-blue-800">Edit Clause</h4>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-32 p-3 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-gray-700"
      />
      <div className="flex justify-end space-x-2 mt-3">
        <button
          onClick={onCancel}
          disabled={isAnalyzing}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveAndAnalyze}
          disabled={isAnalyzing || text === initialText}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Re-analyzing...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save & Re-run Analysis
            </>
          )}
        </button>
      </div>
    </div>
  );
};
