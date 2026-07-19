const statusItems = [
  { label: 'No risk', className: 'border-green-400 bg-green-50' },
  { label: 'Risk', className: 'border-red-300 bg-red-50' },
  { label: 'Not evaluated', className: 'border-amber-300 bg-amber-50' },
];

const relationshipItems = [
  { label: 'REF', className: 'border-legal-meta bg-white' },
  { label: 'OVERRIDES', className: 'border-accent bg-white' },
  { label: 'CONFLICT', className: 'border-risk-critical bg-redline-removeBg' },
  { label: 'CIRCULAR', className: 'border-legal-focus bg-white' },
];

export function GraphLegend() {
  return (
    <aside aria-label="Dependency graph legend" className="pointer-events-none absolute bottom-4 right-4 z-10 max-w-[calc(100%-2rem)] border border-legal-border bg-white/95 p-3 shadow-sm">
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {statusItems.map((item) => <LegendItem key={item.label} {...item} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 border-t border-legal-border pt-2">
        {relationshipItems.map((item) => <LegendItem key={item.label} {...item} />)}
      </div>
    </aside>
  );
}

function LegendItem({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-legal-meta">
      <span className={`h-2.5 w-2.5 border ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}
