import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EvidenceInspector } from './EvidenceInspector';

const clause = {
  id: 'clause-1',
  documentId: 'doc-1',
  documentName: 'Vendor_MSA.pdf',
  documentType: 'MSA' as const,
  sectionNumber: '4.1',
  page: 2,
  text: 'Payment shall be due within thirty days.',
  clauseType: 'payment',
  references: [],
  overrides: [],
};

describe('EvidenceInspector', () => {
  it('stays as a bottom sheet until desktop width', () => {
    const markup = renderToStaticMarkup(
      <EvidenceInspector
        clause={clause}
        risks={[]}
        linkedClauses={[]}
        unresolvedTargets={[]}
        onClose={() => undefined}
        onSelectClause={() => undefined}
      />,
    );

    expect(markup).toContain('fixed inset-x-0 bottom-0');
    expect(markup).toContain('lg:static');
    expect(markup).not.toContain('md:static');
  });
});
