import React, { useState } from 'react';
import { DependencyGraph } from './shared-components/DependencyGraph';
import { PdfViewer } from './shared-components/PdfViewer';
import { VersionComparison } from './shared-components/VersionComparison';
import { ReportExport } from './reports/ReportExport';
import { mockClauses, mockRiskFindings } from './reviewer-workspace/mocks/data';

// Create a mock cycle to test cycle detection
const cyclicClauses = [...mockClauses];
cyclicClauses[0] = { ...cyclicClauses[0], references: ['clause-2'] };
cyclicClauses[1] = { ...cyclicClauses[1], references: ['clause-1'] }; // cycle!

export const Sandbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState('graph');

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Cross-Cutting Components Sandbox</h1>
      <p className="text-gray-500 mb-8">Test the components built in Parts A-D.</p>

      <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-2">
        {['graph', 'pdf', 'version', 'report'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium rounded-t-md capitalize ${activeTab === tab ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        {activeTab === 'graph' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Dependency Graph (with mock cycle)</h2>
            <div className="mb-12 h-96">
        <DependencyGraph clauses={mockClauses} risks={[]} />
      </div>      </div>
        )}

        {activeTab === 'pdf' && (
          <div>
            <h2 className="text-xl font-bold mb-4">PDF Viewer</h2>
            <p className="text-sm text-gray-500 mb-4">
              Since we don't have a real PDF file hosted, it will show the graceful "Failed to load" fallback. 
              If you put a real PDF URL, the highlight engine will draw the bounding box over it.
            </p>
            <div className="max-w-2xl mx-auto">
              <PdfViewer 
                documentUrl="dummy.pdf" 
                highlightClauseId="mock-1"
                highlights={{
                  'mock-1': { page: 1, top: 20, left: 10, width: 80, height: 10 }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'version' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Version Comparison</h2>
      <div className="mb-12">
        <VersionComparison clause={mockClauses[0]} />
      </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div>
            <h2 className="text-xl font-bold mb-4">PDF Report Export</h2>
            <p className="text-sm text-gray-500 mb-4">Click below to generate and download the executive summary PDF based on the mock risk findings.</p>
            <ReportExport findings={mockRiskFindings} score={42} />
          </div>
        )}
      </div>
    </div>
  );
};
