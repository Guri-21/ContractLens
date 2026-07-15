import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { AdvisorAnalyticsResponse } from '../../api/adminAnalytics';

const COLORS = {
  low: '#10B981', // emerald-500
  medium: '#F59E0B', // amber-500
  high: '#EF4444', // red-500
  critical: '#7F1D1D', // red-900
  not_evaluated: '#94A3B8' // slate-400
};

type DistributionData = AdvisorAnalyticsResponse['riskDistribution'];
type ClauseData = AdvisorAnalyticsResponse['clauseTypeRisk'];
type TrendData = AdvisorAnalyticsResponse['trend'];

export const RiskDistributionDonut = ({ data }: { data: DistributionData }) => {
  const chartData = data.filter(d => d.count > 0);
  
  if (chartData.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No risk data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="level"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.level as keyof typeof COLORS] || COLORS.not_evaluated} />
          ))}
        </Pie>
        <RechartsTooltip formatter={(value, name) => [value ?? 0, String(name).toUpperCase()]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const ClauseTypeBarChart = ({ data }: { data: ClauseData }) => {
  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No clause data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="clauseType" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <RechartsTooltip cursor={{ fill: '#F1F5F9' }} />
        <Legend />
        <Bar dataKey="low" stackId="a" fill={COLORS.low} name="Low" />
        <Bar dataKey="medium" stackId="a" fill={COLORS.medium} name="Medium" />
        <Bar dataKey="high" stackId="a" fill={COLORS.high} name="High" />
        <Bar dataKey="critical" stackId="a" fill={COLORS.critical} name="Critical" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const RiskTrendLineChart = ({ data }: { data: TrendData }) => {
  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No trend data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <RechartsTooltip />
        <Legend />
        <Line type="monotone" dataKey="risks" stroke="#3B82F6" strokeWidth={2} name="Total Risks" dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="high" stroke={COLORS.high} strokeWidth={2} name="High Risks" dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const LegalRiskFingerprint = ({ data }: { data: ClauseData }) => {
  // Map clauseTypeRisk into radar format
  const chartData = data.map(d => ({
    subject: d.clauseType.toUpperCase(),
    riskScore: d.low * 1 + d.medium * 2 + d.high * 3 + d.critical * 5,
    fullMark: 20
  }));

  if (chartData.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No fingerprint available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
        <PolarGrid stroke="#E2E8F0" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
        <Radar name="Risk Score" dataKey="riskScore" stroke="#8B2635" fill="#8B2635" fillOpacity={0.2} />
        <RechartsTooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
};
