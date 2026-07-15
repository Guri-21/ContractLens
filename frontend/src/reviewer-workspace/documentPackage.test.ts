import { describe, expect, it } from 'vitest';

import {
  SUPPORTING_DOCUMENT_OPTIONS,
  canAnalyzePackage,
  findDuplicateFilenames,
} from './documentPackage';

describe('reviewer document package', () => {
  it('exposes the approved supporting document types', () => {
    expect(SUPPORTING_DOCUMENT_OPTIONS.map((option) => option.value)).toEqual([
      'NDA',
      'SLA',
      'EXHIBIT',
      'AMENDMENT',
      'ORDER_FORM',
      'DPA',
      'OTHER',
    ]);
  });

  it('rejects duplicate filenames case-insensitively', () => {
    expect(
      findDuplicateFilenames([
        { name: 'Pricing.pdf' },
        { name: 'scope.docx' },
        { name: 'pricing.PDF' },
      ]),
    ).toEqual(['pricing.PDF']);
  });

  it('requires both an assigned MSA and SOW before analysis', () => {
    expect(canAnalyzePackage({ msaDocumentId: '', sowFile: null })).toBe(false);
    expect(canAnalyzePackage({ msaDocumentId: 'msa-1', sowFile: null })).toBe(false);
    expect(
      canAnalyzePackage({
        msaDocumentId: 'msa-1',
        sowFile: { name: 'scope.pdf' },
      }),
    ).toBe(true);
  });
});
