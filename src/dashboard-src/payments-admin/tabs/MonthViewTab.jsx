import { ActionChip, ControlDropdown } from "../components/controls";
import { formatInrFromPaise } from "../utils/formatters";

export function MonthViewTab({
  rows,
  setEditDraft,
  handleFinalize,
  handleSendAgreement,
  handleDeleteCandidate,
  savingEnrollmentId,
  sendingAgreementEnrollmentId,
  batches = [],
  handleChangeCandidateBatch,
  updatingBatchEnrollmentId,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-3">Name</th>
            <th className="px-2 py-2">Candidate ID</th>
            <th className="px-2 py-2">Phone</th>
            <th className="px-2 py-2">Email</th>
            <th className="px-2 py-2">Batch</th>
            <th className="px-2 py-2">Month Paid</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={r.enrollment_id}
              className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              <td className="px-3 py-3">{r.student_name || "-"}</td>
              <td className="px-2 py-2">
                <span className="font-mono text-xs text-slate-700">
                  {r.notes?.candidate_id || "-"}
                </span>
              </td>
              <td className="px-2 py-2">{r.student_phone || "-"}</td>
              <td className="px-2 py-2">{r.student_email || "-"}</td>
              <td className="px-2 py-2">
                <div className="w-40">
                  <ControlDropdown
                    value={r.batch_id || ""}
                    onChange={(val) => handleChangeCandidateBatch?.(r.enrollment_id, val)}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...batches.map((b) => ({ value: b.batch_id, label: b.batch_name })),
                    ]}
                    placeholder="Select Batch"
                    compact
                    fixedMenu
                    disabled={updatingBatchEnrollmentId === r.enrollment_id}
                  />
                </div>
              </td>
              <td className="px-2 py-2">{formatInrFromPaise(r.paid_paise)}</td>
              <td className="px-2 py-2">
                {r.status === "archived" || r.lifecycle_state === "archived" ? (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    Rejected
                  </span>
                ) : r.lifecycle_state === "dropped" ? (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    Dropped
                  </span>
                ) : r.lifecycle_state === "on_hold" ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    On Hold
                  </span>
                ) : r.lifecycle_state === "completed" ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                    Completed
                  </span>
                ) : r.status === "finalized" ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Finalized
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-2 py-2">
                <div className="flex gap-1">
                  <ActionChip
                    onClick={() =>
                      setEditDraft({
                        ...r,
                        total_fee_inr: r?.notes?.total_fee_inr || 60000,
                        monthly_fee_inr: r?.notes?.monthly_fee_inr || 6000,
                        ...(r.notes || {}),
                      })
                    }
                  >
                    Details
                  </ActionChip>
                  {r.status !== "archived" && r.lifecycle_state !== "archived" && (() => {
                    const agreementState = r.agreement_state || "not_sent";
                    const isSending = sendingAgreementEnrollmentId === r.enrollment_id;

                    if (agreementState === "not_sent") {
                      return (
                        <ActionChip
                          onClick={() => handleSendAgreement?.(r)}
                          disabled={isSending}
                        >
                          {isSending ? "Sending..." : "Send Agreement"}
                        </ActionChip>
                      );
                    }

                    if (agreementState === "sent") {
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">
                            Sent
                          </span>
                          <ActionChip
                            onClick={() => handleSendAgreement?.(r)}
                            disabled={isSending}
                          >
                            {isSending ? "Sending..." : "Resend"}
                          </ActionChip>
                        </div>
                      );
                    }

                    if (agreementState === "viewed") {
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                            Viewed
                          </span>
                          <ActionChip
                            onClick={() => handleSendAgreement?.(r)}
                            disabled={isSending}
                          >
                            {isSending ? "Sending..." : "Resend"}
                          </ActionChip>
                        </div>
                      );
                    }

                    if (agreementState === "signed") {
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                            Signed
                          </span>
                          <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-700/10">
                            Pending Details
                          </span>
                        </div>
                      );
                    }

                    if (agreementState === "details_filled") {
                      return (
                        <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 animate-pulse">
                          Details Filled
                        </span>
                      );
                    }

                    return null;
                  })()}
                  {r.status === "pending" && (
                    <ActionChip
                      onClick={() => handleFinalize(r)}
                      disabled={savingEnrollmentId === r.enrollment_id}
                      variant="success"
                    >
                      Finalize
                    </ActionChip>
                  )}
                  <ActionChip
                    onClick={() => {
                      if (window.confirm("Data for this student will be vanished. Are you sure?")) {
                        handleDeleteCandidate?.(r.enrollment_id);
                      }
                    }}
                    disabled={savingEnrollmentId === r.enrollment_id}
                    variant="danger"
                  >
                    Delete
                  </ActionChip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
