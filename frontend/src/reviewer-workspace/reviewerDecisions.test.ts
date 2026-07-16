import { describe, expect, it } from 'vitest';

import { applyReviewerDecisions, decisionLabel } from './reviewerDecisions';
import type { RiskFindingDTO } from './types';

describe('reviewerDecisions', () => {
  it('returns visible labels for suggestion actions', () => {
    expect(decisionLabel('accepted')).toBe('Suggestion accepted');
    expect(decisionLabel('rejected')).toBe('Suggestion rejected');
    expect(decisionLabel('modified')).toBe('Manual modification requested');
  });

  it('removes accepted risks from the active analysis', () => {
    const highRisk: RiskFindingDTO = {
      id: 'risk-high',
      clauseId: 'clause-1',
      riskLevel: 'high',
      status: 'evaluated',
      reason: 'Payment term is too long.',
      evidence: [],
    };
    const mediumRisk: RiskFindingDTO = {
      ...highRisk,
      id: 'risk-medium',
      riskLevel: 'medium',
    };

    expect(applyReviewerDecisions([highRisk, mediumRisk], { 'risk-high': 'accepted' })).toEqual([mediumRisk]);
  });
});
