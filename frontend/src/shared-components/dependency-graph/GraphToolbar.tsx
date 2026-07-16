import { Maximize2, Minimize2, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';

import type { DocumentLane, GraphFilters, RelationshipType } from './graphModel';

type GraphToolbarProps = {
  filters: GraphFilters;
  lanes: readonly DocumentLane[];
  activeFilterCount: number;
  hasFocus: boolean;
  isFullscreen: boolean;
  onFiltersChange: (filters: GraphFilters) => void;
  onFitGraph: () => void;
  onClearFocus: () => void;
  onToggleFullscreen: () => void;
};

const relationshipOptions: Array<{ value: RelationshipType; label: string }> = [
  { value: 'reference', label: 'Reference' },
  { value: 'override', label: 'Overrides' },
  { value: 'conflict', label: 'Conflict' },
  { value: 'unresolved', label: 'Unresolved' },
];

const statusOptions = [
  { value: 'safe', label: 'No risk' },
  { value: 'risk', label: 'Risk' },
  { value: 'not_evaluated', label: 'Not evaluated' },
] as const;

export function GraphToolbar({
  filters,
  lanes,
  activeFilterCount,
  hasFocus,
  isFullscreen,
  onFiltersChange,
  onFitGraph,
  onClearFocus,
  onToggleFullscreen,
}: GraphToolbarProps) {
  const documentId = filters.documentIds?.[0] ?? '';
  const status = filters.statuses?.[0] ?? '';
  const relationshipType = filters.relationshipTypes?.[0] ?? '';
  const clearFilters = () => onFiltersChange({});

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-legal-border bg-legal-surface p-3">
      <label className="relative min-w-[12rem] flex-1 sm:flex-none">
        <span className="sr-only">Search clauses</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-legal-meta" aria-hidden="true" />
        <input
          type="search"
          value={filters.searchQuery ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, searchQuery: event.target.value })}
          placeholder="Search clauses"
          className="h-9 w-full border border-legal-border bg-white pl-8 pr-2 text-sm text-legal-text outline-none transition-colors placeholder:text-legal-meta focus:border-legal-focus"
        />
      </label>

      <label className="sr-only" htmlFor="graph-document-filter">Document</label>
      <select
        id="graph-document-filter"
        value={documentId}
        onChange={(event) => onFiltersChange({ ...filters, documentIds: event.target.value ? [event.target.value] : undefined })}
        className="h-9 min-w-[10rem] border border-legal-border bg-white px-2 font-mono text-[11px] text-legal-text outline-none focus:border-legal-focus"
      >
        <option value="">All documents</option>
        {lanes.map((lane) => <option key={lane.documentId} value={lane.documentId}>{lane.documentType}: {lane.documentName}</option>)}
      </select>

      <label className="sr-only" htmlFor="graph-status-filter">Risk status</label>
      <select
        id="graph-status-filter"
        value={status}
        onChange={(event) => onFiltersChange({ ...filters, statuses: event.target.value ? [event.target.value as typeof statusOptions[number]['value']] : undefined })}
        className="h-9 min-w-[8.5rem] border border-legal-border bg-white px-2 font-mono text-[11px] text-legal-text outline-none focus:border-legal-focus"
      >
        <option value="">All statuses</option>
        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      <label className="sr-only" htmlFor="graph-relationship-filter">Relationship type</label>
      <select
        id="graph-relationship-filter"
        value={relationshipType}
        onChange={(event) => onFiltersChange({ ...filters, relationshipTypes: event.target.value ? [event.target.value as RelationshipType] : undefined })}
        className="h-9 min-w-[9.5rem] border border-legal-border bg-white px-2 font-mono text-[11px] text-legal-text outline-none focus:border-legal-focus"
      >
        <option value="">All relationships</option>
        {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      {activeFilterCount > 0 && (
        <button type="button" onClick={clearFilters} className="h-9 border border-legal-border px-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-legal-meta transition-colors hover:border-legal-focus hover:text-legal-text">
          Clear filters ({activeFilterCount})
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        <ToolbarIconButton label="Fit graph" onClick={onFitGraph}>
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Clear focus" onClick={onClearFocus} disabled={!hasFocus}>
          <X className="h-4 w-4" aria-hidden="true" />
        </ToolbarIconButton>
        <ToolbarIconButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onToggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
        </ToolbarIconButton>
      </div>
    </div>
  );
}

function ToolbarIconButton({ children, disabled = false, label, onClick }: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center border border-legal-border bg-white text-legal-meta transition-colors hover:border-legal-focus hover:text-legal-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
