import { HiSignal } from 'react-icons/hi2';

export function LiveSignal({ size = 14, className = '' }) {
  return <HiSignal size={size} className={`shrink-0 text-[#ef4444] pulse-live ${className}`} />;
}
