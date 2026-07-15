import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  FileText,
  LoaderCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { fetchBackendAnalyze } from '../../api/analyze';
import {
  fetchBackendDocuments,
  uploadDocument,
  type BackendDocument,
} from '../../api/documents';
import {
  SUPPORTING_DOCUMENT_OPTIONS,
  canAnalyzePackage,
  findDuplicateFilenames,
  type SupportingDocumentType,
} from '../documentPackage';
import { clearCachedSavedAnalysisDocuments } from '../persistedAnalysis';

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'done';

interface SupportingDocument {
  id: string;
  file: File;
  documentType: SupportingDocumentType;
}

interface UploadFlowProps {
  onComplete: (data: { clauses: any[]; risks: any[] }) => void;
}

const ACCEPTED_FILE_PATTERN = /\.(pdf|docx)$/i;

export function UploadFlow({ onComplete }: UploadFlowProps) {
  const [availableMsas, setAvailableMsas] = useState<BackendDocument[]>([]);
  const [msaDocumentId, setMsaDocumentId] = useState('');
  const [sowFile, setSowFile] = useState<File | null>(null);
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState('');
  const [loadingMsas, setLoadingMsas] = useState(true);

  useEffect(() => {
    fetchBackendDocuments()
      .then((documents) => {
        const msas = documents.filter((document) =>
          document.document_type === 'MSA' && Boolean(document.assigned_to_id || document.assigned_to)
        );
        setAvailableMsas(msas);
        if (msas.length === 1) setMsaDocumentId(msas[0].id);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load assigned MSAs.'))
      .finally(() => setLoadingMsas(false));
  }, []);

  const ready = canAnalyzePackage({ msaDocumentId, sowFile });
  const selectedMsa = availableMsas.find((document) => document.id === msaDocumentId);
  const existingNames = useMemo(
    () => [sowFile, ...supportingDocuments.map((document) => document.file)].filter(Boolean) as File[],
    [sowFile, supportingDocuments],
  );

  function chooseSow(file?: File) {
    setError('');
    if (!file) return;
    if (!ACCEPTED_FILE_PATTERN.test(file.name)) {
      setError('The SOW must be a PDF or DOCX file.');
      return;
    }
    if (supportingDocuments.some((document) => document.file.name.toLowerCase() === file.name.toLowerCase())) {
      setError('That filename is already used by a supporting document.');
      return;
    }
    setSowFile(file);
  }

  function addSupportingFiles(files: File[]) {
    setError('');
    const validFiles = files.filter((file) => ACCEPTED_FILE_PATTERN.test(file.name));
    if (validFiles.length !== files.length) {
      setError('Only PDF and DOCX supporting documents are accepted.');
    }
    const combined = [...existingNames, ...validFiles];
    const duplicates = findDuplicateFilenames(combined);
    if (duplicates.length) {
      setError(`Duplicate filename: ${duplicates.join(', ')}`);
      return;
    }
    setSupportingDocuments((current) => [
      ...current,
      ...validFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        documentType: 'OTHER' as const,
      })),
    ]);
  }

  async function analyzePackage() {
    if (!ready || !sowFile) return;
    setError('');
    setStatus('uploading');
    try {
      const sow = await uploadDocument(sowFile, 'SOW');
      const supportingDocumentIds: string[] = [];
      for (const document of supportingDocuments) {
        const uploaded = await uploadDocument(document.file, document.documentType);
        supportingDocumentIds.push(uploaded.documentId);
      }
      setStatus('analyzing');
      const result = await fetchBackendAnalyze({
        msaDocumentId,
        sowDocumentId: sow.documentId,
        supportingDocumentIds,
        playbookId: 'default-indian-laws',
        countryCode: 'IN',
      });
      clearCachedSavedAnalysisDocuments();
      setStatus('done');
      onComplete(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Contract package analysis failed.');
      setStatus('idle');
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase text-primary">New contract review</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-text-dark">Build the contract package</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-light">
          Compare a new Statement of Work with the governing MSA selected by your administrator.
        </p>
      </header>

      {error && (
        <div className="mb-5 flex items-start gap-3 border border-status-danger/30 bg-red-50 px-4 py-3 text-sm text-status-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
        <section className="grid gap-5 px-5 py-6 md:grid-cols-[220px_1fr]">
          <SectionTitle icon={ShieldCheck} number="01" title="Governing MSA" description="Published and assigned by Admin" />
          <div>
            <label htmlFor="governing-msa" className="mb-2 block text-sm font-semibold text-text-dark">Assigned MSA</label>
            <select
              id="governing-msa"
              value={msaDocumentId}
              onChange={(event) => setMsaDocumentId(event.target.value)}
              disabled={loadingMsas || availableMsas.length === 0}
              className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100"
            >
              <option value="">{loadingMsas ? 'Loading assigned MSAs...' : 'Select an assigned MSA'}</option>
              {availableMsas.map((document) => (
                <option key={document.id} value={document.id}>{document.name} ({document.status})</option>
              ))}
            </select>
            {!loadingMsas && availableMsas.length === 0 && (
              <p className="mt-2 text-sm text-status-warning">No MSA is assigned. Ask an Admin to publish and assign one.</p>
            )}
            {selectedMsa && <p className="mt-2 text-xs text-text-light">This source is read-only for Legal Advisors.</p>}
          </div>
        </section>

        <section className="grid gap-5 px-5 py-6 md:grid-cols-[220px_1fr]">
          <SectionTitle icon={FileCheck2} number="02" title="Statement of Work" description="Required primary document" />
          <div>
            <label className="flex min-h-28 cursor-pointer items-center justify-center border-2 border-dashed border-primary/30 bg-secondary/40 px-5 text-center hover:border-primary">
              <input type="file" accept=".pdf,.docx" className="sr-only" onChange={(event) => { chooseSow(event.target.files?.[0]); event.target.value = ''; }} />
              {sowFile ? (
                <span className="flex items-center gap-3 text-sm font-medium text-text-dark"><FileText className="h-5 w-5 text-primary" />{sowFile.name}</span>
              ) : (
                <span className="text-sm text-text-light"><strong className="text-primary">Choose SOW</strong><br />PDF or DOCX</span>
              )}
            </label>
            {sowFile && <button type="button" onClick={() => setSowFile(null)} className="mt-2 text-sm font-medium text-status-danger">Remove SOW</button>}
          </div>
        </section>

        <section className="grid gap-5 px-5 py-6 md:grid-cols-[220px_1fr]">
          <SectionTitle icon={FilePlus2} number="03" title="Supporting Documents" description="Optional agreements and evidence" />
          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-text-dark hover:border-primary hover:text-primary">
              <FilePlus2 className="h-4 w-4" /> Add supporting files
              <input type="file" accept=".pdf,.docx" multiple className="sr-only" onChange={(event) => { addSupportingFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
            </label>
            {supportingDocuments.length === 0 && <p className="text-sm text-text-light">NDA, SLA, exhibit, amendment, order form, DPA, or another related contract.</p>}
            {supportingDocuments.map((document) => (
              <div key={document.id} className="grid items-center gap-3 border border-slate-200 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_230px_36px]">
                <span className="truncate text-sm font-medium text-text-dark">{document.file.name}</span>
                <select
                  value={document.documentType}
                  onChange={(event) => setSupportingDocuments((current) => current.map((item) => item.id === document.id ? { ...item, documentType: event.target.value as SupportingDocumentType } : item))}
                  className="border border-slate-300 bg-white px-2 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {SUPPORTING_DOCUMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <button type="button" title="Remove document" onClick={() => setSupportingDocuments((current) => current.filter((item) => item.id !== document.id))} className="flex h-9 w-9 items-center justify-center text-text-light hover:text-status-danger"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 border-b border-slate-200 pb-6">
        <div className="max-w-xl border border-slate-200 bg-secondary/40 px-4 py-3">
          <p className="text-sm font-semibold text-text-dark">Legal grounding</p>
          <p className="mt-1 text-sm text-text-light">
            Default Indian laws will be used for legal checks and citation support.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={analyzePackage}
        disabled={!ready || status !== 'idle'}
        className="mt-6 flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      >
        {status === 'uploading' || status === 'analyzing' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}
        {status === 'uploading' ? 'Uploading contract package...' : status === 'analyzing' ? 'Analyzing MSA against SOW...' : status === 'done' ? 'Analysis complete' : 'Analyze Contract Package'}
      </button>
    </div>
  );
}

function SectionTitle({ icon: Icon, number, title, description }: { icon: typeof ShieldCheck; number: string; title: string; description: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-[10px] font-bold uppercase text-accent">{number}</p><h2 className="font-serif text-lg font-bold text-text-dark">{title}</h2><p className="mt-1 text-xs text-text-light">{description}</p></div></div>;
}
