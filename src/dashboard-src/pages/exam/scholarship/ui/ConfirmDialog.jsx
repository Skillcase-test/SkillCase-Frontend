import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

/**
 * Replaces window.confirm() everywhere in the scholarship admin.
 * The orchestrator holds a single `confirm` state object of shape:
 *   { title, message, confirmLabel, danger, action }
 *
 * Optional: `requireAck` adds a must-tick checkbox, `promptLabel` adds a free-text
 * field whose value is passed to `action(value)` — used where the reason is
 * written to the audit trail and a hardcoded placeholder would be a lie.
 */
import { useState, useEffect } from "react";

export default function ConfirmDialog({ confirm, onCancel }) {
  const [acked, setAcked] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  useEffect(() => { setAcked(false); setPromptValue(""); }, [confirm]);
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
              const value = promptValue;
              onCancel();
              await action?.(value);
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
      {confirm.promptLabel && (
        <label className="block mt-4 text-xs font-semibold text-slate-600">
          {confirm.promptLabel}
          <input
            data-testid="confirm-prompt"
            autoFocus
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder={confirm.promptPlaceholder || ""}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-[#002856]"
          />
        </label>
      )}
      {needAck && (
        <label className="flex items-start gap-2 mt-4 text-xs text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={acked} onChange={(e) => setAcked(e.target.checked)} className="mt-0.5" />
          <span>{confirm.ackLabel || "I understand"}</span>
        </label>
      )}
    </Modal>
  );
}
