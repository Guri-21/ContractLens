export type ClauseDTO = {
  id: string;
  documentId: string;
  documentName: string;
  documentType: "MSA" | "SOW" | "SLA" | "NDA" | "EXHIBIT" | "PLAYBOOK" | "LAW";
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
};
