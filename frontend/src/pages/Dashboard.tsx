import {
  Contract,
  TrendRecord,
  DeptRecord,
  CountryRecord,
  ClauseRecord,
  ClauseTypeRiskRecord,
  riskMeta,
  levelFor
} from '../mock/data';

interface DashboardProps {
  contracts: Contract[];
  globalRisks?: any[];
  riskTab: 'dept' | 'country' | 'clause';
  onSetRiskTab: (tab: 'dept' | 'country' | 'clause') => void;
  activeNav: string;
  onOpenExportModal: () => void;
}

export default function Dashboard({
  contracts,
  globalRisks = [],
  riskTab,
  onSetRiskTab,
  activeNav,
  onOpenExportModal
}: DashboardProps) {
  const normalizedRisks = globalRisks.map((risk) => ({
    ...risk,
    riskLevel: risk.riskLevel || risk.risk_level || 'low',
    clauseType: risk.clauseType || risk.clause_type || 'General',
    status: risk.status || 'evaluated',
  }));

  // Dynamic calculations based on contracts list
  const scored = contracts.filter((c) => c.level && c.score !== null) as (Contract & { score: number; level: string })[];
  const reviewed = contracts.filter((c) => c.status === 'reviewed').length;
  const pending = contracts.filter((c) => c.status === 'queued' || c.status === 'processing').length;
  const highRisk = scored.filter((c) => c.level === 'high' || c.level === 'critical').length;
  const avg = scored.length > 0 ? Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length) : 0;

  // Dynamically compute aggregated data
  const deptMap: Record<string, { count: number, scoredCount: number, totalScore: number }> = {};
  const countryMap: Record<string, { count: number, scoredCount: number, totalScore: number }> = {};
  contracts.forEach(c => {
    if (!deptMap[c.dept]) deptMap[c.dept] = { count: 0, scoredCount: 0, totalScore: 0 };
    deptMap[c.dept].count += 1;
    if (c.score !== null) {
      deptMap[c.dept].scoredCount += 1;
      deptMap[c.dept].totalScore += c.score;
    }

    if (!countryMap[c.country]) countryMap[c.country] = { count: 0, scoredCount: 0, totalScore: 0 };
    countryMap[c.country].count += 1;
    if (c.score !== null) {
      countryMap[c.country].scoredCount += 1;
      countryMap[c.country].totalScore += c.score;
    }
  });

  const deptData: DeptRecord[] = Object.keys(deptMap).map(k => ({
    label: k,
    contracts: deptMap[k].count,
    avgRisk: deptMap[k].scoredCount > 0 ? Math.round(deptMap[k].totalScore / deptMap[k].scoredCount) : 0
  })).sort((a, b) => b.contracts - a.contracts);

  const countryData: CountryRecord[] = Object.keys(countryMap).map(k => ({
    label: k,
    contracts: countryMap[k].count,
    avgRisk: countryMap[k].scoredCount > 0 ? Math.round(countryMap[k].totalScore / countryMap[k].scoredCount) : 0
  })).sort((a, b) => b.contracts - a.contracts);

  const trendMap: Record<string, { count: number, totalScore: number, order: number }> = {};
  scored.forEach(c => {
    const date = new Date(c.iso);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!trendMap[key]) trendMap[key] = { count: 0, totalScore: 0, order: date.getFullYear() * 12 + date.getMonth() };
    trendMap[key].count += 1;
    trendMap[key].totalScore += c.score;
  });
  const trendData: TrendRecord[] = Object.keys(trendMap).sort((a, b) => trendMap[a].order - trendMap[b].order).slice(-8).map(k => ({
    m: new Date(`${k}-01T00:00:00`).toLocaleString('en-US', { month: 'short' }),
    v: Math.round(trendMap[k].totalScore / trendMap[k].count)
  }));
  if (trendData.length === 0) {
    trendData.push({ m: 'Current', v: 0 });
    trendData.unshift({ m: 'Prev', v: 0 });
  } else if (trendData.length === 1) {
    trendData.unshift({ m: 'Prev', v: trendData[0].v });
  }

  const clauseMap: Record<string, { flagged: number, critical: number, severityTotal: number }> = {};
  const severityWeights: Record<string, number> = { low: 24, medium: 48, high: 72, critical: 94 };
  normalizedRisks.forEach(r => {
    const t = r.clauseType || 'General';
    if (!clauseMap[t]) clauseMap[t] = { flagged: 0, critical: 0, severityTotal: 0 };
    clauseMap[t].flagged += 1;
    clauseMap[t].severityTotal += severityWeights[r.riskLevel] || severityWeights.low;
    if (r.riskLevel === 'critical') clauseMap[t].critical += 1;
  });
  const clauseData: ClauseRecord[] = Object.keys(clauseMap).map(k => ({
    label: k,
    flagged: clauseMap[k].flagged,
    critical: clauseMap[k].critical
  })).sort((a, b) => b.flagged - a.flagged);

  const clauseTypeRisk: ClauseTypeRiskRecord[] = Object.keys(clauseMap).map(k => {
    return {
      label: k,
      avgRisk: Math.round(clauseMap[k].severityTotal / Math.max(1, clauseMap[k].flagged))
    };
  }).sort((a, b) => b.avgRisk - a.avgRisk);

  // Donut chart calculations
  const levels = ['low', 'medium', 'high', 'critical'] as const;
  const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  levels.forEach((l) => {
    counts[l] = scored.filter((c) => c.level === l).length;
  });
  const totalScored = scored.length;
  const C = 2 * Math.PI * 52;
  let accumulatedLength = 0;
  const donut = levels
    .filter((l) => counts[l] > 0)
    .map((l) => {
      const len = totalScored > 0 ? (counts[l] / totalScored) * C : 0;
      const segment = {
        color: riskMeta[l].color,
        dash: `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
        offset: (-accumulatedLength).toFixed(2)
      };
      accumulatedLength += len;
      return segment;
    });

  const riskLegend = levels.map((l) => {
    const count = counts[l];
    const pct = totalScored > 0 ? Math.round((count / totalScored) * 100) : 0;
    return {
      color: riskMeta[l].color,
      label: riskMeta[l].label,
      count,
      pct: `${pct}%`
    };
  });

  // Trend SVG line & area computations
  const n = trendData.length;
  const trendValues = trendData.map((d) => d.v);
  const rawMin = Math.min(...trendValues);
  const rawMax = Math.max(...trendValues);
  const vmin = Math.max(0, Math.floor((rawMin - 8) / 5) * 5);
  const vmax = Math.min(100, Math.ceil((rawMax + 8) / 5) * 5);
  const w = 680, h = 220, pl = 44, pr = 16, pt = 16, pb = 30;
  const px = (i: number) => pl + (i * (w - pl - pr)) / (n - 1);
  const py = (val: number) => pt + ((vmax - val) / (vmax - vmin)) * (h - pt - pb);
  const linePts = trendData.map((d, i) => `${px(i).toFixed(1)},${py(d.v).toFixed(1)}`).join(' ');
  const baseY = h - pb;
  const areaPath =
    `M ${px(0).toFixed(1)},${baseY} ` +
    trendData.map((d, i) => `L ${px(i).toFixed(1)},${py(d.v).toFixed(1)}`).join(' ') +
    ` L ${px(n - 1).toFixed(1)},${baseY} Z`;
  const trendDots = trendData.map((d, i) => ({ cx: px(i).toFixed(1), cy: py(d.v).toFixed(1), label: d.m }));
  const gridStep = Math.max(5, Math.ceil((vmax - vmin) / 4 / 5) * 5);
  const trendGrid = Array.from({ length: 5 }, (_, idx) => vmin + idx * gridStep)
    .filter((val) => val <= vmax)
    .map((val) => ({ y: py(val).toFixed(1), ty: (py(val) + 4).toFixed(1), val }));

  // KPI metadata lists
  const kpis = [
    { label: 'Contracts Reviewed', value: reviewed, color: '#0F172A', caption: `of ${contracts.length} total` },
    { label: 'Pending Review', value: pending, color: '#9C7A3C', caption: 'queued or processing' },
    { label: 'High-Risk Contracts', value: highRisk, color: '#8B2635', caption: 'High or Critical level' },
    { label: 'Average Risk Score', value: avg, color: '#0F172A', caption: 'across scored contracts' }
  ];

  // Helper mapping helper for pill rendering
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

  // Business metrics calculation
  const clientCounts: Record<string, number> = {};
  contracts.forEach((c) => {
    clientCounts[c.client] = (clientCounts[c.client] || 0) + 1;
  });
  const clientArr = Object.entries(clientCounts).sort((a, b) => b[1] - a[1]);
  const maxClient = clientArr.length > 0 ? Math.max(...clientArr.map((e) => e[1])) : 1;
  const clientBars = clientArr.map(([label, value]) => ({
    label,
    value,
    widthPercent: `${(value / maxClient) * 100}%`
  }));

  const maxDeptC = deptData.length > 0 ? Math.max(...deptData.map((d) => d.contracts)) : 1;
  const deptBars = deptData.map((d) => ({
    label: d.label,
    value: d.contracts,
    widthPercent: `${(d.contracts / maxDeptC) * 100}%`
  }));

  const sortedCountries = [...countryData].sort((a, b) => b.contracts - a.contracts);
  const maxCountryC = sortedCountries.length > 0 ? Math.max(...sortedCountries.map((d) => d.contracts)) : 1;
  const countryBars = sortedCountries.map((d) => ({
    label: d.label,
    value: d.contracts,
    widthPercent: `${(d.contracts / maxCountryC) * 100}%`
  }));

  const validRtContracts = contracts.filter((c) => c.rt !== null);
  const avgRt =
    validRtContracts.length > 0
      ? (validRtContracts.reduce((acc, c) => acc + (c.rt || 0), 0) / validRtContracts.length).toFixed(1)
      : '0.0';

  const bizKpis = [
    { label: 'Active Clients', value: Object.keys(clientCounts).length, color: '#0F172A', caption: 'in portfolio' },
    { label: 'Countries', value: countryData.length, color: '#0F172A', caption: 'counterparty jurisdictions' },
    { label: 'Avg Review Time', value: `${avgRt}h`, color: '#9C7A3C', caption: 'per reviewed contract' },
    { label: 'Departments', value: deptData.length, color: '#0F172A', caption: 'submitting contracts' }
  ];

  // High risk list view (Overview page)
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

  // Risk Analytics Breakdown Tabs
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

  const rtabs = [
    { k: 'dept' as const, label: 'Department' },
    { k: 'country' as const, label: 'Country' },
    { k: 'clause' as const, label: 'Clause Type' }
  ];

  // Clause Analytics Charts
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
    <div>
      {/* ==================== 1. COMPLIANCE: OVERVIEW ==================== */}
      {activeNav === 'dashboard' && (
        <div className="animate-cl-rise">
          <div className="mb-6.5">
            <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
              Compliance
            </div>
            <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
              Compliance Overview
            </h1>
            <p className="text-[#64748B] text-sm mt-1.5">
              Aggregate risk posture across the contract portfolio. Individual contract review is handled by reviewers.
            </p>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5 animate-cl-rise">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white border border-[#E2E8F0] rounded p-5">
                <div className="font-mono text-[10.5px] tracking-[0.08em] text-[#64748B] uppercase mb-3">
                  {k.label}
                </div>
                <div className="font-serif text-[38px] leading-none" style={{ color: k.color }}>
                  {k.value}
                </div>
                <div className="text-xs text-[#94A3B8] mt-2">{k.caption}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4 mb-5">
            {/* Risk Distribution Card */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-4">
                Risk distribution
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-[22px]">
                <svg
                  viewBox="0 0 140 140"
                  className="w-[140px] h-[140px] flex-none -rotate-90"
                >
                  <circle cx="70" cy="70" r="52" fill="none" stroke="#F1F5F9" strokeWidth="18"></circle>
                  {donut.map((d, idx) => (
                    <circle
                      key={idx}
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke={d.color}
                      strokeWidth="18"
                      strokeDasharray={d.dash}
                      strokeDashoffset={d.offset}
                    ></circle>
                  ))}
                </svg>
                <div className="flex-1 w-full">
                  {riskLegend.map((l) => (
                    <div key={l.label} className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-b-0">
                      <span className="w-2.5 h-2.5 rounded-[2px] flex-none" style={{ background: l.color }}></span>
                      <span className="flex-1 text-[13px] text-[#334155]">{l.label}</span>
                      <span className="font-semibold text-[#0F172A] text-[13px]">{l.count}</span>
                      <span className="text-xs text-[#94A3B8] w-9.5 text-right">{l.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Average Risk Score Card */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-2">
                Average risk score — trailing 8 months
              </div>
              <div className="relative">
                <svg viewBox="0 0 680 220" className="w-full h-auto">
                  {/* Grid Lines */}
                  {trendGrid.map((g, idx) => (
                    <g key={idx}>
                      <line x1="44" y1={g.y} x2="664" y2={g.y} stroke="#F1F5F9" strokeWidth="1"></line>
                      <text x="34" y={g.ty} textAnchor="end" fontSize="11" fill="#94A3B8" fontFamily="IBM Plex Mono">
                        {g.val}
                      </text>
                    </g>
                  ))}
                  {/* Area fill */}
                  <path d={areaPath} fill="var(--accent)" fillOpacity="0.08"></path>
                  {/* Trend line */}
                  <polyline points={linePts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline>
                  {/* Grid Dots */}
                  {trendDots.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.cx} cy={p.cy} r="3.5" fill="#fff" stroke="var(--accent)" strokeWidth="2"></circle>
                      <text x={p.cx} y="212" textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="IBM Plex Mono">
                        {p.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* Attention list */}
          <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
            <div className="p-3.5 px-5 border-b border-[#E2E8F0] font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
              High-risk contracts requiring attention
            </div>
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
          </div>
        </div>
      )}

      {/* ==================== 2. COMPLIANCE: RISK ANALYTICS ==================== */}
      {activeNav === 'risk' && (
        <div className="animate-cl-rise">
          <div className="mb-6.5">
            <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
              Compliance
            </div>
            <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
              Risk Analytics
            </h1>
            <p className="text-[#64748B] text-sm mt-1.5">
              Distribution, trend, and how risk concentrates across the organization.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4 mb-5">
            {/* Risk Distribution Card */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-4">
                Risk distribution
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-[22px]">
                <svg
                  viewBox="0 0 140 140"
                  className="w-[130px] h-[130px] flex-none -rotate-90"
                >
                  <circle cx="70" cy="70" r="52" fill="none" stroke="#F1F5F9" strokeWidth="18"></circle>
                  {donut.map((d, idx) => (
                    <circle
                      key={idx}
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke={d.color}
                      strokeWidth="18"
                      strokeDasharray={d.dash}
                      strokeDashoffset={d.offset}
                    ></circle>
                  ))}
                </svg>
                <div className="flex-1 w-full">
                  {riskLegend.map((l) => (
                    <div key={l.label} className="flex items-center gap-2.5 py-1.25 border-b border-slate-50 last:border-b-0">
                      <span className="w-2.5 h-2.5 rounded-[2px] flex-none" style={{ background: l.color }}></span>
                      <span className="flex-1 text-[13px] text-[#334155]">{l.label}</span>
                      <span className="font-semibold text-[#0F172A] text-[13px]">{l.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Average Risk Score Trend Card */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-2">
                Average risk score trend
              </div>
              <svg viewBox="0 0 680 220" className="w-full h-auto">
                {trendGrid.map((g, idx) => (
                  <g key={idx}>
                    <line x1="44" y1={g.y} x2="664" y2={g.y} stroke="#F1F5F9" strokeWidth="1"></line>
                    <text x="34" y={g.ty} textAnchor="end" fontSize="11" fill="#94A3B8" fontFamily="IBM Plex Mono">
                      {g.val}
                    </text>
                  </g>
                ))}
                <path d={areaPath} fill="var(--accent)" fillOpacity="0.08"></path>
                <polyline points={linePts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline>
                {trendDots.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.cx} cy={p.cy} r="3.5" fill="#fff" stroke="var(--accent)" strokeWidth="2"></circle>
                    <text x={p.cx} y="212" textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="IBM Plex Mono">
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Breakdown Tabs Card */}
          <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
                Average risk by {riskTab === 'dept' ? 'department' : riskTab === 'country' ? 'country' : 'clause type'}
              </div>
              <div className="flex gap-1 bg-[#F1F5F9] p-[3px] rounded-md">
                {rtabs.map((t) => {
                  const active = riskTab === t.k;
                  return (
                    <button
                      key={t.k}
                      onClick={() => onSetRiskTab(t.k)}
                      className={`text-[12.5px] font-semibold px-3.5 py-1.5 rounded transition-all ${
                        active
                          ? 'bg-white text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.1)]'
                          : 'bg-transparent text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Breakdown Bars */}
            <div className="flex flex-col gap-2">
              {breakdownBars.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl mb-2 opacity-30">📊</div>
                  <div className="text-slate-500 text-sm">No data available for this category yet.</div>
                </div>
              ) : (
                breakdownBars.map((b) => (
                  <div key={b.label} className="flex items-center gap-3.5 py-1.5">
                    <div className="w-[150px] flex-none text-[13px] text-[#334155] text-right font-medium truncate">
                      {b.label}
                    </div>
                    <div className="flex-1 h-5.5 bg-[#F8FAFC] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full rounded-[3px] animate-cl-grow origin-left"
                        style={{
                          width: b.widthPercent,
                          background: b.barColor
                        }}
                      ></div>
                    </div>
                    <div className="w-24 flex-none text-xs text-[#64748B]">
                      {b.meta}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. COMPLIANCE: CLAUSE ANALYTICS ==================== */}
      {activeNav === 'clause' && (
        <div className="animate-cl-rise">
          <div className="mb-6.5">
            <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
              Compliance
            </div>
            <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
              Clause Analytics
            </h1>
            <p className="text-[#64748B] text-sm mt-1.5">
              Which clause types the review engine flags as risky most often.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
            {/* Clause Bars Card */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-4.5">
                Most-flagged clause types
              </div>
              <div className="flex flex-col gap-2">
                {clauseBars.map((c) => (
                  <div key={c.label} className="flex items-center gap-3.5 py-1.5">
                    <div className="w-[150px] flex-none text-[13px] text-[#334155] text-right font-medium truncate">
                      {c.label}
                    </div>
                    <div className="flex-1 h-5 bg-[#F8FAFC] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-[3px] animate-cl-grow origin-left"
                        style={{ width: c.widthPercent }}
                      ></div>
                    </div>
                    <div className="w-8.5 flex-none font-semibold text-[13px] text-[#0F172A]">
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clause Table Detail Card */}
            <div className="bg-white border border-[#E2E8F0] rounded overflow-hidden">
              <div className="p-3.5 px-5 border-b border-[#E2E8F0] font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
                Detail
              </div>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[#64748B] text-[10.5px] tracking-[0.06em] uppercase">
                    <th className="p-2.5 px-4 font-semibold">Clause type</th>
                    <th className="p-2.5 px-4 font-semibold text-right">Flagged</th>
                    <th className="p-2.5 px-4 font-semibold text-right">Critical</th>
                  </tr>
                </thead>
                <tbody>
                  {clauseTable.map((c) => (
                    <tr key={c.label} className="border-t border-[#F1F5F9]">
                      <td className="p-2.5 px-4 text-[#0F172A] font-medium">{c.label}</td>
                      <td className="p-2.5 px-4 text-right text-[#475569]">{c.flagged}</td>
                      <td className="p-2.5 px-4 text-right">
                        {typeof c.critStyle === 'object' && 'background' in c.critStyle ? (
                          <span style={c.critStyle}>{c.critical}</span>
                        ) : (
                          <span style={c.critStyle}>{c.critical}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. COMPLIANCE: BUSINESS ANALYTICS ==================== */}
      {activeNav === 'business' && (
        <div className="animate-cl-rise">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-6.5 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.16em] text-accent-text uppercase mb-2">
                Compliance
              </div>
              <h1 className="font-serif font-normal text-[32px] m-0 text-[#0F172A]">
                Business Analytics
              </h1>
              <p className="text-[#64748B] text-sm mt-1.5">
                Portfolio distribution and operational review metrics.
              </p>
            </div>
            <button
              onClick={onOpenExportModal}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs px-4.5 py-2.5 rounded flex items-center gap-2 cursor-pointer transition-colors"
            >
              📥 Export report (PDF)
            </button>
          </div>

          {/* Business KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
            {bizKpis.map((k) => (
              <div key={k.label} className="bg-white border border-[#E2E8F0] rounded p-4.5 px-5">
                <div className="font-mono text-[10.5px] tracking-[0.08em] text-[#64748B] uppercase mb-3">
                  {k.label}
                </div>
                <div className="font-serif text-[32px] leading-none" style={{ color: k.color }}>
                  {k.value}
                </div>
                <div className="text-xs text-[#94A3B8] mt-2">{k.caption}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Client bars */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-4">
                Contracts by client
              </div>
              <div className="flex flex-col gap-2">
                {clientBars.map((b) => (
                  <div key={b.label} className="flex items-center gap-3 py-1.5">
                    <div className="w-[130px] flex-none text-[12.5px] text-[#334155] text-right font-medium truncate">
                      {b.label}
                    </div>
                    <div className="flex-1 h-[18px] bg-[#F8FAFC] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full bg-[#0F172A] rounded-[3px] animate-cl-grow origin-left"
                        style={{ width: b.widthPercent }}
                      ></div>
                    </div>
                    <div className="w-6 flex-none font-semibold text-[12.5px] text-[#0F172A]">
                      {b.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department bars */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-4">
                Contracts by department
              </div>
              <div className="flex flex-col gap-2">
                {deptBars.map((b) => (
                  <div key={b.label} className="flex items-center gap-3 py-1.5">
                    <div className="w-[130px] flex-none text-[12.5px] text-[#334155] text-right font-medium truncate">
                      {b.label}
                    </div>
                    <div className="flex-1 h-[18px] bg-[#F8FAFC] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-[3px] animate-cl-grow origin-left"
                        style={{ width: b.widthPercent }}
                      ></div>
                    </div>
                    <div className="w-6 flex-none font-semibold text-[12.5px] text-[#0F172A]">
                      {b.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Country bars */}
            <div className="bg-white border border-[#E2E8F0] rounded p-5 px-5.5">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase mb-4">
                Contracts by country
              </div>
              <div className="flex flex-col gap-2">
                {countryBars.map((b) => (
                  <div key={b.label} className="flex items-center gap-3 py-1.5">
                    <div className="w-[110px] flex-none text-[12.5px] text-[#334155] text-right font-medium truncate">
                      {b.label}
                    </div>
                    <div className="flex-1 h-[18px] bg-[#F8FAFC] rounded-[3px] overflow-hidden">
                      <div
                        className="h-full bg-[#475569] rounded-[3px] animate-cl-grow origin-left"
                        style={{ width: b.widthPercent }}
                      ></div>
                    </div>
                    <div className="w-6 flex-none font-semibold text-[12.5px] text-[#0F172A]">
                      {b.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI accuracy placeholder card */}
            <div className="bg-white border border-dashed border-[#CBD5E1] rounded p-5 px-5.5 bg-[repeating-linear-gradient(45deg,#FCFCFD,#FCFCFD_10px,#F8FAFC_10px,#F8FAFC_20px)]">
              <div className="flex justify-between items-center mb-3">
                <div className="font-mono text-[11px] tracking-[0.1em] text-[#64748B] uppercase">
                  AI accuracy
                </div>
                <span className="bg-[#FEF3C7] text-[#92600A] text-[10px] font-bold tracking-[0.06em] px-2 py-0.5 rounded-full">
                  PLACEHOLDER
                </span>
              </div>
              <div className="font-serif text-[44px] text-[#CBD5E1] leading-none">——%</div>
              <div className="text-[12.5px] text-[#64748B] mt-2.5 leading-relaxed">
                No verified accuracy metric is wired up yet. Awaiting a labeled evaluation set from the ML team — this number is intentionally not fabricated.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
