
interface RoleLandingProps {
  onSelectRole: (role: 'admin' | 'compliance') => void;
  accentColor: string;
}

export default function RoleLanding({ onSelectRole, accentColor }: RoleLandingProps) {
  const roleTiles = [
    {
      key: 'admin' as const,
      tag: 'Configure',
      name: 'Admin',
      desc: 'Playbooks, jurisdiction rules, users, system monitoring, and the audit trail.',
      cta: 'Enter workspace →',
      disabled: false,
      tagColor: accentColor,
      hoverClass: 'hover:border-accent hover:-translate-y-0.5',
      style: { border: '1px solid #334155' }
    },
    {
      key: 'compliance' as const,
      tag: 'Monitor',
      name: 'Compliance Officer',
      desc: 'Aggregate risk posture, analytics, and PDF reporting. No individual contract review.',
      cta: 'Enter workspace →',
      disabled: false,
      tagColor: accentColor === '#8B2635' ? '#8B2635' : '#C9A24B',
      hoverClass: 'hover:border-[#C9A24B] hover:-translate-y-0.5',
      style: { border: '1px solid #334155' }
    },
    {
      key: 'reviewer' as const,
      tag: 'Separate',
      name: 'Legal Reviewer',
      desc: 'Clause viewer, redlines and comparison — a different workspace, out of this build.',
      cta: 'Managed separately',
      disabled: true,
      tagColor: '#475569',
      hoverClass: 'opacity-55 cursor-not-allowed',
      style: { border: '1px dashed #334155', background: '#111827' }
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-[#0F172A] bg-[radial-gradient(circle_at_50%_0%,_#1E293B_0%,_#0F172A_60%)]">
      <div className="text-center mb-11 animate-cl-rise">
        <div className="font-mono text-xs tracking-[0.34em] text-accent uppercase mb-4">
          Contract<span className="text-[#94A3B8]">Lens</span>
        </div>
        <h1 className="font-serif font-normal text-[44px] leading-[1.1] text-[#F8FAFC] mb-3">
          AI Contract Review, <span className="italic text-accent">governed.</span>
        </h1>
        <p className="text-[#94A3B8] text-[15px] max-w-[440px] mx-auto leading-relaxed">
          Choose a workspace. Access is scoped to your role — you only ever see what your role governs.
        </p>
      </div>

      <div className="flex gap-5 flex-wrap justify-center max-w-[760px]">
        {roleTiles.map((t) => (
          <button
            key={t.key}
            onClick={() => !t.disabled && onSelectRole(t.key as 'admin' | 'compliance')}
            disabled={t.disabled}
            className={`w-[230px] text-left p-6 rounded-md bg-[#1E293B] transition-all duration-200 ${t.hoverClass}`}
            style={t.style}
          >
            <div
              className="font-mono text-[11px] tracking-[0.2em] uppercase mb-3.5"
              style={{ color: t.tagColor }}
            >
              {t.tag}
            </div>
            <div className="font-serif text-2xl text-[#F8FAFC] mb-2">{t.name}</div>
            <div className="text-sm text-[#94A3B8] line-clamp-3 leading-relaxed">{t.desc}</div>
            <div
              className="mt-[18px] text-xs font-semibold"
              style={{ color: t.disabled ? '#475569' : t.tagColor }}
            >
              {t.cta}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 font-mono text-[11px] text-[#475569] tracking-[0.06em]">
        DEMO • RUNNING ON MOCK DATA • NO LIVE BACKEND
      </div>
    </div>
  );
}
