export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
      <div className="mb-3 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function StatCard({ label, value, tone = "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-900"
          : "border-slate-200 bg-white text-slate-900";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

export function EmptyState({
  message = "No records found for current filters.",
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <p className="text-base font-semibold text-slate-700">
        No data to display
      </p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}
