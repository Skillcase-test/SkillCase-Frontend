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

  async function handleBulkGenerateInvoices(items) {
    if (!Array.isArray(items) || !items.length) return null;
    try {
      const res = await paymentsAdminApi.generateInvoicesBulk({ items });
      const { generated_count, skipped_count } = res.data || {};
      if (setNotice) {
        setNotice(
          `Generated ${generated_count || 0} invoice draft(s)${
            skipped_count ? ` (${skipped_count} skipped)` : ""
          }`,
        );
      }
      await loadTabData();
      return res.data;
    } catch (err) {
      setError(
        err?.response?.data?.msg ||
          err?.message ||
          "Bulk invoice generation failed",
      );
      throw err;
    }
  }

  async function handleBulkSendInvoices(invoiceIds) {
    if (!Array.isArray(invoiceIds) || !invoiceIds.length) return null;
    try {
      const res = await paymentsAdminApi.sendInvoicesBulk({
        invoice_ids: invoiceIds,
      });
      const { sent_count, skipped_count } = res.data || {};
      if (setNotice) {
        setNotice(
          `Sent ${sent_count || 0} invoice(s)${
            skipped_count ? ` (${skipped_count} skipped)` : ""
          }`,
        );
      }
      await loadTabData();
      return res.data;
    } catch (err) {
      setError(
        err?.response?.data?.msg ||
          err?.message ||
          "Bulk invoice sending failed",
      );
      throw err;
    }
  }

  return {
    handleGenerateInvoice,
    handleBulkGenerateInvoices,
    handleSendInvoice,
    handleBulkSendInvoices,
    handleCancelInvoice,
  };
}
