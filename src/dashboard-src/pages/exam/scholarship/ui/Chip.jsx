/**
 * Small status/type pill used across the scholarship admin.
 * `cls` is a tailwind class string controlling the colors.
 */
export default function Chip({ children, cls = "bg-slate-100 text-slate-600 border-slate-200" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${cls}`}
    >
      {children}
    </span>
  );
}
