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

const lawRisk: RiskFindingDTO = {
  id: 'risk-law',
  clauseId: 'law',
  riskLevel: 'medium',
  status: 'evaluated',
  reason: 'RetailGrid SOW changes governing law/forum away from the India-governed MSA.',
  evidence: [
    {
      documentName: 'RetailGrid_Governing_MSA.pdf',
      section: '9',
      page: 9,
      quote: 'Indian law applies and disputes shall be arbitrated in Delhi.',
    },
    {
      documentName: 'RetailGrid_Statement_of_Work.pdf',
      section: '10',
      page: 10,
      quote: 'All disputes shall be subject to courts in Dubai International Financial Centre.',
    },
  ],
};

const liabilityRisk: RiskFindingDTO = {
  id: 'risk-liability',
  clauseId: 'liability',
  riskLevel: 'critical',
  status: 'evaluated',
  reason: 'RetailGrid SOW overrides the MSA liability cap and exposes Vendor to uncapped liability.',
  evidence: [
    {
      documentName: 'RetailGrid_Governing_MSA.pdf',
      section: '5.1',
      page: 5,
      quote: 'Aggregate liability is limited to fees paid under the affected SOW in the prior twelve months.',
    },
    {
      documentName: 'RetailGrid_Statement_of_Work.pdf',
      section: '7',
      page: 7,
      quote: 'Vendor shall bear unlimited liability for store revenue loss during rollout delays.',
    },
  ],
  redline: {
    originalText: 'Vendor shall bear unlimited liability for store revenue loss during rollout delays.',
    suggestedText: 'Vendor liability shall remain subject to the limitation of liability in Section 5.1 of the MSA.',
  },
};

const slaRisk: RiskFindingDTO = {
  id: 'risk-sla',
  clauseId: 'sla',
  riskLevel: 'high',
  status: 'evaluated',
  reason: 'RetailGrid SOW service credits exceed the MSA cap and create duplicate penalty exposure.',
  evidence: [{
    documentName: 'RetailGrid_Statement_of_Work.pdf',
    section: '6',
    page: 6,
    quote: 'Missed launch dates result in fifteen percent monthly credits and separate penalties.',
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

  it('responds to greeting prompts without showing a grounding refusal', () => {
    const result = answerLegalQuestion('hi', [clause], [risk]);

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('Ask me about a clause');
  });

  it('routes governing-law questions to governing-law evidence instead of payment evidence', () => {
    const result = answerLegalQuestion('Why is the governing law clause risky?', [clause], [risk, lawRisk]);

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('governing law');
    expect(result.answer).not.toContain('Payment period');
    expect(result.citations).toContainEqual(expect.objectContaining({
      quote: 'Indian law applies and disputes shall be arbitrated in Delhi.',
    }));
  });

  it('summarizes multiple MSA/SOW conflicts when the question asks for all conflict areas', () => {
    const result = answerLegalQuestion(
      'Does this SOW conflict with the MSA on payment, liability, SLA penalties, or governing law?',
      [clause],
      [risk, liabilityRisk, slaRisk, lawRisk],
    );

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('RetailGrid SOW overrides the MSA liability cap');
    expect(result.answer).toContain('RetailGrid SOW service credits exceed the MSA cap');
    expect(result.answer).toContain('RetailGrid SOW changes governing law');
  });

  it('includes suggested wording when asked for a redline', () => {
    const result = answerLegalQuestion('What redline suggestion should I use for the liability clause?', [clause], [liabilityRisk, slaRisk]);

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('Suggested wording');
    expect(result.answer).toContain('Section 5.1 of the MSA');
    expect(result.answer).not.toContain('Service credits shall be the sole remedy');
  });

  it('names Indian laws when asked which Indian laws are exposed', () => {
    const result = answerLegalQuestion('Which Indian laws are breached or exposed here, and why?', [clause], [risk, lawRisk]);

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('Likely Indian laws breached or exposed');
    expect(result.answer).toContain('Indian Contract Act, 1872');
    expect(result.answer).toContain('Arbitration and Conciliation Act, 1996');
  });
});
