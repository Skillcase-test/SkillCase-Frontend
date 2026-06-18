import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";
import { formatIstDateTime } from "../../utils/formatters";
import { MONTH_NAMES } from "../../utils/constants";

export function useActionsPayments(state) {
  const {
    rows,
    year,
    month,
    setError,
    setNotice,
    setReconciling,
    loadTabData,
    setFeeBreakdownModal,
    feeBreakdownCache,
    setFeeBreakdownCache,
    setFeeBreakdownLoading,
    setManualPaymentModal,
    setRelinkModal,
    setBookAmountModal,
    paymentAllTime,
    debouncedPaymentSearch,
    paymentSortBy,
    paymentSortOrder,
    paymentBookedOnly,
  } = state;

  async function exportPaymentsExcel() {
    try {
      const res = await paymentsAdminApi.getPaymentView(year, month, {
        search: debouncedPaymentSearch || undefined,
        sortBy: paymentSortBy,
        sortOrder: paymentSortOrder,
        all: paymentAllTime || undefined,
        booked: paymentBookedOnly || undefined,
        download: true,
      });
      const downloadRows = res.data.rows || [];

      const headers = [
        "Student Name",
        "Phone",
        "Batch",
        "Amount (INR)",
        "Status",
        "Payment ID",
        "Paid At",
        "Booked Month",
        "Candidate Type",
      ];
      const data = downloadRows.map((r) => [
        r.student_name || "",
        r.student_phone || "",
        r.batch_name || "",
        (Number(r.amount_paise || 0) / 100).toFixed(2),
        r.payment_status || "",
        r.razorpay_payment_id || "",
        r.paid_at ? formatIstDateTime(r.paid_at) : "",
        r.booked_month ? (MONTH_NAMES[r.booked_month] || "null") : "null",
        r.enrollment_notes?.candidate_type === "recruitment" ? "Recruitment" : "Student",
      ]);

      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Payments</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            table { border-collapse: collapse; }
            th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; }
            td { border: 1px solid #cbd5e1; padding: 6px; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data.map((row) => `
                <tr>
                  ${row.map((cell) => `<td>${cell}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseFilename = paymentAllTime
        ? "payments_all_time"
        : `payments_${year}_${String(month).padStart(2, "0")}`;
      const filename = `${baseFilename}${paymentBookedOnly ? "_booked" : ""}.xls`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to download payments Excel");
    }
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


  async function openFeeBreakdown({ enrollmentId, studentName }) {
    const cacheKey = `${enrollmentId}|${year}|${month}|due`;
    if (feeBreakdownCache[cacheKey]) {
      setFeeBreakdownModal({
        open: true,
        title: `${studentName || "Candidate"} - Closing Due Breakdown`,
        rows: feeBreakdownCache[cacheKey],
        mode: "due",
      });
      return;
    }
    setFeeBreakdownLoading(true);
    setFeeBreakdownModal({
      open: true,
      title: `${studentName || "Candidate"} - Closing Due Breakdown`,
      rows: [],
      mode: "due",
    });
    try {
      const res = await paymentsAdminApi.getTotalFeeBreakdown(enrollmentId, year, month);
      const rowsOut = Array.isArray(res?.data?.rows) ? res.data.rows : [];
      setFeeBreakdownCache((prev) => ({ ...prev, [cacheKey]: rowsOut }));
      setFeeBreakdownModal((prev) => ({ ...prev, rows: rowsOut, mode: "due" }));
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to load fee breakdown");
      setFeeBreakdownModal((prev) => ({ ...prev, rows: [] }));
    } finally {
      setFeeBreakdownLoading(false);
    }
  }

  async function openDiscountBreakdown({ enrollmentId, studentName }) {
    const cacheKey = `${enrollmentId}|${year}|${month}|discount`;
    if (feeBreakdownCache[cacheKey]) {
      setFeeBreakdownModal({
        open: true,
        title: `${studentName || "Candidate"} - Discount Breakdown`,
        rows: feeBreakdownCache[cacheKey],
        mode: "discount",
      });
      return;
    }
    setFeeBreakdownLoading(true);
    setFeeBreakdownModal({
      open: true,
      title: `${studentName || "Candidate"} - Discount Breakdown`,
      rows: [],
      mode: "discount",
    });
    try {
      const res = await paymentsAdminApi.getTotalFeeBreakdown(enrollmentId, year, month);
      const rowsOut = (Array.isArray(res?.data?.rows) ? res.data.rows : []).filter(
        (row) => Number(row.discount_amount_paise || 0) > 0,
      );
      setFeeBreakdownCache((prev) => ({ ...prev, [cacheKey]: rowsOut }));
      setFeeBreakdownModal((prev) => ({ ...prev, rows: rowsOut, mode: "discount" }));
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to load discount breakdown");
      setFeeBreakdownModal((prev) => ({ ...prev, rows: [] }));
    } finally {
      setFeeBreakdownLoading(false);
    }
  }

  async function handleCreateManualTransaction(payload) {
    setError("");
    try {
      await paymentsAdminApi.createManualTransaction(payload);
      setManualPaymentModal({ open: false, mode: "create", data: null });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to create manual payment");
    }
  }

  async function handleUpdateManualTransaction(paymentId, payload) {
    setError("");
    try {
      await paymentsAdminApi.updateManualTransaction(paymentId, payload);
      setManualPaymentModal({ open: false, mode: "create", data: null });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to update manual payment");
    }
  }

  async function handleDeleteManualTransaction(paymentId) {
    if (!window.confirm("Are you sure you want to delete this payment transaction?")) return;
    setError("");
    try {
      await paymentsAdminApi.deleteManualTransaction(paymentId);
      setNotice("Payment transaction deleted successfully");
      setManualPaymentModal({ open: false, mode: "create", data: null });
      await loadTabData();
      alert("Payment transaction deleted successfully");
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to delete payment transaction");
    }
  }

  async function handleRelinkTransactionByPhone(paymentId, phone) {
    setError("");
    try {
      const res = await paymentsAdminApi.relinkTransactionByPhone(paymentId, phone);
      setNotice(res.data?.msg || "Payment successfully relinked to the candidate");
      setRelinkModal({ open: false, payment: null });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to relink payment transaction");
      throw err;
    }
  }

  return {
    exportPaymentsExcel,
    handleReconcile,
    openFeeBreakdown,
    openDiscountBreakdown,
    handleCreateManualTransaction,
    handleUpdateManualTransaction,
    handleDeleteManualTransaction,
    handleRelinkTransactionByPhone,
    handleBookAmount: async (payload) => {
      setError("");
      try {
        await paymentsAdminApi.bookAmount(payload);
        setNotice("Amount booked successfully");
        setBookAmountModal({ open: false, payment: null });
        await loadTabData();
      } catch (err) {
        setError(err?.response?.data?.msg || "Failed to book amount");
        throw err;
      }
    },
  };
}
