import { describe, expect, it } from 'vitest';

import { calculateAnalysisScores } from './analysisScoring';
import type { RiskFindingDTO } from './types';

function risk(
  id: string,
  riskLevel: RiskFindingDTO['riskLevel'],
  status: RiskFindingDTO['status'] = 'evaluated',
  overrides: Partial<RiskFindingDTO> = {},
): RiskFindingDTO {
  return {
    id,
    clauseId: id,
    riskLevel,
    status,
    reason: 'Test finding',
    evidence: [],
    ...overrides,
  };
}

describe('calculateAnalysisScores', () => {
  it('uses one enriched source for risk and compliance scores', () => {
    const result = calculateAnalysisScores([
      risk('critical', 'critical', 'evaluated', {
        reason: 'Liability cap is overridden by the SOW.',
        contradictionType: 'msa_conflict',
        confidence: 0.95,
      }),
      risk('high-1', 'high', 'evaluated', {
        reason: 'Payment timeline conflicts with MSA invoice terms.',
        contradictionType: 'msa_conflict',
        confidence: 0.9,
      }),
      risk('high-2', 'high', 'evaluated', {
        reason: 'SLA penalties exceed service credit cap.',
        contradictionType: 'msa_conflict',
        confidence: 0.9,
      }),
      risk('high-3', 'high', 'not_evaluated', {
        reason: 'Cannot evaluate security obligations because Exhibit B is missing.',
        missingDocuments: ['Exhibit B'],
        confidence: 0.9,
      }),
      risk('medium', 'medium', 'evaluated', {
        reason: 'Governing law conflicts with India arbitration requirement.',
        contradictionType: 'country_law_violation',
        confidence: 0.8,
      }),
    ], 12);

    expect(result.riskScore).toBe(27);
    expect(result.complianceScore).toBe(73);
    expect(result.weightedRisk).toBe(63.19);
  });
});
