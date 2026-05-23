import { ActionChip, ControlDropdown } from "../components/controls";
import { StatCard } from "../components/common";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";

function lifecycleActionsForRow(row) {
  const s = String(row.lifecycle_state || row.status || "").toLowerCase();
  if (s === "dropped") return ["undrop"];
  if (s === "on_hold") return ["unhold", "drop"];
  if (s === "active" || s === "completed" || s === "pending" || s === "finalized") {
    return ["hold", "drop"];
  }
  return ["hold", "drop"];
}

const actionLabels = {
  hold: "Hold",
  unhold: "Unhold",
  drop: "Drop",
  undrop: "Undrop",
};

export function AllViewTab({
  rows,
  setEditDraft,
  allSummary,
  allStatusFilter,
  setAllStatusFilter,
  allBatchFilter,
  setAllBatchFilter,
  batches,
  openLifecycleModal,
  handleChangeCandidateBatch,
  handleChangeCandidateStatus,
  updatingBatchEnrollmentId,
}) {
  const batchOptions = [
    { value: "", label: "All Batches" },
    ...batches.map((b) => ({ value: b.batch_id, label: b.batch_name })),
  ];
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "dropped", label: "Dropped" },
    { value: "completed", label: "Completed" },
    { value: "pending", label: "Pending" },
    { value: "finalized", label: "Finalized" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total Enrollments" value={allSummary?.total_enrollments || 0} />
        <StatCard label="Total Active" value={allSummary?.total_active || 0} tone="emerald" />
        <StatCard label="Total Dropped" value={allSummary?.total_dropped || 0} tone="amber" />
        <StatCard label="Total Hold" value={allSummary?.total_hold || 0} tone="blue" />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <ControlDropdown
          value={allStatusFilter}
          onChange={setAllStatusFilter}
          options={statusOptions}
          placeholder="Filter by status"
        />
        <ControlDropdown
          value={allBatchFilter}
          onChange={setAllBatchFilter}
          options={batchOptions}
          placeholder="Filter by batch"
        />
      </div>

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
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.enrollment_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="px-3 py-3">{r.student_name || "-"}</td>
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
                <td className="px-2 py-2">
                  <div className="w-32">
                    <ControlDropdown
                      value={String(r.lifecycle_state || r.status || "").toLowerCase()}
                      onChange={(val) => handleChangeCandidateStatus?.(r, val)}
                      placeholder="Status"
                      compact
                      fixedMenu
                      disabled={updatingBatchEnrollmentId === r.enrollment_id}
                      options={(() => {
                        const s = String(r.lifecycle_state || r.status || "").toLowerCase();
                        const opts = [
                          { value: s, label: s === "on_hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1) }
                        ];

                        if (s === "dropped") {
                          opts.push({ value: "active", label: "Active" });
                        } else if (s === "on_hold") {
                          opts.push({ value: "active", label: "Active" });
                          opts.push({ value: "dropped", label: "Dropped" });
                        } else if (s === "active" || s === "pending" || s === "completed" || s === "finalized") {
                          opts.push({ value: "on_hold", label: "On Hold" });
                          opts.push({ value: "dropped", label: "Dropped" });
                          if (s !== "completed" && s !== "finalized") {
                            opts.push({ value: "completed", label: "Completed" });
                          }
                        }
                        return opts;
                      })()}
                    />
                  </div>
                </td>
                <td className="px-2 py-2">{formatInrFromPaise(r.paid_total_paise)}</td>
                <td className="px-2 py-2">{formatIstDateTime(r.last_paid_at)}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-2">
                    <ActionChip onClick={() => setEditDraft({ ...r, ...(r.notes || {}) })}>
                      Details
                    </ActionChip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
