import {
  ControlButton,
  ControlDropdown,
  ControlInput,
} from "../components/controls";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";

export function InvoiceViewTab({
  selectedEnrollmentId,
  setSelectedEnrollmentId,
  setSelectedInvoicePaymentId,
  filteredEnrollmentOptions,
  selectedInvoicePaymentId,
  invoicePaymentOptions,
  selectedEnrollment,
  handleGenerateAndSendInvoice,
  selectedEnrollmentInvoiceRows,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Generate And Send Invoice
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Pick candidate, pick uninvoiced payment, verify auto-filled email,
          then send.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <ControlDropdown
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
            value={selectedInvoicePaymentId}
            onChange={setSelectedInvoicePaymentId}
            placeholder="Select Uninvoiced Payment"
            disabled={!selectedEnrollmentId}
            options={invoicePaymentOptions.map((p) => ({
              value: p.payment_id,
              label: `#${p.payment_id} - ${formatInrFromPaise(p.amount_paise)}`,
            }))}
          />
          <ControlInput
            value={selectedEnrollment?.student_email || ""}
            readOnly
            placeholder="Candidate email auto-filled"
            className="bg-slate-100 text-slate-700"
          />
          <ControlButton
            onClick={handleGenerateAndSendInvoice}
            disabled={!selectedEnrollmentId || !selectedInvoicePaymentId}
            variant="primary"
            className="px-4"
          >
            Generate + Send Invoice
          </ControlButton>
        </div>
      </div>

      {selectedEnrollmentId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">
            Invoices Sent For Selected Enrollment
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
    </div>
  );
}
