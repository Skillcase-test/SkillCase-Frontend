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
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [mergePrompt, setMergePrompt] = useState(false);
  const [existingGroups, setExistingGroups] = useState([]);
  const [mergeTarget, setMergeTarget] = useState({});
  const [existingLoading, setExistingLoading] = useState(false);

  useEffect(() => {
    if (modal && modal.open) {
      setYear(new Date().getUTCFullYear());
      setMonth(new Date().getUTCMonth() + 1);
      setNotes("");
      setError("");
      setShowBookingConfirmation(false);
      setMergePrompt(false);
      setExistingGroups([]);
      setMergeTarget({});

      if (modal.isBulk && Array.isArray(modal.payments)) {
        setPayments(modal.payments);
        setSelectedIds(modal.payments.map((p) => p.split_id || p.payment_id));
        setFetching(false);
      } else if (modal.payment) {
        const p = modal.payment;
        setSelectedIds([]);
        setPayments([]);

        // Fetch all capture/processed unbooked transactions for this phone number
        if (p.student_phone) {
          setFetching(true);
          paymentsAdminApi
            .getBookedAmountCandidatePayments(p.student_phone)
            .then((res) => {
              const rows = res.data.rows || [];
              setPayments(rows);
              // Preselect the opened row — split payments map to their unbooked share
              const splitMatch = rows.find(
                (r) => r.is_split && String(r.payment_id) === String(p.payment_id),
              );
              if (splitMatch) {
                setSelectedIds([splitMatch.split_id]);
              } else if (
                rows.some((r) => String(r.payment_id) === String(p.payment_id))
              ) {
                setSelectedIds([p.payment_id]);
              }
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

  // Look up booked amounts the involved candidates already have in the chosen
  // target month — those can be consolidated into one invoice at confirm time.
  useEffect(() => {
    if (!modal || !modal.open) return;
    const nameByEnrollment = {};
    let items = [];
    if (modal.isBulk) {
      const enrollmentIds = [
        ...new Set(
          (modal.payments || [])
            .map((p) => String(p.enrollment_id || ""))
            .filter(Boolean),
        ),
      ];
      for (const p of modal.payments || []) {
        const eid = String(p.enrollment_id || "");
        if (eid && !nameByEnrollment[eid])
          nameByEnrollment[eid] = p.student_name || "";
      }
      items = enrollmentIds.map((eid) => ({
        enrollment_id: eid,
        year,
        month,
      }));
    } else if (payments.length) {
      const eids = new Set();
      for (const p of payments) {
        const eid = String(p.enrollment_id || "");
        if (eid) {
          eids.add(eid);
          if (!nameByEnrollment[eid]) nameByEnrollment[eid] = p.student_name || "";
        }
      }
      items = [...eids].map((eid) => ({ enrollment_id: eid, year, month }));
    }
    if (!items.length) {
      setExistingGroups([]);
      setMergeTarget({});
      return;
    }
    setExistingLoading(true);
    paymentsAdminApi
      .getExistingBookedAmounts(items)
      .then((res) => {
        const groups = [];
        const targets = {};
        for (const r of res.data?.results || []) {
          const bookings = r.bookings || [];
          if (!bookings.length) continue;
          const eid = String(r.enrollment_id);
          groups.push({
            enrollment_id: eid,
            student_name: nameByEnrollment[eid] || "",
            bookings,
          });
          const firstMergeable = bookings.find(
            (b) => b.invoice_status !== "sent",
          );
          targets[eid] = firstMergeable ? firstMergeable.booked_amount_id : "";
        }
        setExistingGroups(groups);
        setMergeTarget(targets);
      })
      .catch(() => {
        setExistingGroups([]);
        setMergeTarget({});
      })
      .finally(() => setExistingLoading(false));
  }, [modal, year, month, payments]);

  if (!modal || !modal.open) return null;
  if (!modal.isBulk && !modal.payment) return null;

  const initialPayment = modal.payment;

  const rowKey = (r) => r.split_id || r.payment_id;
  const selectedRows = payments.filter((p) =>
    selectedIds.includes(rowKey(p)),
  );

  const toggleSelect = (key) => {
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key],
    );
  };

  const selectMergeTarget = (enrollmentId, bookedAmountId) => {
    setMergeTarget((prev) => ({ ...prev, [enrollmentId]: bookedAmountId }));
  };

  const totalMergeCount = Object.values(mergeTarget).filter(Boolean).length;

  const mergeableCount = existingGroups.reduce(
    (sum, g) =>
      sum + g.bookings.filter((b) => b.invoice_status !== "sent").length,
    0,
  );
  const sentOnlyCount = existingGroups.reduce(
    (sum, g) =>
      sum + g.bookings.filter((b) => b.invoice_status === "sent").length,
    0,
  );
  const hasMergeableBookings = mergeableCount > 0;

  const handleClose = () => {
    setPayments([]);
    setSelectedIds([]);
    setError("");
    setLoading(false);
    setShowBookingConfirmation(false);
    setMergePrompt(false);
    setExistingGroups([]);
    setMergeTarget({});
    setModal({ open: false, payment: null });
  };

  const openBookingConfirmation = () => {
    if (selectedIds.length === 0) {
      setError("Please select at least one transaction to book");
      return;
    }
    setError("");
    if (hasMergeableBookings) {
      setMergePrompt(true);
    } else {
      setShowBookingConfirmation(true);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const paymentIds = selectedRows
        .filter((r) => !r.is_split)
        .map((r) => r.payment_id);
      const splitIds = selectedRows
        .filter((r) => r.is_split)
        .map((r) => r.split_id);
      if (modal.isBulk) {
        const mergeMap = {};
        for (const [eid, targetId] of Object.entries(mergeTarget)) {
          if (targetId) mergeMap[eid] = [targetId];
        }
        await onConfirm({
          payment_ids: paymentIds,
          split_ids: splitIds,
          year,
          month,
          notes,
          isBulk: true,
          merge_map: mergeMap,
        });
      } else {
        const eids = [
          ...new Set(selectedRows.map((r) => String(r.enrollment_id || ""))),
        ].filter(Boolean);
        if (eids.length !== 1) {
          setError(
            "Selected items must belong to a single candidate — book each candidate separately.",
          );
          return;
        }
        const eid = eids[0];
        await onConfirm({
          enrollment_id: eid,
          payment_ids: paymentIds,
          split_ids: splitIds,
          year,
          month,
          notes,
          merge_booked_amount_ids: mergeTarget[eid] ? [mergeTarget[eid]] : [],
        });
      }
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to book amount");
    } finally {
      setLoading(false);
    }
  };

  const totalPaise = selectedRows.reduce(
    (sum, p) => sum + Number(p.amount_paise || 0),
    0,
  );

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
                  const key = rowKey(p);
                  const txId = p.razorpay_payment_id || p.payment_id.slice(0, 8);
                  const isChecked = selectedIds.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors select-none ${
                        isChecked ? "bg-slate-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(key)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          {formatInrFromPaise(p.amount_paise)}
                          {p.is_split && (
                            <span
                              className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700 border border-violet-200"
                              title="Training share split from a recruitment payment"
                            >
                              Training split
                            </span>
                          )}
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

          {/* Existing bookings awareness — merge choice is forced at confirm */}
          {existingLoading ? (
            <p className="text-xs text-slate-400 py-1">
              Checking existing bookings for this month...
            </p>
          ) : hasMergeableBookings ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-[11px] font-medium text-indigo-800">
              {mergeableCount} existing booking
              {mergeableCount === 1 ? "" : "s"} already exist
              {mergeableCount === 1 ? "s" : ""} for {MONTH_NAMES[month]} {year} —
              you will be asked which booking to add the new payments to, or to
              book separately.
            </div>
          ) : sentOnlyCount > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-medium text-slate-600">
              {sentOnlyCount} existing booking{sentOnlyCount === 1 ? "" : "s"} in{" "}
              {MONTH_NAMES[month]} {year} already{" "}
              {sentOnlyCount === 1 ? "has" : "have"} a sent invoice — this will
              be booked as a separate invoice.
            </div>
          ) : null}

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
            onClick={openBookingConfirmation}
            disabled={loading || selectedIds.length === 0}
          >
            Confirm Booking
          </ControlButton>
        </div>
      </div>

      {mergePrompt ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <h4 className="text-base font-bold text-slate-900">
              Existing bookings in {MONTH_NAMES[month]} {year}
            </h4>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              {modal.isBulk
                ? "Some selected candidates already have booked amounts for this month. Pick which booking the new payments get added to — its invoice covers the combined amount."
                : "This candidate already has booked amounts for this month. Pick which booking the new payments get added to — its invoice covers the combined amount."}
            </p>

            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {existingGroups.map((g) => (
                <div
                  key={g.enrollment_id}
                  className="rounded-xl border border-slate-200 overflow-hidden"
                >
                  {modal.isBulk ? (
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                      {g.student_name || "Candidate"}
                    </div>
                  ) : null}
                  <div className="divide-y divide-slate-100">
                    {g.bookings.map((b) => {
                      const isSent = b.invoice_status === "sent";
                      const isDraft = b.invoice_status === "generated";
                      const checked =
                        mergeTarget[g.enrollment_id] === b.booked_amount_id;
                      return (
                        <label
                          key={b.booked_amount_id}
                          className={`flex items-start gap-2.5 px-3 py-2 select-none ${
                            isSent
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer hover:bg-slate-50/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`merge-${g.enrollment_id}`}
                            disabled={isSent}
                            checked={checked}
                            onChange={() =>
                              selectMergeTarget(
                                g.enrollment_id,
                                b.booked_amount_id,
                              )
                            }
                            className="mt-0.5 h-4 w-4 rounded-full border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-800">
                                {formatInrFromPaise(b.amount_paise)}
                              </p>
                              {isSent ? (
                                <span className="rounded-md border border-rose-100 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                  Sent {b.invoice_number || ""}
                                </span>
                              ) : isDraft ? (
                                <span className="rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                                  Draft {b.invoice_number || ""}
                                </span>
                              ) : (
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                  No invoice
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {b.txn_count} payment{b.txn_count === 1 ? "" : "s"}{" "}
                              · booked {formatIstDate(b.created_at)}
                              {isSent
                                ? " — locked, invoice already sent"
                                : isDraft
                                  ? " — draft will be regenerated"
                                  : ""}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                    <label className="flex items-start gap-2.5 px-3 py-2 select-none cursor-pointer hover:bg-slate-50/50">
                      <input
                        type="radio"
                        name={`merge-${g.enrollment_id}`}
                        checked={!mergeTarget[g.enrollment_id]}
                        onChange={() => selectMergeTarget(g.enrollment_id, "")}
                        className="mt-0.5 h-4 w-4 rounded-full border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800">
                          Book as a separate invoice
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          creates a new booked amount — its own invoice
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              {modal.isBulk
                ? `${totalMergeCount} candidate${totalMergeCount === 1 ? "" : "s"} will merge into an existing booking, ${existingGroups.length - totalMergeCount} will be booked separately.`
                : totalMergeCount > 0
                  ? "New payments will be added to the selected booking — one invoice covers the combined amount."
                  : "New payments will be booked as a separate invoice."}
            </p>

            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <ControlButton
                variant="secondary"
                onClick={() => setMergePrompt(false)}
                disabled={loading}
              >
                Go Back
              </ControlButton>
              <ControlButton
                variant="primary"
                onClick={() => {
                  setMergePrompt(false);
                  setShowBookingConfirmation(true);
                }}
                disabled={loading}
              >
                Continue
              </ControlButton>
            </div>
          </div>
        </div>
      ) : null}

      {showBookingConfirmation ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900">Confirm Booking Month</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to book {formatInrFromPaise(totalPaise)} in {MONTH_NAMES[month]} {year}?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {modal.isBulk
                ? `${selectedIds.length} selected payments will be booked.`
                : `${initialPayment?.student_name || "This candidate"}'s selected payments will be booked.`}
            </p>
            {totalMergeCount > 0 ? (
              <p className="mt-2 text-xs font-medium text-indigo-700">
                {modal.isBulk
                  ? `${totalMergeCount} candidate${totalMergeCount === 1 ? "" : "s"} will merge into an existing booking — its invoice covers the combined amount.`
                  : "The new payments will be added to the existing booking — one invoice covers the combined amount."}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <ControlButton
                variant="secondary"
                onClick={() => setShowBookingConfirmation(false)}
                disabled={loading}
              >
                Go Back
              </ControlButton>
              <ControlButton
                variant="primary"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Booking..." : "Yes, Book Amount"}
              </ControlButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
