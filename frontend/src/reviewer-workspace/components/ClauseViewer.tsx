import React, { useState, useMemo } from 'react';
import { CheckCircle, ExternalLink, Search, Filter } from 'lucide-react';

import { ClauseDTO, RiskFindingDTO } from '../types';
import { RedlineView } from './RedlineView';
import { InlineClauseEditor } from './InlineClauseEditor';
import { CrossDocumentComparison } from './CrossDocumentComparison';
import { VersionComparison } from '../../shared-components/VersionComparison';

interface ClauseViewerProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
  isLocked?: boolean;
}

export const ClauseViewer: React.FC<ClauseViewerProps> = ({ clauses, risks, isLocked = false }) => {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(clauses.length > 0 ? clauses[0].id : null);
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const selectedClause = clauses.find(c => c.id === selectedClauseId);
  const clauseRisks = selectedClause ? risks.filter(r => r.clauseId === selectedClause.id) : [];

  const getRiskBadge = (clauseId: string) => {
    const clauseRisksForBadge = risks.filter(r => r.clauseId === clauseId);
    if (clauseRisksForBadge.length === 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase bg-green-50 text-green-700 border border-green-200">
          OK
        </span>
      );
    }
    
    const notEvaluated = clauseRisksForBadge.find(r => r.status === 'not_evaluated');
    if (notEvaluated) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200 border-dashed" title="Not Evaluated">
          SKIP
        </span>
      );
    }

    const maxRisk = clauseRisksForBadge.reduce((prev, current) => {
      const levels = { low: 1, medium: 2, high: 3, critical: 4 };
      return levels[current.riskLevel] > levels[prev.riskLevel] ? current : prev;
    });

    const colors = {
      low: 'bg-risk-low/10 text-risk-low border border-risk-low/20',
      medium: 'bg-risk-medium/10 text-risk-medium border border-risk-medium/20',
      high: 'bg-risk-high/10 text-risk-high border border-risk-high/20',
      critical: 'bg-risk-critical/10 text-risk-critical border border-risk-critical/20 font-bold'
    };

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider ${colors[maxRisk.riskLevel]}`}>
        {maxRisk.riskLevel}
      </span>
    );
  };

  const filteredClauses = useMemo(() => {
    return clauses.filter(clause => {
      const matchesSearch = clause.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (clause.title && clause.title.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      if (riskFilter === 'all') return true;
      
      const clauseRisksForFilter = risks.filter(r => r.clauseId === clause.id);
      if (riskFilter === 'none') {
        return clauseRisksForFilter.length === 0;
      }
      return clauseRisksForFilter.some(r => r.riskLevel === riskFilter || r.contradictionType === riskFilter);
    });
  }, [clauses, risks, searchQuery, riskFilter]);

  const getClauseTone = (clauseId: string) => {
    const clauseRisks = risks.filter(r => r.clauseId === clauseId);
    if (clauseRisks.length === 0) return 'border-green-200 bg-green-50/65 hover:bg-green-50';
    if (clauseRisks.some(r => r.status === 'not_evaluated')) return 'border-amber-200 bg-amber-50/65 hover:bg-amber-50';
    return 'border-red-200 bg-red-50/65 hover:bg-red-50';
  };

  return (
    <div className="flex h-full bg-legal-surface overflow-hidden">
      {/* Left Pane: Clause List */}
      <div className="w-1/3 border-r border-legal-border flex flex-col h-full overflow-hidden bg-legal-bg">
        <div className="p-4 border-b border-legal-border bg-legal-bg">
          <div className="flex items-center justify-between mb-3">
             <h2 className="font-display font-semibold text-legal-text">Document Clauses</h2>
             <span className="font-mono text-[10px] text-legal-meta uppercase">{filteredClauses.length} of {clauses.length}</span>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-legal-meta" />
              </div>
              <input
                type="text"
                placeholder="Search text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-8 pr-3 py-1.5 border border-legal-border bg-legal-surface text-legal-text text-sm rounded-sm focus:ring-1 focus:ring-legal-focus focus:border-legal-focus font-body placeholder:font-mono placeholder:text-xs"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 text-legal-meta flex-shrink-0" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="block w-full pl-2 pr-8 py-1.5 text-xs font-mono text-legal-text border border-legal-border bg-legal-surface rounded-sm focus:ring-1 focus:ring-legal-focus focus:border-legal-focus"
              >
                <option value="all">ALL CLAUSES</option>
                <option value="none">CLEAN ONLY</option>
                <option value="critical">CRITICAL RISK</option>
                <option value="high">HIGH RISK</option>
                <option value="medium">MEDIUM RISK</option>
                <option value="low">LOW RISK</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto cl-scroll">
          {filteredClauses.map((clause) => (
            <div
              key={clause.id}
              onClick={() => setSelectedClauseId(clause.id)}
              className={`p-4 border-b cursor-pointer transition-colors relative ${
                selectedClauseId === clause.id ? 'bg-legal-surface border-legal-focus/40' : getClauseTone(clause.id)
              }`}
            >
              {selectedClauseId === clause.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-legal-focus" />}
              <div className="flex justify-between items-start mb-1.5">
                <h3 className="font-display font-semibold text-sm text-legal-text truncate pr-2">
                  {clause.sectionNumber ? `${clause.sectionNumber} ` : ''}{clause.title || clause.clauseType}
                </h3>
                {getRiskBadge(clause.id)}
              </div>
              <p className="font-body text-xs text-legal-meta line-clamp-2 leading-relaxed">{clause.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Clause Details */}
      <div className="w-2/3 flex flex-col h-full overflow-y-auto bg-legal-surface cl-scroll relative">
        {selectedClause ? (
          <div className="p-8 max-w-4xl mx-auto w-full pb-24">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="font-mono text-[10px] text-legal-meta uppercase tracking-widest mb-2">
                  {selectedClause.documentName} {selectedClause.page && `• PAGE ${selectedClause.page}`}
                </div>
                <h1 className="font-display text-3xl font-semibold text-legal-text">
                  {selectedClause.sectionNumber ? `${selectedClause.sectionNumber} ` : ''}{selectedClause.title || selectedClause.clauseType}
                </h1>
              </div>
              {!isLocked && (
                <button 
                  onClick={() => setEditingClauseId(selectedClause.id)}
                  className="font-mono text-xs uppercase tracking-wider font-semibold text-legal-focus bg-legal-focus/10 hover:bg-legal-focus/20 px-3 py-1.5 rounded-sm transition-colors border border-legal-focus/20"
                >
                  Edit Text
                </button>
              )}
            </div>

            {/* Editing mode or view mode */}
            {editingClauseId === selectedClause.id ? (
              <InlineClauseEditor 
                initialText={selectedClause.text} 
                onCancel={() => setEditingClauseId(null)}
                onSave={(newText: string) => {
                  console.log("Saved new text:", newText);
                  setEditingClauseId(null);
                }}
              />
            ) : (
              <div className="text-legal-text leading-relaxed font-body text-[15px] mb-8">
                {selectedClause.text}
              </div>
            )}

            {/* Related References */}
            {selectedClause.references.length > 0 && (
              <div className="mb-8">
                <h4 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest border-b border-legal-border pb-1 mb-3">Cross References</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedClause.references.map(ref => (
                    <span key={ref} className="font-mono text-xs bg-legal-bg text-legal-text border border-legal-border px-2 py-1 rounded-sm flex items-center hover:bg-legal-border transition-colors cursor-pointer">
                      <ExternalLink className="w-3 h-3 mr-1.5 opacity-50" /> {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Findings */}
            <div className="space-y-6">
              <h3 className="font-display text-xl font-semibold text-legal-text border-b border-legal-border pb-2 mb-4">AI Analysis</h3>
              
              {clauseRisks.length === 0 ? (
                <div className="font-mono text-xs text-green-700 bg-green-50 border border-green-200 p-4 rounded-sm flex items-center uppercase tracking-wider">
                  <CheckCircle className="w-4 h-4 mr-2" /> No risks detected.
                </div>
              ) : (
                clauseRisks.map(risk => (
                  <div key={risk.id}>
                    {risk.status === 'not_evaluated' ? (
                      <div className="bg-amber-50 border border-amber-200 border-dashed p-4 rounded-sm">
                        <div className="font-mono text-[10px] uppercase text-amber-800 mb-2">Evaluation Skipped</div>
                        <p className="font-body text-sm text-legal-text">{risk.reason}</p>
                        {risk.missingDocuments?.length ? (
                          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-800">
                            Missing: {risk.missingDocuments.join(', ')}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="bg-red-50/45 border border-red-200 shadow-sm p-5 rounded-sm">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${risk.riskLevel === 'high' || risk.riskLevel === 'critical' ? 'bg-risk-critical/10 text-risk-critical' : 'bg-risk-medium/10 text-risk-medium'}`}>
                            {risk.riskLevel} RISK
                          </span>
                        </div>
                        <p className="font-body text-sm text-legal-text leading-relaxed">{risk.reason}</p>
                        
                        {risk.playbookRuleViolated && (
                          <div className="mt-3 font-mono text-xs text-legal-focus bg-blue-50 border border-blue-100 p-2 rounded-sm flex">
                            <span className="font-bold mr-2 uppercase">Rule:</span> {risk.playbookRuleViolated}
                          </div>
                        )}

                        {/* Cross Document Contradiction handles evidence display if length > 1 */}
                        {(risk.evidence && risk.evidence.length > 1) || (risk.comparisonText) ? (
                          <CrossDocumentComparison 
                            finding={risk} 
                            onAccept={() => { if (!isLocked) console.log('Accept'); }}
                            onReject={() => { if (!isLocked) console.log('Reject'); }}
                            onEdit={() => { if (!isLocked) setEditingClauseId(selectedClause.id); }}
                          />
                        ) : risk.evidence && risk.evidence.length === 1 ? (
                           <div className="mt-4 border-l-2 border-legal-meta pl-3">
                              <div className="font-mono text-[10px] uppercase text-legal-meta mb-1">Source Evidence</div>
                              <p className="font-body text-sm text-legal-text italic">"{risk.evidence[0].quote}"</p>
                              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-legal-meta">
                                {risk.evidence[0].documentName}
                                {risk.evidence[0].page ? ` - Page ${risk.evidence[0].page}` : ''}
                                {risk.evidence[0].section ? ` - Section ${risk.evidence[0].section}` : ''}
                              </p>
                           </div>
                        ) : null}

                        {risk.redline && !risk.comparisonText && (
                          <div className="mt-4 pt-4 border-t border-legal-border">
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

            {/* Version History */}
            {selectedClause.versionHistory && selectedClause.versionHistory.length > 0 && (
              <div className="mt-12 pt-8 border-t border-legal-border">
                <VersionComparison clause={selectedClause} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center font-mono text-sm uppercase tracking-widest text-legal-meta">
            Select a clause to review
          </div>
        )}
      </div>
    </div>
  );
};
