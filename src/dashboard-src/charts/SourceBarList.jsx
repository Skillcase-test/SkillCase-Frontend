import { adjustColorOpacity } from "../utils/Utils";

const COLORS = [
  "#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#f97316",
];

function barGradient(color) {
  return `linear-gradient(90deg, ${color} 0%, ${adjustColorOpacity(color, 0.55)} 100%)`;
}

// Horizontal ranked bars - used for Conversion by Source.
export function SourceBarList({ rows = [], valueKey = "conversion_rate_pct", suffix = "%" }) {
  if (!rows.length) return null;
  const maxValue = Math.max(1, ...rows.map((r) => r[valueKey] || 0));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.source} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs font-semibold text-slate-600">
            {row.source}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, ((row[valueKey] || 0) / maxValue) * 100)}%`,
                background: barGradient(COLORS[i % COLORS.length]),
              }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-xs font-bold tabular-nums text-slate-700">
            {row[valueKey]}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SourceBarList;
