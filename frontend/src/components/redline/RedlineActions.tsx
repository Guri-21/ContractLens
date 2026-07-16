import { Check, X, Edit2 } from 'lucide-react';

interface RedlineActionsProps {
  onAccept: () => void;
  onReject: () => void;
  onModify?: () => void;
  disabled?: boolean;
}

export default function RedlineActions({
  onAccept,
  onReject,
  onModify,
  disabled = false
}: RedlineActionsProps) {
  return (
    <div className="flex gap-2.5 justify-end mt-4 select-none">
      <button
        onClick={onReject}
        disabled={disabled}
        className="bg-transparent hover:bg-red-50 text-[#64748B] hover:text-red-700 text-xs font-semibold px-3.5 py-2 rounded cursor-pointer border border-[#E2E8F0] hover:border-red-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" /> Reject
      </button>
      
      {onModify && (
        <button
          onClick={onModify}
          disabled={disabled}
          className="bg-transparent hover:bg-slate-50 text-[#334155] text-xs font-semibold px-3.5 py-2 rounded cursor-pointer border border-[#E2E8F0] transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <Edit2 className="w-3.5 h-3.5" /> Modify
        </button>
      )}

      <button
        onClick={onAccept}
        disabled={disabled}
        className="bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold px-4 py-2 rounded cursor-pointer border-0 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
      >
        <Check className="w-3.5 h-3.5" /> Accept Suggestion
      </button>
    </div>
  );
}
