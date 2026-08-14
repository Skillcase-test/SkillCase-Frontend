import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

/**
 * Replaces window.confirm() everywhere in the scholarship admin.
 * The orchestrator holds a single `confirm` state object of shape:
 *   { title, message, confirmLabel, danger, action }
 */
export default function ConfirmDialog({ confirm, onCancel }) {
  if (!confirm) return null;
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
            onClick={async () => {
              const { action } = confirm;
              onCancel();
              await action?.();
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition ${
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
    </Modal>
  );
}
