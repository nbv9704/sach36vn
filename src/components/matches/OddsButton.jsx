export function OddsButton({ odd, compact = false, muted = false, onSelect, selected = false, quickBetSuccess = false }) {
  const highlighted = selected || quickBetSuccess;
  const defaultClass = muted ? 'bg-[#343541] hover:bg-[#424552] disabled:opacity-40' : 'bg-[#1a1c24] hover:bg-[#22252e] disabled:opacity-40';

  return (
    <button
      type="button"
      disabled={odd.blocked || quickBetSuccess}
      onClick={onSelect}
      className={`flex min-h-10 w-full min-w-0 items-center justify-between gap-3 rounded px-3 py-2 text-left transition-all duration-300 active:scale-[0.99] disabled:cursor-not-allowed ${highlighted ? 'scale-[0.98] bg-[#ffd200] text-black shadow-[0_0_0_1px_rgba(255,210,0,0.25)]' : defaultClass
      } ${compact ? 'text-xs' : 'text-sm'}`}
    >
      <span className={`min-w-0 flex-1 truncate font-medium ${highlighted ? 'text-black' : muted ? 'text-[#8f93a1]' : 'text-[#ffffff]'}`}>{odd.outcomeName}</span>
      <span className={`flex shrink-0 items-center gap-1 font-mono font-bold ${highlighted ? 'text-black' : muted ? 'text-white' : 'text-[#ffd200]'}`}>
        {quickBetSuccess && <span className="text-sm leading-none">✓</span>}
        {odd.odds}
      </span>
    </button>
  );
}
