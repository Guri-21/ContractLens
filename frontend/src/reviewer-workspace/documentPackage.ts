import type { DocumentType } from '../lib/types';

export type SupportingDocumentType = Exclude<
  DocumentType,
  'MSA' | 'SOW' | 'PLAYBOOK' | 'LAW'
>;

export const SUPPORTING_DOCUMENT_OPTIONS: Array<{
  value: SupportingDocumentType;
  label: string;
}> = [
  { value: 'NDA', label: 'Non-Disclosure Agreement' },
  { value: 'SLA', label: 'Service Level Agreement' },
  { value: 'EXHIBIT', label: 'Exhibit or Schedule' },
  { value: 'AMENDMENT', label: 'Amendment or Addendum' },
  { value: 'ORDER_FORM', label: 'Order Form' },
  { value: 'DPA', label: 'Data Processing Addendum' },
  { value: 'OTHER', label: 'Other Supporting Contract' },
];

export function findDuplicateFilenames(files: Array<{ name: string }>): string[] {
  const seen = new Set<string>();
  return files.reduce<string[]>((duplicates, file) => {
    const normalized = file.name.toLowerCase();
    if (seen.has(normalized)) duplicates.push(file.name);
    seen.add(normalized);
    return duplicates;
  }, []);
}

export function canAnalyzePackage({
  msaDocumentId,
  sowFile,
}: {
  msaDocumentId: string;
  sowFile: { name: string } | null;
}): boolean {
  return Boolean(msaDocumentId && sowFile);
}
