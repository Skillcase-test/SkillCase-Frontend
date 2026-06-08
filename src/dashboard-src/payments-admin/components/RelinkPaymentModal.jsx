import React, { useState } from "react";
import { ControlButton, ControlInput } from "./controls";
import { formatInrFromPaise } from "../utils/formatters";

export function RelinkPaymentModal({ modal, setModal, onConfirm }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!modal || !modal.open || !modal.payment) return null;

  const payment = modal.payment;
  const currentPhone = payment.student_phone || "-";
  const currentName = payment.student_name || "-";
  const amountStr = formatInrFromPaise(payment.signed_amount_paise ?? payment.amount_paise);
  const paymentIdStr = payment.razorpay_payment_id || payment.payment_id || "-";

  const handleClose = () => {
    setPhone("");
    setError("");
    setLoading(false);
    setModal({ open: false, payment: null });
  };

  const handleConfirm = async () => {
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(payment.payment_id, phone);
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to relink payment transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">
          Relink Payment Transaction
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Reassociate payment with a different registered candidate.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          <div className="flex justify-between">
            <span className="font-semibold">Transaction ID:</span>
            <span className="font-mono">{paymentIdStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Amount:</span>
            <span>{amountStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Currently Linked To:</span>
            <span>{currentName} ({currentPhone})</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700">
            Target Candidate Phone Number
          </label>
          <ControlInput
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter new phone number"
            className="mt-1 w-full"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mt-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <ControlButton
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </ControlButton>
          <ControlButton
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Relinking..." : "Confirm Relink"}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
