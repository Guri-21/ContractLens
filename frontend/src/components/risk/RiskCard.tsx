import { AlertCircle, FileText, CheckCircle } from 'lucide-react';
import RiskLevelBadge from './RiskLevelBadge';

interface RiskCardProps {
  finding: {
    id: string;
    risk_level: string; // low | medium | high | critical
    status: string;
    reason: string;
    playbook_rule_violated?: string | null;
    evidence?: any;
    redline?: {
      originalText: string;
      suggestedText: string;
    } | null;
  };
  onSelectClause?: () => void;
}

export default function RiskCard({ finding, onSelectClause }: RiskCardProps) {
  const isCritical = finding.risk_level === 'critical' || finding.risk_level === 'high';
  
  // Parse evidence details if available
  let evidenceList: any[] = [];
  try {
    if (typeof finding.evidence === 'string') {
      evidenceList = JSON.parse(finding.evidence);
    } else if (Array.isArray(finding.evidence)) {
      evidenceList = finding.evidence;
    }
  } catch (e) {
    console.error(e);
  }

  const badgeLevel = (finding.risk_level.toLowerCase() as 'low' | 'medium' | 'high' | 'critical') || 'low';

  return (
    <div 
      className={`border rounded-lg p-4 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
        isCritical ? 'border-red-100 hover:border-red-200' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertCircle className="w-4 h-4 text-[#8B2635] flex-none" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-none" />
          )}
          <span className="font-semibold text-[#0F172A] text-sm">
            {finding.playbook_rule_violated || 'Compliance Variance'}
          </span>
        </div>
        <RiskLevelBadge level={badgeLevel} />
      </div>

      <p className="text-xs text-[#475569] leading-relaxed mb-3.5">
        {finding.reason}
      </p>

      {evidenceList.length > 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded p-2.5 mb-3 text-[11px] text-[#64748B]">
          <div className="font-semibold mb-1 flex items-center gap-1.5 uppercase font-mono tracking-wider">
            <FileText className="w-3.5 h-3.5" /> Evidence Reference
          </div>
          {evidenceList.map((ev, i) => (
            <div key={i} className="line-clamp-2 italic text-[#475569]">
              "{ev.quote}" {ev.page ? `(Page ${ev.page}, Sec ${ev.section || 'N/A'})` : ''}
            </div>
          ))}
        </div>
      )}

      {finding.redline && (
        <div className="border border-slate-100 rounded overflow-hidden text-xs">
          <div className="bg-slate-50 p-2 font-semibold text-[#334155] border-b border-slate-100 flex items-center justify-between">
            <span>Proposed Redline Suggestion</span>
          </div>
          <div className="p-2.5 bg-white space-y-2">
            <div className="text-red-700 bg-red-50/50 p-1.5 rounded line-through border border-red-50">
              {finding.redline.originalText}
            </div>
            <div className="text-emerald-700 bg-emerald-50/50 p-1.5 rounded font-medium border border-emerald-50">
              {finding.redline.suggestedText}
            </div>
          </div>
        </div>
      )}

      {onSelectClause && (
        <button
          onClick={onSelectClause}
          className="mt-3 text-[11px] font-semibold text-accent hover:text-accent-hover bg-transparent border-0 cursor-pointer flex items-center gap-1"
        >
          Locate in contract →
        </button>
      )}
    </div>
  );
}
