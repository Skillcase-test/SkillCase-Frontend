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

  async function handleGenerateInvoice(stateOverride) {
    if (!selectedEnrollmentId || !selectedInvoicePaymentId) return null;
    try {
      const bookedAmount = invoicePaymentRows.find(
        (p) => String(p.booked_amount_id) === String(selectedInvoicePaymentId),
      );
      const invoiceYear = bookedAmount ? bookedAmount.target_year : year;
      const invoiceMonth = bookedAmount ? bookedAmount.target_month : month;
      const gen = await paymentsAdminApi.generateInvoice({
        enrollment_id: selectedEnrollmentId,
        year: invoiceYear,
        month: invoiceMonth,
        booked_amount_id: selectedInvoicePaymentId,
        state: stateOverride,
      });
      return gen.data.invoice;
    } catch (err) {
      setError(err?.response?.data?.msg || "Invoice generation failed");
      throw err;
    }
  }

  async function handleSendInvoice(invoiceId) {
    if (!invoiceId) return;
    try {
      await paymentsAdminApi.sendInvoice({
        invoice_id: invoiceId,
      });
      setSelectedInvoicePaymentId("");
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Sending invoice failed");
      throw err;
    }
  }

  async function handleCancelInvoice(invoiceId) {
    if (!invoiceId) return;
    try {
      await paymentsAdminApi.deleteInvoice(invoiceId);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Cancelling invoice failed");
      throw err;
    }
  }

  return {
    handleGenerateInvoice,
    handleSendInvoice,
    handleCancelInvoice,
  };
}
