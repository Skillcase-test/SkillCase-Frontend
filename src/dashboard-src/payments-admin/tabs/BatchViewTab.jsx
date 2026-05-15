import {
  ActionChip,
  ControlButton,
  ControlInput,
  ControlSelect,
} from "../components/controls";
import { formatInrFromPaise } from "../utils/formatters";

export function BatchViewTab({
  rows,
  batchForm,
  setBatchForm,
  handleCreateBatch,
  handleUpdateBatch,
  handleDeleteBatch,
  batchFilter,
  setBatchFilter,
  updatingBatchEnrollmentId,
  handleChangeCandidateBatch,
  batches,
  handleHold,
  handleUnhold,
  handleDrop,
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">Batch CRUD + Filter</p>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ControlInput
            value={batchForm.name}
            onChange={(e) =>
              setBatchForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="New batch name"
            className="w-56"
          />
          <ControlInput
            value={batchForm.description}
            onChange={(e) =>
              setBatchForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Description (optional)"
            className="w-72"
          />
          <ControlButton onClick={handleCreateBatch} variant="primary">
            Create Batch
          </ControlButton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ControlSelect
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-56"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_name}>
                {b.batch_name}
              </option>
            ))}
          </ControlSelect>
          {batches.map((b) => (
            <div
              key={b.batch_id}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1"
            >
              <span className="text-xs font-medium text-slate-700">{b.batch_name}</span>
              <ActionChip onClick={() => handleUpdateBatch(b)}>Edit</ActionChip>
              <ActionChip variant="danger" onClick={() => handleDeleteBatch(b.batch_id)}>
                Delete
              </ActionChip>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-3">Batch</th>
            <th className="px-2 py-2">Name</th>
            <th className="px-2 py-2">Phone</th>
            <th className="px-2 py-2">Paid</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Change Batch</th>
            <th className="px-2 py-2">Lifecycle Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={r.enrollment_id}
              className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              <td className="px-3 py-3">{r.batch_name}</td>
              <td className="px-2 py-2">{r.student_name || "-"}</td>
              <td className="px-2 py-2">{r.student_phone || "-"}</td>
              <td className="px-2 py-2">{formatInrFromPaise(r.paid_paise)}</td>
              <td className="px-2 py-2">
                {r.lifecycle_state === "on_hold" ? "on_hold" : r.status}
              </td>
              <td className="px-2 py-2">
                <ControlSelect
                  value={r.batch_id || ""}
                  disabled={updatingBatchEnrollmentId === r.enrollment_id}
                  onChange={(e) =>
                    handleChangeCandidateBatch(r.enrollment_id, e.target.value)
                  }
                  className="h-9 w-44 px-2 text-xs"
                >
                  <option value="">No batch</option>
                  {batches.map((b) => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_name}
                    </option>
                  ))}
                </ControlSelect>
              </td>
              <td className="px-2 py-2">
                <div className="flex gap-1">
                  <ActionChip
                    onClick={() => handleHold(r.enrollment_id)}
                    variant="warning"
                  >
                    Hold
                  </ActionChip>
                  <ActionChip onClick={() => handleUnhold(r.enrollment_id)}>
                    Unhold
                  </ActionChip>
                  <ActionChip
                    onClick={() => handleDrop(r.enrollment_id)}
                    variant="danger"
                  >
                    Drop
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
