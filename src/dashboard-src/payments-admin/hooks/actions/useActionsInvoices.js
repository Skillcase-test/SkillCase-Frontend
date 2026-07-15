import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";

export function useActionsInvoices(state) {
  const {
    selectedEnrollmentId,
    selectedInvoicePaymentId,
    year,
    month,
    setSelectedInvoicePaymentId,
    setError,
    setNotice,
    loadTabData,
    invoicePaymentRows,
  } = state;

  async function handleGenerateInvoice() {
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
      });
      await loadTabData();
      return gen.data.invoice;
    } catch (err) {
      setError(err?.response?.data?.msg || "Invoice generation failed");
      throw err;
    }
  }

  async function handleSendInvoice(invoiceId) {
    if (!invoiceId) return;
    try {
      const res = await paymentsAdminApi.sendInvoice({
        invoice_id: invoiceId,
      });
      setSelectedInvoicePaymentId("");
      if (setNotice) {
        setNotice(`Invoice ${res.data?.invoice?.invoice_number || ""} sent successfully`);
      }
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
      if (setNotice) {
        setNotice("Draft invoice cancelled and discarded");
      }
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
