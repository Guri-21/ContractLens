import type { ClauseDTO, RiskFindingDTO } from './types';

type PersistedRisk = {
  id: string;
  risk_level?: RiskFindingDTO['riskLevel'];
  riskLevel?: RiskFindingDTO['riskLevel'];
  status: RiskFindingDTO['status'];
  reason: string;
  playbook_rule_violated?: string | null;
  playbookRuleViolated?: string | null;
  evidence?: RiskFindingDTO['evidence'];
  missing_documents?: string[] | null;
  missingDocuments?: string[] | null;
  redline?: RiskFindingDTO['redline'] | null;
  contradiction_type?: RiskFindingDTO['contradictionType'] | null;
  contradictionType?: RiskFindingDTO['contradictionType'] | null;
  confidence?: number | null;
  comparison_text?: RiskFindingDTO['comparisonText'] | null;
  comparisonText?: RiskFindingDTO['comparisonText'] | null;
};

type PersistedClause = {
  id: string;
  document_id?: string;
  documentId?: string;
  document_name?: string;
  documentName?: string;
  document_type?: ClauseDTO['documentType'];
  documentType?: ClauseDTO['documentType'];
  section_number?: string | null;
  sectionNumber?: string | null;
  title?: string | null;
  page?: number | null;
  text: string;
  clause_type?: string | null;
  clauseType?: string | null;
  references?: string[] | null;
  overrides?: string[] | null;
  table_data?: unknown;
  tableData?: unknown;
  risks?: PersistedRisk[] | null;
};

export type PersistedDocument = {
  id: string;
  name: string;
  document_type: ClauseDTO['documentType'];
  status: string;
  assigned_to_id?: string | null;
  assigned_to?: { id: string; email: string } | null;
  clauses?: PersistedClause[] | null;
};

const CACHE_PREFIX = 'contractlens.savedAnalyses.documents.v2';
let memoryCache: { ownerKey: string; documents: PersistedDocument[] } | null = null;

export function getCachedSavedAnalysisDocuments(ownerKey = getCurrentCacheOwner()): PersistedDocument[] | null {
  if (memoryCache?.ownerKey === ownerKey) return memoryCache.documents;
  try {
    const cached = sessionStorage.getItem(cacheKeyFor(ownerKey));
    if (!cached) return null;
    const parsed = JSON.parse(cached) as PersistedDocument[];
    memoryCache = { ownerKey, documents: parsed };
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedSavedAnalysisDocuments(documents: PersistedDocument[], ownerKey = getCurrentCacheOwner()) {
  memoryCache = { ownerKey, documents };
  try {
    sessionStorage.setItem(cacheKeyFor(ownerKey), JSON.stringify(documents));
  } catch {
    // Ignore storage quota/private-mode failures; memory cache still works.
  }
}

export function clearCachedSavedAnalysisDocuments(ownerKey = getCurrentCacheOwner()) {
  memoryCache = null;
  try {
    sessionStorage.removeItem(cacheKeyFor(ownerKey));
  } catch {
    // Ignore storage failures.
  }
}

export function clearAllSavedAnalysisCaches() {
  memoryCache = null;
  try {
    Object.keys(sessionStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}

function getCurrentCacheOwner(): string {
  try {
    return localStorage.getItem('email') || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function cacheKeyFor(ownerKey: string): string {
  return `${CACHE_PREFIX}.${ownerKey}`;
}

export function buildAnalysisFromDocuments(documents: PersistedDocument[], focusDocumentId?: string) {
  const analyzedDocuments = documents.filter(document => (document.clauses?.length || 0) > 0);
  const focus = focusDocumentId
    ? analyzedDocuments.find(document => document.id === focusDocumentId)
    : analyzedDocuments[0];
  const selectedDocuments = focus
    ? analyzedDocuments.filter(document => document.id === focus.id || document.document_type === 'MSA')
    : analyzedDocuments;

  const clauses = selectedDocuments.flatMap(document =>
    (document.clauses || []).map(clause => normalizeClause(clause, document)),
  );
  const risks = selectedDocuments.flatMap(document =>
    (document.clauses || []).flatMap(clause =>
      (clause.risks || []).map(risk => normalizeRisk(risk, clause.id)),
    ),
  );

  return { clauses, risks, focusDocument: focus, analyzedDocuments };
}

function normalizeClause(clause: PersistedClause, document: PersistedDocument): ClauseDTO {
  return {
    id: clause.id,
    documentId: clause.documentId || clause.document_id || document.id,
    documentName: clause.documentName || clause.document_name || document.name,
    documentType: clause.documentType || clause.document_type || document.document_type,
    sectionNumber: clause.sectionNumber || clause.section_number || undefined,
    title: clause.title || undefined,
    page: clause.page || undefined,
    text: clause.text,
    clauseType: clause.clauseType || clause.clause_type || undefined,
    references: clause.references || [],
    overrides: clause.overrides || [],
    tableData: clause.tableData || clause.table_data,
  };
}

function normalizeRisk(risk: PersistedRisk, clauseId: string): RiskFindingDTO {
  return {
    id: risk.id,
    clauseId,
    riskLevel: risk.riskLevel || risk.risk_level || 'low',
    status: risk.status,
    reason: risk.reason,
    playbookRuleViolated: risk.playbookRuleViolated || risk.playbook_rule_violated || undefined,
    evidence: risk.evidence || [],
    missingDocuments: risk.missingDocuments || risk.missing_documents || undefined,
    redline: risk.redline || undefined,
    contradictionType: risk.contradictionType || risk.contradiction_type || undefined,
    confidence: risk.confidence || undefined,
    comparisonText: risk.comparisonText || risk.comparison_text || undefined,
  };
}
