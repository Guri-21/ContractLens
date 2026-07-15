/**
 * Mock data for the Reviewer Workspace.
 *
 * Enriched on branch gurnoor-citation-graph-ui to exercise:
 *  - SourceCitation: multi-evidence findings, not_evaluated findings
 *  - DependencyGraph: override edges, conflict edges, and a cycle for the cycle-detection banner
 */

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
    // "supersedes" triggers override edge in knowledge_graph.py
    text: "Notwithstanding Section 4.1 of the MSA, payment for services outlined in this SOW shall be due Net 30 days from invoice date. This SOW supersedes conflicting payment terms in the MSA.",
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
  {
    id: "clause-4",
    documentId: "doc-sow",
    documentName: "SOW #1",
    documentType: "SOW",
    sectionNumber: "7",
    title: "Confidentiality",
    page: 4,
    // references clause-3 to create a non-trivial graph path; clause-1 creates cycle
    text: "Confidentiality obligations set forth herein are subject to the limitations of liability in Section 8.2 of the MSA. In case of conflict, this clause shall prevail. See also Section 4.1 for payment obligations that remain in force.",
    clauseType: "confidentiality",
    references: ["clause-3", "clause-1"],
    // clause-4 references clause-1 and clause-1 references nothing — no cycle here.
    // To demonstrate the cycle banner, clause-3 references clause-4 via override below.
    overrides: ["clause-3"],
  },
];

export const mockRiskFindings: RiskFindingDTO[] = [
  {
    id: "risk-1",
    clauseId: "clause-2",
    riskLevel: "medium",
    status: "evaluated",
    reason:
      "SOW payment terms contradict MSA payment terms. MSA specifies Net 60, while SOW specifies Net 30.",
    playbookRuleViolated:
      "Payment terms must be Net 45 or greater unless approved by VP of Finance.",
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
        quote:
          "Notwithstanding Section 4.1 of the MSA, payment for services outlined in this SOW shall be due Net 30 days from invoice date.",
      },
    ],
    redline: {
      originalText:
        "Payment for services outlined in this SOW shall be due Net 30 days from invoice date.",
      suggestedText:
        "Payment for services outlined in this SOW shall be due Net 60 days from invoice date, consistent with the Master Service Agreement.",
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
    reason:
      "Unable to evaluate exclusions to Limitation of Liability because Exhibit A was not provided.",
    evidence: [
      {
        documentName: "Master Service Agreement",
        page: 5,
        section: "8.2",
        quote:
          "This limitation does not apply to breaches of confidentiality or indemnification obligations under Exhibit A.",
      },
    ],
    missingDocuments: ["Exhibit A"],
    contradictionType: "missing_clause",
    confidence: 100.0,
  },
  {
    id: "risk-3",
    clauseId: "clause-4",
    riskLevel: "critical",
    status: "evaluated",
    reason:
      "SOW Confidentiality clause attempts to override MSA Limitation of Liability (§8.2), creating circular precedence: SOW §7 overrides MSA §8.2, which references Exhibit A that in turn governs SOW obligations.",
    playbookRuleViolated:
      "Confidentiality clauses must not override the master liability cap without explicit CFO approval.",
    evidence: [
      {
        documentName: "SOW #1",
        page: 4,
        section: "7",
        quote:
          "In case of conflict, this clause shall prevail.",
      },
      {
        documentName: "Master Service Agreement",
        page: 5,
        section: "8.2",
        quote:
          "In no event shall either party's aggregate liability exceed the total amounts paid under this Agreement.",
      },
    ],
  },
];
