import React, { useState, useEffect } from "react";
import { ControlButton } from "./controls";
import { formatInrFromPaise, formatIstDate } from "../utils/formatters";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { MONTH_NAMES } from "../utils/constants";

export function BookAmountModal({ modal, setModal, onConfirm }) {
  const [payments, setPayments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (modal && modal.open) {
      setYear(new Date().getUTCFullYear());
      setMonth(new Date().getUTCMonth() + 1);
      setNotes("");
      setError("");

      if (modal.isBulk && Array.isArray(modal.payments)) {
        setPayments(modal.payments);
        setSelectedIds(modal.payments.map((p) => p.payment_id));
        setFetching(false);
      } else if (modal.payment) {
        const p = modal.payment;
        setSelectedIds([p.payment_id]);
        setPayments([]);

        // Fetch all capture/processed unbooked transactions for this phone number
        if (p.student_phone) {
          setFetching(true);
          paymentsAdminApi
            .getBookedAmountCandidatePayments(p.student_phone)
            .then((res) => {
              setPayments(res.data.rows || []);
            })
            .catch((err) => {
              setError(err?.response?.data?.msg || "Failed to load candidate payments");
            })
            .finally(() => {
              setFetching(false);
            });
        }
      }
    }
  }, [modal]);

  if (!modal || !modal.open) return null;
  if (!modal.isBulk && !modal.payment) return null;

  const initialPayment = modal.payment;

  const toggleSelect = (paymentId) => {
    setSelectedIds((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleClose = () => {
    setPayments([]);
    setSelectedIds([]);
    setError("");
    setLoading(false);
    setModal({ open: false, payment: null });
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      setError("Please select at least one transaction to book");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (modal.isBulk) {
        await onConfirm({
          payment_ids: selectedIds,
          year,
          month,
          notes,
          isBulk: true,
        });
      } else {
        await onConfirm({
          enrollment_id: initialPayment.enrollment_id,
          payment_ids: selectedIds,
          year,
          month,
          notes,
        });
      }
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to book amount");
    } finally {
      setLoading(false);
    }
  };

  const totalPaise = payments
    .filter((p) => selectedIds.includes(p.payment_id))
    .reduce((sum, p) => sum + Number(p.amount_paise || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="border-b pb-3">
          <h3 className="text-lg font-bold text-slate-900">
            Book Captured Amount
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Club and attribute one or more captured payments to a target billing month.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
          {/* Candidate Info card */}
          <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1">
            {modal.isBulk ? (
              <div className="flex justify-between">
                <span className="font-semibold">Bulk Booking:</span>
                <span>{selectedIds.length} Payments Selected</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="font-semibold">Candidate Name:</span>
                  <span>{initialPayment?.student_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Candidate Phone:</span>
                  <span>{initialPayment?.student_phone || "-"}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-1.5 mt-1.5">
              <span className="font-semibold">Total Selected to Book:</span>
              <span className="text-slate-900 font-bold text-sm">
                {formatInrFromPaise(totalPaise)}
              </span>
            </div>
          </div>

          {/* Month & Year target selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Target Billing Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Target Billing Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of unbooked positive payments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Payments to Club
            </label>
            {fetching ? (
              <p className="text-xs text-slate-400 py-3">Loading payments...</p>
            ) : payments.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                No unbooked captured transactions found.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                {payments.map((p) => {
                  const txId = p.razorpay_payment_id || p.payment_id.slice(0, 8);
                  const isChecked = selectedIds.includes(p.payment_id);
                  return (
                    <label
                      key={p.payment_id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors select-none ${
                        isChecked ? "bg-slate-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(p.payment_id)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          {formatInrFromPaise(p.amount_paise)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          ID: {txId} | Date: {formatIstDate(p.paid_at)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Internal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context or description for this booking"
              className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2.5 my-2">
            {error}
          </div>
        )}

        <div className="border-t pt-3 flex justify-end gap-2">
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
            disabled={loading || selectedIds.length === 0}
          >
            {loading ? "Booking..." : "Confirm Booking"}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
