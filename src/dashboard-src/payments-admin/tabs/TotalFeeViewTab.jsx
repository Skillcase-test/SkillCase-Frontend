import { ActionChip } from "../components/controls";
import { formatInrFromPaise } from "../utils/formatters";

export function TotalFeeViewTab({
  rows,
  feeFilter,
  setFeeFilter,
  cohortFilter,
  setCohortFilter,
  openFeeBreakdown,
  openDiscountBreakdown,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ActionChip
          active={cohortFilter === "new"}
          onClick={() => setCohortFilter("new")}
          title="Students enrolled in the selected target month"
        >
          New
        </ActionChip>
        <ActionChip
          active={cohortFilter === "old"}
          onClick={() => setCohortFilter("old")}
          title="Students enrolled before the selected target month"
        >
          Old
        </ActionChip>
        <ActionChip
          active={cohortFilter === "both"}
          onClick={() => setCohortFilter("both")}
          title="All students regardless of enrollment date"
        >
          Both
        </ActionChip>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionChip
          active={feeFilter === ""}
          onClick={() => setFeeFilter("")}
          title="Show all students without any status filter"
        >
          All
        </ActionChip>
        <ActionChip
          active={feeFilter === "unpaid"}
          onClick={() => setFeeFilter("unpaid")}
          title="Shows students with any outstanding balance (including carry forward dues)"
        >
          Unpaid
        </ActionChip>
        <ActionChip
          active={feeFilter === "unpaid_current_month"}
          onClick={() => setFeeFilter("unpaid_current_month")}
          title="Shows students with unpaid fees specifically for the selected month, ignoring past dues"
        >
          Unpaid Current Month
        </ActionChip>
        <ActionChip
          active={feeFilter === "unpaid_last_month"}
          onClick={() => setFeeFilter("unpaid_last_month")}
          title="Shows students who carried forward unpaid fees into this month"
        >
          Unpaid Last Month
        </ActionChip>
        <ActionChip
          active={feeFilter === "discounted"}
          onClick={() => setFeeFilter("discounted")}
          title="Shows students who received a discount in this month"
        >
          Discounted Students
        </ActionChip>
        <ActionChip
          active={feeFilter === "paid"}
          onClick={() => setFeeFilter("paid")}
          title="Shows students who have completely cleared their balance by the end of this month"
        >
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
                <td className="px-2 py-2">
                  <button
                    type="button"
                    disabled={!Number(r.discountPaise || 0)}
                    className="underline decoration-dotted underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-70"
                    onClick={() =>
                      openDiscountBreakdown({
                        enrollmentId: r.enrollment_id,
                        studentName: r.student_name,
                      })
                    }
                  >
                    {formatInrFromPaise(r.discountPaise)}
                  </button>
                </td>
                <td className="px-2 py-2">{formatInrFromPaise(r.paidThisMonthPaise)}</td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="underline decoration-dotted underline-offset-2"
                    onClick={() =>
                      openFeeBreakdown({
                        enrollmentId: r.enrollment_id,
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
