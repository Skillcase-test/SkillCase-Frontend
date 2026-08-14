/**
 * Empty state used across the admin tabs — icon, title, optional sub copy
 * and an optional call-to-action button.
 */
export default function EmptyState({ icon: Icon, title, sub, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8" : "py-14"
      } rounded-xl border border-dashed border-slate-200`}
    >
      {Icon && <Icon className="w-10 h-10 text-[#002856]/20 mb-3" />}
      <p className="font-semibold text-slate-700 text-sm">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 max-w-sm">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
