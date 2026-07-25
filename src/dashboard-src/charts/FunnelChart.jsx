import { adjustColorOpacity } from "../utils/Utils";

const COLORS = [
  "#2563eb", "#3b82f6", "#0ea5e9", "#f59e0b", "#8b5cf6", "#22c55e", "#ec4899",
  "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function number(val) {
  return Number(val || 0).toLocaleString("en-IN");
}

function barGradient(color) {
  return `linear-gradient(90deg, ${color} 0%, ${adjustColorOpacity(color, 0.55)} 100%)`;
}

// Funnel bars (squeezed gradient bars) combined directly into a single
// row layout with Stage, Funnel bar, and tight right-aligned metrics
// (Leads, Conv %, Drop-off) that never overflow or clip.
export function FunnelChart({ stages = [] }) {
  if (!stages.length) return null;
  const maxLeads = Math.max(1, ...stages.map((s) => s.leads));

  return (
    <div className="w-full space-y-1">
      {/* Header Row */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span className="w-32 shrink-0">Stage</span>
        <span className="flex-1 min-w-0">Funnel</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-14 text-right">Leads</span>
          <span className="w-14 text-right">% of Total</span>
          <span className="w-16 text-right">vs Prior</span>
        </div>
      </div>

      {/* Stage Rows */}
      {stages.map((s, i) => {
        const widthPct = Math.max(8, (s.leads / maxLeads) * 100);
        const color = COLORS[i % COLORS.length];
        return (
          <div
            key={s.stage}
            className="flex items-center gap-3 border-b border-slate-50 py-2 last:border-0 text-sm"
          >
            <span
              className="w-32 shrink-0 truncate font-medium text-slate-700"
              title={s.stage}
            >
              {s.stage}
            </span>
            <div className="flex-1 min-w-0 flex items-center">
              <div
                className="h-6 rounded-md transition-all"
                style={{ width: `${widthPct}%`, background: barGradient(color) }}
                title={`${s.stage}: ${number(s.leads)} leads`}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
              <span className="w-14 text-right font-semibold text-slate-700">
                {number(s.leads)}
              </span>
              <span className="w-14 text-right text-slate-600">
                {s.conversion_pct}%
              </span>
              <span
                className={`w-16 text-right ${
                  s.drop_off_pct != null && s.drop_off_pct <= -30
                    ? "font-semibold text-rose-600"
                    : s.drop_off_pct != null && s.drop_off_pct > 0
                      ? "text-emerald-600"
                      : "text-slate-600"
                }`}
              >
                {s.drop_off_pct != null
                  ? `${s.drop_off_pct > 0 ? "+" : ""}${s.drop_off_pct}%`
                  : "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FunnelChart;


