export type DocumentType = "MSA" | "SOW" | "SLA" | "NDA" | "EXHIBIT" | "AMENDMENT" | "ORDER_FORM" | "DPA" | "OTHER" | "PLAYBOOK" | "LAW";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type EvaluationStatus = "evaluated" | "not_evaluated";

export type ClauseVersionDTO = {
  versionNumber: number;
  text: string;
  editedBy?: string;
  editedAt: string;
  changeType: "uploaded" | "ai_suggestion_accepted" | "manual_edit";
};

export type ClauseDTO = {
  id: string;
  documentId: string;
  documentName: string;
  documentType: DocumentType;
  sectionNumber?: string;
  title?: string;
  page?: number;
  text: string;
  clauseType?: string;
  references: string[];
  overrides: string[];
  tableData?: unknown;
  entities?: { type: string; value: string }[];
  embeddingId?: string;
  versionHistory?: ClauseVersionDTO[];
};

export type RiskFindingDTO = {
  id: string;
  clauseId: string;
  riskLevel: RiskLevel;
  status: EvaluationStatus;
  reason: string;
  playbookRuleViolated?: string;
  evidence: { documentName: string; page?: number; section?: string; quote: string }[];
  missingDocuments?: string[];
  redline?: { originalText: string; suggestedText: string; diffHtml?: string };
  contradictionType?: "msa_conflict" | "playbook_violation" | "country_law_violation" | "missing_clause";
  confidence?: number;
  comparisonText?: {
    sowText: string;
    msaText: string;
  };
};

export type MissingMandatoryClauseDTO = {
  clauseName: string;
  present: boolean;
};

export type CountryLawComplianceDTO = {
  lawName: string;
  status: "pass" | "warning" | "fail";
  details?: string;
};

export type FinancialSummaryDTO = {
  contractValue?: string;
  penalty?: string;
  paymentTerms?: string;
  liabilityCap?: string;
  warrantyPeriod?: string;
};

export type ApprovalDTO = {
  status: "pending" | "approved" | "needs_revision" | "rejected";
  reason?: string;
  reviewerNotes?: string;
  internalRemarks?: string;
  decidedBy?: string;
  decidedAt?: string;
};

export type NotificationDTO = {
  id: string;
  type: "analysis_completed" | "new_contradiction" | "playbook_updated" | "ready_for_approval" | "reanalysis_completed";
  message: string;
  createdAt: string;
  read: boolean;
  relatedDocumentId?: string;
};
