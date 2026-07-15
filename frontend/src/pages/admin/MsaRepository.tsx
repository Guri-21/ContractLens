import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchBackendDocuments, uploadAdminMsa, assignMsa, deleteMsa } from '../../api/documents';
import { fetchUsers, UserResponse } from '../../api/users';
import { FileText, Upload, Users, AlertCircle, Trash2 } from 'lucide-react';

export default function MsaRepository() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');
  const [error, setError] = useState('');
  
  // Search state for dropdown
  const [advisorSearch, setAdvisorSearch] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docs, users] = await Promise.all([
        fetchBackendDocuments(),
        fetchUsers()
      ]);
      setDocuments(docs.filter((d: any) => d.document_type === 'MSA'));
      setAdvisors(users.filter(u => u.role === 'Legal Reviewer'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setError('');
    
    try {
      await uploadAdminMsa(file, selectedAdvisorId || undefined);
      setFile(null);
      setSelectedAdvisorId('');
      setAdvisorSearch('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to upload MSA');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssign = async (docId: string, advisorId: string) => {
    try {
      await assignMsa(docId, advisorId);
      await loadData();
    } catch (err) {
      alert('Failed to assign MSA');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this MSA? This action cannot be undone.')) return;
    try {
      await deleteMsa(docId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete MSA');
    }
  };

  const filteredAdvisors = advisors.filter(a => 
    a.email.toLowerCase().includes(advisorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-cl-fade max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-serif font-bold text-text-dark">Governing MSA Library</h2>
        <p className="text-text-light text-sm mt-1">Upload and manage Master Service Agreements for your legal team.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New MSA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            {error && <p className="text-status-danger text-sm">{error}</p>}
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-text-dark mb-1.5">Select File (PDF/DOCX)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="flex-1 w-full relative">
                <label className="block text-sm font-medium text-text-dark mb-1.5">Assign to Legal Advisor (Optional)</label>
                <div className="relative border border-slate-300 rounded-md bg-white">
                  <div className="p-2 border-b border-slate-100">
                    <input 
                      type="text" 
                      placeholder="Search advisor by email..." 
                      className="w-full text-sm outline-none"
                      value={advisorSearch}
                      onChange={e => setAdvisorSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="w-full p-2 text-sm outline-none bg-transparent"
                    value={selectedAdvisorId}
                    onChange={e => setSelectedAdvisorId(e.target.value)}
                    size={3}
                  >
                    <option value="">-- Do not assign yet --</option>
                    {filteredAdvisors.map(adv => (
                      <option key={adv.id} value={adv.id}>{adv.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button type="submit" variant="primary" className="gap-2 h-[42px] mb-1" isLoading={isUploading} disabled={!file}>
                <Upload className="w-4 h-4" />
                Upload & Publish
              </Button>
            </div>
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
              [1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-50 rounded-lg border border-slate-100 animate-pulse" />
              ))
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-text-light border border-dashed border-slate-200 rounded-lg">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No MSAs published yet.
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white transition-colors gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-dark">{doc.name}</h4>
                      <p className="text-xs text-text-light font-mono mt-1">ID: {doc.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <select 
                      className="text-sm border border-slate-200 rounded p-1.5 bg-white outline-none focus:border-primary"
                      value={doc.assigned_to_id || ''}
                      onChange={e => handleAssign(doc.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {advisors.map(adv => (
                        <option key={adv.id} value={adv.id}>{adv.email}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 ml-2 text-slate-400 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors"
                      title="Delete MSA"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
