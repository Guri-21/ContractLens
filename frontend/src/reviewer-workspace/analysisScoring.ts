import type { RiskFindingDTO } from './types';

const RISK_WEIGHTS: Record<RiskFindingDTO['riskLevel'], number> = {
  low: 1,
  medium: 4,
  high: 7,
  critical: 10,
};

const NOT_EVALUATED_WEIGHT = 5;

const CLAUSE_IMPORTANCE: Array<{ pattern: RegExp; multiplier: number }> = [
  { pattern: /\b(liability|uncapped|indemnif|damages)\b/i, multiplier: 1.35 },
  { pattern: /\b(governing law|jurisdiction|forum|arbitration|dispute)\b/i, multiplier: 1.3 },
  { pattern: /\b(payment|invoice|fee|fees|payable|paid)\b/i, multiplier: 1.2 },
  { pattern: /\b(data|privacy|security|dpdp|confidential)\b/i, multiplier: 1.2 },
  { pattern: /\b(sla|service level|service credit|penalt|milestone)\b/i, multiplier: 1.15 },
];

const CONTRADICTION_MULTIPLIER: Record<string, number> = {
  msa_conflict: 1.3,
  country_law_violation: 1.25,
  missing_clause: 1.2,
  playbook_violation: 1,
};

export type AnalysisScores = {
  riskScore: number;
  complianceScore: number;
  weightedRisk: number;
};

export function calculateAnalysisScores(risks: RiskFindingDTO[], totalClauses: number): AnalysisScores {
  const activeRisks = risks.filter((risk) => !['accepted', 'resolved'].includes(String(risk.status)));
  const maxFindingWeight = RISK_WEIGHTS.critical * 1.35 * 1.3 * 1.1;
  const denominator = Math.max(1, totalClauses) * maxFindingWeight;
  const weightedRisk = activeRisks.reduce((total, risk) => total + calculateFindingWeight(risk), 0);
  const riskScore = Math.min(100, Math.round((weightedRisk / denominator) * 100));

  return {
    riskScore,
    complianceScore: Math.max(0, 100 - riskScore),
    weightedRisk: Number(weightedRisk.toFixed(2)),
  };
}

function calculateFindingWeight(risk: RiskFindingDTO): number {
  const severityWeight = risk.status === 'not_evaluated'
    ? Math.max(NOT_EVALUATED_WEIGHT, RISK_WEIGHTS[risk.riskLevel])
    : RISK_WEIGHTS[risk.riskLevel];
  const missingDataMultiplier = risk.status === 'not_evaluated' || risk.missingDocuments?.length ? 1.5 : 1;
  const clauseMultiplier = getClauseImportanceMultiplier(risk);
  const contradictionMultiplier = CONTRADICTION_MULTIPLIER[risk.contradictionType || ''] || 1;
  const confidenceMultiplier = getConfidenceMultiplier(risk.confidence);

  return severityWeight * missingDataMultiplier * clauseMultiplier * contradictionMultiplier * confidenceMultiplier;
}

function getClauseImportanceMultiplier(risk: RiskFindingDTO): number {
  const text = [
    risk.reason,
    risk.playbookRuleViolated || '',
    risk.redline?.originalText || '',
    risk.redline?.suggestedText || '',
    ...(risk.evidence || []).flatMap(evidence => [evidence.section || '', evidence.quote]),
  ].join(' ');
  const match = CLAUSE_IMPORTANCE.find(item => item.pattern.test(text));
  return match?.multiplier || 1;
}

function getConfidenceMultiplier(confidence?: number): number {
  if (confidence === undefined || confidence === null) return 1;
  if (confidence >= 0.9) return 1.1;
  if (confidence >= 0.7) return 1;
  if (confidence >= 0.5) return 0.9;
  return 0.8;
}
