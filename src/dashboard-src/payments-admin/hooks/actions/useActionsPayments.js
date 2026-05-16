import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";

export function useActionsPayments(state) {
  const {
    rows,
    year,
    month,
    setError,
    setReconciling,
    loadTabData,
    setRefundingPaymentId,
    setFeeBreakdownModal,
    feeBreakdownCache,
    setFeeBreakdownCache,
    setFeeBreakdownLoading,
  } = state;

  async function exportPaymentsCsv() {
    const headers = [
      "Student Name",
      "Phone",
      "Batch",
      "Amount (INR)",
      "Status",
      "Razorpay Payment ID",
      "Paid At",
    ];
    const lines = rows.map((r) => [
      r.student_name || "",
      r.student_phone || "",
      r.batch_name || "",
      (Number(r.amount_paise || 0) / 100).toFixed(2),
      r.payment_status || "",
      r.razorpay_payment_id || "",
      r.paid_at || "",
    ]);
    const csv = [headers, ...lines].map((x) => x.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${year}_${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleReconcile() {
    setReconciling(true);
    setError("");
    try {
      await paymentsAdminApi.reconcile({ year, month });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Reconcile failed");
    } finally {
      setReconciling(false);
    }
  }

  async function handleRefund(paymentId) {
    if (!window.confirm("Process refund for this payment?")) return;
    setRefundingPaymentId(paymentId);
    try {
      await paymentsAdminApi.refundPayment(paymentId);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Refund failed");
    } finally {
      setRefundingPaymentId("");
    }
  }

  async function openFeeBreakdown({ enrollmentId, type, studentName }) {
    const cacheKey = `${enrollmentId}|${year}|${month}|${type}`;
    if (feeBreakdownCache[cacheKey]) {
      setFeeBreakdownModal({
        open: true,
        title: `${studentName || "Candidate"} - ${type === "paid" ? "Paid Breakdown" : "Closing Due Breakdown"}`,
        rows: feeBreakdownCache[cacheKey],
      });
      return;
    }
    setFeeBreakdownLoading(true);
    setFeeBreakdownModal({
      open: true,
      title: `${studentName || "Candidate"} - ${type === "paid" ? "Paid Breakdown" : "Closing Due Breakdown"}`,
      rows: [],
    });
    try {
      const res = await paymentsAdminApi.getTotalFeeBreakdown(enrollmentId, year, month, type);
      const rowsOut = Array.isArray(res?.data?.rows) ? res.data.rows : [];
      setFeeBreakdownCache((prev) => ({ ...prev, [cacheKey]: rowsOut }));
      setFeeBreakdownModal((prev) => ({ ...prev, rows: rowsOut }));
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to load fee breakdown");
      setFeeBreakdownModal((prev) => ({ ...prev, rows: [] }));
    } finally {
      setFeeBreakdownLoading(false);
    }
  }

  return { exportPaymentsCsv, handleReconcile, handleRefund, openFeeBreakdown };
}
