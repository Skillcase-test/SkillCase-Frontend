import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import {
  CONTROL_BASE,
  ControlButton,
  ControlInput,
  ControlSelect,
} from "./controls";

const personalFields = [
  ["student_name", "Name"],
  ["student_phone", "Phone"],
  ["student_email", "Email"],
  ["candidate_id", "Candidate ID"],
  ["alternate_number", "Alternate Number"],
  ["nationality", "Nationality"],
  ["current_location_city", "Current Location (City)"],
  ["state", "State"],
  ["lead_owner", "Lead Owner"],
];

const educationFields = [
  ["educational_qualification", "Educational Qualification"],
  ["year_of_passing", "Year of Passing"],
  ["shift_pattern", "Shift Pattern"],
  ["first_shift_timing", "First Shift Timing"],
  ["second_shift_timing", "Second Shift Timing"],
  ["third_shift_timing", "Third Shift Timing"],
  ["daily_shift_timing", "Daily Shift Timing"],
];

const documentFields = [
  ["passport_gdrive_link", "passport", "Passport"],
  ["degree_certificate_gdrive_link", "degree", "Degree Certificate"],
  ["updated_resume_gdrive_link", "resume", "Updated Resume"],
];

const requiredFieldKeys = new Set([
  "student_name",
  "student_phone",
  "student_email",
  "candidate_id",
  "dob",
  "gender",
  "nationality",
  "current_location_city",
  "state",
  "educational_qualification",
  "batch_id",
  "terms_ack_status",
]);

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function createManualPaymentKey() {
  return `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function firstOfMonthInput(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return todayInputDate().slice(0, 8) + "01";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
}

function addMonthsInput(dateValue, offset) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  parsed.setMonth(parsed.getMonth() + offset);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
}

function Field({ label, required = false, children }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function updateExpectedRow(setEditDraft, index, patch) {
  setEditDraft((prev) => {
    const rows = Array.isArray(prev?.expected_payments)
      ? [...prev.expected_payments]
      : [];
    rows[index] = { ...(rows[index] || {}), ...patch };
    return { ...prev, expected_payments: rows };
  });
}

function sourceLabel(row) {
  if (row.source_type === "admin_manual_actual") return "Manual Payment";
  if (row.row_kind === "actual_only") return "Imported Payment";
  if (row.source_type === "import") return "Imported Schedule";
  if (row.source_type === "manual_adjustment") return "Manual Actual";
  return "Admin";
}

export function CandidateDetailsForm({
  editDraft,
  setEditDraft,
  batches,
  handleSaveEnrollmentEdit,
  savingEnrollmentId,
}) {
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [uploadError, setUploadError] = useState("");
  if (!editDraft) return null;
  const expectedRows = Array.isArray(editDraft.expected_payments)
    ? editDraft.expected_payments
    : [];
  const isCreateMode = Boolean(editDraft.is_manual_create || !editDraft.enrollment_id);
  const saving = savingEnrollmentId === (editDraft.enrollment_id || "manual-create");

  const textField = ([key, label]) => (
    <Field key={key} label={label} required={requiredFieldKeys.has(key)}>
      <ControlInput
        value={editDraft[key] || ""}
        onChange={(e) => setEditDraft((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={label}
        className="w-full"
      />
    </Field>
  );

  async function uploadDocument(fieldKey, documentType, file) {
    if (!file) return;
    if (isCreateMode) {
      setUploadError("Save the candidate first, then upload private documents.");
      return;
    }
    setUploadingDoc(fieldKey);
    setUploadError("");
    try {
      const res = await paymentsAdminApi.getPaymentDocumentUploadUrl({
        enrollment_id: editDraft.enrollment_id,
        document_type: documentType,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
      });
      const { uploadUrl, key } = res.data || {};
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("S3 upload failed");
      setEditDraft((p) => ({ ...p, [fieldKey]: key }));
    } catch (err) {
      setUploadError(err?.response?.data?.msg || err?.message || "Document upload failed");
    } finally {
      setUploadingDoc("");
    }
  }

  async function openDocument(value) {
    const key = String(value || "").trim();
    if (!key) return;
    if (/^https?:\/\//i.test(key)) {
      window.open(key, "_blank", "noopener,noreferrer");
      return;
    }
    const res = await paymentsAdminApi.getPaymentDocumentDownloadUrl(key);
    if (res.data?.downloadUrl) {
      window.open(res.data.downloadUrl, "_blank", "noopener,noreferrer");
    }
  }

  function generateExpectedSchedule() {
    const total = Number(editDraft.total_fee_inr || 0);
    const monthly = Number(editDraft.monthly_fee_inr || 0);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(monthly) || monthly <= 0) {
      return;
    }
    const existingExpectedRows = expectedRows.filter((row) => {
      const amount = Number(row.expected_payment_inr ?? row.expected_amount_inr ?? row.expected_amount_paise ?? 0);
      return row.row_kind !== "actual_only" && Number.isFinite(amount) && amount > 0;
    });
    if (
      existingExpectedRows.length &&
      !window.confirm("Replace existing expected payment rows with a generated schedule?")
    ) {
      return;
    }
    const count = Math.ceil(total / monthly);
    const startDate = firstOfMonthInput(editDraft.created_at || editDraft.finalized_at || todayInputDate());
    let remaining = total;
    const generated = Array.from({ length: count }, (_, index) => {
      const amount = Math.min(monthly, remaining);
      remaining -= amount;
      return {
        expected_date: addMonthsInput(startDate, index),
        actual_date: "",
        expected_payment_inr: amount,
        actual_payment_inr: "",
        notes: "",
        source_type: "admin",
        manual_payment_key: createManualPaymentKey(),
      };
    });
    const actualOnlyRows = expectedRows.filter((row) => row.row_kind === "actual_only");
    setEditDraft((prev) => ({
      ...prev,
      expected_payments: [...generated, ...actualOnlyRows],
    }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isCreateMode ? "Add Candidate" : "Candidate Details"}
          </h2>
          <p className="text-sm text-slate-500">{editDraft.student_phone || "No phone"}</p>
        </div>
        <div className="flex gap-2">
          <ControlButton variant="secondary" onClick={() => setEditDraft(null)}>
            Back
          </ControlButton>
          <ControlButton variant="primary" disabled={saving} onClick={handleSaveEnrollmentEdit}>
            {saving ? "Saving..." : isCreateMode ? "Save Candidate" : "Save Details"}
          </ControlButton>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">Candidate Personal Details</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {personalFields.map(textField)}
          <Field label="Date of Birth" required>
            <input
              type="date"
              value={editDraft.dob || ""}
              onChange={(e) => setEditDraft((p) => ({ ...p, dob: e.target.value }))}
              className={`${CONTROL_BASE} w-full`}
            />
          </Field>
          <Field label="Gender" required>
            <ControlSelect
              value={editDraft.gender || ""}
              onChange={(e) => setEditDraft((p) => ({ ...p, gender: e.target.value }))}
              className="w-full"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </ControlSelect>
          </Field>
          <Field label="Batch" required>
            <ControlSelect
              value={editDraft.batch_id || ""}
              onChange={(e) => setEditDraft((p) => ({ ...p, batch_id: e.target.value || null }))}
              className="w-full"
            >
              <option value="">No batch</option>
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
              ))}
            </ControlSelect>
          </Field>
          <Field label="Terms Acknowledgement" required>
            <ControlSelect
              value={editDraft.terms_ack_status || ""}
              onChange={(e) => setEditDraft((p) => ({ ...p, terms_ack_status: e.target.value }))}
              className="w-full"
            >
              <option value="">Select acknowledgement</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="have_doubts">I have doubts</option>
            </ControlSelect>
          </Field>
          <Field label="Total Amount (INR)">
            <ControlInput value={editDraft.total_fee_inr || ""} onChange={(e) => setEditDraft((p) => ({ ...p, total_fee_inr: e.target.value }))} className="w-full" />
          </Field>
          <Field label="Default Monthly Amount (INR)">
            <ControlInput value={editDraft.monthly_fee_inr || ""} onChange={(e) => setEditDraft((p) => ({ ...p, monthly_fee_inr: e.target.value }))} className="w-full" />
          </Field>
          <Field label="Expected Schedule">
            <ControlButton type="button" variant="secondary" onClick={generateExpectedSchedule} className="w-full">
              Generate Schedule
            </ControlButton>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">Documents / Attachments</h3>
        {uploadError ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {uploadError}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          {documentFields.map(([key, documentType, label]) => (
            <Field key={key} label={label}>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <input
                  type="file"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  onChange={(e) => uploadDocument(key, documentType, e.target.files?.[0])}
                  disabled={uploadingDoc === key}
                />
                {isCreateMode ? (
                  <p className="text-xs text-amber-700">
                    Save candidate first; upload will work after the profile has an ID.
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">
                    {editDraft[key] ? String(editDraft[key]).split("/").pop() : "No file uploaded"}
                  </span>
                  {editDraft[key] ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-800 underline"
                      onClick={() => openDocument(editDraft[key]).catch((err) => setUploadError(err?.response?.data?.msg || "Could not open document"))}
                    >
                      View
                    </button>
                  ) : null}
                </div>
                {uploadingDoc === key ? <p className="text-xs text-slate-500">Uploading...</p> : null}
              </div>
            </Field>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">Education Qualifications</h3>
        <div className="grid gap-3 md:grid-cols-3">{educationFields.map(textField)}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-500">Expected Payments</h3>
            <p className="mt-1 text-xs text-slate-500">
              Date drives month/year. Imported actuals appear here without creating due unless expected is entered.
            </p>
          </div>
          <ControlButton
            variant="secondary"
            onClick={() =>
              setEditDraft((prev) => ({
                ...prev,
                expected_payments: [
                  ...(Array.isArray(prev.expected_payments) ? prev.expected_payments : []),
                  {
                    expected_date: "",
                    actual_date: "",
                    expected_payment_inr: "",
                    actual_payment_inr: "",
                    notes: "",
                    source_type: "admin",
                    manual_payment_key: createManualPaymentKey(),
                  },
                ],
              }))
            }
          >
            <Plus size={14} className="mr-1" />
            Add
          </ControlButton>
        </div>
        <div className="space-y-2">
          {expectedRows.map((row, index) => (
            <div key={row.schedule_id || index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1.4fr_auto]">
              <Field label="Expected Date">
                <input
                  type="date"
                  value={String(row.expected_date || row.date || "").slice(0, 10)}
                  onChange={(e) => updateExpectedRow(setEditDraft, index, { expected_date: e.target.value })}
                  className={`${CONTROL_BASE} w-full`}
                />
              </Field>
              <Field label="Actual Date">
                <input
                  type="date"
                  value={String(row.actual_date || row.date || "").slice(0, 10)}
                  onChange={(e) =>
                    updateExpectedRow(setEditDraft, index, {
                      actual_date: e.target.value,
                      actual_payment_touched: true,
                      manual_payment_key: row.manual_payment_key || createManualPaymentKey(),
                    })
                  }
                  className={`${CONTROL_BASE} w-full`}
                />
              </Field>
              <Field label="Expected Payment">
                <ControlInput
                  value={row.expected_payment_inr ?? row.expected_amount_inr ?? ""}
                  onChange={(e) => updateExpectedRow(setEditDraft, index, { expected_payment_inr: e.target.value, expected_amount_inr: e.target.value })}
                  placeholder="0"
                  className="w-full"
                />
              </Field>
              <Field label="Actual Payment">
                <ControlInput
                  value={row.actual_payment_inr ?? ""}
                  onChange={(e) =>
                    updateExpectedRow(setEditDraft, index, {
                      actual_payment_inr: e.target.value,
                      actual_date: row.actual_date || row.expected_date || row.date || todayInputDate(),
                      actual_payment_touched: true,
                      manual_payment_key: row.manual_payment_key || createManualPaymentKey(),
                    })
                  }
                  placeholder="0"
                  className="w-full"
                />
              </Field>
              <Field label="Source">
                <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600">
                  {sourceLabel(row)}
                </div>
              </Field>
              <Field label="Notes">
                <ControlInput
                  value={row.notes || ""}
                  onChange={(e) => updateExpectedRow(setEditDraft, index, { notes: e.target.value })}
                  placeholder="Optional"
                  className="w-full"
                />
              </Field>
              <button
                type="button"
                onClick={() =>
                  setEditDraft((prev) => ({
                    ...prev,
                    expected_payments: expectedRows.filter((_, i) => i !== index),
                  }))
                }
                className="mt-6 inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-rose-700"
                title="Remove row"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!expectedRows.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No expected or actual payment rows available.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
