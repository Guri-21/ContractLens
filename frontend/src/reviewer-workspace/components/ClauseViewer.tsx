import React, { useState } from 'react';
import { ShieldAlert, ShieldX, CheckCircle, FileText, FileWarning, ExternalLink } from 'lucide-react';

import { mockClauses, mockRiskFindings } from '../mocks/data';
import { RedlineView } from './RedlineView';
import { InlineClauseEditor } from './InlineClauseEditor';
import { CrossDocumentComparison } from './CrossDocumentComparison';

export const ClauseViewer: React.FC = () => {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(mockClauses[0].id);
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);

  const selectedClause = mockClauses.find(c => c.id === selectedClauseId);
  const clauseRisks = selectedClause ? mockRiskFindings.filter(r => r.clauseId === selectedClause.id) : [];

  const getRiskBadge = (clauseId: string) => {
    const risks = mockRiskFindings.filter(r => r.clauseId === clauseId);
    if (risks.length === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" /> OK
        </span>
      );
    }
    
    // Check for not_evaluated first
    const notEvaluated = risks.find(r => r.status === 'not_evaluated');
    if (notEvaluated) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 border-dashed" title="AI refused to evaluate due to missing context">
          <ShieldX className="w-3 h-3 mr-1 text-gray-500" /> Not Evaluated
        </span>
      );
    }

    const maxRisk = risks.reduce((prev, current) => {
      const levels = { low: 1, medium: 2, high: 3, critical: 4 };
      return levels[current.riskLevel] > levels[prev.riskLevel] ? current : prev;
    });

    const colors = {
      low: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900 font-bold'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[maxRisk.riskLevel]}`}>
        <ShieldAlert className="w-3 h-3 mr-1" /> {maxRisk.riskLevel.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Left Pane: Clause List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col h-full overflow-hidden bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">Document Clauses</h2>
          <p className="text-sm text-gray-500">{mockClauses.length} clauses extracted</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockClauses.map((clause) => (
            <div
              key={clause.id}
              onClick={() => setSelectedClauseId(clause.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedClauseId === clause.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-100 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-semibold text-gray-800 truncate pr-2">
                  {clause.sectionNumber ? `${clause.sectionNumber} ` : ''}{clause.title || clause.clauseType}
                </h3>
                {getRiskBadge(clause.id)}
              </div>
              <p className="text-xs text-gray-500 truncate mb-2">{clause.documentName}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{clause.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Clause Details */}
      <div className="w-2/3 flex flex-col h-full overflow-y-auto bg-white">
        {selectedClause ? (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {selectedClause.sectionNumber ? `${selectedClause.sectionNumber} ` : ''}{selectedClause.title || selectedClause.clauseType}
                </h1>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span className="flex items-center"><FileText className="w-4 h-4 mr-1"/> {selectedClause.documentName}</span>
                  {selectedClause.page && <span>Page {selectedClause.page}</span>}
                </div>
              </div>
              <button 
                onClick={() => setEditingClauseId(selectedClause.id)}
                className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
              >
                Edit Clause
              </button>
            </div>

            {/* Editing mode or view mode */}
            {editingClauseId === selectedClause.id ? (
              <InlineClauseEditor 
                initialText={selectedClause.text} 
                onCancel={() => setEditingClauseId(null)}
                onSave={(newText) => {
                  console.log("Saved new text:", newText);
                  setEditingClauseId(null);
                }}
              />
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-800 leading-relaxed font-serif">{selectedClause.text}</p>
              </div>
            )}

            {/* Related References */}
            {selectedClause.references.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Related References</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedClause.references.map(ref => (
                    <span key={ref} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <ExternalLink className="w-3 h-3 mr-1" /> {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Findings */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">AI Findings</h3>
              
              {clauseRisks.length === 0 ? (
                <div className="flex items-center justify-center p-8 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  <span>No risks detected in this clause.</span>
                </div>
              ) : (
                clauseRisks.map(risk => (
                  <div key={risk.id} className="mb-6 last:mb-0">
                    {risk.status === 'not_evaluated' ? (
                      // Distinct rendering for not_evaluated
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-5">
                        <div className="flex items-start">
                          <ShieldX className="w-6 h-6 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <h4 className="text-base font-semibold text-gray-800 mb-1">Evaluation Skipped</h4>
                            <p className="text-sm text-gray-600 mb-3">{risk.reason}</p>
                            
                            {risk.missingDocuments && risk.missingDocuments.length > 0 && (
                              <div className="mb-4 p-3 bg-white border border-gray-200 rounded text-sm text-gray-700">
                                <strong>Missing required documents:</strong>
                                <ul className="list-disc pl-5 mt-1">
                                  {risk.missingDocuments.map(doc => <li key={doc}>{doc}</li>)}
                                </ul>
                              </div>
                            )}

                            {risk.evidence && risk.evidence.length > 0 && (
                              <div className="mt-2">
                                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Evidence from uploaded docs</h5>
                                {risk.evidence.map((ev, i) => (
                                  <div key={i} className="bg-white border border-gray-100 p-3 rounded mb-2 last:mb-0 text-sm shadow-sm">
                                    <div className="text-xs text-gray-400 mb-1">{ev.documentName} {ev.section && `• Sec ${ev.section}`} {ev.page && `• Page ${ev.page}`}</div>
                                    <p className="text-gray-700 italic">"{ev.quote}"</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Standard risk rendering
                      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <div className="flex items-start mb-4">
                          <FileWarning className={`w-6 h-6 mt-0.5 mr-3 flex-shrink-0 ${risk.riskLevel === 'high' || risk.riskLevel === 'critical' ? 'text-red-500' : 'text-orange-500'}`} />
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-base font-semibold text-gray-900">Risk Identified</h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${risk.riskLevel === 'high' || risk.riskLevel === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                {risk.riskLevel}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{risk.reason}</p>
                            
                            {risk.playbookRuleViolated && (
                              <div className="mt-2 text-sm text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                                <strong>Playbook Rule:</strong> {risk.playbookRuleViolated}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Evidence rendering */}
                        {risk.evidence && risk.evidence.length === 1 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Evidence</h5>
                            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm">
                              <div className="text-xs text-gray-500 mb-1">{risk.evidence[0].documentName} {risk.evidence[0].page && `• Page ${risk.evidence[0].page}`}</div>
                              <p className="text-gray-800 italic">"{risk.evidence[0].quote}"</p>
                            </div>
                          </div>
                        )}

                        {/* Cross Document Contradiction */}
                        {risk.evidence && risk.evidence.length > 1 && (
                          <div className="mb-4">
                            <CrossDocumentComparison finding={risk} />
                          </div>
                        )}

                        {/* Redline Recommendation */}
                        {risk.redline && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <RedlineView 
                              originalText={risk.redline.originalText}
                              suggestedText={risk.redline.suggestedText}
                              onAccept={() => console.log('Accepted redline')}
                              onReject={() => console.log('Rejected redline')}
                              onModify={() => console.log('Modify redline')}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Placeholders for Future Components */}
            <div className="mt-12 space-y-4 border-t-2 border-dashed border-gray-200 pt-8 opacity-50">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Future Extensions</h3>
              <div className="bg-gray-100 h-24 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                &lt;DependencyGraph clauseId="{selectedClause.id}" /&gt; (Placeholder)
              </div>
              <div className="bg-gray-100 h-24 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                &lt;PdfViewer documentId="{selectedClause.documentId}" page={selectedClause.page} /&gt; (Placeholder)
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a clause to view details
          </div>
        )}
      </div>
    </div>
  );
};
