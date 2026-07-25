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

// Funnel bars (gradient-filled, same treatment as the line/bar charts) with
// a stage table underneath. Bars are centered and shrink with the leads
// count - kept as separate rows (not a single tapered shape) so long stage
// names never fight for space against the bar width.
export function FunnelChart({ stages = [] }) {
  if (!stages.length) return null;
  const maxLeads = Math.max(1, ...stages.map((s) => s.leads));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        {stages.map((s, i) => {
          const widthPct = Math.max(12, (s.leads / maxLeads) * 100);
          const color = COLORS[i % COLORS.length];
          return (
            <div key={s.stage} className="flex flex-col items-start">
              <div
                className="flex h-11 items-center rounded-lg text-xs font-bold text-white shadow-sm transition-all"
                style={{ width: `${widthPct}%`, background: barGradient(color) }}
              >
                <span className="truncate px-3">
                  {s.stage} &middot; {number(s.leads)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Stage
              </th>
              <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Leads
              </th>
              <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Conv %
              </th>
              <th className="py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Drop-off
              </th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.stage} className="border-b border-slate-50">
                <td className="truncate py-2 pr-2 font-medium text-slate-700" title={s.stage}>
                  {s.stage}
                </td>
                <td className="py-2 pr-2 tabular-nums text-slate-600">{number(s.leads)}</td>
                <td className="py-2 pr-2 tabular-nums text-slate-600">{s.conversion_pct}%</td>
                <td
                  className={`py-2 tabular-nums ${s.drop_off_pct > 30 ? "font-semibold text-rose-600" : "text-slate-600"}`}
                >
                  {s.drop_off_pct ? `-${s.drop_off_pct}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FunnelChart;
