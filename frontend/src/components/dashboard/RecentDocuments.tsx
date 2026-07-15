import { Contract, riskMeta } from '../../mock/data';

interface RecentDocumentsProps {
  contracts: Contract[];
}

export default function RecentDocuments({ contracts }: RecentDocumentsProps) {
  const scored = contracts.filter((c) => c.level && c.score !== null) as (Contract & { score: number; level: string })[];

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

  const highRiskList = scored
    .filter((c) => c.level === 'high' || c.level === 'critical')
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)
    .map((c) => {
      const meta = riskMeta[c.level];
      return {
        ...c,
        riskLabel: `${meta.label} • ${c.score}`,
        riskStyle: pillStyle(meta.soft, meta.text)
      };
    });

  return (
    <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
      <div className="p-3.5 px-5 border-b border-[#E2E8F0] font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
        High-risk contracts requiring attention
      </div>
      {highRiskList.length === 0 ? (
        <div className="p-10 text-center text-slate-400 text-sm">
          No high-risk contracts found requiring attention.
        </div>
      ) : (
        <table className="w-full border-collapse text-[13.5px]">
          <tbody>
            {highRiskList.map((c) => (
              <tr key={c.id} className="border-t border-[#F1F5F9] first:border-t-0 hover:bg-slate-50/50">
                <td className="p-3.5 px-5">
                  <div className="font-semibold text-[#0F172A]">{c.name}</div>
                  <div className="text-xs text-[#94A3B8] font-mono mt-0.5">
                    {c.id} • {c.client}
                  </div>
                </td>
                <td className="p-3.5 px-5 text-[#475569]">{c.dept}</td>
                <td className="p-3.5 px-5">
                  <span style={c.riskStyle}>{c.riskLabel}</span>
                </td>
                <td className="p-3.5 px-5 text-right text-[#64748B]">{c.reviewer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
