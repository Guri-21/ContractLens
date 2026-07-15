import { useState } from 'react';
import ClauseList from '../components/document-viewer/ClauseList';
import DocumentPanel from '../components/document-viewer/DocumentPanel';
import SourceCitation from '../components/document-viewer/SourceCitation';
import { mockClauses, mockRiskFindings } from '../reviewer-workspace/mocks/data';

export default function DocumentViewer() {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(
    mockClauses.length > 0 ? mockClauses[0].id : null
  );

  const selectedClause = mockClauses.find(c => c.id === selectedClauseId) || null;
  const selectedRisk = mockRiskFindings.find(r => r.clauseId === selectedClauseId) || null;

  return (
    <div className="flex h-[calc(100vh-160px)] overflow-hidden bg-white border border-[#E2E8F0] rounded-lg shadow-sm">
      {/* 1. Left Clause Navigator */}
      <ClauseList
        clauses={mockClauses}
        risks={mockRiskFindings}
        selectedClauseId={selectedClauseId}
        onSelectClause={(id) => setSelectedClauseId(id)}
      />

      {/* 2. Middle Document Panel */}
      <DocumentPanel
        clauses={mockClauses}
        risks={mockRiskFindings}
        selectedClauseId={selectedClauseId}
        onSelectClause={(id) => setSelectedClauseId(id)}
      />

      {/* 3. Right Sidebar Citation Panel */}
      <SourceCitation
        clause={selectedClause}
        risk={selectedRisk}
      />
    </div>
  );
}
