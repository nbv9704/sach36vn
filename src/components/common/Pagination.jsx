import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[#22252e] text-[#8a8e99] disabled:opacity-50 hover:bg-[#2a2e38] hover:text-white"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-xs font-bold text-[#8a8e99] uppercase tracking-wide">
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[#22252e] text-[#8a8e99] disabled:opacity-50 hover:bg-[#2a2e38] hover:text-white"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
