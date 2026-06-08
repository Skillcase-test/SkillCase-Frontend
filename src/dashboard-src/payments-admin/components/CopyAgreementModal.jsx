import React, { useState } from "react";
import { ControlButton } from "./controls";

export function CopyAgreementModal({ modal, setModal }) {
  const [copied, setCopied] = useState(false);

  if (!modal || !modal.open || !modal.url) return null;

  const handleClose = () => {
    setCopied(false);
    setModal({ open: false, url: "", studentName: "" });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(modal.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">
          Agreement Link Generated
        </h3>
        <p className="mt-1 text-xs text-slate-500 text-left">
          The agreement email was sent to {modal.studentName || "the candidate"}. You can also copy the signing link below to send manually via WhatsApp or SMS.
        </p>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 text-left">
          <label className="block font-semibold text-slate-500 mb-1">
            Signing URL:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={modal.url}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 outline-none select-all"
            />
            <ControlButton
              variant={copied ? "success" : "primary"}
              onClick={handleCopy}
              className="h-8 min-w-[70px] px-2 text-xs font-semibold"
            >
              {copied ? "Copied" : "Copy"}
            </ControlButton>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <ControlButton
            variant="secondary"
            onClick={handleClose}
          >
            Close
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
