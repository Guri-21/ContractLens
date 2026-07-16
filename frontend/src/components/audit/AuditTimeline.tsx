import { AuditTimelineItem } from '../../mock/data';

interface AuditTimelineProps {
  timeline: AuditTimelineItem[];
}

export default function AuditTimeline({ timeline }: AuditTimelineProps) {
  return (
    <div className="pl-3.5 border-l border-[#E2E8F0] ml-1.5 mt-3 flex flex-col gap-4.5">
      {timeline.map((s, idx) => (
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
  );
}
