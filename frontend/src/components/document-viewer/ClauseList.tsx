import { useState } from 'react';
import { Search } from 'lucide-react';
import { ClauseDTO, RiskFindingDTO } from '../../reviewer-workspace/types';
import RiskLevelBadge from '../risk/RiskLevelBadge';

interface ClauseListProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
  selectedClauseId: string | null;
  onSelectClause: (id: string) => void;
}

export default function ClauseList({
  clauses,
  risks,
  selectedClauseId,
  onSelectClause
}: ClauseListProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Map risk level for easy lookup
  const riskMap = new Map<string, RiskFindingDTO>();
  risks.forEach(r => riskMap.set(r.clauseId, r));

  const filteredClauses = clauses.filter(c => {
    const risk = riskMap.get(c.id);
    const matchesSearch = 
      (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
      c.text.toLowerCase().includes(search.toLowerCase());
      
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'risky') return matchesSearch && risk && risk.riskLevel !== 'low';
    if (filterType === 'clean') return matchesSearch && (!risk || risk.riskLevel === 'low');
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0] w-80 flex-none select-none">
      <div className="p-4 border-b border-[#E2E8F0] space-y-3 bg-[#F8FAFC]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search clauses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded bg-white outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-1 bg-[#F1F5F9] p-0.5 rounded-md text-[11px] font-semibold text-[#64748B]">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1 rounded transition-colors border-0 ${
              filterType === 'all' ? 'bg-white text-[#0F172A] shadow-sm' : 'bg-transparent hover:text-[#0F172A]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('risky')}
            className={`flex-1 py-1 rounded transition-colors border-0 ${
              filterType === 'risky' ? 'bg-white text-[#0F172A] shadow-sm' : 'bg-transparent hover:text-[#0F172A]'
            }`}
          >
            Risky
          </button>
          <button
            onClick={() => setFilterType('clean')}
            className={`flex-1 py-1 rounded transition-colors border-0 ${
              filterType === 'clean' ? 'bg-white text-[#0F172A] shadow-sm' : 'bg-transparent hover:text-[#0F172A]'
            }`}
          >
            Clean
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] p-2 space-y-1">
        {filteredClauses.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#94A3B8] italic">
            No matching clauses found
          </div>
        ) : (
          filteredClauses.map((c) => {
            const risk = riskMap.get(c.id);
            const isSelected = selectedClauseId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => onSelectClause(c.id)}
                className={`p-3 rounded-md transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-accent-soft border border-accent/30' 
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5 gap-2">
                  <span className="font-semibold text-xs text-[#0F172A] truncate">
                    {c.title || c.clauseType || `Section ${c.sectionNumber || 'N/A'}`}
                  </span>
                  {risk && risk.riskLevel && (
                    <RiskLevelBadge level={risk.riskLevel.toLowerCase() as any} className="scale-90 origin-right" />
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                  {c.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
