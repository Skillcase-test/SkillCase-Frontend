import React, { useState, useEffect } from "react";
import {
  ControlButton,
  ControlDropdown,
  ControlInput,
} from "../components/controls";
import {
  formatInrFromPaise,
  formatIstDateTime,
  formatIstDate,
} from "../utils/formatters";
import { MONTH_NAMES } from "../utils/constants";

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
  filteredEnrollmentOptions,
  selectedInvoicePaymentId,
  invoicePaymentOptions,
  selectedEnrollment,
  handleGenerateInvoice,
  handleSendInvoice,
  handleCancelInvoice,
  selectedEnrollmentInvoiceRows,
}) {
  const [step, setStep] = useState(1);
  const [verifiedState, setVerifiedState] = useState("");
  const [draftInvoice, setDraftInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setStep(1);
    setDraftInvoice(null);
    setVerifiedState(selectedEnrollment?.notes?.state || "");
    setLocalError("");
  }, [selectedEnrollmentId, selectedInvoicePaymentId, selectedEnrollment]);

  const handleStartFlow = () => {
    setVerifiedState(selectedEnrollment?.notes?.state || "");
    setLocalError("");
    setStep(2);
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
        setDraftInvoice(inv);
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Generate And Send Invoice
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Pick candidate, pick uninvoiced payment, verify state, preview
          generated PDF, and send.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <ControlDropdown
            id="select-candidate-dropdown"
            value={selectedEnrollmentId}
            onChange={(val) => {
              setSelectedEnrollmentId(String(val));
              setSelectedInvoicePaymentId("");
            }}
            placeholder="Search and select enrollment"
            searchable
            options={filteredEnrollmentOptions.map((r) => ({
              value: r.enrollment_id,
              label: `${r.student_name || "Unnamed"} - ${r.student_phone || "-"}`,
            }))}
          />
          <ControlDropdown
            id="select-payment-dropdown"
            value={selectedInvoicePaymentId}
            onChange={setSelectedInvoicePaymentId}
            placeholder="Select Uninvoiced Payment"
            disabled={!selectedEnrollmentId}
            options={invoicePaymentOptions.map((p) => {
              const labelDate = `${MONTH_NAMES[p.target_month]} ${p.target_year}`;
              const clubbedText =
                Array.isArray(p.transactions) && p.transactions.length > 0
                  ? " (" +
                    p.transactions
                      .map(
                        (t) =>
                          `${formatIstDate(t.paid_at)} - ${formatInrFromPaise(t.amount_paise)}`,
                      )
                      .join(", ") +
                    ")"
                  : "";
              return {
                value: p.booked_amount_id,
                label: `Booked: ${labelDate} - ${formatInrFromPaise(p.amount_paise)}${clubbedText}`,
              };
            })}
          />
          <ControlInput
            value={selectedEnrollment?.student_email || ""}
            readOnly
            placeholder="Candidate email auto-filled"
            className="bg-slate-100 text-slate-700"
          />
          <ControlButton
            id="start-invoice-flow-btn"
            onClick={handleStartFlow}
            disabled={!selectedEnrollmentId || !selectedInvoicePaymentId}
            variant="primary"
            className="px-4"
          >
            Generate Invoice
          </ControlButton>
        </div>
      </div>

      {selectedEnrollmentId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">
            Invoice Logs For Selected Enrollment
          </h4>
          {selectedEnrollmentInvoiceRows.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No invoice generated yet for this enrollment.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedEnrollmentInvoiceRows.map((inv) => (
                <span
                  key={inv.invoice_id}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                >
                  {inv.invoice_number} | {formatInrFromPaise(inv.amount_paise)}{" "}
                  | {inv.status} | {formatIstDateTime(inv.created_at)}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Step 2: State Verification Modal */}
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
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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

      {/* Step 3: PDF Preview Modal */}
      {step === 3 && draftInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col h-[90vh]">
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Preview GST Invoice
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Review the computed GST details and PDF layout before sending
                  it to the candidate.
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
                GST breakdown matches candidate's state ({verifiedState}).
              </span>
              <div className="flex gap-2">
                <ControlButton
                  id="cancel-discard-invoice-btn"
                  variant="secondary"
                  onClick={handleCancelDraft}
                  disabled={isSending || isCancelling}
                  className="border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  {isCancelling ? "Cancelling..." : "Cancel & Discard"}
                </ControlButton>
                <ControlButton
                  id="confirm-send-invoice-btn"
                  variant="primary"
                  onClick={handleConfirmAndSend}
                  disabled={isSending || isCancelling}
                >
                  {isSending ? "Sending..." : "Confirm & Send Email"}
                </ControlButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
