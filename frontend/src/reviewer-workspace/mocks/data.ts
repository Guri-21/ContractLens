import { ClauseDTO, RiskFindingDTO } from "../types";

export const mockClauses: ClauseDTO[] = [
  {
    id: "clause-1",
    documentId: "doc-msa",
    documentName: "Master Service Agreement",
    documentType: "MSA",
    sectionNumber: "4.1",
    title: "Payment Terms",
    page: 2,
    text: "Client shall pay all undisputed invoices within Net 60 days of receipt.",
    clauseType: "payment_terms",
    references: [],
    overrides: [],
    entities: [],
    embeddingId: undefined,
    versionHistory: [],
  },
  {
    id: "clause-2",
    documentId: "doc-sow",
    documentName: "SOW #1",
    documentType: "SOW",
    sectionNumber: "3",
    title: "Fees and Payment",
    page: 1,
    text: "Payment for services outlined in this SOW shall be due Net 30 days from invoice date.",
    clauseType: "payment_terms",
    references: ["clause-1"],
    overrides: ["clause-1"],
    entities: [],
    embeddingId: undefined,
    versionHistory: [],
  },
  {
    id: "clause-3",
    documentId: "doc-msa",
    documentName: "Master Service Agreement",
    documentType: "MSA",
    sectionNumber: "8.2",
    title: "Limitation of Liability",
    page: 5,
    text: "In no event shall either party's aggregate liability exceed the total amounts paid under this Agreement in the twelve (12) months preceding the claim. This limitation does not apply to breaches of confidentiality or indemnification obligations under Exhibit A.",
    clauseType: "liability",
    references: ["exhibit-a"],
    overrides: [],
    entities: [],
    embeddingId: undefined,
    versionHistory: [],
  },
];

export const mockRiskFindings: RiskFindingDTO[] = [
  {
    id: "risk-1",
    clauseId: "clause-2",
    riskLevel: "medium",
    status: "evaluated",
    reason: "SOW payment terms contradict MSA payment terms. MSA specifies Net 60, while SOW specifies Net 30.",
    playbookRuleViolated: "Payment terms must be Net 45 or greater unless approved by VP of Finance.",
    evidence: [
      {
        documentName: "Master Service Agreement",
        page: 2,
        section: "4.1",
        quote: "Client shall pay all undisputed invoices within Net 60 days of receipt.",
      },
      {
        documentName: "SOW #1",
        page: 1,
        section: "3",
        quote: "shall be due Net 30 days from invoice date.",
      },
    ],
    redline: {
      originalText: "Payment for services outlined in this SOW shall be due Net 30 days from invoice date.",
      suggestedText: "Payment for services outlined in this SOW shall be due Net 60 days from invoice date, consistent with the Master Service Agreement.",
    },
    contradictionType: "msa_conflict",
    confidence: 95.0,
    comparisonText: {
      sowText: "Payment for services outlined in this SOW shall be due Net 30 days from invoice date.",
      msaText: "Client shall pay all undisputed invoices within Net 60 days of receipt."
    }
  },
  {
    id: "risk-2",
    clauseId: "clause-3",
    riskLevel: "high",
    status: "not_evaluated",
    reason: "Unable to evaluate exclusions to Limitation of Liability because Exhibit A was not provided.",
    evidence: [
      {
        documentName: "Master Service Agreement",
        page: 5,
        section: "8.2",
        quote: "This limitation does not apply to breaches of confidentiality or indemnification obligations under Exhibit A.",
      },
    ],
    missingDocuments: ["Exhibit A"],
    contradictionType: "missing_clause",
    confidence: 100.0,
  },
];
