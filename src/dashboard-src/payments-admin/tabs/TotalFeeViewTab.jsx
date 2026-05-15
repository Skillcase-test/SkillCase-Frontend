import {
  formatDiscountHistoryTooltip,
  formatInrFromPaise,
} from "../utils/formatters";

export function TotalFeeViewTab({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-3">Name</th>
            <th className="px-2 py-2">Phone</th>
            <th className="px-2 py-2">Carry Forward</th>
            <th className="px-2 py-2">Base</th>
            <th className="px-2 py-2">Discount</th>
            <th className="px-2 py-2">Paid</th>
            <th className="px-2 py-2">Closing Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={r.enrollment_id}
              className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              <td className="px-3 py-3">{r.student_name || "-"}</td>
              <td className="px-2 py-2">{r.student_phone || "-"}</td>
              <td className="px-2 py-2">
                {formatInrFromPaise(r.carryForwardDuePaise)}
              </td>
              <td className="px-2 py-2">
                {formatInrFromPaise(r.monthlyBasePaise)}
              </td>
              <td
                className="px-2 py-2"
                title={
                  Array.isArray(r.discounts) && r.discounts.length
                    ? formatDiscountHistoryTooltip(r.discounts)
                    : "No discount reason"
                }
              >
                <span className="cursor-help underline decoration-dotted underline-offset-2">
                  {formatInrFromPaise(r.discountPaise)}
                </span>
              </td>
              <td className="px-2 py-2">
                {formatInrFromPaise(r.paidThisMonthPaise)}
              </td>
              <td
                className="px-2 py-2"
                title={formatDiscountHistoryTooltip(r.discount_history)}
              >
                <span className="cursor-help underline decoration-dotted underline-offset-2">
                  {formatInrFromPaise(r.closingDuePaise)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
