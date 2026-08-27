import { useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./controls";

export function ConfirmationModal({
  isOpen,
  title = "Are you sure?",
  description = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  input = false,
  inputLabel = "",
  inputPlaceholder = "",
  defaultValue = "",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [val, setVal] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVal(defaultValue);
      if (input) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, defaultValue, input]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition p-1 rounded-lg"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? "bg-rose-100 text-rose-600"
                : "bg-blue-100 text-[#083262]"
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <HelpCircle className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-900 leading-tight">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs font-medium text-slate-500 whitespace-pre-line leading-relaxed">
                {description}
              </p>
            )}

            {input && (
              <div className="mt-3 space-y-1">
                {inputLabel && (
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {inputLabel}
                  </label>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder={inputPlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      onConfirm(val);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                />
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <SecondaryButton onClick={onCancel} disabled={loading}>
                {cancelText}
              </SecondaryButton>
              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(input ? val : undefined)}
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                  isDanger
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#083262] hover:bg-[#052243]"
                }`}
              >
                {loading ? "Processing..." : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
