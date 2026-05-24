export function TeamLogo({ name }) {
  const initials = String(name || 'T')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a2e38] text-[10px] font-black text-[#ffd200] ring-1 ring-white/5">
      {initials || 'T'}
    </div>
  );
}
