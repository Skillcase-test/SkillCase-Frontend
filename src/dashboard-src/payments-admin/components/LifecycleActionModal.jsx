import { ControlButton, ControlSelect } from "./controls";
import { MONTH_NAMES } from "../utils/constants";

export function LifecycleActionModal({ lifecycleModal, setLifecycleModal, handleLifecycleSubmit }) {
  if (!lifecycleModal?.open) return null;
  const titleMap = {
    hold: "Hold Candidate",
    unhold: "Unhold Candidate",
    drop: "Drop Candidate",
    undrop: "Undrop Candidate",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{titleMap[lifecycleModal.action] || "Update Status"}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Apply action for <span className="font-semibold">{lifecycleModal.studentName || "Candidate"}</span>.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ControlSelect
            value={lifecycleModal.year}
            onChange={(e) => setLifecycleModal((prev) => ({ ...prev, year: Number(e.target.value) }))}
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </ControlSelect>
          <ControlSelect
            value={lifecycleModal.month}
            onChange={(e) => setLifecycleModal((prev) => ({ ...prev, month: Number(e.target.value) }))}
          >
            {MONTH_NAMES.slice(1).map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </ControlSelect>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <ControlButton
            variant="secondary"
            onClick={() => setLifecycleModal((prev) => ({ ...prev, open: false }))}
          >
            Cancel
          </ControlButton>
          <ControlButton variant="primary" onClick={handleLifecycleSubmit}>
            Confirm
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
