import {
  ActionChip,
  ControlButton,
  ControlDropdown,
  ControlInput,
  ControlSelect,
} from "../components/controls";
import { MONTH_NAMES } from "../utils/constants";
import { formatInrFromPaise } from "../utils/formatters";

export function DiscountsViewTab({
  rows,
  discountForm,
  setDiscountForm,
  candidateOptions,
  handleCreateDiscountRequest,
  handleDiscountDecision,
  setRejectModal,
  canApproveDiscounts,
}) {
  const candidateDropdownOptions = candidateOptions.map((c) => ({
    value: c.enrollment_id,
    label: `${c.student_name || "Unknown"} - ${c.student_phone || "-"}`,
  }));

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">Create Discount Request</p>
        <div className="grid gap-2 md:grid-cols-4">
          <ControlDropdown
            value={discountForm.enrollment_id}
            onChange={(val) => {
              const selected = candidateOptions.find(
                (x) => String(x.enrollment_id) === String(val),
              );
              setDiscountForm((prev) => ({
                ...prev,
                enrollment_id: String(val),
                student_name: selected?.student_name || "",
                student_phone: selected?.student_phone || "",
              }));
            }}
            options={candidateDropdownOptions}
            placeholder="Select Candidate"
            searchable
          />
          <ControlSelect
            value={discountForm.target_month_name}
            onChange={(e) =>
              setDiscountForm((prev) => ({ ...prev, target_month_name: e.target.value }))
            }
          >
            {MONTH_NAMES.slice(1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </ControlSelect>
          <ControlSelect
            value={discountForm.discount_type}
            onChange={(e) =>
              setDiscountForm((prev) => ({ ...prev, discount_type: e.target.value }))
            }
          >
            <option value="one_time">one_time</option>
            <option value="monthly">monthly</option>
            <option value="percentage">percentage</option>
          </ControlSelect>
          {discountForm.discount_type === "percentage" ? (
            <ControlInput
              value={discountForm.discount_percent}
              onChange={(e) =>
                setDiscountForm((prev) => ({ ...prev, discount_percent: e.target.value }))
              }
              placeholder="Percent (%)"
            />
          ) : (
            <ControlInput
              value={discountForm.discount_value}
              onChange={(e) =>
                setDiscountForm((prev) => ({ ...prev, discount_value: e.target.value }))
              }
              placeholder="Amount in INR"
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ControlInput
            value={discountForm.reason}
            onChange={(e) =>
              setDiscountForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="Reason"
            className="w-full max-w-lg"
          />
          <ControlButton onClick={handleCreateDiscountRequest} variant="primary">
            Request Discount
          </ControlButton>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-3">Name</th>
            <th className="px-2 py-2">Phone</th>
            <th className="px-2 py-2">Month</th>
            <th className="px-2 py-2">Type</th>
            <th className="px-2 py-2">Value</th>
            <th className="px-2 py-2">Reason</th>
            <th className="px-2 py-2">Requested By</th>
            <th className="px-2 py-2">Approved By</th>
            <th className="px-2 py-2">Status</th>
            {canApproveDiscounts && <th className="px-2 py-2">Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((r, idx) => (
            <tr
              key={r.discount_id}
              className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              <td className="px-3 py-3">{r.student_name || "-"}</td>
              <td className="px-2 py-2">{r.student_phone || "-"}</td>
              <td className="px-2 py-2">
                {MONTH_NAMES[Number(r.target_month) || 0] || r.target_month}
              </td>
              <td className="px-2 py-2">{r.discount_type}</td>
              <td
                className="px-2 py-2"
                title={r.reason || "No discount reason"}
              >
                {r.discount_type === "percentage"
                  ? `${Number(r.discount_percent || 0)}%`
                  : formatInrFromPaise(r.discount_value_paise)}
              </td>
              <td className="px-2 py-2">{r.reason || "-"}</td>
              <td className="px-2 py-2">{r.requested_by_name || "-"}</td>
              <td className="px-2 py-2">{r.approved_by_name || "-"}</td>
              <td
                className="px-2 py-2"
                title={
                  r.status === "rejected"
                    ? r.rejection_reason || "No rejection reason provided"
                    : ""
                }
              >
                {r.status}
              </td>
              {canApproveDiscounts && (
                <td className="px-2 py-2">
                  {r.status === "pending" ? (
                    r.block_approval ? (
                      <span className="text-xs font-semibold text-amber-600" title={`This candidate has a monthly discount request starting in ${r.first_month_name}. Please approve or reject it in that month.`}>
                        Approve in {r.first_month_name}
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <ActionChip
                          onClick={() =>
                            handleDiscountDecision(r.discount_id, "approved")
                          }
                          variant="success"
                        >
                          Approve
                        </ActionChip>
                        <ActionChip
                          onClick={() =>
                            setRejectModal({
                              open: true,
                              discountId: r.discount_id,
                              reason: "",
                            })
                          }
                          variant="danger"
                        >
                          Reject
                        </ActionChip>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-slate-500">Reviewed</span>
                  )}
                </td>
              )}
            </tr>
          )) : (
            <tr>
              <td colSpan={canApproveDiscounts ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                No discount requests found.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
