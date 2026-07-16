import { 
  DeptRecord, CountryRecord, 
  ClauseRecord, ClauseTypeRiskRecord, riskMeta, levelFor 
} from '../../mock/data';

interface ClauseDistributionProps {
  deptData: DeptRecord[];
  countryData: CountryRecord[];
  clauseData: ClauseRecord[];
  clauseTypeRisk: ClauseTypeRiskRecord[];
  riskTab: 'dept' | 'country' | 'clause';
  onSetRiskTab: (tab: 'dept' | 'country' | 'clause') => void;
}

export default function ClauseDistribution({
  deptData,
  countryData,
  clauseData,
  clauseTypeRisk,
  riskTab,
  onSetRiskTab,
}: ClauseDistributionProps) {

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

  const rtabs = [
    { k: 'dept' as const, label: 'Department' },
    { k: 'country' as const, label: 'Country' },
    { k: 'clause' as const, label: 'Clause Type' }
  ];

  // Risk Analytics Breakdown calculation
  const currentBreakdownSrc =
    riskTab === 'dept' ? deptData : riskTab === 'country' ? countryData : clauseTypeRisk;
  const maxBreakdownRisk =
    currentBreakdownSrc.length > 0 ? Math.max(...currentBreakdownSrc.map((d) => d.avgRisk)) : 1;

  const breakdownBars = currentBreakdownSrc.map((d) => {
    const lv = levelFor(d.avgRisk) || 'low';
    const contractsMeta = 'contracts' in d ? ` • ${d.contracts} contracts` : '';
    return {
      label: d.label,
      avgRisk: d.avgRisk,
      widthPercent: `${(d.avgRisk / maxBreakdownRisk) * 100}%`,
      barColor: riskMeta[lv].color,
      meta: `${d.avgRisk} avg${contractsMeta}`
    };
  });

  // Clause Analytics Calculations
  const maxClause = clauseData.length > 0 ? Math.max(...clauseData.map((c) => c.flagged)) : 1;
  const clauseBars = clauseData.map((c) => ({
    label: c.label,
    value: c.flagged,
    widthPercent: `${(c.flagged / maxClause) * 100}%`
  }));

  const clauseTable = clauseData.map((c) => ({
    label: c.label,
    flagged: c.flagged,
    critical: c.critical,
    critStyle:
      c.critical > 0
        ? pillStyle(riskMeta.critical.soft, riskMeta.critical.text)
        : { color: '#94A3B8', fontSize: '11px', fontWeight: 600 }
  }));

  return (
    <div className="space-y-6">
      {/* 1. Risk Concentration Analytics */}
      <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 mb-5.5">
          <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
            Risk concentration breakdown
          </div>
          <div className="flex bg-[#F1F5F9] p-0.75 rounded gap-0.5 self-stretch sm:self-auto">
            {rtabs.map((t) => {
              const active = riskTab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => onSetRiskTab(t.k)}
                  className={`flex-1 sm:flex-none text-xs font-semibold px-3 py-1.5 rounded transition-all cursor-pointer border-0 ${
                    active ? 'bg-white text-[#0F172A] shadow-sm' : 'bg-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Breakdown bar charts list */}
        <div className="flex flex-col gap-4">
          {breakdownBars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs font-semibold text-[#334155] mb-1.5">
                <span>{b.label}</span>
                <span className="text-[#64748B] font-mono font-medium">{b.meta}</span>
              </div>
              <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: b.widthPercent, background: b.barColor }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Flagged Clause Severity & Types list */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.6fr] gap-4">
        {/* Clause Distribution Bar Chart */}
        <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
          <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-5">
            Flagged clauses by type
          </div>
          <div className="flex flex-col gap-4">
            {clauseBars.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-xs font-semibold text-[#334155] mb-1.5">
                  <span>{b.label}</span>
                  <span className="text-[#64748B] font-mono font-medium">{b.value} flags</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: b.widthPercent }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Severity Table */}
        <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
          <div className="p-3.5 px-5 border-b border-[#E2E8F0] font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
            Clause severity breakdown
          </div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[#64748B] text-[10.5px] tracking-[0.08em] uppercase border-b border-[#E2E8F0]">
                <th className="p-2.5 px-5 font-semibold">Clause Type</th>
                <th className="p-2.5 px-5 font-semibold text-center">Total Flagged</th>
                <th className="p-2.5 px-5 font-semibold text-right">Critical Risk</th>
              </tr>
            </thead>
            <tbody>
              {clauseTable.map((r) => (
                <tr key={r.label} className="border-t border-[#F1F5F9] first:border-t-0 hover:bg-slate-50/50">
                  <td className="p-2.5 px-5 font-semibold text-[#334155]">{r.label}</td>
                  <td className="p-2.5 px-5 text-center text-[#475569] font-mono">{r.flagged}</td>
                  <td className="p-2.5 px-5 text-right">
                    <span style={r.critStyle}>{r.critical} critical</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
