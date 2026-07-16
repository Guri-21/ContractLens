const statusItems = [
  { label: 'No risk', className: 'border-emerald-300 bg-emerald-100' },
  { label: 'Risk', className: 'border-red-300 bg-red-100' },
  { label: 'Not evaluated', className: 'border-amber-300 bg-amber-100' },
];

const relationshipItems = [
  { label: 'REF', className: 'border-slate-400 bg-slate-100' },
  { label: 'OVERRIDES', className: 'border-amber-500 bg-amber-100' },
  { label: 'CONFLICT', className: 'border-red-500 bg-red-100' },
  { label: 'CIRCULAR', className: 'border-violet-500 bg-violet-100' },
];

export function GraphLegend() {
  return (
    <aside aria-label="Dependency graph legend" className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] border border-legal-border bg-white/95 p-3 shadow-sm">
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
