import { describe, expect, it } from 'vitest';

import { answerLegalQuestion } from './legalAdviceEngine';
import type { ClauseDTO, RiskFindingDTO } from './types';

const clause: ClauseDTO = {
  id: 'payment',
  documentId: 'sow',
  documentName: 'Acme_SOW.pdf',
  documentType: 'SOW',
  sectionNumber: '3',
  page: 4,
  title: 'Payment Terms',
  text: 'Customer shall pay invoices within ninety days after acceptance.',
  clauseType: 'payment',
  references: [],
  overrides: [],
};

const risk: RiskFindingDTO = {
  id: 'risk-payment',
  clauseId: 'payment',
  riskLevel: 'high',
  status: 'evaluated',
  reason: 'Payment period may be inconsistent with Indian Contract Act, 1872 expectations for enforceable commercial certainty.',
  evidence: [{
    documentName: 'Acme_SOW.pdf',
    section: '3',
    page: 4,
    quote: 'Customer shall pay invoices within ninety days after acceptance.',
  }],
};

describe('legalAdviceEngine', () => {
  it('answers from matching analysis evidence with citations', () => {
    const result = answerLegalQuestion('Is the payment term risky under Indian law?', [clause], [risk]);

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('Indian Contract Act, 1872');
    expect(result.citations).toContainEqual(
      expect.objectContaining({
        label: 'Acme_SOW.pdf - Section 3 - Page 4',
        quote: 'Customer shall pay invoices within ninety days after acceptance.',
      }),
    );
  });

  it('refuses when the current analysis has no supporting source', () => {
    const result = answerLegalQuestion('Tell me about source code escrow', [clause], [risk]);

    expect(result.refused).toBe(true);
    expect(result.citations).toHaveLength(0);
  });
});
