import { ActionChip } from "../components/controls";
import { formatInrFromPaise } from "../utils/formatters";

export function PaymentViewTab({ rows, handleRefund, refundingPaymentId }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-3">Name</th>
            <th className="px-2 py-2">Phone</th>
            <th className="px-2 py-2">Amount</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Payment ID</th>
            <th className="px-2 py-2">Refund</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.payment_id || i}
              className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              <td className="px-3 py-3">{r.student_name || "-"}</td>
              <td className="px-2 py-2">{r.student_phone || "-"}</td>
              <td className="px-2 py-2">
                {formatInrFromPaise(r.signed_amount_paise ?? r.amount_paise)}
              </td>
              <td className="px-2 py-2">{r.payment_status || "-"}</td>
              <td className="px-2 py-2">{r.razorpay_payment_id || "-"}</td>
              <td className="px-2 py-2">
                <ActionChip
                  onClick={() => handleRefund(r.payment_id)}
                  disabled={
                    !r.payment_id ||
                    refundingPaymentId === r.payment_id ||
                    r.payment_status === "refunded" ||
                    r.is_refund_entry
                  }
                  variant="danger"
                >
                  {r.is_refund_entry
                    ? "Refund Entry"
                    : r.payment_status === "refunded"
                      ? "Refunded"
                      : refundingPaymentId === r.payment_id
                        ? "Processing..."
                        : "Refund"}
                </ActionChip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
