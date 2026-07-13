import { useState, useEffect, useRef } from "react";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2, Filter, X } from "lucide-react";
import { ActionChip, ControlInput } from "../components/controls";
import { MONTH_NAMES } from "../utils/constants";

export function PaymentViewTab({
  rows,
  paymentSortBy,
  paymentSortOrder,
  setPaymentSortBy,
  setPaymentSortOrder,
  paymentAmountInr,
  setPaymentAmountInr,
  paymentLinksOnly,
  setCurrentPage,
  setRelinkModal,
  handleDeleteManualTransaction,
  handleRefund,
  refundingPaymentId,
  setBookAmountModal,
  handleTagRecruitment,
  savingEnrollmentId,
  totalAmountPaise,
  canManagePayments = true,
}) {
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [amountFilterOpen, setAmountFilterOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState(paymentAmountInr || "");
  const [amountFilterError, setAmountFilterError] = useState("");
  const amountFilterRef = useRef(null);

  useEffect(() => {
    setSelectedTxIds([]);
  }, [rows]);

  useEffect(() => {
    setAmountDraft(paymentAmountInr || "");
    setAmountFilterError("");
  }, [paymentAmountInr]);

  useEffect(() => {
    if (paymentLinksOnly) setAmountFilterOpen(false);
  }, [paymentLinksOnly]);

  useEffect(() => {
    function closeAmountFilter(event) {
      if (amountFilterRef.current && !amountFilterRef.current.contains(event.target)) {
        setAmountFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", closeAmountFilter);
    return () => document.removeEventListener("mousedown", closeAmountFilter);
  }, []);

  const bookableRows = canManagePayments ? rows.filter(
    (r) =>
      !r.is_payment_link &&
      r.enrollment_id &&
      !r.booked_amount_id &&
      ["captured", "authorized", "processed"].includes(r.payment_status) &&
      Number(r.signed_amount_paise ?? r.amount_paise) > 0,
  ) : [];

  const handleToggleSelectAll = () => {
    if (selectedTxIds.length === bookableRows.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(bookableRows.map((r) => r.payment_id));
    }
  };

  const handleToggleSelect = (paymentId) => {
    setSelectedTxIds((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId],
    );
  };

  const handleSort = (field) => {
    if (field === "paid_at") {
      if (paymentSortBy === "paid_at") {
        setPaymentSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setPaymentSortBy("paid_at");
        setPaymentSortOrder("desc");
      }
    } else {
      if (paymentSortBy === field) {
        if (paymentSortOrder === "desc") {
          setPaymentSortOrder("asc");
        } else {
          setPaymentSortBy("paid_at");
          setPaymentSortOrder("desc");
        }
      } else {
        setPaymentSortBy(field);
        setPaymentSortOrder("desc");
      }
    }
  };

  const renderSortIcon = (field) => {
    if (paymentSortBy === field) {
      return paymentSortOrder === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
      );
    }
    return (
      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  };

  const selectedPayments = rows.filter((r) =>
    selectedTxIds.includes(r.payment_id),
  );
  const selectedAmountPaise = selectedPayments.reduce(
    (sum, r) => sum + Number(r.signed_amount_paise ?? r.amount_paise ?? 0),
    0,
  );

  const applyAmountFilter = () => {
    const normalizedAmount = amountDraft.trim();
    if (!normalizedAmount) {
      clearAmountFilter();
      return;
    }
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) ||
      Number(normalizedAmount) <= 0
    ) {
      setAmountFilterError("Enter a positive INR amount with up to two decimal places.");
      return;
    }
    setCurrentPage(1);
    setPaymentAmountInr(normalizedAmount);
    setAmountFilterOpen(false);
  };

  const clearAmountFilter = () => {
    setCurrentPage(1);
    setAmountDraft("");
    setAmountFilterError("");
    setPaymentAmountInr("");
    setAmountFilterOpen(false);
  };

  return (
    <div className="space-y-4">
      {selectedTxIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              Selected{" "}
              <span className="font-bold text-slate-900">
                {selectedTxIds.length}
              </span>{" "}
              payments (Total:{" "}
              <span className="font-bold text-slate-900">
                {formatInrFromPaise(selectedAmountPaise)}
              </span>
              )
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ActionChip
              onClick={() => {
                setBookAmountModal({
                  open: true,
                  isBulk: true,
                  payments: selectedPayments,
                });
              }}
              variant="success"
            >
              Bulk Book Selected
            </ActionChip>
            <button
              onClick={() => setSelectedTxIds([])}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  disabled={!canManagePayments}
                  checked={
                    bookableRows.length > 0 &&
                    selectedTxIds.length === bookableRows.length
                  }
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
              </th>
              <th
                onClick={() => handleSort("student_name")}
                className="px-3 py-3 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Name</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {renderSortIcon("student_name")}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("student_phone")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Phone</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {renderSortIcon("student_phone")}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("amount")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Amount</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {renderSortIcon("amount")}
                  </span>
                  <div ref={amountFilterRef} className="relative">
                    <button
                      type="button"
                      aria-label="Filter by exact payment amount"
                      title="Filter by exact payment amount"
                      disabled={paymentLinksOnly}
                      onClick={(event) => {
                        event.stopPropagation();
                        setAmountFilterOpen((open) => !open);
                      }}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        paymentAmountInr
                          ? "bg-slate-900 text-white"
                          : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      }`}
                    >
                      <Filter size={13} />
                    </button>
                    {amountFilterOpen && !paymentLinksOnly ? (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="absolute left-0 top-full z-30 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">
                            Exact payment amount
                          </span>
                          <button
                            type="button"
                            aria-label="Close amount filter"
                            title="Close"
                            onClick={() => setAmountFilterOpen(false)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <ControlInput
                          value={amountDraft}
                          onChange={(event) => {
                            setAmountDraft(event.target.value);
                            setAmountFilterError("");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") applyAmountFilter();
                          }}
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Amount in INR"
                          className="h-9 w-full text-xs"
                        />
                        {amountFilterError ? (
                          <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
                            {amountFilterError}
                          </p>
                        ) : null}
                        <div className="mt-3 flex justify-end gap-2">
                          <ActionChip type="button" onClick={clearAmountFilter}>
                            Clear
                          </ActionChip>
                          <ActionChip type="button" variant="success" onClick={applyAmountFilter}>
                            Apply
                          </ActionChip>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </th>
              <th
                onClick={() => handleSort("paid_at")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Payment Date</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {renderSortIcon("paid_at")}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("gateway")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Source</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {renderSortIcon("gateway")}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("razorpay_payment_id")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Payment ID</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {renderSortIcon("razorpay_payment_id")}
                  </span>
                </div>
              </th>
              <th className="px-2 py-2 text-center w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                  No payments found for the current filters.
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr
                key={r.payment_id || i}
                className={`group ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} ${
                  selectedTxIds.includes(r.payment_id) ? "bg-slate-50/80" : ""
                }`}
              >
                <td className="px-3 py-3 text-center">
                  {canManagePayments && !r.is_payment_link &&
                  r.enrollment_id &&
                  !r.booked_amount_id &&
                  ["captured", "authorized", "processed"].includes(
                    r.payment_status,
                  ) &&
                  Number(r.signed_amount_paise ?? r.amount_paise) > 0 ? (
                    <input
                      type="checkbox"
                      checked={selectedTxIds.includes(r.payment_id)}
                      onChange={() => handleToggleSelect(r.payment_id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      disabled
                      className="h-4 w-4 rounded border-slate-200 text-slate-200 cursor-not-allowed opacity-40"
                    />
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{r.student_name || "Unknown payer"}</span>
                    {!r.enrollment_id && !r.is_payment_link ? (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Unlinked
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <span>{r.student_phone || "-"}</span>
                    {canManagePayments && !r.is_payment_link &&
                      (!r.metadata_json ||
                        r.metadata_json.source !== "admin_manual_actual") && (
                        <button
                          onClick={() =>
                            setRelinkModal({ open: true, payment: r })
                          }
                          className={`${r.enrollment_id ? "opacity-0 group-hover:opacity-100" : "opacity-100"} p-1 rounded hover:bg-slate-200 transition-all text-slate-500`}
                          title="Link or relink transaction by phone number"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  {formatInrFromPaise(r.signed_amount_paise ?? r.amount_paise)}
                </td>
                <td className="px-2 py-2">
                  {r.paid_at ? formatIstDateTime(r.paid_at) : "-"}
                </td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                    {r.gateway_display || "Razorpay"}
                  </span>
                </td>
                <td className="px-2 py-2">{r.razorpay_payment_id || r.gateway_payment_id || "-"}</td>
                <td className="px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {r.is_payment_link ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <ActionChip
                          onClick={() => {
                            navigator.clipboard.writeText(r.short_url || "");
                            alert("Payment link copied to clipboard!");
                          }}
                          variant="primary"
                        >
                          Copy Link
                        </ActionChip>
                        {r.description && (
                          <span
                            className="text-[9px] text-slate-400 font-medium truncate max-w-[150px]"
                            title={r.description}
                          >
                            {r.description}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {r.booked_amount_id ? (
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            Booked:{" "}
                            {MONTH_NAMES[r.booked_month] || r.booked_month}{" "}
                            {r.booked_year}
                          </span>
                        ) : canManagePayments && r.enrollment_id ? (
                          ["captured", "authorized", "processed"].includes(
                            r.payment_status,
                          ) &&
                          Number(r.signed_amount_paise ?? r.amount_paise) >
                            0 && (
                            <ActionChip
                              onClick={() =>
                                setBookAmountModal({ open: true, payment: r })
                              }
                              variant="success"
                            >
                              Book
                            </ActionChip>
                          )
                        ) : null}
                        {canManagePayments && r.enrollment_id &&
                          (r.enrollment_notes?.candidate_type ===
                          "recruitment" ? (
                            <span
                              className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200"
                              title="Candidate tagged as recruitment"
                            >
                              Recruitment
                            </span>
                          ) : (
                            <ActionChip
                              onClick={() =>
                                handleTagRecruitment?.(
                                  r.enrollment_id,
                                  r.student_name,
                                )
                              }
                              disabled={savingEnrollmentId === r.enrollment_id}
                              variant="primary"
                            >
                              {savingEnrollmentId === r.enrollment_id
                                ? "Tagging..."
                                : "Tag as Recruitment"}
                            </ActionChip>
                          ))}
                        {canManagePayments && r.metadata_json?.source === "admin_manual_actual" && (
                          <ActionChip
                            onClick={() =>
                              handleDeleteManualTransaction(r.payment_id)
                            }
                            variant="danger"
                          >
                            Delete
                          </ActionChip>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 font-bold text-slate-800">
                Total Amount
              </td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 font-bold">
                {formatInrFromPaise(totalAmountPaise)}
              </td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
