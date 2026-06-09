import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2 } from "lucide-react";
import { ActionChip } from "../components/controls";

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
}) {
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

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
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
              onClick={() => handleSort("payment_status")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Status</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("payment_status")}
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
              className={`group ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
            >
              <td className="px-3 py-3">{r.student_name || "-"}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <span>{r.student_phone || "-"}</span>
                  {r.student_phone && (
                    <button
                      onClick={() => setRelinkModal({ open: true, payment: r })}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 transition-all text-slate-500"
                      title="Relink transaction by phone number"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </td>
              <td className="px-2 py-2">
                {formatInrFromPaise(r.signed_amount_paise ?? r.amount_paise)}
              </td>
              <td className="px-2 py-2">{r.payment_status || "-"}</td>
              <td className="px-2 py-2">{formatIstDateTime(r.paid_at)}</td>
              <td className="px-2 py-2">{r.razorpay_payment_id || "-"}</td>
              <td className="px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <ActionChip
                    onClick={() => handleDeleteManualTransaction(r.payment_id)}
                    variant="danger"
                  >
                    Delete
                  </ActionChip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
