import { ActionChip } from "../components/controls";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";

export function AllViewTab({ rows, setEditDraft }) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-2 py-2">Phone</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Paid Total</th>
              <th className="px-2 py-2">Last Paid</th>
              <th className="px-2 py-2">Action</th>
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
                <td className="px-2 py-2">{r.status || "-"}</td>
                <td className="px-2 py-2">
                  {formatInrFromPaise(r.paid_total_paise)}
                </td>
                <td className="px-2 py-2">
                  {formatIstDateTime(r.last_paid_at)}
                </td>
                <td className="px-2 py-2">
                  <ActionChip
                    onClick={() => setEditDraft({ ...r, ...(r.notes || {}) })}
                  >
                    Details
                  </ActionChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
