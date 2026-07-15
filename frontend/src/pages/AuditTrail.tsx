import { useState } from 'react';
import { AuditEvent, riskMeta, statusMeta } from '../mock/data';

interface AuditTrailProps {
  auditData: AuditEvent[];
}

export default function AuditTrail({ auditData }: AuditTrailProps) {
  const [expandedId, setExpandedId] = useState<string | null>('C-1060');

  const toggleEvent = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const pillStyle = (bg: string, color: string) => ({
    background: bg,
    color,
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '14px',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const
  });

  return (
    <div className="animate-cl-rise">
      <div className="mb-5.5">
        <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
          Administration
        </div>
        <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
          Audit Trail
        </h1>
        <p className="text-[#64748B] text-sm mt-1.5">
          System-wide, immutable record: who uploaded what, the resulting risk score, and every reviewer action on each finding.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {auditData.length === 0 ? (
          <div className="bg-white border border-dashed border-[#CBD5E1] rounded-lg p-10 flex flex-col items-center justify-center text-center mt-4">
            <div className="text-4xl mb-3 opacity-50">📋</div>
            <h3 className="text-lg font-medium text-slate-800 mb-1">No audit records found</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              There is currently no data available for the audit trail. Once documents are uploaded and reviewed, their activity will appear here.
            </p>
          </div>
        ) : (
          auditData.map((e) => {
            const rm = e.level ? riskMeta[e.level] : null;
            const isExpanded = expandedId === e.id;
            
            const dotColor = rm ? rm.color : '#8B2635'; // Default to failed if no score/level
            const riskLabel = rm ? `${rm.label} • ${e.score}` : 'Failed';
            const riskPill = rm 
              ? pillStyle(rm.soft, rm.text) 
              : pillStyle(statusMeta.failed.soft, statusMeta.failed.color);

            return (
              <div
                key={e.id}
                className="bg-white border border-[#E2E8F0] rounded-md overflow-hidden transition-all duration-200"
              >
                {/* Event Header Toggle Button */}
                <button
                  onClick={() => toggleEvent(e.id)}
                  className="w-full text-left bg-transparent border-0 cursor-pointer p-4 px-5 flex items-center gap-4 focus:outline-none"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-none"
                    style={{ background: dotColor }}
                  ></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-[#0F172A] text-sm md:text-[14.5px]">
                        {e.contract}
                      </span>
                      <span className="font-mono text-[11px] text-[#94A3B8]">{e.id}</span>
                    </div>
                    <div className="text-[12.5px] text-[#64748B] mt-0.5 truncate">{e.summary}</div>
                  </div>

                  <div className="flex items-center gap-3.5 flex-none">
                    <span style={riskPill}>{riskLabel}</span>
                    <span className="text-xs text-[#94A3B8] whitespace-nowrap hidden sm:inline">
                      {e.uploadedAt}
                    </span>
                    <span
                      className="text-accent text-lg font-bold transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      ›
                    </span>
                  </div>
                </button>

                {/* Collapsible Timeline Content */}
                {isExpanded && (
                  <div className="border-t border-[#F1F5F9] p-2.5 px-5 pb-4.5 bg-[#FCFCFD] animate-cl-fade">
                    <div className="pl-3.5 border-l border-[#E2E8F0] ml-1.5 mt-3 flex flex-col gap-4.5">
                      {e.timeline.map((s, idx) => (
                        <div key={idx} className="relative pl-5">
                          {/* Bullet circle */}
                          <span
                            className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_1px_#E2E8F0]"
                            style={{ background: s.color }}
                          ></span>
                          <div className="flex justify-between items-baseline gap-3">
                            <div
                              className="font-mono text-[10px] tracking-[0.08em] uppercase font-bold text-xs"
                              style={{ color: s.color }}
                            >
                              {s.kind}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] font-mono whitespace-nowrap">
                              {s.at}
                            </div>
                          </div>
                          <div className="text-[13.5px] text-[#0F172A] mt-0.5">{s.title}</div>
                          {s.note && (
                            <div className="text-[12.5px] text-[#64748B] mt-1 italic">
                              “{s.note}” — <span className="font-semibold">{s.actor || 'System'}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
