import { riskMeta } from '../../mock/data';

interface RiskLevelBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export default function RiskLevelBadge({ level, className = '' }: RiskLevelBadgeProps) {
  const meta = riskMeta[level] || riskMeta.low;

  return (
    <span
      className={`inline-block font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}
      style={{
        backgroundColor: meta.soft,
        color: meta.text,
        border: `1px solid ${meta.color}20`,
      }}
    >
      ● {meta.label}
    </span>
  );
}
