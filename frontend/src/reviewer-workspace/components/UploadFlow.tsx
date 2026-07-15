import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../../api/documents';
import { fetchBackendAnalyze } from '../../api/analyze';

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'done';

interface UploadFlowProps {
  onComplete: (data: { clauses: any[], risks: any[] }) => void;
}

export const UploadFlow: React.FC<UploadFlowProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [playbook, setPlaybook] = useState('active-demo-playbook');
  const [country, setCountry] = useState('IN');
  const [contractType, setContractType] = useState('MSA');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => 
        f.name.endsWith('.pdf') || f.name.endsWith('.docx')
      );
      
      if (selectedFiles.length !== e.target.files.length) {
        alert("Only .pdf and .docx files are supported.");
      }

      setFiles((currentFiles) => {
        const byName = new Map(currentFiles.map((file) => [file.name, file]));
        selectedFiles.forEach((file) => byName.set(file.name, file));
        return Array.from(byName.values()).slice(0, 2);
      });
      e.target.value = '';
    }
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setStatus('uploading');
    
    try {
      // 1. Upload files
      const documentIds: string[] = [];
      for (const file of files) {
        const res = await uploadDocument(file);
        documentIds.push(res.documentId);
      }
      
      // Simulate granular steps since backend is a single POST request right now
      setStatus('parsing');
      await new Promise(r => setTimeout(r, 1500));
      
      setStatus('analyzing');
      const data = await fetchBackendAnalyze(documentIds, playbook, country);
      
      setStatus('done');
      onComplete(data);
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-20 p-8 bg-white shadow-xl rounded-xl border border-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ContractLens Reviewer</h1>
        <p className="text-gray-500 mt-2">Upload up to 2 related documents for AI analysis.</p>
      </div>

      <div className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
          <UploadCloud className="mx-auto h-12 w-12 text-indigo-400 mb-4" />
          <div className="flex text-sm text-gray-600 justify-center flex-col items-center">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-3 py-1 shadow-sm border border-gray-200">
              <span>Select files</span>
              <input id="file-upload" name="file-upload" type="file" accept=".pdf,.docx" className="sr-only" multiple onChange={handleFileChange} />
            </label>
            <p className="mt-2">or drag and drop (Max 2)</p>
            <p className="text-xs text-gray-400 mt-1">PDF or DOCX up to 10MB</p>
          </div>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-700">Selected Documents</h3>
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                {file.name}
              </div>
            ))}
          </div>
        )}

        {/* Configuration */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Playbook Version</label>
            <select
              value={playbook}
              onChange={(e) => setPlaybook(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            >
              <option value="active-demo-playbook">Demo Playbook - Net 30 Payment</option>
              <option value="standard-v1">Standard v1.0</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            >
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="EU">European Union</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            >
              <option value="MSA">MSA</option>
              <option value="SOW">SOW</option>
              <option value="NDA">NDA</option>
            </select>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="pt-4 flex flex-col items-center">
          <button
            onClick={startAnalysis}
            disabled={status !== 'idle'}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {status === 'idle' ? 'Run AI Analysis' : 'Processing...'}
          </button>
          
          {status !== 'idle' && (
            <div className="mt-6 w-full space-y-3">
              <StatusRow active={status === 'uploading'} done={['parsing', 'analyzing', 'done'].includes(status)} label="Uploading documents..." />
              <StatusRow active={status === 'parsing'} done={['analyzing', 'done'].includes(status)} label="Parsing clauses and tables..." />
              <StatusRow active={status === 'analyzing'} done={['done'].includes(status)} label="Analyzing risks against playbook..." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusRow = ({ active, done, label }: { active: boolean; done: boolean; label: string }) => {
  return (
    <div className={`flex items-center text-sm ${active ? 'text-indigo-600 font-medium' : done ? 'text-green-600' : 'text-gray-400'}`}>
      {done ? (
        <CheckCircle className="h-5 w-5 mr-3" />
      ) : active ? (
        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
      ) : (
        <div className="h-5 w-5 mr-3 rounded-full border-2 border-gray-200" />
      )}
      {label}
    </div>
  );
};
