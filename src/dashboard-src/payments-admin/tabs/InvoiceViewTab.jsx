import React, { useState, useEffect } from "react";
import { ControlButton, ControlInput } from "../components/controls";
import {
  formatInrFromPaise,
  formatIstDateTime,
  formatIstDate,
} from "../utils/formatters";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export function InvoiceViewTab({
  selectedEnrollmentId,
  setSelectedEnrollmentId,
  setSelectedInvoicePaymentId,
  selectedInvoicePaymentId,
  selectedEnrollment,
  handleGenerateInvoice,
  handleSendInvoice,
  handleCancelInvoice,
  invoicePaymentRows = [],
  invoiceRows = [],
  allSearch = "",
}) {
  const [step, setStep] = useState(1);
  const [verifiedState, setVerifiedState] = useState("");
  const [draftInvoice, setDraftInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setStep(1);
    setDraftInvoice(null);
    setLocalError("");
  }, [selectedEnrollmentId, selectedInvoicePaymentId]);

  useEffect(() => {
    if (selectedEnrollment?.notes?.state) {
      setVerifiedState(selectedEnrollment.notes.state);
    } else {
      setVerifiedState("");
    }
  }, [selectedEnrollment]);

  const handleStartFlowForRow = async (row, options = {}) => {
    setSelectedEnrollmentId(row.enrollment_id);
    setSelectedInvoicePaymentId(row.booked_amount_id);
    setVerifiedState(row.enrollment_notes?.state || row.notes?.state || "");
    setLocalError("");

    if (row.draft_invoice_id && !options.forceRegenerate) {
      setIsGenerating(true);
      try {
        const res = await paymentsAdminApi.getInvoicePdf(row.draft_invoice_id);
        setDraftInvoice({
          invoice_id: row.draft_invoice_id,
          invoice_number: res.data.invoice_number,
          pdf_base64: res.data.pdf_base64,
          isSent: false,
        });
        setStep(3);
      } catch (err) {
        alert(err?.response?.data?.msg || "Failed to fetch draft invoice PDF");
      } finally {
        setIsGenerating(false);
      }
    } else {
      setStep(2);
    }
  };

  const handleQuickSend = async (row) => {
    if (
      !window.confirm(
        `Are you sure you want to send draft invoice ${row.draft_invoice_number} to ${row.student_name}?`
      )
    ) {
      return;
    }
    setIsSending(true);
    setLocalError("");
    try {
      await handleSendInvoice(row.draft_invoice_id);
    } catch (err) {
      alert(err?.response?.data?.msg || "Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

  const handleClosePreview = () => {
    setStep(1);
    setDraftInvoice(null);
  };

  const handleConfirmStateAndGenerate = async () => {
    if (!verifiedState) {
      setLocalError("Please select a state to proceed");
      return;
    }
    setIsGenerating(true);
    setLocalError("");
    try {
      const inv = await handleGenerateInvoice(verifiedState);
      if (inv) {
        setDraftInvoice({
          ...inv,
          isSent: false,
        });
        setStep(3);
      } else {
        setLocalError("Failed to generate draft invoice");
      }
    } catch (err) {
      setLocalError(
        err?.response?.data?.msg || "Failed to generate draft invoice",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAndSend = async () => {
    if (!draftInvoice?.invoice_id) return;
    setIsSending(true);
    setLocalError("");
    try {
      await handleSendInvoice(draftInvoice.invoice_id);
      setStep(1);
      setDraftInvoice(null);
    } catch (err) {
      setLocalError(err?.response?.data?.msg || "Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelDraft = async () => {
    if (!draftInvoice?.invoice_id) {
      setStep(1);
      return;
    }
    setIsCancelling(true);
    setLocalError("");
    try {
      await handleCancelInvoice(draftInvoice.invoice_id);
      setStep(1);
      setDraftInvoice(null);
    } catch (err) {
      setLocalError(
        err?.response?.data?.msg || "Failed to cancel draft invoice",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleViewSentInvoice = async (invoiceId) => {
    setIsLoadingPdf(true);
    setLocalError("");
    try {
      const res = await paymentsAdminApi.getInvoicePdf(invoiceId);
      setDraftInvoice({
        invoice_number: res.data.invoice_number,
        pdf_base64: res.data.pdf_base64,
        isSent: true,
      });
      setVerifiedState("");
      setStep(3);
    } catch (err) {
      alert(err?.response?.data?.msg || "Failed to fetch invoice PDF");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const filteredPending = (invoicePaymentRows || []).filter((r) => {
    const q = (allSearch || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (r.student_name || "").toLowerCase().includes(q) ||
      (r.student_phone || "").toLowerCase().includes(q) ||
      (r.student_email || "").toLowerCase().includes(q)
    );
  });

  const filteredSent = (invoiceRows || []).filter((r) => {
    const q = (allSearch || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (r.student_name || "").toLowerCase().includes(q) ||
      (r.student_phone || "").toLowerCase().includes(q) ||
      (r.student_email || "").toLowerCase().includes(q) ||
      (r.invoice_number || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Pending Invoices
          </h3>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {filteredPending.length} pending
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold">
                <th className="px-3 py-3">Student details</th>
                <th className="px-2 py-3">Amount Booked</th>
                <th className="px-2 py-3">Linked Payments</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-slate-500 text-xs"
                  >
                    All booked payments for this month have been invoiced, or no
                    payments exist.
                  </td>
                </tr>
              ) : (
                filteredPending.map((r, idx) => (
                  <tr
                    key={r.booked_amount_id}
                    className={
                      idx % 2 === 0
                        ? "bg-white hover:bg-slate-50/50"
                        : "bg-slate-50/60 hover:bg-slate-50/50"
                    }
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">
                        {r.student_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.student_email}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.student_phone}
                      </div>
                    </td>
                    <td className="px-2 py-3 font-semibold text-slate-700">
                      {formatInrFromPaise(r.amount_paise)}
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-600">
                      <div className="font-medium text-slate-700">
                        Target: {r.target_month}/{r.target_year}
                      </div>
                      {Array.isArray(r.transactions) &&
                        r.transactions.length > 0 && (
                          <div className="mt-1 space-y-0.5 max-w-[320px] truncate">
                            {r.transactions.map((t) => (
                              <div
                                key={t.payment_id}
                                className="text-[11px] text-slate-500"
                              >
                                {formatIstDate(t.paid_at)} -{" "}
                                {formatInrFromPaise(t.amount_paise)} (
                                {t.razorpay_payment_id || "manual"})
                              </div>
                            ))}
                          </div>
                        )}
                    </td>
                    <td className="px-2 py-3">
                      {r.draft_invoice_id ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 mr-1">
                            Draft ({r.draft_invoice_number})
                          </span>
                          <ControlButton
                            onClick={() => handleStartFlowForRow(r)}
                            disabled={isGenerating || isSending}
                            variant="secondary"
                            className="h-8 rounded-lg px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </ControlButton>
                          <ControlButton
                            onClick={() => handleStartFlowForRow(r, { forceRegenerate: true })}
                            disabled={isGenerating || isSending}
                            variant="secondary"
                            className="h-8 rounded-lg px-2.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50/50"
                          >
                            Regenerate
                          </ControlButton>
                          <ControlButton
                            onClick={() => handleQuickSend(r)}
                            disabled={isGenerating || isSending}
                            variant="primary"
                            className="h-8 rounded-lg px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white"
                          >
                            {isSending ? "Sending..." : "Send"}
                          </ControlButton>
                        </div>
                      ) : (
                        <ControlButton
                          onClick={() => handleStartFlowForRow(r)}
                          disabled={isGenerating || isSending}
                          variant="primary"
                          className="h-8 rounded-lg px-3 text-xs"
                        >
                          {isGenerating ? "Loading..." : "Generate Draft"}
                        </ControlButton>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Sent Invoices
          </h3>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            {filteredSent.length} sent
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold">
                <th className="px-3 py-3">Invoice Number</th>
                <th className="px-2 py-3">Student details</th>
                <th className="px-2 py-3">Date Sent</th>
                <th className="px-2 py-3">Amount</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSent.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-slate-500 text-xs"
                  >
                    No invoices generated yet for this month.
                  </td>
                </tr>
              ) : (
                filteredSent.map((r, idx) => (
                  <tr
                    key={r.invoice_id}
                    className={
                      idx % 2 === 0
                        ? "bg-white hover:bg-slate-50/50"
                        : "bg-slate-50/60 hover:bg-slate-50/50"
                    }
                  >
                    <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700">
                      {r.invoice_number}
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-semibold text-slate-800">
                        {r.student_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.student_email}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-500">
                      {formatIstDateTime(r.sent_at || r.created_at)}
                    </td>
                    <td className="px-2 py-3 font-semibold text-slate-700">
                      {formatInrFromPaise(r.amount_paise)}
                    </td>
                    <td className="px-2 py-3">
                      <ControlButton
                        onClick={() => handleViewSentInvoice(r.invoice_id)}
                        variant="secondary"
                        disabled={isLoadingPdf}
                        className="h-8 rounded-lg px-3 text-xs"
                      >
                        View PDF
                      </ControlButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {step === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col">
            <div className="border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Verify Candidate State
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Verify the candidate's state for GST calculation. This will
                update their profile notes.
              </p>
            </div>

            <div className="my-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  State / Union Territory
                </label>
                <select
                  id="candidate-state-select"
                  value={verifiedState}
                  onChange={(e) => setVerifiedState(e.target.value)}
                  disabled
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                >
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {localError && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                  {localError}
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex justify-end gap-2">
              <ControlButton
                id="cancel-state-verification-btn"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={isGenerating}
              >
                Cancel
              </ControlButton>
              <ControlButton
                id="confirm-generate-invoice-btn"
                variant="primary"
                onClick={handleConfirmStateAndGenerate}
                disabled={isGenerating || !verifiedState}
              >
                {isGenerating ? "Generating..." : "Confirm & Generate"}
              </ControlButton>
            </div>
          </div>
        </div>
      )}

      {step === 3 && draftInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col h-[90vh]">
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {draftInvoice.isSent
                    ? "View GST Invoice"
                    : "Preview GST Invoice"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {draftInvoice.isSent
                    ? "Viewing completed and dispatched TAX INVOICE statement."
                    : "Review the computed GST details and PDF layout before sending it to the candidate."}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {draftInvoice.invoice_number}
              </span>
            </div>

            <div className="my-4 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
              <iframe
                src={`data:application/pdf;base64,${draftInvoice.pdf_base64}`}
                title="Invoice PDF Preview"
                className="w-full h-full border-none rounded-lg"
              />
            </div>

            {localError && (
              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2.5 my-2">
                {localError}
              </div>
            )}

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                {draftInvoice.isSent
                  ? "This invoice has already been sent to the candidate's email."
                  : `GST breakdown matches candidate's state (${verifiedState}).`}
              </span>
              <div className="flex gap-2">
                {draftInvoice.isSent ? (
                  <ControlButton
                    variant="secondary"
                    onClick={() => setStep(1)}
                    className="px-6"
                  >
                    Close
                  </ControlButton>
                ) : (
                  <>
                    <ControlButton
                      id="cancel-discard-invoice-btn"
                      variant="secondary"
                      onClick={handleCancelDraft}
                      disabled={isSending || isCancelling}
                      className="border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-rose-600"
                    >
                      {isCancelling ? "Discarding..." : "Discard Draft"}
                    </ControlButton>
                    <ControlButton
                      id="modal-regenerate-invoice-btn"
                      variant="secondary"
                      onClick={() => setStep(2)}
                      disabled={isSending || isCancelling}
                      className="border-amber-200 hover:bg-amber-50 hover:text-amber-700 text-amber-700"
                    >
                      Regenerate
                    </ControlButton>
                    <ControlButton
                      id="modal-close-preview-btn"
                      variant="secondary"
                      onClick={handleClosePreview}
                      disabled={isSending || isCancelling}
                      className="border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      Close
                    </ControlButton>
                    <ControlButton
                      id="confirm-send-invoice-btn"
                      variant="primary"
                      onClick={handleConfirmAndSend}
                      disabled={isSending || isCancelling}
                    >
                      {isSending ? "Sending..." : "Confirm & Send Email"}
                    </ControlButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
