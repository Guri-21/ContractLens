import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchBackendDocuments, peekBackendDocuments, uploadAdminMsa, assignMsa, deleteMsa } from '../../api/documents';
import { fetchUsers, peekUsers, UserResponse } from '../../api/users';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

export default function MsaRepository() {
  // Seed from cache so a return visit renders instantly with no loading flash.
  const cachedDocs = peekBackendDocuments();
  const cachedUsers = peekUsers();
  const [documents, setDocuments] = useState<any[]>(
    cachedDocs ? cachedDocs.filter((d: any) => d.document_type === 'MSA') : [],
  );
  const [advisors, setAdvisors] = useState<UserResponse[]>(
    cachedUsers ? cachedUsers.filter(u => u.role === 'Legal Reviewer') : [],
  );
  const [isLoading, setIsLoading] = useState(!(cachedDocs && cachedUsers));
  const [isUploading, setIsUploading] = useState(false);
  const [assigningDocId, setAssigningDocId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const [advisorSearch, setAdvisorSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    // Only show the skeleton when we have nothing to display yet.
    if (documents.length === 0) setIsLoading(true);
    try {
      const [docs, users] = await Promise.all([
        fetchBackendDocuments(),
        fetchUsers(),
      ]);
      setDocuments(docs.filter((d: any) => d.document_type === 'MSA'));
      setAdvisors(users.filter(u => u.role === 'Legal Reviewer'));
    } catch (err) {
      console.error(err);
      setError('Failed to load MSA repository data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedAdvisor = advisors.find(advisor => advisor.id === selectedAdvisorId);
  const assignedCount = documents.filter(doc => doc.assigned_to_id).length;

  const filteredAdvisors = useMemo(() => {
    const query = advisorSearch.trim().toLowerCase();
    if (!query) return advisors;
    return advisors.filter(advisor => advisor.email.toLowerCase().includes(query));
  }, [advisors, advisorSearch]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      await uploadAdminMsa(file, selectedAdvisorId || undefined);
      setSuccess(`${file.name} was published${selectedAdvisor ? ` and assigned to ${selectedAdvisor.email}` : ''}.`);
      setFile(null);
      setSelectedAdvisorId('');
      setAdvisorSearch('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to upload MSA');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssign = async (docId: string, advisorId: string) => {
    setAssigningDocId(docId);
    setError('');
    setSuccess('');

    try {
      await assignMsa(docId, advisorId);
      const advisor = advisors.find(item => item.id === advisorId);
      setSuccess(advisor ? `MSA assigned to ${advisor.email}.` : 'MSA assignment cleared.');
      await loadData();
    } catch (err) {
      setError('Failed to assign MSA');
    } finally {
      setAssigningDocId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this MSA? This action cannot be undone.')) return;
    setError('');
    setSuccess('');

    try {
      await deleteMsa(docId);
      setSuccess('MSA deleted.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete MSA');
    }
  };

  return (
    <div className="space-y-6 animate-cl-fade max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-text-dark">Governing MSA Library</h2>
          <p className="text-text-light text-sm mt-1">Publish approved MSAs and assign them to legal advisors.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="MSAs" value={documents.length} />
          <Metric label="Assigned" value={assignedCount} />
          <Metric label="Advisors" value={advisors.length} />
        </div>
      </div>

      {(error || success) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          <div className="flex items-center gap-2">
            {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {error || success}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload New MSA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid gap-5 lg:grid-cols-[1.05fr_1.2fr_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-text-dark">MSA file</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-[126px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors ${
                  file ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50 hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <FileUp className={`mb-3 h-8 w-8 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold text-text-dark">
                  {file ? file.name : 'Choose PDF or DOCX'}
                </span>
                <span className="mt-1 text-xs text-text-light">
                  {file ? `${Math.max(1, Math.round(file.size / 1024))} KB selected` : 'Approved governing MSA document'}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                required
                accept=".pdf,.docx"
                onChange={event => setFile(event.target.files?.[0] || null)}
                className="hidden"
              />
              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-text-light hover:text-status-danger"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove file
                </button>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold text-text-dark">Assign to advisor</label>
                {selectedAdvisor && (
                  <button
                    type="button"
                    onClick={() => setSelectedAdvisorId('')}
                    className="text-xs font-medium text-text-light hover:text-status-danger"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search legal advisor..."
                    className="h-9 flex-1 bg-transparent text-sm outline-none"
                    value={advisorSearch}
                    onChange={event => setAdvisorSearch(event.target.value)}
                  />
                </div>
                <div className="max-h-[148px] overflow-y-auto p-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAdvisorId('')}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedAdvisorId === '' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-text-dark'
                    }`}
                  >
                    <span>Do not assign yet</span>
                    {selectedAdvisorId === '' && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  {filteredAdvisors.map(advisor => (
                    <button
                      key={advisor.id}
                      type="button"
                      onClick={() => setSelectedAdvisorId(advisor.id)}
                      className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedAdvisorId === advisor.id ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 text-text-dark'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{advisor.email}</span>
                        <span className="text-xs text-text-light">{advisor.assigned_docs?.length || 0} assigned documents</span>
                      </span>
                      {selectedAdvisorId === advisor.id && <UserCheck className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  ))}
                  {filteredAdvisors.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-text-light">No advisor found.</div>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" className="h-12 gap-2 px-6" isLoading={isUploading} disabled={!file || isUploading}>
              <Upload className="w-4 h-4" />
              Publish MSA
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published MSAs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              [1, 2, 3].map(item => <MsaSkeleton key={item} />)
            ) : documents.length === 0 ? (
              <div className="py-10 text-center text-text-light border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No MSAs published yet.
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-text-dark" title={doc.name}>{doc.name}</h4>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-text-light">{doc.status || 'pending'}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-text-light">ID {String(doc.id).slice(0, 8)}</span>
                          {doc.assigned_to?.email ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Assigned to {doc.assigned_to.email}</span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <select
                          className="min-w-[230px] bg-transparent text-sm outline-none"
                          value={doc.assigned_to_id || ''}
                          onChange={event => handleAssign(doc.id, event.target.value)}
                          disabled={assigningDocId === doc.id}
                        >
                          <option value="">Unassigned</option>
                          {advisors.map(advisor => (
                            <option key={advisor.id} value={advisor.id}>{advisor.email}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                        title="Delete MSA"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[84px] rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm">
      <div className="text-lg font-bold text-text-dark">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-text-light">{label}</div>
    </div>
  );
}

function MsaSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-64 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-48 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="h-10 w-64 rounded-lg bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}
