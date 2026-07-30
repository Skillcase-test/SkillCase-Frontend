const STYLES = {
  activated: ["border-emerald-200 bg-emerald-50 text-emerald-700", "eMandate Active"],
  cancelled: ["border-rose-200 bg-rose-50 text-rose-700", "eMandate Cancelled"],
  expired: ["border-amber-200 bg-amber-50 text-amber-700", "eMandate Expired"],
};

export function MandateBadge({ status }) {
  const style = STYLES[status];
  if (!style) return null;
  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style[0]}`}
    >
      {style[1]}
    </span>
  );
}
