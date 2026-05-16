import { ActionChip, ControlButton, ControlInput } from "../components/controls";

export function BatchViewTab({
  batches,
  batchForm,
  setBatchForm,
  handleCreateBatch,
  handleUpdateBatch,
  handleDeleteBatch,
}) {
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
            {batches.map((b, idx) => (
              <tr key={b.batch_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="px-3 py-3">{b.batch_name}</td>
                <td className="px-2 py-2">{b.description || "-"}</td>
                <td className="px-2 py-2">{Number(b.enrollment_count || 0)}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    <ActionChip onClick={() => handleUpdateBatch(b)}>Edit</ActionChip>
                    <ActionChip variant="danger" onClick={() => handleDeleteBatch(b.batch_id)}>
                      Delete
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
