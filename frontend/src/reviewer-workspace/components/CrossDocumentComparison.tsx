import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { RiskFindingDTO } from '../types';

interface CrossDocumentComparisonProps {
  finding: RiskFindingDTO;
}

export const CrossDocumentComparison: React.FC<CrossDocumentComparisonProps> = ({ finding }) => {
  if (!finding.evidence || finding.evidence.length < 2) {
    return null; // Need at least 2 pieces of evidence to compare
  }

  const [doc1, doc2] = finding.evidence;

  return (
    <div className="mt-4 border border-red-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center">
        <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
        <h4 className="text-sm font-semibold text-red-800">Cross-Document Contradiction Detected</h4>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Document 1 */}
        <div className="border-r border-gray-100 pr-4">
          <div className="mb-2">
            <span className="inline-block px-2 py-1 bg-gray-100 text-xs font-medium text-gray-700 rounded mb-1">
              {doc1.documentName}
            </span>
            {doc1.section && (
              <span className="text-xs text-gray-500 ml-2">Section {doc1.section}</span>
            )}
            {doc1.page && (
              <span className="text-xs text-gray-500 ml-2">Page {doc1.page}</span>
            )}
          </div>
          <p className="text-sm text-gray-800 bg-red-50/50 p-2 rounded border border-red-100/50">
            "{doc1.quote}"
          </p>
        </div>

        {/* Document 2 */}
        <div>
          <div className="mb-2">
            <span className="inline-block px-2 py-1 bg-gray-100 text-xs font-medium text-gray-700 rounded mb-1">
              {doc2.documentName}
            </span>
            {doc2.section && (
              <span className="text-xs text-gray-500 ml-2">Section {doc2.section}</span>
            )}
            {doc2.page && (
              <span className="text-xs text-gray-500 ml-2">Page {doc2.page}</span>
            )}
          </div>
          <p className="text-sm text-gray-800 bg-red-50/50 p-2 rounded border border-red-100/50">
            "{doc2.quote}"
          </p>
        </div>
      </div>
      <div className="bg-gray-50 p-3 border-t border-gray-200 text-sm text-gray-700">
        <strong>AI Analysis:</strong> {finding.reason}
      </div>
    </div>
  );
};
