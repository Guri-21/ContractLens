import { z } from "zod";

export const ClauseSchema = z.object({
  id: z.string(),
  text: z.string(),
  sectionNumber: z.string().optional(),
  page: z.number().optional(),
  tableData: z.any().optional(),
  references: z.array(z.string()),
  overrides: z.array(z.string()),
});
export type Clause = z.infer<typeof ClauseSchema>;

export const ContradictionResultSchema = z.object({
  clauseId: z.string(),
  relatedClauseId: z.string(),
  relationship: z.enum(["entailment", "contradiction", "not_mentioned"]),
  explanation: z.string(),
});
export type ContradictionResult = z.infer<typeof ContradictionResultSchema>;

export const RiskFlagSchema = z.object({
  clauseId: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  reason: z.string(),
  playbookRuleViolated: z.string().optional(),
  citation: z.object({
    page: z.number().optional(),
    section: z.string().optional(),
  }).optional(),
});
export type RiskFlag = z.infer<typeof RiskFlagSchema>;

export const RedlineSuggestionSchema = z.object({
  clauseId: z.string(),
  originalText: z.string(),
  suggestedText: z.string(),
  diffType: z.string(),
});
export type RedlineSuggestion = z.infer<typeof RedlineSuggestionSchema>;

export const AuditEntrySchema = z.object({
  timestamp: z.string().datetime(),
  actor: z.enum(["ai", "human"]),
  action: z.string(),
  clauseId: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
