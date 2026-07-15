
interface RedlineViewerProps {
  originalText: string;
  suggestedText: string;
}

export default function RedlineViewer({ originalText, suggestedText }: RedlineViewerProps) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
        AI Redline Comparison
      </div>
      
      <div className="p-4 space-y-4 text-xs md:text-sm leading-relaxed">
        {/* Deletion / Original */}
        <div className="bg-[#FFF5F5] border border-[#FEE2E2] rounded-md p-3.5 relative">
          <span className="absolute right-3.5 top-2.5 bg-[#FCA5A5]/30 text-[#991B1B] text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded select-none">
            Original (To Remove)
          </span>
          <p className="line-through text-[#991B1B]/80 font-serif pr-20 pt-1">
            {originalText}
          </p>
        </div>

        {/* Addition / Suggested */}
        <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-md p-3.5 relative animate-cl-fade">
          <span className="absolute right-3.5 top-2.5 bg-[#86EFAC]/30 text-[#166534] text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded select-none">
            Suggested (To Insert)
          </span>
          <p className="text-[#166534] font-medium font-serif pr-20 pt-1">
            {suggestedText}
          </p>
        </div>
      </div>
    </div>
  );
}
