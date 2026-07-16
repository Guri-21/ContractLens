import { Contract, TrendRecord, riskMeta } from '../../mock/data';

interface RiskSummaryProps {
  contracts: Contract[];
  trendData: TrendRecord[];
  accentColor?: string;
}

export default function RiskSummary({ contracts, trendData, accentColor = 'var(--accent)' }: RiskSummaryProps) {
  // KPI Calculations
  const scored = contracts.filter((c) => c.level && c.score !== null) as (Contract & { score: number; level: string })[];
  const reviewed = contracts.filter((c) => c.status === 'reviewed').length;
  const pending = contracts.filter((c) => c.status === 'queued' || c.status === 'processing').length;
  const highRisk = scored.filter((c) => c.level === 'high' || c.level === 'critical').length;
  const avg = scored.length > 0 ? Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length) : 0;

  const kpis = [
    { label: 'Contracts Reviewed', value: reviewed, color: '#0F172A', caption: `of ${contracts.length} total` },
    { label: 'Pending Review', value: pending, color: '#9C7A3C', caption: 'queued or processing' },
    { label: 'High-Risk Contracts', value: highRisk, color: '#8B2635', caption: 'High or Critical level' },
    { label: 'Average Risk Score', value: avg, color: '#0F172A', caption: 'across scored contracts' }
  ];

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
  const vmin = 44, vmax = 66, w = 680, h = 220, pl = 44, pr = 16, pt = 16, pb = 30;
  const px = (i: number) => pl + (i * (w - pl - pr)) / (n - 1);
  const py = (val: number) => pt + ((vmax - val) / (vmax - vmin)) * (h - pt - pb);
  const linePts = trendData.map((d, i) => `${px(i).toFixed(1)},${py(d.v).toFixed(1)}`).join(' ');
  const baseY = h - pb;
  const areaPath =
    `M ${px(0).toFixed(1)},${baseY} ` +
    trendData.map((d, i) => `L ${px(i).toFixed(1)},${py(d.v).toFixed(1)}`).join(' ') +
    ` L ${px(n - 1).toFixed(1)},${baseY} Z`;
  const trendDots = trendData.map((d, i) => ({ cx: px(i).toFixed(1), cy: py(d.v).toFixed(1), label: d.m }));
  const trendGrid = [45, 50, 55, 60, 65].map((val) => ({ y: py(val).toFixed(1), ty: (py(val) + 4).toFixed(1), val }));

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-cl-rise">
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4">
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
              <path d={areaPath} fill={accentColor} fillOpacity="0.08"></path>
              {/* Trend line */}
              <polyline points={linePts} fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline>
              {/* Grid Dots */}
              {trendDots.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.cx} cy={p.cy} r="3.5" fill="#fff" stroke={accentColor} strokeWidth="2"></circle>
                  <text x={p.cx} y="212" textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="IBM Plex Mono">
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
