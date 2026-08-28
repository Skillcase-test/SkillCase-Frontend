import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

/**
 * Replaces window.confirm() everywhere in the scholarship admin.
 * The orchestrator holds a single `confirm` state object of shape:
 *   { title, message, confirmLabel, danger, action }
 */
import { useState, useEffect } from "react";

export default function ConfirmDialog({ confirm, onCancel }) {
  const [acked, setAcked] = useState(false);
  useEffect(() => { setAcked(false); }, [confirm]);
  if (!confirm) return null;
  const needAck = !!confirm.requireAck;
  return (
    <Modal
      title={confirm.title || "Are you sure?"}
      subtitle={confirm.subtitle}
      onClose={onCancel}
      size="sm"
      icon={
        <AlertTriangle
          className={`w-5 h-5 ${confirm.danger ? "text-red-500" : "text-amber-500"}`}
        />
      }
      footer={
        <>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            disabled={needAck && !acked}
            onClick={async () => {
              const { action } = confirm;
              onCancel();
              await action?.();
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${
              confirm.danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#002856] hover:bg-[#001e40]"
            }`}
          >
            {confirm.confirmLabel || "Confirm"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-500 leading-relaxed">{confirm.message}</p>
      {needAck && (
        <label className="flex items-start gap-2 mt-4 text-xs text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={acked} onChange={(e) => setAcked(e.target.checked)} className="mt-0.5" />
          <span>{confirm.ackLabel || "I understand"}</span>
        </label>
      )}
    </Modal>
  );
}
