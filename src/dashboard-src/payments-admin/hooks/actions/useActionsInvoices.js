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
  } = state;

  async function handleGenerateAndSendInvoice() {
    if (!selectedEnrollmentId || !selectedInvoicePaymentId) return;
    try {
      const gen = await paymentsAdminApi.generateInvoice({
        enrollment_id: selectedEnrollmentId,
        year,
        month,
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
