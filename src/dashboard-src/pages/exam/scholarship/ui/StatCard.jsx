/**
 * Stat card in the WiseDashboard style — white card, tinted icon square,
 * bold navy value.
 */
export default function StatCard({ icon: Icon, label, value, sub, tone = "bg-[#eef2f6] text-[#002856]" }) {
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}
      >
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div className="min-w-0">
        <p className="text-[22px] font-bold text-[#163B72] leading-none">{value ?? "—"}</p>
        <p className="text-xs font-medium text-slate-400 mt-1 truncate">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
