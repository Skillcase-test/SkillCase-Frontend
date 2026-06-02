import { useEffect, useState, useRef } from "react";
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
  ["alternate_number", "Alternate Number"],
  ["nationality", "Nationality"],
  ["current_location_city", "Current Location (City)"],
  ["lead_owner", "Lead Owner"],
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
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
  if (Number.isNaN(parsed.getTime()))
    return todayInputDate().slice(0, 8) + "01";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
}

function addMonthsInput(dateValue, offset) {
  if (!dateValue) return "";
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  const originalDay = parsed.getDate();
  parsed.setDate(1);
  parsed.setMonth(parsed.getMonth() + offset);
  const targetYear = parsed.getFullYear();
  const targetMonth = parsed.getMonth();
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  parsed.setDate(Math.min(originalDay, daysInMonth));
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatToDdMmYyyy(dateStr) {
  if (!dateStr) return "";
  const cleaned = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return dateStr;
  const [y, m, d] = cleaned.split("-");
  return `${d}-${m}-${y}`;
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
  handleDeleteCandidate,
  savingEnrollmentId,
}) {
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [batchLogs, setBatchLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isEditingCandidateId, setIsEditingCandidateId] = useState(false);
  const [isEditingEnrollmentDate, setIsEditingEnrollmentDate] = useState(false);

  const expectedPaymentsRef = useRef(null);
  const [lastAddedKey, setLastAddedKey] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    setIsEditingCandidateId(false);
    setIsEditingEnrollmentDate(false);
  }, [editDraft?.enrollment_id]);

  useEffect(() => {
    if (!editDraft) return;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const randomPhone = String(Math.floor(6000000000 + Math.random() * 4000000000));
    const firstBatchId = batches && batches[0] ? batches[0].batch_id : "";

    const defaults = {
      student_name: `Test Candidate ${randomSuffix}`,
      student_phone: randomPhone,
      student_email: `test.candidate.${randomSuffix}@example.com`,
      batch_id: firstBatchId,
      dob: "2000-01-01",
      gender: "Male",
      nationality: "Indian",
      current_location_city: "Bangalore",
      state: "Karnataka",
      educational_qualification: "Graduate (B.Tech)",
      terms_ack_status: "yes",
      shift_pattern: "Daily Shift Pattern",
      daily_shift_timing: "09:00 AM - 06:00 PM",
      lead_owner: "Admin",
      year_of_passing: "2022",
    };

    let hasChanges = false;
    const patched = { ...editDraft };
    for (const [key, defVal] of Object.entries(defaults)) {
      if (!String(patched[key] ?? "").trim()) {
        patched[key] = defVal;
        hasChanges = true;
      }
    }

    if (!patched.expected_payment_start_date) {
      const expectedRows = Array.isArray(patched.expected_payments) ? patched.expected_payments : [];
      const fallbackDate = expectedRows.find(r => r.row_kind !== "actual_only" && r.expected_date)
        ? String(expectedRows.find(r => r.row_kind !== "actual_only" && r.expected_date).expected_date).slice(0, 10)
        : (patched.created_at ? String(patched.created_at).slice(0, 10) : todayInputDate());
      patched.expected_payment_start_date = fallbackDate;
      hasChanges = true;
    }

    if (hasChanges) {
      setEditDraft(patched);
    }
  }, [editDraft?.enrollment_id, batches, setEditDraft]);

  if (!editDraft) return null;
  const expectedRows = Array.isArray(editDraft.expected_payments)
    ? editDraft.expected_payments
    : [];

  const generatedExpectedRows = expectedRows.filter((row) => row.row_kind !== "actual_only");
  const currentExpectedTotal = generatedExpectedRows.reduce((sum, row) => sum + Number(row.expected_amount_inr || row.expected_payment_inr || 0), 0);
  const firstExpectedRow = generatedExpectedRows[0];
  const currentExpectedMonthly = firstExpectedRow ? Number(firstExpectedRow.expected_amount_inr || firstExpectedRow.expected_payment_inr || 0) : 0;

  const isScheduleDisabled = generatedExpectedRows.length > 0 &&
    currentExpectedTotal === Number(editDraft.total_fee_inr || 0) &&
    currentExpectedMonthly === Number(editDraft.monthly_fee_inr || 0);
  const isCreateMode = Boolean(
    editDraft.is_manual_create || !editDraft.enrollment_id,
  );
  const saving =
    savingEnrollmentId === (editDraft.enrollment_id || "manual-create");

  useEffect(() => {
    if (!editDraft?.enrollment_id || isCreateMode) {
      setBatchLogs([]);
      return;
    }
    let active = true;
    async function loadBatchLogs() {
      setLoadingLogs(true);
      try {
        const res = await paymentsAdminApi.getRawLogs({
          enrollment_id: editDraft.enrollment_id,
          event_type: "admin.batch_changed",
          limit: 100,
        });
        if (active) {
          setBatchLogs(res.data.rows || []);
        }
      } catch (err) {
        console.error("Failed to load batch logs", err);
      } finally {
        if (active) {
          setLoadingLogs(false);
        }
      }
    }
    loadBatchLogs();
    return () => {
      active = false;
    };
  }, [editDraft?.enrollment_id, isCreateMode]);

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
      setUploadError(
        "Save the candidate first, then upload private documents.",
      );
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
      setUploadError(
        err?.response?.data?.msg || err?.message || "Document upload failed",
      );
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

  function handleExpectedPaymentStartDateChange(newStartDate) {
    if (!newStartDate) {
      setEditDraft((prev) => ({ ...prev, expected_payment_start_date: "" }));
      return;
    }
    setEditDraft((prev) => {
      const next = { ...prev, expected_payment_start_date: newStartDate };
      const rows = Array.isArray(next.expected_payments)
        ? next.expected_payments
        : [];
      if (rows.length > 0) {
        next.expected_payments = rows.map((row, index) => ({
          ...row,
          expected_date: addMonthsInput(newStartDate, index),
        }));
      }
      return next;
    });
  }

  function generateExpectedSchedule() {
    const total = Number(editDraft.total_fee_inr || 0);
    const monthly = Number(editDraft.monthly_fee_inr || 0);
    if (
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isFinite(monthly) ||
      monthly <= 0
    ) {
      return;
    }
    const existingExpectedRows = expectedRows.filter((row) => {
      const amount = Number(
        row.expected_payment_inr ??
          row.expected_amount_inr ??
          row.expected_amount_paise ??
          0,
      );
      return (
        row.row_kind !== "actual_only" && Number.isFinite(amount) && amount > 0
      );
    });
    if (
      existingExpectedRows.length &&
      !window.confirm(
        "Replace existing expected payment rows with a generated schedule?",
      )
    ) {
      return;
    }

    // 1. Gather all actual payments made so far from on-screen expected and actual-only rows
    const rawPool = [];
    for (const row of expectedRows) {
      if (row.actual_payment_list) {
        const amounts = String(row.actual_payment_list).split(",").map(a => Number(a.trim()) || 0);
        const dates = String(row.actual_date || "").split(",").map(d => d.trim());
        for (let i = 0; i < amounts.length; i++) {
          if (amounts[i] > 0) {
            rawPool.push({
              amount: amounts[i],
              date: dates[i] || "",
            });
          }
        }
      } else {
        const amount = Number(row.actual_payment_inr || 0);
        if (amount > 0) {
          rawPool.push({
            amount,
            date: row.actual_date ? String(row.actual_date).slice(0, 10) : "",
          });
        }
      }
    }

    // Club and sum actual payments with the exact same date to rebuild original transaction totals
    const clubbedMap = new Map();
    for (const item of rawPool) {
      const key = item.date;
      if (clubbedMap.has(key)) {
        clubbedMap.set(key, clubbedMap.get(key) + item.amount);
      } else {
        clubbedMap.set(key, item.amount);
      }
    }

    const actualsPool = [];
    for (const [date, amount] of clubbedMap.entries()) {
      actualsPool.push({ date, amount });
    }

    // Sort actual payments chronologically
    actualsPool.sort((a, b) => a.date.localeCompare(b.date));

    // 2. Generate new expected schedule rows
    const count = Math.ceil(total / monthly);
    const startDate = editDraft.expected_payment_start_date || (expectedRows.find(r => r.row_kind !== "actual_only" && r.expected_date) ? String(expectedRows.find(r => r.row_kind !== "actual_only" && r.expected_date).expected_date).slice(0, 10) : (editDraft.created_at ? String(editDraft.created_at).slice(0, 10) : todayInputDate()));
    let remaining = total;
    const generated = Array.from({ length: count }, (_, index) => {
      const amount = Math.min(monthly, remaining);
      remaining -= amount;
      return {
        expected_date: addMonthsInput(startDate, index),
        expected_payment_inr: amount,
        source_type: "admin",
        manual_payment_key: createManualPaymentKey(),
      };
    });

    // 3. Run FIFO matching locally on the new expected rows
    const matched = generated.map((row) => {
      let needed = Number(row.expected_payment_inr || 0);
      const allocations = [];

      for (const act of actualsPool) {
        if (needed <= 0) break;
        if (act.amount <= 0) continue;

        const allocated = Math.min(needed, act.amount);
        allocations.push({
          date: act.date,
          amount: allocated,
        });

        act.amount -= allocated;
        needed -= allocated;
      }

      const actualPaymentListStr = allocations.map((a) => String(a.amount)).join(", ");
      const actualDateStr = allocations.map((a) => a.date).join(", ");
      
      return {
        ...row,
        actual_payment_list: actualPaymentListStr,
        actual_date: actualDateStr,
      };
    });

    // 4. Capture any remaining unallocated overpayments as actual-only rows
    const leftoverRows = [];
    for (const act of actualsPool) {
      if (act.amount > 0) {
        leftoverRows.push({
          schedule_id: `actual-only-leftover-${Date.now()}-${Math.random()}`,
          expected_date: "",
          expected_payment_inr: "",
          actual_payment_list: String(act.amount),
          actual_date: act.date,
          row_kind: "actual_only",
        });
      }
    }

    setEditDraft((prev) => ({
      ...prev,
      expected_payments: [...matched, ...leftoverRows],
      expected_payment_start_date: startDate,
    }));

    setTimeout(() => {
      expectedPaymentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleDragStart(e, index) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e, index) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setEditDraft((prev) => {
      const list = Array.isArray(prev?.expected_payments)
        ? [...prev.expected_payments]
        : [];
      const [draggedItem] = list.splice(draggedIndex, 1);
      list.splice(index, 0, draggedItem);
      return { ...prev, expected_payments: list };
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  const extraStyles = `
    @keyframes slideDownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .newly-added-row {
      animation: slideDownFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .drag-row-transition {
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `;

  return (
    <div className="space-y-5">
      <style>{extraStyles}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isCreateMode ? "Add Candidate" : "Candidate Details"}
          </h2>
          <p className="text-sm text-slate-500">
            {editDraft.student_phone || "No phone"}
          </p>
        </div>
        <div className="flex gap-2">

          <ControlButton variant="secondary" onClick={() => setEditDraft(null)}>
            Back
          </ControlButton>
          <ControlButton
            variant="primary"
            disabled={saving}
            onClick={handleSaveEnrollmentEdit}
          >
            {saving
              ? "Saving..."
              : isCreateMode
                ? "Save Candidate"
                : "Save Details"}
          </ControlButton>
        </div>
      </div>

      {!isCreateMode ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
            Batch Change History
          </h3>
          {loadingLogs ? (
            <p className="text-xs text-slate-500 font-semibold">
              Loading batch history...
            </p>
          ) : batchLogs.length > 0 ? (
            <div className="space-y-2.5">
              {batchLogs.map((log) => {
                const payload = log.payload_json || {};
                const fromBatch = payload.previous_batch_name || "Unassigned";
                const toBatch = payload.next_batch_name || "Unassigned";
                const dateStr = log.received_at
                  ? new Date(log.received_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "-";
                return (
                  <div
                    key={log.raw_log_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {fromBatch}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold text-slate-900">
                        {toBatch}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No batch change history found for this candidate.
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
          Candidate Personal Details
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Candidate ID — system-generated on finalize, editable in edit mode with confirmation */}
          <Field label="Candidate ID">
            {isCreateMode ? (
              <div className="flex h-10 items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-400 italic">
                Generated automatically on Finalize
              </div>
            ) : isEditingCandidateId ? (
              <ControlInput
                value={editDraft.candidate_id || ""}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, candidate_id: e.target.value.toUpperCase() }))
                }
                placeholder="Candidate ID (e.g. SK-A2-05260001)"
                className="w-full font-mono"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className={`flex h-10 flex-1 items-center rounded-xl border px-3 text-sm font-mono ${
                  editDraft.candidate_id
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold"
                    : "border-dashed border-slate-300 bg-slate-50 text-slate-400 italic"
                }`}>
                  {editDraft.candidate_id || "Not yet assigned"}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to edit the Candidate ID?")) {
                      setIsEditingCandidateId(true);
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
                  title="Edit Candidate ID"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
            )}
          </Field>
          {personalFields.map(textField)}
          <Field label="State" required={requiredFieldKeys.has("state")}>
            <ControlSelect
              value={editDraft.state || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, state: e.target.value }))
              }
              className="w-full"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </ControlSelect>
          </Field>
          <Field label="Date of Birth" required>
            <input
              type="date"
              value={editDraft.dob || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, dob: e.target.value }))
              }
              className={`${CONTROL_BASE} w-full`}
            />
          </Field>
          <Field label="Gender" required>
            <ControlSelect
              value={editDraft.gender || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, gender: e.target.value }))
              }
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
              onChange={(e) =>
                setEditDraft((p) => ({
                  ...p,
                  batch_id: e.target.value || null,
                }))
              }
              className="w-full"
            >
              <option value="">No batch</option>
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_name}
                </option>
              ))}
            </ControlSelect>
          </Field>
          <Field label="Terms Acknowledgement" required>
            <ControlSelect
              value={editDraft.terms_ack_status || ""}
              onChange={(e) =>
                setEditDraft((p) => ({
                  ...p,
                  terms_ack_status: e.target.value,
                }))
              }
              className="w-full"
            >
              <option value="">Select acknowledgement</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="have_doubts">I have doubts</option>
            </ControlSelect>
          </Field>
          <Field label="Total Amount (INR)">
            <ControlInput
              value={editDraft.total_fee_inr || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, total_fee_inr: e.target.value }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Default Monthly Amount (INR)">
            <ControlInput
              value={editDraft.monthly_fee_inr || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, monthly_fee_inr: e.target.value }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Enrollment Date">
            {isEditingEnrollmentDate ? (
              <input
                type="date"
                value={editDraft.created_at ? String(editDraft.created_at).slice(0, 10) : todayInputDate()}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, created_at: e.target.value }))
                }
                className={`${CONTROL_BASE} w-full`}
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={editDraft.created_at ? String(editDraft.created_at).slice(0, 10) : todayInputDate()}
                  disabled
                  className={`${CONTROL_BASE} w-full bg-slate-100 text-slate-500 cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to edit the Enrollment Date?")) {
                      setIsEditingEnrollmentDate(true);
                    }
                  }}
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
                  title="Edit Enrollment Date"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
            )}
          </Field>
          <Field label="Expected Payment Start Date">
            <input
              type="date"
              value={editDraft.expected_payment_start_date || (expectedRows.find(r => r.row_kind !== "actual_only" && r.expected_date) ? String(expectedRows.find(r => r.row_kind !== "actual_only" && r.expected_date).expected_date).slice(0, 10) : (editDraft.created_at ? String(editDraft.created_at).slice(0, 10) : todayInputDate()))}
              onChange={(e) => handleExpectedPaymentStartDateChange(e.target.value)}
              className={`${CONTROL_BASE} w-full`}
            />
          </Field>
          <Field label="Expected Schedule">
            <ControlButton
              type="button"
              variant="secondary"
              onClick={generateExpectedSchedule}
              disabled={isScheduleDisabled}
              className="w-full"
            >
              {isScheduleDisabled ? "Schedule Generated" : "Generate Schedule"}
            </ControlButton>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
          Documents / Attachments
        </h3>
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
                  onChange={(e) =>
                    uploadDocument(key, documentType, e.target.files?.[0])
                  }
                  disabled={uploadingDoc === key}
                />
                {isCreateMode ? (
                  <p className="text-xs text-amber-700">
                    Save candidate first; upload will work after the profile has
                    an ID.
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">
                    {editDraft[key]
                      ? String(editDraft[key]).split("/").pop()
                      : "No file uploaded"}
                  </span>
                  {editDraft[key] ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-800 underline"
                      onClick={() =>
                        openDocument(editDraft[key]).catch((err) =>
                          setUploadError(
                            err?.response?.data?.msg ||
                              "Could not open document",
                          ),
                        )
                      }
                    >
                      View
                    </button>
                  ) : null}
                </div>
                {uploadingDoc === key ? (
                  <p className="text-xs text-slate-500">Uploading...</p>
                ) : null}
              </div>
            </Field>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
          Education Qualifications
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {educationFields.map(textField)}
        </div>
      </section>

      <section ref={expectedPaymentsRef} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-500">
              Expected Payments
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Date drives month/year. Imported actuals appear here without
              creating due unless expected is entered.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {expectedRows.map((row, index) => {
            const isNewlyAdded = row.manual_payment_key && row.manual_payment_key === lastAddedKey;
            const actualDates = row.actual_date ? row.actual_date.split(",").map(d => d.trim()) : [];
            const actualPayments = row.actual_payment_list ? row.actual_payment_list.split(",").map(a => a.trim()) : [];
            const subRowCount = Math.max(1, actualDates.length);

            return (
              <div
                key={row.schedule_id || row.manual_payment_key || index}
                className={`grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_2fr] items-start cursor-default border-slate-200 bg-slate-50/60
                  ${isNewlyAdded ? "newly-added-row" : ""}
                `}
              >
                <Field label="Expected Date">
                  <ControlInput
                    value={formatToDdMmYyyy(row.expected_date ? String(row.expected_date).slice(0, 10) : addMonthsInput(editDraft.expected_payment_start_date || editDraft.created_at || todayInputDate(), index))}
                    disabled
                    className="w-full bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </Field>
                <Field label="Expected Payment (INR)">
                  <ControlInput
                    value={row.expected_payment_inr ?? row.expected_amount_inr ?? editDraft.monthly_fee_inr ?? ""}
                    disabled
                    placeholder="-"
                    className="w-full bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </Field>
                <div className="space-y-3">
                  {Array.from({ length: subRowCount }).map((_, subIdx) => {
                    const actDate = actualDates[subIdx] || "";
                    const actAmt = actualPayments[subIdx] || "";

                    return (
                      <div key={subIdx} className="grid gap-2 grid-cols-2">
                        <Field label={subIdx === 0 ? "Actual Date(s)" : ""}>
                          <ControlInput
                            value={formatToDdMmYyyy(actDate) || "-"}
                            disabled
                            placeholder="-"
                            className="w-full bg-slate-100 text-slate-500 cursor-not-allowed"
                          />
                        </Field>
                        <Field label={subIdx === 0 ? "Actual Payment(s) (INR)" : ""}>
                          <ControlInput
                            value={actAmt ? String(actAmt) : "-"}
                            disabled
                            placeholder="-"
                            className="w-full bg-slate-100 text-slate-500 cursor-not-allowed"
                          />
                        </Field>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
