import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure pdf.js worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface HighlightMetadata {
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PdfViewerProps {
  documentUrl: string;
  highlights?: Record<string, HighlightMetadata>; // Map of clauseId to bounding box
  highlightClauseId?: string | null;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
  documentUrl, 
  highlights = {}, 
  highlightClauseId 
}) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);

  const activeHighlight = highlightClauseId ? highlights[highlightClauseId] : null;

  // If a highlight is selected, automatically jump to its page
  React.useEffect(() => {
    if (activeHighlight && activeHighlight.page !== pageNumber) {
      setPageNumber(activeHighlight.page);
    }
  }, [activeHighlight, pageNumber]);

  return (
    <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg overflow-hidden border border-gray-200">
      <div className="w-full flex justify-between items-center mb-4 bg-white p-2 rounded shadow-sm">
        <button 
          disabled={pageNumber <= 1} 
          onClick={() => setPageNumber(prev => prev - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm font-medium"
        >
          Previous
        </button>
        <span className="text-sm font-medium text-gray-700">
          Page {pageNumber} of {numPages || '--'}
        </span>
        <button 
          disabled={pageNumber >= (numPages || 1)} 
          onClick={() => setPageNumber(prev => prev + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm font-medium"
        >
          Next
        </button>
      </div>

      <div className="relative shadow-xl">
        <Document
          file={documentUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="p-20 text-gray-500">Loading PDF...</div>}
          error={<div className="p-20 text-red-500">Failed to load PDF.</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={true} 
            renderAnnotationLayer={true}
            className="max-w-full"
            width={600}
          />
        </Document>

        {/* Absolute-positioned highlight overlay */}
        {activeHighlight && activeHighlight.page === pageNumber && (
          <div 
            className="absolute bg-yellow-300 mix-blend-multiply opacity-50 border-2 border-yellow-500 rounded pointer-events-none transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
            style={{
              top: `${activeHighlight.top}%`,
              left: `${activeHighlight.left}%`,
              width: `${activeHighlight.width}%`,
              height: `${activeHighlight.height}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};
