import { ActionChip, ControlDropdown } from "../components/controls";
import { StatCard } from "../components/common";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

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
  allSortBy,
  allSortOrder,
  setAllSortBy,
  setAllSortOrder,
}) {
  const handleSort = (field) => {
    if (field === "created_at") {
      if (allSortBy === "created_at") {
        setAllSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setAllSortBy("created_at");
        setAllSortOrder("desc");
      }
    } else {
      if (allSortBy === field) {
        if (allSortOrder === "desc") {
          setAllSortOrder("asc");
        } else {
          setAllSortBy("created_at");
          setAllSortOrder("desc");
        }
      } else {
        setAllSortBy(field);
        setAllSortOrder("desc");
      }
    }
  };

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
    { value: "refunded", label: "Refunded" },
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
              <th
                onClick={() => handleSort("student_name")}
                className="px-3 py-3 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Name</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "student_name" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("candidate_id")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Candidate ID</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "candidate_id" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("student_phone")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Phone</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "student_phone" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("student_email")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Email</span>
                  <span className="text-slate-400 group-hover:text-slate-650 transition-colors">
                    {allSortBy === "student_email" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("batch_name")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Batch</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "batch_name" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th className="px-2 py-2">Status</th>
              <th
                onClick={() => handleSort("paid_total_paise")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Paid Total</span>
                  <span className="text-slate-400 group-hover:text-slate-650 transition-colors">
                    {allSortBy === "paid_total_paise" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("last_paid_at")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Last Paid</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "last_paid_at" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  No candidates found matching the filters.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.enrollment_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
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
                  <td className="px-2 py-2">
                    {r.lifecycle_state === "dropped" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        Dropped
                      </span>
                    ) : r.status === "archived" || r.lifecycle_state === "archived" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        Rejected
                      </span>
                    ) : r.status === "refunded" || r.lifecycle_state === "refunded" ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        Refunded
                      </span>
                    ) : r.lifecycle_state === "on_hold" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        On Hold
                      </span>
                    ) : r.lifecycle_state === "completed" ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        Completed
                      </span>
                    ) : r.lifecycle_state === "active" || r.status === "finalized" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    )}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
