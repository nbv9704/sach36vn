import { formatMoney } from '../../lib/match-utils';

export function CurrencyIcon({ className = 'h-4 w-4' }) {
  return <img src="/currency.png" alt="Currency" className={`shrink-0 object-contain ${className}`} />;
}

export function CurrencyAmount({ value, className = 'font-mono font-black text-white', iconClassName = 'h-4 w-4' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <CurrencyIcon className={iconClassName} />
      <span>{formatMoney(value)}</span>
    </span>
  );
}
