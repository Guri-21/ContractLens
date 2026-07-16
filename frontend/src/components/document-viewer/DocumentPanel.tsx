import { ClauseDTO, RiskFindingDTO } from '../../reviewer-workspace/types';
import { FileText, Eye } from 'lucide-react';

interface DocumentPanelProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
  selectedClauseId: string | null;
  onSelectClause: (id: string) => void;
}

export default function DocumentPanel({
  clauses,
  risks,
  selectedClauseId,
  onSelectClause
}: DocumentPanelProps) {
  
  const riskMap = new Map<string, RiskFindingDTO>();
  risks.forEach(r => riskMap.set(r.clauseId, r));

  const documentName = clauses.length > 0 ? clauses[0].documentName : 'Contract Document';
  const documentType = clauses.length > 0 ? clauses[0].documentType : 'MSA';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAFB]">
      <div className="p-4 bg-white border-b border-[#E2E8F0] flex justify-between items-center select-none">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-accent" />
          <div>
            <h2 className="font-semibold text-sm text-[#0F172A]">{documentName}</h2>
            <span className="text-[10px] font-mono text-[#64748B] uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {documentType}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <Eye className="w-4 h-4 text-[#94A3B8]" /> Full Text View
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
        <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-6 md:p-8 space-y-6 min-h-[500px] leading-relaxed text-sm text-[#334155] font-serif">
          {clauses.map((clause) => {
            const isSelected = selectedClauseId === clause.id;
            const risk = riskMap.get(clause.id);
            const hasRisk = risk && risk.riskLevel !== 'low';

            let highlightBg = 'transparent';
            if (isSelected) {
              highlightBg = 'rgba(156, 122, 60, 0.12)'; // accent-soft
            } else if (hasRisk) {
              highlightBg = 'rgba(139, 38, 53, 0.04)'; // critical-soft
            }

            return (
              <div
                key={clause.id}
                onClick={() => onSelectClause(clause.id)}
                className={`p-3.5 rounded transition-all duration-150 cursor-pointer border-l-2 ${
                  isSelected 
                    ? 'border-accent shadow-[0_1px_3px_rgba(0,0,0,0.02)]' 
                    : hasRisk 
                    ? 'border-red-400/60 hover:bg-[#FAFAFB]' 
                    : 'border-transparent hover:bg-slate-50/50'
                }`}
                style={{ backgroundColor: highlightBg }}
              >
                <div className="flex justify-between items-baseline mb-1.5 font-sans select-none text-[11px] font-mono text-[#94A3B8]">
                  <span>
                    {clause.title || clause.clauseType || 'General Clause'}{' '}
                    {clause.sectionNumber ? `• Section ${clause.sectionNumber}` : ''}
                  </span>
                  <span>Page {clause.page || '1'}</span>
                </div>
                <div className="text-[13.5px] leading-relaxed text-[#334155]">
                  {clause.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
