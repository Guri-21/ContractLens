export type DocumentType = "MSA" | "SOW" | "SLA" | "NDA" | "EXHIBIT" | "PLAYBOOK" | "LAW";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type EvaluationStatus = "evaluated" | "not_evaluated";

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
};
