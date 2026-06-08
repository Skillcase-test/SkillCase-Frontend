import { ActionChip, ControlButton, ControlInput } from "../components/controls";
import { formatInrFromPaise, formatIstDate } from "../utils/formatters";
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export function BatchViewTab({
  batches,
  batchForm,
  setBatchForm,
  handleCreateBatch,
  handleUpdateBatch,
  handleDeleteBatch,
  activeBatchId,
  setActiveBatchId,
  activeBatchName,
  setActiveBatchName,
  rows,
  setEditDraft,
  batchSortBy,
  setBatchSortBy,
  batchSortOrder,
  setBatchSortOrder,
}) {
  const handleSort = (field) => {
    if (field === "created_at") {
      if (batchSortBy === "created_at") {
        setBatchSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setBatchSortBy("created_at");
        setBatchSortOrder("desc");
      }
    } else {
      if (batchSortBy === field) {
        if (batchSortOrder === "desc") {
          setBatchSortOrder("asc");
        } else {
          setBatchSortBy("created_at");
          setBatchSortOrder("desc");
        }
      } else {
        setBatchSortBy(field);
        setBatchSortOrder("desc");
      }
    }
  };

  const renderSortIcon = (field) => {
    if (batchSortBy === field) {
      return batchSortOrder === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
      );
    }
    return (
      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  };

  if (activeBatchId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Students in Batch: {activeBatchName}
            </h2>
            <p className="text-xs text-slate-500">
              List of enrolled candidates for this batch
            </p>
          </div>
          <ControlButton
            onClick={() => {
              setActiveBatchId("");
              setActiveBatchName("");
            }}
            variant="secondary"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Back to Batches
          </ControlButton>
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
                      {renderSortIcon("student_name")}
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
                      {renderSortIcon("candidate_id")}
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
                      {renderSortIcon("student_phone")}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("student_email")}
                  className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Email</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {renderSortIcon("student_email")}
                    </span>
                  </div>
                </th>
                <th className="px-2 py-2">Status</th>
                <th
                  onClick={() => handleSort("created_at")}
                  className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Enrollment Date</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {renderSortIcon("created_at")}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("paid_total_paise")}
                  className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Total Paid</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {renderSortIcon("paid_total_paise")}
                    </span>
                  </div>
                </th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    No candidates found in this batch.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={r.enrollment_id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {r.student_name || "-"}
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-mono text-xs text-slate-700">
                        {r.notes?.candidate_id || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{r.student_phone || "-"}</td>
                    <td className="px-2 py-2 text-slate-600">{r.student_email || "-"}</td>
                    <td className="px-2 py-2">
                      {r.lifecycle_state === "dropped" ? (
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
                      ) : r.lifecycle_state === "archived" ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          Rejected
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{formatIstDate(r.created_at)}</td>
                    <td className="px-2 py-2 font-semibold text-slate-800">
                      {formatInrFromPaise(r.paid_total_paise)}
                    </td>
                    <td className="px-2 py-2">
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

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">Batch Management</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ControlInput
            value={batchForm.name}
            onChange={(e) => setBatchForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="New batch name"
            className="w-56"
          />
          <ControlInput
            value={batchForm.description}
            onChange={(e) => setBatchForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-80"
          />
          <ControlButton onClick={handleCreateBatch} variant="primary">
            Create Batch
          </ControlButton>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-3">Batch</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Enrollments</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                  No batches found.
                </td>
              </tr>
            ) : (
              rows.map((b, idx) => (
                <tr key={b.batch_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => {
                        setActiveBatchId(b.batch_id);
                        setActiveBatchName(b.batch_name);
                      }}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left focus:outline-none"
                    >
                      {b.batch_name}
                    </button>
                  </td>
                  <td className="px-2 py-2">{b.description || "-"}</td>
                  <td className="px-2 py-2">{Number(b.enrollment_count || 0)}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <ActionChip
                        onClick={() => {
                          setActiveBatchId(b.batch_id);
                          setActiveBatchName(b.batch_name);
                        }}
                      >
                        Students
                      </ActionChip>
                      <ActionChip onClick={() => handleUpdateBatch(b)}>Edit</ActionChip>
                      <ActionChip variant="danger" onClick={() => handleDeleteBatch(b.batch_id)}>
                        Delete
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
