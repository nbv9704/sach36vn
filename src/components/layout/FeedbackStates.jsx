import { AlertTriangle, Bot } from 'lucide-react';

export function PageShell({ children }) {
  return <div className="space-y-8">{children}</div>;
}

export function LoadingState() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="h-44 rounded-md bg-[#22252e] skeleton-shimmer" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <section className="rounded-md border border-[#ef4444]/30 bg-[#22252e] p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 text-[#ef4444]" size={22} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Match feed failed</h2>
          <p className="mt-2 text-sm text-[#8a8e99]">{message}</p>
          <button type="button" onClick={onRetry} className="mt-4 rounded bg-[#ffd200] px-4 py-2 text-xs font-black uppercase text-black">
            Retry
          </button>
        </div>
      </div>
    </section>
  );
}

export function EmptyMatches({ title = 'No matches available' }) {
  return (
    <section className="rounded-md bg-[#22252e] p-8 text-center">
      <Bot className="mx-auto text-[#8a8e99]" size={34} />
      <h2 className="mt-4 text-sm font-black uppercase tracking-wide text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#8a8e99]">
        The backend is connected, but this feed currently has no events for the selected view.
      </p>
    </section>
  );
}
