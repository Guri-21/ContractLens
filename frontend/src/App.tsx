import { useState } from 'react';
import { ReviewerWorkspace } from './reviewer-workspace/ReviewerWorkspace';
import { Sandbox } from './Sandbox';

export default function Component() { 
  const [view, setView] = useState<'workspace' | 'sandbox'>('sandbox');

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="bg-gray-800 text-white p-2 flex space-x-4">
        <button onClick={() => setView('workspace')} className={`px-3 py-1 rounded ${view === 'workspace' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>Reviewer Workspace</button>
        <button onClick={() => setView('sandbox')} className={`px-3 py-1 rounded ${view === 'sandbox' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>Cross-Cutting Sandbox</button>
      </div>
      <div className="flex-1 overflow-auto">
        {view === 'workspace' ? <ReviewerWorkspace /> : <Sandbox />}
      </div>
    </div>
  );
}
