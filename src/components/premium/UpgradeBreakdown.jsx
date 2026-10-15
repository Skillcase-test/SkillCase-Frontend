const rupees = (paise) => Math.round((paise || 0) / 100);

function shortDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** What a UPI plan upgrade costs: the difference now, then the new price from the renewal date. */
export default function UpgradeBreakdown({ chargePaise, recurringPaise, recurringFrom }) {
  const from = shortDate(recurringFrom);
  return (
    <div className="w-full bg-slate-50 rounded-2xl p-4 flex flex-col gap-2.5 text-xs font-medium text-slate-600">
      <div className="flex justify-between items-baseline gap-3 text-sm text-[#002856] font-bold">
        <span className="min-w-0">Pay now, for the rest of this cycle</span>
        <span className="shrink-0 text-right">₹{rupees(chargePaise)}</span>
      </div>
      <div className="w-full border-t border-slate-200" />
      <div className="flex justify-between items-baseline gap-3">
        <span className="min-w-0">Then every month{from ? ` from ${from}` : ""}</span>
        <span className="shrink-0 text-right text-[#002856] font-semibold">₹{rupees(recurringPaise)}</span>
      </div>
      <p className="text-slate-400 font-normal leading-relaxed">
        One UPI approval covers both. Your renewal date stays the same and you can cancel anytime.
      </p>
    </div>
  );
}
