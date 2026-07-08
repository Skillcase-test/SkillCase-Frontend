import { useState, useEffect } from "react";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2 } from "lucide-react";
import { ActionChip } from "../components/controls";
import { MONTH_NAMES } from "../utils/constants";

export function PaymentViewTab({
  rows,
  paymentSortBy,
  paymentSortOrder,
  setPaymentSortBy,
  setPaymentSortOrder,
  setRelinkModal,
  handleDeleteManualTransaction,
  handleRefund,
  refundingPaymentId,
  setBookAmountModal,
  handleTagRecruitment,
  savingEnrollmentId,
  totalAmountPaise,
}) {
  const [selectedTxIds, setSelectedTxIds] = useState([]);

  useEffect(() => {
    setSelectedTxIds([]);
  }, [rows]);

  const bookableRows = rows.filter(
    (r) =>
      !r.booked_amount_id &&
      ["captured", "authorized", "processed"].includes(r.payment_status) &&
      Number(r.signed_amount_paise ?? r.amount_paise) > 0
  );

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
        : [...prev, paymentId]
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

  const selectedPayments = rows.filter((r) => selectedTxIds.includes(r.payment_id));
  const selectedAmountPaise = selectedPayments.reduce(
    (sum, r) => sum + Number(r.signed_amount_paise ?? r.amount_paise ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      {selectedTxIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              Selected <span className="font-bold text-slate-900">{selectedTxIds.length}</span> payments (Total: <span className="font-bold text-slate-900">{formatInrFromPaise(selectedAmountPaise)}</span>)
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
                  checked={bookableRows.length > 0 && selectedTxIds.length === bookableRows.length}
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
            {rows.map((r, i) => (
              <tr
                key={r.payment_id || i}
                className={`group ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} ${
                  selectedTxIds.includes(r.payment_id) ? "bg-slate-50/80" : ""
                }`}
              >
                <td className="px-3 py-3 text-center">
                  {!r.booked_amount_id &&
                  ["captured", "authorized", "processed"].includes(r.payment_status) &&
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
                <td className="px-3 py-3">{r.student_name || "-"}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <span>{r.student_phone || "-"}</span>
                    {(!r.metadata_json || r.metadata_json.source !== "admin_manual_actual") && (
                      <button
                        onClick={() => setRelinkModal({ open: true, payment: r })}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 transition-all text-slate-500"
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
                <td className="px-2 py-2">{r.paid_at ? formatIstDateTime(r.paid_at) : "-"}</td>
                <td className="px-2 py-2">{r.razorpay_payment_id || "-"}</td>
                <td className="px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {r.booked_amount_id ? (
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        Booked: {MONTH_NAMES[r.booked_month] || r.booked_month}{" "}
                        {r.booked_year}
                      </span>
                    ) : (
                      ["captured", "authorized", "processed"].includes(
                        r.payment_status,
                      ) &&
                      Number(r.signed_amount_paise ?? r.amount_paise) > 0 && (
                        <ActionChip
                          onClick={() =>
                            setBookAmountModal({ open: true, payment: r })
                          }
                          variant="success"
                        >
                          Book
                        </ActionChip>
                      )
                    )}
                    {r.enrollment_id &&
                      (r.enrollment_notes?.candidate_type === "recruitment" ? (
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
                    {r.metadata_json?.source === "admin_manual_actual" && (
                      <ActionChip
                        onClick={() =>
                          handleDeleteManualTransaction(r.payment_id)
                        }
                        variant="danger"
                      >
                        Delete
                      </ActionChip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 font-bold text-slate-800">Total Amount</td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 font-bold">
                {formatInrFromPaise(totalAmountPaise)}
              </td>
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
