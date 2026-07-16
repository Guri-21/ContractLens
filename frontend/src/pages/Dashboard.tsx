import {
  Contract,
  TrendRecord,
  DeptRecord,
  CountryRecord,
  ClauseRecord,
  ClauseTypeRiskRecord
} from '../mock/data';
import RiskSummary from '../components/dashboard/RiskSummary';
import RecentDocuments from '../components/dashboard/RecentDocuments';
import ClauseDistribution from '../components/dashboard/ClauseDistribution';

interface DashboardProps {
  contracts: Contract[];
  trendData: TrendRecord[];
  deptData: DeptRecord[];
  countryData: CountryRecord[];
  clauseData: ClauseRecord[];
  clauseTypeRisk: ClauseTypeRiskRecord[];
  riskTab: 'dept' | 'country' | 'clause';
  onSetRiskTab: (tab: 'dept' | 'country' | 'clause') => void;
  activeNav: string;
  onOpenExportModal: () => void;
}

export default function Dashboard({
  contracts,
  trendData,
  deptData,
  countryData,
  clauseData,
  clauseTypeRisk,
  riskTab,
  onSetRiskTab,
  activeNav,
  onOpenExportModal
}: DashboardProps) {

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

  return (
    <div className="space-y-6">
      {/* ==================== 1. COMPLIANCE: OVERVIEW ==================== */}
      {activeNav === 'dashboard' && (
        <div className="animate-cl-rise space-y-6">
          <div>
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

          {/* Modularized Risk Summary (KPIs, Donut, Line Chart) */}
          <RiskSummary contracts={contracts} trendData={trendData} />

          {/* Modularized High-Risk Attention list */}
          <RecentDocuments contracts={contracts} />
        </div>
      )}

      {/* ==================== 2. COMPLIANCE: RISK ANALYTICS ==================== */}
      {activeNav === 'risk' && (
        <div className="animate-cl-rise space-y-6">
          <div>
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

          {/* Modularized Clause Distribution / Risk Tab breakdown */}
          <ClauseDistribution 
            deptData={deptData} 
            countryData={countryData} 
            clauseData={clauseData} 
            clauseTypeRisk={clauseTypeRisk} 
            riskTab={riskTab} 
            onSetRiskTab={onSetRiskTab} 
          />
        </div>
      )}

      {/* ==================== 3. COMPLIANCE: CLAUSE ANALYTICS ==================== */}
      {activeNav === 'clause' && (
        <div className="animate-cl-rise space-y-6">
          <div>
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

          <ClauseDistribution 
            deptData={deptData} 
            countryData={countryData} 
            clauseData={clauseData} 
            clauseTypeRisk={clauseTypeRisk} 
            riskTab={riskTab} 
            onSetRiskTab={onSetRiskTab} 
          />
        </div>
      )}

      {/* ==================== 4. COMPLIANCE: BUSINESS ANALYTICS ==================== */}
      {activeNav === 'business' && (
        <div className="animate-cl-rise space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
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
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs px-4.5 py-2.5 rounded flex items-center gap-2 cursor-pointer transition-colors border-0"
            >
              📥 Export report (PDF)
            </button>
          </div>

          {/* Business KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
