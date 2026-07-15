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
  documentType: "MSA" | "SOW" | "SLA" | "NDA" | "EXHIBIT" | "AMENDMENT" | "ORDER_FORM" | "DPA" | "OTHER" | "PLAYBOOK" | "LAW";
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
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "evaluated" | "not_evaluated";
  reason: string;
  playbookRuleViolated?: string;
  evidence: {
    documentName: string;
    page?: number;
    section?: string;
    quote: string;
  }[];
  missingDocuments?: string[];
  redline?: {
    originalText: string;
    suggestedText: string;
    diffHtml?: string;
  };
  contradictionType?: "msa_conflict" | "playbook_violation" | "country_law_violation" | "missing_clause";
  confidence?: number;
  comparisonText?: {
    sowText: string;
    msaText: string;
  };
};
