import { describe, expect, it } from 'vitest';

import { getFinancialImpactItems, getIndianLawExposure } from './analysisInsights';
import type { ClauseDTO, RiskFindingDTO } from './types';

const baseRisk = {
  status: 'evaluated',
  evidence: [],
} satisfies Pick<RiskFindingDTO, 'status' | 'evidence'>;

describe('analysisInsights', () => {
  it('uses risk count as the primary Indian-law exposure metric and infers likely breached laws', () => {
    const risks: RiskFindingDTO[] = [
      {
        ...baseRisk,
        id: 'law-1',
        clauseId: 'law',
        riskLevel: 'medium',
        contradictionType: 'country_law_violation',
        reason: 'SOW changes governing law away from the India-governed MSA.',
      },
      {
        ...baseRisk,
        id: 'law-2',
        clauseId: 'law',
        riskLevel: 'medium',
        reason: 'Indian-law grounded review could not map the dispute forum to an exact statute.',
      },
    ];

    const exposure = getIndianLawExposure(risks);

    expect(exposure.risks).toHaveLength(2);
    expect(exposure.laws.map(law => law.name)).toEqual(expect.arrayContaining([
      'Indian Contract Act, 1872',
      'Arbitration and Conciliation Act, 1996',
    ]));
    expect(exposure.laws.every(law => law.source === 'inferred')).toBe(true);
    expect(exposure.unmappedRiskCount).toBe(0);
  });

  it('detects financial impact from risk findings even when clause type casing is inconsistent', () => {
    const clauses: ClauseDTO[] = [{
      id: 'payment',
      documentId: 'sow',
      documentName: 'RetailGrid_SOW.pdf',
      documentType: 'SOW',
      title: 'Payment Schedule',
      clauseType: 'payment',
      text: 'Client shall pay rollout fees within sixty days.',
      references: [],
      overrides: [],
    }];
    const risks: RiskFindingDTO[] = [
      {
        ...baseRisk,
        id: 'risk-payment',
        clauseId: 'payment',
        riskLevel: 'high',
        reason: 'Payment Schedule conflicts with the MSA payment timeline.',
      },
      {
        ...baseRisk,
        id: 'risk-sla',
        clauseId: 'sla',
        riskLevel: 'high',
        reason: 'SLA Penalties exceed the MSA service credit cap.',
      },
      {
        ...baseRisk,
        id: 'risk-liability',
        clauseId: 'liability',
        riskLevel: 'critical',
        reason: 'Liability Override exposes Vendor to uncapped damages.',
      },
    ];

    const items = getFinancialImpactItems(clauses, risks);

    expect(items.map(item => item.id)).toEqual(expect.arrayContaining([
      'risk-risk-payment',
      'risk-risk-sla',
      'risk-risk-liability',
      'clause-payment',
    ]));
  });
});
