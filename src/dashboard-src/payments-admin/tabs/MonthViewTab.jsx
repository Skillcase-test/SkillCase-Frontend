import { ActionChip } from "../components/controls";
import { formatInrFromPaise } from "../utils/formatters";

export function MonthViewTab({
  rows,
  setEditDraft,
  handleFinalize,
  handleReject,
  savingEnrollmentId,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-3">Name</th>
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
              <td className="px-2 py-2">{r.student_phone || "-"}</td>
              <td className="px-2 py-2">{r.student_email || "-"}</td>
              <td className="px-2 py-2">{r.batch_name || "-"}</td>
              <td className="px-2 py-2">{formatInrFromPaise(r.paid_paise)}</td>
              <td className="px-2 py-2">
                {r.status === "finalized" ? (
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
                    onClick={() => setEditDraft({ ...r, ...(r.notes || {}) })}
                  >
                    Details
                  </ActionChip>
                  {r.status !== "finalized" ? (
                    <>
                      <ActionChip
                        onClick={() => handleFinalize(r.enrollment_id)}
                        disabled={savingEnrollmentId === r.enrollment_id}
                        variant="success"
                      >
                        Finalize
                      </ActionChip>
                      <ActionChip
                        onClick={() => handleReject(r.enrollment_id)}
                        disabled={savingEnrollmentId === r.enrollment_id}
                        variant="danger"
                      >
                        Reject
                      </ActionChip>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
