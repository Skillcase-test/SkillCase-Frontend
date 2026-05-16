import { ActionChip } from "../components/controls";
import { formatDiscountHistoryTooltip, formatInrFromPaise } from "../utils/formatters";

export function TotalFeeViewTab({
  rows,
  feeFilter,
  setFeeFilter,
  cohortFilter,
  setCohortFilter,
  openFeeBreakdown,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ActionChip active={cohortFilter === "new"} onClick={() => setCohortFilter("new")}>
          New
        </ActionChip>
        <ActionChip active={cohortFilter === "old"} onClick={() => setCohortFilter("old")}>
          Old
        </ActionChip>
        <ActionChip active={cohortFilter === "both"} onClick={() => setCohortFilter("both")}>
          Both
        </ActionChip>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionChip active={feeFilter === "unpaid"} onClick={() => setFeeFilter("unpaid")}>
          Unpaid
        </ActionChip>
        <ActionChip
          active={feeFilter === "unpaid_last_month"}
          onClick={() => setFeeFilter("unpaid_last_month")}
        >
          Unpaid Last Month
        </ActionChip>
        <ActionChip active={feeFilter === "discounted"} onClick={() => setFeeFilter("discounted")}>
          Discounted Students
        </ActionChip>
        <ActionChip active={feeFilter === "paid"} onClick={() => setFeeFilter("paid")}>
          Paid Students
        </ActionChip>
      </div>

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
            {rows.length ? rows.map((r, idx) => (
              <tr key={r.enrollment_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="px-3 py-3">{r.student_name || "-"}</td>
                <td className="px-2 py-2">{r.student_phone || "-"}</td>
                <td className="px-2 py-2">{formatInrFromPaise(r.carryForwardDuePaise)}</td>
                <td className="px-2 py-2">{formatInrFromPaise(r.monthlyBasePaise)}</td>
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
                  <button
                    type="button"
                    className="underline decoration-dotted underline-offset-2"
                    onClick={() =>
                      openFeeBreakdown({
                        enrollmentId: r.enrollment_id,
                        type: "paid",
                        studentName: r.student_name,
                      })
                    }
                  >
                    {formatInrFromPaise(r.paidThisMonthPaise)}
                  </button>
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="underline decoration-dotted underline-offset-2"
                    onClick={() =>
                      openFeeBreakdown({
                        enrollmentId: r.enrollment_id,
                        type: "due",
                        studentName: r.student_name,
                      })
                    }
                  >
                    {formatInrFromPaise(r.closingDuePaise)}
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No rows found for selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
