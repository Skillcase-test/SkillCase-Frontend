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

export function StatCard({ label, value, tone = "slate", subText, onDownload, downloading }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-900"
          : tone === "indigo"
            ? "border-indigo-200 bg-indigo-50 text-indigo-900"
            : tone === "purple"
              ? "border-purple-200 bg-purple-50 text-purple-900"
              : "border-slate-200 bg-white text-slate-900";

  const btnClass =
    tone === "emerald"
      ? "border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-100/50"
      : tone === "amber"
        ? "border-amber-300 text-amber-700 bg-white hover:bg-amber-100/50"
        : tone === "blue"
          ? "border-blue-300 text-blue-700 bg-white hover:bg-blue-100/50"
          : tone === "indigo"
            ? "border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-100/50"
            : tone === "purple"
              ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-100/50"
              : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50";

  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {label}
        </p>
        <p className="mt-2 text-xl font-bold">{value}</p>
        {subText && (
          <p className="mt-1 text-[10px] opacity-75">
            {subText}
          </p>
        )}
      </div>

      {onDownload && (
        <button
          onClick={onDownload}
          disabled={downloading}
          className={`mt-3 flex items-center justify-center gap-1 rounded-lg border py-1 px-2.5 text-[10px] font-semibold shadow-sm transition-colors disabled:opacity-50 ${btnClass}`}
        >
          {downloading ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          <span>{downloading ? "Downloading..." : "Download XLS"}</span>
        </button>
      )}
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
