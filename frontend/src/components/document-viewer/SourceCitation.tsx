import { ClauseDTO, RiskFindingDTO } from '../../reviewer-workspace/types';
import RiskLevelBadge from '../risk/RiskLevelBadge';
import { Scale, CheckCircle, HelpCircle } from 'lucide-react';

interface SourceCitationProps {
  clause: ClauseDTO | null;
  risk: RiskFindingDTO | null;
}

export default function SourceCitation({ clause, risk }: SourceCitationProps) {
  if (!clause) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 text-[#94A3B8]">
        <HelpCircle className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs">Select a clause from the document to view compliance citations.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden select-none border-l border-[#E2E8F0] w-80 flex-none">
      <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <h3 className="font-serif text-sm text-[#0F172A]">Compliance Citation</h3>
        <p className="text-[11px] text-[#64748B] mt-0.5">Evaluation rules applied to this section.</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* Compliance Status */}
        <div className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
            Status
          </span>
          {risk ? (
            <div className="flex items-center gap-2">
              <RiskLevelBadge level={risk.riskLevel.toLowerCase() as any} />
              <span className="text-xs font-semibold text-[#8B2635]">Out of Compliance</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
              <CheckCircle className="w-4 h-4" /> Passed Compliance Check
            </div>
          )}
        </div>

        {/* Clause Details */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
            Classification
          </span>
          <div className="text-xs font-semibold text-[#334155]">
            {clause.clauseType || 'General Clause'}
          </div>
          {clause.sectionNumber && (
            <div className="text-[11px] text-[#64748B]">
              Section {clause.sectionNumber} (Page {clause.page || 'N/A'})
            </div>
          )}
        </div>

        {/* Playbook Rules Violated */}
        {risk && (
          <div className="space-y-2 border-t border-[#F1F5F9] pt-4">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Rule Violated
            </span>
            <div className="bg-red-50/50 border border-red-100 rounded p-3 text-xs">
              <div className="font-semibold text-red-900 mb-1">
                {risk.playbookRuleViolated || 'Jurisdiction Compliance Rule'}
              </div>
              <p className="text-red-800 leading-relaxed">
                {risk.reason}
              </p>
            </div>
          </div>
        )}

        {/* General References */}
        {clause.references && clause.references.length > 0 && (
          <div className="space-y-1.5 border-t border-[#F1F5F9] pt-4">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
              Cross References
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {clause.references.map((ref, idx) => (
                <span 
                  key={idx}
                  className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.75 rounded border border-slate-200"
                >
                  {ref}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
