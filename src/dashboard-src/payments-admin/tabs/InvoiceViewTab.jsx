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

const formatMonthYearName = (year, month) => {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

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
  bookedSummaryRows = [],
  bookedSummaryUnbookedTotal = { amount_paise: 0, count: 0 },
  summaryMonthsLimit = 6,
  setSummaryMonthsLimit,
  summaryMonthDetail = null,
  setSummaryMonthDetail,
  summaryCandidatesRows = [],
  summaryCandidatesLoading = false,
  handleViewSummaryMonthCandidates,
  summaryUnbookedDetail = null,
  setSummaryUnbookedDetail,
  summaryUnbookedRows = [],
  summaryUnbookedLoading = false,
  monthSelectionModal = null,
  setMonthSelectionModal,
  handleViewSummaryMonthUnbooked,
  canManageInvoices = true,
  canDownloadInvoices = true,
}) {
  const [step, setStep] = useState(1);
  const [verifiedState, setVerifiedState] = useState("");
  const [candidatesSearch, setCandidatesSearch] = useState("");
  const [draftInvoice, setDraftInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleDownloadExcel = () => {
    const filtered = (summaryCandidatesRows || []).filter((r) => {
      const q = candidatesSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (r.student_name || "").toLowerCase().includes(q) ||
        (r.student_email || "").toLowerCase().includes(q) ||
        (r.student_phone || "").toLowerCase().includes(q)
      );
    });

    const escapeXml = (str) => {
      if (typeof str !== "string") return str;
      return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case "&":
            return "&amp;";
          case "'":
            return "&apos;";
          case '"':
            return "&quot;";
          default:
            return c;
        }
      });
    };

    const headers = [
      "Candidate Name",
      "Phone",
      "Enrollment Date",
      "Candidate Status",
      "Booked On",
      "Booked Amount (INR)",
      "Candidate State",
      "SAC Code",
      "Invoice Number",
      "Invoice Date",
      "Taxable Amount (INR)",
      "IGST (INR)",
      "CGST (INR)",
      "SGST (INR)",
    ];

    const data = filtered.map((r) => [
      escapeXml(r.student_name || ""),
      escapeXml(r.student_phone || ""),
      r.created_at ? formatIstDate(r.created_at) : "",
      r.is_new ? "New Candidate" : "Old Candidate",
      r.booked_at ? formatIstDate(r.booked_at) : "",
      (Number(r.amount_paise || 0) / 100).toFixed(2),
      escapeXml(r.candidate_state || ""),
      r.sac_code || "999293",
      escapeXml(r.invoice_number || ""),
      r.invoice_date ? formatIstDate(r.invoice_date) : "",
      (Number(r.taxable_value_paise || 0) / 100).toFixed(2),
      (Number(r.igst_paise || 0) / 100).toFixed(2),
      (Number(r.cgst_paise || 0) / 100).toFixed(2),
      (Number(r.sgst_paise || 0) / 100).toFixed(2),
    ]);

    const totalAmountPaise = filtered.reduce(
      (sum, r) => sum + Number(r.amount_paise || 0),
      0,
    );
    const totalAmountInr = (totalAmountPaise / 100).toFixed(2);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Booked Candidates</x:Name>
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
            ${data
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell}</td>`).join("")}
              </tr>
            `,
              )
              .join("")}
            <tr style="font-weight: bold; background-color: #f8fafc;">
              <td>Total</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td>${totalAmountInr}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseMonthLabel = summaryMonthDetail?.label
      ? summaryMonthDetail.label.toLowerCase().replace(/\s+/g, "_")
      : "booked_candidates";
    a.download = `booked_candidates_${baseMonthLabel}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadUnbookedExcel = () => {
    const filtered = (summaryUnbookedRows || []).filter((r) => {
      const q = candidatesSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (r.student_name || "").toLowerCase().includes(q) ||
        (r.student_email || "").toLowerCase().includes(q) ||
        (r.student_phone || "").toLowerCase().includes(q)
      );
    });

    const escapeXml = (str) => {
      if (typeof str !== "string") return str;
      return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case "&":
            return "&amp;";
          case "'":
            return "&apos;";
          case '"':
            return "&quot;";
          default:
            return c;
        }
      });
    };

    const headers = [
      "Candidate Name",
      "Phone",
      "Email",
      "Paid At",
      "Payment ID",
      "Method",
      "Amount (INR)",
    ];

    const data = filtered.map((r) => [
      escapeXml(r.student_name || ""),
      escapeXml(r.student_phone || ""),
      escapeXml(r.student_email || ""),
      r.paid_at ? formatIstDate(r.paid_at) : "",
      r.razorpay_payment_id || "",
      r.payment_method || "",
      (Number(r.amount_paise || 0) / 100).toFixed(2),
    ]);

    const totalAmountPaise = filtered.reduce(
      (sum, r) => sum + Number(r.amount_paise || 0),
      0,
    );
    const totalAmountInr = (totalAmountPaise / 100).toFixed(2);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Unbooked Payments</x:Name>
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
            ${data
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell}</td>`).join("")}
              </tr>
            `,
              )
              .join("")}
            <tr style="font-weight: bold; background-color: #f8fafc;">
              <td>Total</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td>${totalAmountInr}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseMonthLabel = summaryUnbookedDetail?.label
      ? summaryUnbookedDetail.label.toLowerCase().replace(/\s+/g, "_")
      : "unbooked_payments";
    a.download = `unbooked_payments_${baseMonthLabel}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        `Are you sure you want to send draft invoice ${row.draft_invoice_number} to ${row.student_name}?`,
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

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoiceIds((current) => current.includes(invoiceId)
      ? current.filter((id) => id !== invoiceId)
      : [...current, invoiceId]);
  };

  const handleBulkInvoiceDownload = async () => {
    if (!selectedInvoiceIds.length || isBulkDownloading) return;
    setIsBulkDownloading(true);
    try {
      const response = await paymentsAdminApi.downloadInvoicesBulk(selectedInvoiceIds);
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "skillcase_invoices.zip";
      link.click();
      URL.revokeObjectURL(url);
      setSelectedInvoiceIds([]);
    } catch (err) {
      let message = "Failed to download invoice ZIP";
      const responseData = err?.response?.data;
      if (responseData instanceof Blob) {
        try {
          const payload = JSON.parse(await responseData.text());
          message = payload?.msg || message;
        } catch {
          // A non-JSON response should retain the generic download error.
        }
      } else {
        message = responseData?.msg || message;
      }
      setLocalError(message);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Pending Invoices
          </h3>
          <span className="rounded-full bg-amber-50 border border-amber-200/50 px-3 py-1 text-xs font-bold text-amber-800 shadow-sm">
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
                          <span className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-700 shadow-sm mr-1">
                            Draft ({r.draft_invoice_number})
                          </span>
                          {canManageInvoices ? (
                            <>
                              <ControlButton
                                onClick={() => handleStartFlowForRow(r)}
                                disabled={isGenerating || isSending}
                                variant="secondary"
                                className="h-8 rounded-lg px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm active:scale-95 transition-all duration-150"
                              >
                                View
                              </ControlButton>
                              <ControlButton
                                onClick={() => handleStartFlowForRow(r, { forceRegenerate: true })}
                                disabled={isGenerating || isSending}
                                variant="secondary"
                                className="h-8 rounded-lg px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50/60 shadow-sm active:scale-95 transition-all duration-150"
                              >
                                Regenerate
                              </ControlButton>
                              <ControlButton
                                onClick={() => handleQuickSend(r)}
                                disabled={isGenerating || isSending}
                                variant="primary"
                                className="h-8 rounded-lg px-3.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none text-white shadow-sm active:scale-95 transition-all duration-150 font-semibold"
                              >
                                {isSending ? "Sending..." : "Send"}
                              </ControlButton>
                            </>
                          ) : null}
                        </div>
                      ) : canManageInvoices ? (
                        <ControlButton
                          onClick={() => handleStartFlowForRow(r)}
                          disabled={isGenerating || isSending}
                          variant="primary"
                          className="h-8 rounded-lg px-4 text-xs bg-slate-900 hover:bg-slate-800 text-white border-none active:scale-95 transition-all duration-150 font-semibold shadow-sm"
                        >
                          {isGenerating ? "Loading..." : "Generate Draft"}
                        </ControlButton>
                      ) : <span className="text-xs text-slate-500">Read only</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Generated & Sent Invoices
          </h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 border border-emerald-200/50 px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
              {filteredSent.length} invoices
            </span>
            {canDownloadInvoices ? (
            <ControlButton
              onClick={handleBulkInvoiceDownload}
              disabled={!selectedInvoiceIds.length || isBulkDownloading}
              variant="secondary"
              className="h-8 rounded-lg px-3 text-xs border-slate-200"
            >
              {isBulkDownloading ? "Preparing ZIP..." : `Download Selected (${selectedInvoiceIds.length})`}
            </ControlButton>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold">
                {canDownloadInvoices ? <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredSent.length > 0 && selectedInvoiceIds.length === filteredSent.length}
                    onChange={() => setSelectedInvoiceIds(
                      selectedInvoiceIds.length === filteredSent.length
                        ? []
                        : filteredSent.map((invoice) => invoice.invoice_id),
                    )}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th> : null}
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
                    colSpan={canDownloadInvoices ? 6 : 5}
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
                    {canDownloadInvoices ? <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(r.invoice_id)}
                        onChange={() => toggleInvoiceSelection(r.invoice_id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td> : null}
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
                      {canDownloadInvoices ? <ControlButton
                        onClick={() => handleViewSentInvoice(r.invoice_id)}
                        variant="secondary"
                        disabled={isLoadingPdf}
                        className="h-8 rounded-lg px-4 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm active:scale-95 transition-all duration-150"
                      >
                        View PDF
                      </ControlButton>
                      : <span className="text-xs text-slate-500">View only</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Amount Booked by Month
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Show:</span>
            <select
              value={summaryMonthsLimit}
              onChange={(e) => setSummaryMonthsLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold cursor-pointer"
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={9}>Last 9 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <th className="px-3 py-3 text-left">Month</th>
                <th className="px-2 py-3 text-right">Booked (New)</th>
                <th className="px-2 py-3 text-right">Booked (Old)</th>
                <th className="px-2 py-3 text-right">Total Booked</th>
              </tr>
            </thead>
            <tbody>
              {bookedSummaryRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-slate-500 text-xs"
                  >
                    No booked amount records found.
                  </td>
                </tr>
              ) : (
                <>
                  {bookedSummaryRows.map((r, idx) => (
                    <tr
                      key={`${r.target_year}-${r.target_month}`}
                      onClick={() =>
                        handleViewSummaryMonthCandidates(
                          r.target_year,
                          r.target_month,
                          formatMonthYearName(r.target_year, r.target_month)
                        )
                      }
                      className={
                        idx % 2 === 0
                          ? "bg-white hover:bg-slate-50/80 cursor-pointer select-none transition-colors duration-150"
                          : "bg-slate-50/60 hover:bg-slate-50/80 cursor-pointer select-none transition-colors duration-150"
                      }
                    >
                      <td className="px-3 py-3 font-semibold text-slate-700 text-left">
                        {formatMonthYearName(r.target_year, r.target_month)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="font-semibold text-slate-700">
                          {formatInrFromPaise(r.amount_new_paise)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {r.count_new}{" "}
                          {r.count_new === 1 ? "candidate" : "candidates"}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="font-semibold text-slate-700">
                          {formatInrFromPaise(r.amount_old_paise)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {r.count_old}{" "}
                          {r.count_old === 1 ? "candidate" : "candidates"}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="font-bold text-slate-800">
                          {formatInrFromPaise(
                            Number(r.amount_new_paise) +
                              Number(r.amount_old_paise),
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {Number(r.count_new) + Number(r.count_old)} total
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr
                    onClick={() =>
                      handleViewSummaryMonthUnbooked(
                        "",
                        "",
                        "Money Not Booked"
                      )
                    }
                    className="bg-amber-50/30 hover:bg-amber-50/60 cursor-pointer select-none transition-colors duration-150 border-t border-slate-200"
                  >
                    <td className="px-3 py-3 text-left">
                      {/* Month is blank */}
                    </td>
                    <td className="px-2 py-3 text-right">
                      {/* Booked New is blank */}
                    </td>
                    <td className="px-2 py-3 text-right">
                      {/* Booked Old is blank */}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="font-bold text-amber-700">
                        {formatInrFromPaise(bookedSummaryUnbookedTotal?.amount_paise || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {bookedSummaryUnbookedTotal?.count || 0} total not booked
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify Candidate State Modal */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 transition-all duration-300">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-950/20 flex flex-col transform transition-transform duration-300 scale-100">
            <div className="border-b border-slate-100 pb-3">
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  State / Union Territory
                </label>
                <select
                  id="candidate-state-select"
                  value={verifiedState}
                  onChange={(e) => setVerifiedState(e.target.value)}
                  disabled
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus:outline-none focus:border-indigo-500 focus:ring focus:ring-indigo-200/50"
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

            <div className="border-t border-slate-100 pt-3 flex justify-end gap-2">
              <ControlButton
                id="cancel-state-verification-btn"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={isGenerating}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all duration-150"
              >
                Cancel
              </ControlButton>
              <ControlButton
                id="confirm-generate-invoice-btn"
                variant="primary"
                onClick={handleConfirmStateAndGenerate}
                disabled={isGenerating || !verifiedState}
                className="bg-[#002856 hover:bg-[#002860] border-none text-white active:scale-95 transition-all duration-150 font-semibold"
              >
                {isGenerating ? "Generating..." : "Confirm & Generate"}
              </ControlButton>
            </div>
          </div>
        </div>
      )}

      {/* Preview/View GST Invoice Modal */}
      {step === 3 && draftInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 transition-all duration-300">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-950/20 flex flex-col h-[90vh]">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
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
              <span className="rounded-full bg-indigo-50 border border-indigo-200/50 text-indigo-700 px-3 py-1 text-xs font-mono font-bold shadow-sm">
                {draftInvoice.invoice_number}
              </span>
            </div>

            <div className="my-4 flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-1">
              <iframe
                src={`data:application/pdf;base64,${draftInvoice.pdf_base64}`}
                title="Invoice PDF Preview"
                className="w-full h-full border-none rounded-xl"
              />
            </div>

            {localError && (
              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2.5 my-2">
                {localError}
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-500">
                {draftInvoice.isSent ? (
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 font-semibold">
                    This invoice has already been sent to the candidate's email.
                  </span>
                ) : (
                  <span className="text-indigo-600 bg-indigo-50/70 border border-indigo-100 rounded-full px-3 py-1 font-semibold">
                    GST breakdown matches candidate's state ({verifiedState}).
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                {draftInvoice.isSent ? (
                  <ControlButton
                    variant="secondary"
                    onClick={() => setStep(1)}
                    className="px-6 border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all duration-150"
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
                      className="border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-rose-600 active:scale-95 transition-all duration-150"
                    >
                      {isCancelling ? "Discarding..." : "Discard Draft"}
                    </ControlButton>
                    <ControlButton
                      id="modal-regenerate-invoice-btn"
                      variant="secondary"
                      onClick={() => setStep(2)}
                      disabled={isSending || isCancelling}
                      className="border-amber-200 hover:bg-amber-50 hover:text-amber-700 text-amber-700 active:scale-95 transition-all duration-150"
                    >
                      Regenerate
                    </ControlButton>
                    <ControlButton
                      id="modal-close-preview-btn"
                      variant="secondary"
                      onClick={handleClosePreview}
                      disabled={isSending || isCancelling}
                      className="border-slate-200 hover:bg-slate-50 text-slate-600 active:scale-95 transition-all duration-150"
                    >
                      Close
                    </ControlButton>
                    <ControlButton
                      id="confirm-send-invoice-btn"
                      variant="primary"
                      onClick={handleConfirmAndSend}
                      disabled={isSending || isCancelling}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none text-white active:scale-95 transition-all duration-150 font-semibold"
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

      {/* Booked Candidates Details Modal */}
      {summaryMonthDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 transition-all duration-300">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-950/20 flex flex-col h-[75vh] transform transition-transform duration-300 scale-100">
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Booked Candidates — {summaryMonthDetail.label}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Candidates who contributed to the monthly booked amount.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canDownloadInvoices ? (
                  <ControlButton
                    onClick={handleDownloadExcel}
                    variant="secondary"
                    className="h-9 rounded-xl px-4 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm active:scale-95 transition-all duration-150"
                  >
                    Download Excel
                  </ControlButton>
                ) : null}
                <ControlButton
                  variant="secondary"
                  onClick={() => {
                    setSummaryMonthDetail(null);
                    setCandidatesSearch("");
                  }}
                  className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-none font-sans font-normal"
                >
                  ✕
                </ControlButton>
              </div>
            </div>

            {/* Local Search Input inside Modal */}
            <div className="my-4">
              <ControlInput
                value={candidatesSearch}
                onChange={(e) => setCandidatesSearch(e.target.value)}
                placeholder="Search candidate name, email, or phone"
                className="w-full"
              />
            </div>

            {/* Candidates Table Container */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
                    <th className="px-3 py-3">Candidate Details</th>
                    <th className="px-2 py-3">Category</th>
                    <th className="px-2 py-3">Booked On</th>
                    <th className="px-2 py-3 text-right">Booked Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryCandidatesLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-12 text-center text-slate-500 text-xs"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                          <span>Loading booked candidates...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const filtered = (summaryCandidatesRows || []).filter(
                        (r) => {
                          const q = candidatesSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            (r.student_name || "").toLowerCase().includes(q) ||
                            (r.student_email || "").toLowerCase().includes(q) ||
                            (r.student_phone || "").toLowerCase().includes(q)
                          );
                        },
                      );

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-8 text-center text-slate-500 text-xs"
                            >
                              No matching candidates found.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((r, idx) => (
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
                            <div className="text-[10px] text-slate-400 mt-1">
                              Enrolled:{" "}
                              {r.created_at ? formatIstDate(r.created_at) : "-"}
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            {r.is_new ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow-sm">
                                New Candidate
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200/50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 shadow-sm">
                                Old Candidate
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-slate-600 font-medium">
                            {r.booked_at ? formatIstDate(r.booked_at) : "-"}
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-slate-700">
                            {formatInrFromPaise(r.amount_paise)}
                          </td>
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex justify-end">
              <ControlButton
                variant="secondary"
                onClick={() => {
                  setSummaryMonthDetail(null);
                  setCandidatesSearch("");
                }}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all duration-150"
              >
                Close
              </ControlButton>
            </div>
          </div>
        </div>
      )}

      {/* Not Booked Payments Details Modal */}
      {summaryUnbookedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 transition-all duration-300">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-950/20 flex flex-col h-[75vh] transform transition-transform duration-300 scale-100">
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {summaryUnbookedDetail.label === "Money Not Booked"
                    ? "Money Not Booked"
                    : `Not Booked Payments — ${summaryUnbookedDetail.label}`}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {summaryUnbookedDetail.label === "Money Not Booked"
                    ? "Payments received that have not yet been booked."
                    : "Payments received this month that have not yet been booked."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ControlButton
                  onClick={handleDownloadUnbookedExcel}
                  variant="secondary"
                  className="h-9 rounded-xl px-4 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm active:scale-95 transition-all duration-150"
                >
                  Download Excel
                </ControlButton>
                <ControlButton
                  variant="secondary"
                  onClick={() => {
                    setSummaryUnbookedDetail(null);
                    setCandidatesSearch("");
                  }}
                  className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-none font-sans font-normal"
                >
                  ✕
                </ControlButton>
              </div>
            </div>

            {/* Local Search Input inside Modal */}
            <div className="my-4">
              <ControlInput
                value={candidatesSearch}
                onChange={(e) => setCandidatesSearch(e.target.value)}
                placeholder="Search candidate name, email, or phone"
                className="w-full"
              />
            </div>

            {/* Payments Table Container */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
                    <th className="px-3 py-3">Candidate Details</th>
                    <th className="px-2 py-3">Paid At</th>
                    <th className="px-2 py-3">Payment Info</th>
                    <th className="px-2 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryUnbookedLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-12 text-center text-slate-500 text-xs"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                          <span>Loading unbooked payments...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const filtered = (summaryUnbookedRows || []).filter(
                        (r) => {
                          const q = candidatesSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            (r.student_name || "").toLowerCase().includes(q) ||
                            (r.student_email || "").toLowerCase().includes(q) ||
                            (r.student_phone || "").toLowerCase().includes(q)
                          );
                        },
                      );

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-8 text-center text-slate-500 text-xs"
                            >
                              No matching unbooked payments found.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((r, idx) => (
                        <tr
                          key={r.payment_id}
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
                            <div className="text-[10px] text-slate-400 mt-1">
                              Enrolled:{" "}
                              {r.candidate_created_at
                                ? formatIstDate(r.candidate_created_at)
                                : "-"}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-slate-600 font-medium">
                            {r.paid_at ? formatIstDate(r.paid_at) : "-"}
                          </td>
                          <td className="px-2 py-3 text-slate-600">
                            <div className="font-mono text-xs text-slate-700">
                              {r.razorpay_payment_id || "-"}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              {r.payment_method || "-"}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-slate-700">
                            {formatInrFromPaise(r.amount_paise)}
                          </td>
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex justify-end">
              <ControlButton
                variant="secondary"
                onClick={() => {
                  setSummaryUnbookedDetail(null);
                  setCandidatesSearch("");
                }}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all duration-150"
              >
                Close
              </ControlButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
