import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, FileText, LoaderCircle } from 'lucide-react';
import { fetchBackendDocuments } from '../api/documents';
import { useAuth } from '../lib/context/AuthContext';
import { ReviewerWorkspace } from './ReviewerWorkspace';
import {
  buildAnalysisFromDocuments,
  clearCachedSavedAnalysisDocuments,
  getCachedSavedAnalysisDocuments,
  PersistedDocument,
  setCachedSavedAnalysisDocuments,
} from './persistedAnalysis';

export const SavedAnalysesPage: React.FC = () => {
  const { documentId } = useParams();
  const { email } = useAuth();
  const [documents, setDocuments] = useState<PersistedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const ownerKey = email || 'anonymous';
    const cached = getCachedSavedAnalysisDocuments(ownerKey);
    if (cached) {
      setDocuments(cached);
      setLoading(false);
    }
    loadDocuments().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [email]);

  async function loadDocuments(forceRefresh = false) {
    const ownerKey = email || 'anonymous';
    if (forceRefresh) {
      clearCachedSavedAnalysisDocuments(ownerKey);
      setLoading(true);
    }
    setError('');
    try {
      const result = await fetchBackendDocuments({ force: true });
      const persisted = result as PersistedDocument[];
      setCachedSavedAnalysisDocuments(persisted, ownerKey);
      setDocuments(persisted);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load saved analyses.');
    } finally {
      setLoading(false);
    }
  }

  const analysis = useMemo(
    () => buildAnalysisFromDocuments(documents, documentId),
    [documents, documentId],
  );

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-legal-meta">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Loading saved analyses...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-5 text-red-800">
        <AlertTriangle className="mb-2 h-5 w-5" />
        {error}
      </div>
    );
  }

  if (documentId) {
    if (!analysis.focusDocument || analysis.clauses.length === 0) {
      return (
        <div className="border border-amber-200 bg-amber-50 p-5 text-amber-900">
          No saved analysis was found for this document.
        </div>
      );
    }
    return <ReviewerWorkspace initialClauses={analysis.clauses} initialRisks={analysis.risks} readOnlyAnalysis />;
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-legal-meta">Saved Analysis</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-legal-text">Previously Analyzed Contracts</h1>
            <p className="mt-2 max-w-2xl text-sm text-legal-meta">
              Analyses are stored in the backend as clauses and risk findings. This page is cached after first load.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDocuments(true)}
            className="border border-legal-border bg-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-legal-text hover:border-legal-focus hover:text-legal-focus"
          >
            Refresh
          </button>
        </div>
      </header>

      {analysis.analyzedDocuments.length === 0 ? (
        <div className="border border-legal-border bg-white p-6 text-legal-meta">
          No saved analyses yet. Run an analysis from the Review Workspace first.
        </div>
      ) : (
        <div className="grid gap-4">
          {analysis.analyzedDocuments.map(document => {
            const riskCount = (document.clauses || []).reduce((total, clause) => total + (clause.risks?.length || 0), 0);
            const clauseCount = document.clauses?.length || 0;
            return (
              <Link
                key={document.id}
                to={`/advisor/analyses/${document.id}`}
                className="border border-legal-border bg-white p-5 shadow-sm transition-colors hover:border-legal-focus hover:bg-legal-bg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-legal-focus" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-legal-meta">
                        {document.document_type} - {document.status}
                      </span>
                    </div>
                    <h2 className="truncate font-display text-xl font-semibold text-legal-text">{document.name}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-right font-mono text-[10px] uppercase tracking-widest text-legal-meta">
                    <span><strong className="block text-lg text-legal-text">{clauseCount}</strong> clauses</span>
                    <span><strong className="block text-lg text-risk-high">{riskCount}</strong> risks</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
