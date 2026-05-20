import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";

export function useActionsInvoices(state) {
  const {
    selectedEnrollmentId,
    selectedInvoicePaymentId,
    year,
    month,
    setSelectedInvoicePaymentId,
    setError,
    loadTabData,
    invoicePaymentRows,
  } = state;

  async function handleGenerateAndSendInvoice() {
    if (!selectedEnrollmentId || !selectedInvoicePaymentId) return;
    try {
      const payment = invoicePaymentRows.find(
        (p) => String(p.payment_id) === String(selectedInvoicePaymentId),
      );
      const paidAt = payment?.paid_at ? new Date(payment.paid_at) : null;
      const invoiceYear = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt.getUTCFullYear() : year;
      const invoiceMonth = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt.getUTCMonth() + 1 : month;
      const gen = await paymentsAdminApi.generateInvoice({
        enrollment_id: selectedEnrollmentId,
        year: invoiceYear,
        month: invoiceMonth,
        payment_id: selectedInvoicePaymentId,
      });
      await paymentsAdminApi.sendInvoice({
        invoice_id: gen.data.invoice.invoice_id,
      });
      setSelectedInvoicePaymentId("");
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Invoice action failed");
    }
  }

  return { handleGenerateAndSendInvoice };
}
