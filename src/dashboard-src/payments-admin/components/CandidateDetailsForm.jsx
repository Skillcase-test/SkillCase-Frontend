import { useEffect, useState, useRef, useMemo } from "react";
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

function parseStatusLogs(rawLogs) {
  const sortedLogs = [...rawLogs].sort((a, b) => new Date(a.received_at) - new Date(b.received_at));
  const statusEvents = [];
  let currentState = "Active";

  const hasCreatedEvent = sortedLogs.some((log) => log.event_type === "admin.manual_candidate_created");
  if (hasCreatedEvent) {
    currentState = "Pending";
  }

  for (const log of sortedLogs) {
    const payload = log.payload_json || {};
    let fromStatus = currentState;
    let toStatus = "";
    let effectiveStr = "";

    if (log.event_type === "admin.manual_candidate_created") {
      fromStatus = "None";
      toStatus = "Pending";
      currentState = "Pending";
    } else if (
      (log.event_type === "discord.finalized_notified" || log.event_type === "discord.finalized_notify_failed") &&
      payload.action === "finalized"
    ) {
      fromStatus = "Pending";
      toStatus = "Active";
      currentState = "Active";
    } else if (log.event_type === "admin.enrollment_hold_started") {
      if (currentState === "Pending") {
        statusEvents.push({
          raw_log_id: "inferred-finalize-" + log.raw_log_id,
          fromStatus: "Pending",
          toStatus: "Active",
          effectiveStr: "",
          received_at: log.received_at,
        });
        currentState = "Active";
      }
      fromStatus = currentState;
      toStatus = "On Hold";
      currentState = "On Hold";
      if (payload.hold_start_month && payload.hold_start_year) {
        effectiveStr = "(Effective " + String(payload.hold_start_month).padStart(2, "0") + "/" + payload.hold_start_year + ")";
      }
    } else if (log.event_type === "admin.enrollment_hold_ended") {
      fromStatus = "On Hold";
      toStatus = "Active";
      currentState = "Active";
      if (payload.resume_month && payload.resume_year) {
        effectiveStr = "(Effective " + String(payload.resume_month).padStart(2, "0") + "/" + payload.resume_year + ")";
      }
    } else if (log.event_type === "admin.enrollment_dropped") {
      if (currentState === "Pending") {
        statusEvents.push({
          raw_log_id: "inferred-finalize-" + log.raw_log_id,
          fromStatus: "Pending",
          toStatus: "Active",
          effectiveStr: "",
          received_at: log.received_at,
        });
        currentState = "Active";
      }
      fromStatus = currentState;
      toStatus = "Dropped";
      currentState = "Dropped";
      if (payload.dropped_from_month && payload.dropped_from_year) {
        effectiveStr = "(Effective " + String(payload.dropped_from_month).padStart(2, "0") + "/" + payload.dropped_from_year + ")";
      }
    } else if (log.event_type === "admin.enrollment_undropped") {
      fromStatus = "Dropped";
      toStatus = "Active";
      currentState = "Active";
      if (payload.undropped_from_month && payload.undropped_from_year) {
        effectiveStr = "(Effective " + String(payload.undropped_from_month).padStart(2, "0") + "/" + payload.undropped_from_year + ")";
      }
    } else if (log.event_type === "payment.marked_on_hold_automatically_60days") {
      if (currentState === "Pending") {
        statusEvents.push({
          raw_log_id: "inferred-finalize-" + log.raw_log_id,
          fromStatus: "Pending",
          toStatus: "Active",
          effectiveStr: "",
          received_at: log.received_at,
        });
        currentState = "Active";
      }
      fromStatus = currentState;
      toStatus = "On Hold";
      currentState = "On Hold";
      effectiveStr = "(Auto Hold)";
      if (payload.hold_start_month && payload.hold_start_year) {
        effectiveStr += " (Effective " + String(payload.hold_start_month).padStart(2, "0") + "/" + payload.hold_start_year + ")";
      }
    } else if (log.event_type === "payment.marked_on_hold_ended_automatically") {
      fromStatus = "On Hold";
      toStatus = "Active";
      currentState = "Active";
      effectiveStr = "(Auto Resume)";
    } else if (log.event_type === "payment.marked_dropped_automatically_90days") {
      if (currentState === "Pending") {
        statusEvents.push({
          raw_log_id: "inferred-finalize-" + log.raw_log_id,
          fromStatus: "Pending",
          toStatus: "Active",
          effectiveStr: "",
          received_at: log.received_at,
        });
        currentState = "Active";
      }
      fromStatus = currentState;
      toStatus = "Dropped";
      currentState = "Dropped";
      effectiveStr = "(Auto Drop)";
      if (payload.dropped_from_month && payload.dropped_from_year) {
        effectiveStr += " (Effective " + String(payload.dropped_from_month).padStart(2, "0") + "/" + payload.dropped_from_year + ")";
      }
    } else if (log.event_type === "admin.payment_link_created") {
      fromStatus = "Link Generated";
      const amountInr = (Number(payload.amount_paise || 0) / 100).toFixed(2);
      toStatus = `₹${amountInr}`;
      effectiveStr = `(${payload.description || "No description"})`;
    } else if (log.event_type.startsWith("admin.state_override_")) {
      const subState = log.event_type.replace("admin.state_override_", "");
      fromStatus = currentState;
      if (subState === "cleared") {
        toStatus = "Auto";
        currentState = "Active";
        effectiveStr = "(Override Cleared)";
      } else {
        const stateLabels = {
          active: "Active",
          on_hold: "On Hold",
          dropped: "Dropped",
          completed: "Completed"
        };
        toStatus = stateLabels[subState] || subState;
        currentState = toStatus;
        effectiveStr = `(Override: "${payload.reason || "No reason"}")`;
      }
    }

    if (toStatus) {
      statusEvents.push({
        raw_log_id: log.raw_log_id,
        fromStatus,
        toStatus,
        effectiveStr,
        received_at: log.received_at,
      });
    }
  }

  return statusEvents.reverse();
}

export function CandidateDetailsForm({
  editDraft,
  setEditDraft,
  batches,
  handleSaveEnrollmentEdit,
  handleDeleteCandidate,
  savingEnrollmentId,
  onRefresh,
}) {
  const paymentIdCounts = useMemo(() => {
    const counts = {};
    const rows = Array.isArray(editDraft?.expected_payments) ? editDraft.expected_payments : [];
    for (const row of rows) {
      if (row.actual_payment_id_list) {
        const ids = String(row.actual_payment_id_list)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        for (const id of ids) {
          const lowerId = id.toLowerCase();
          if (lowerId !== "-" && lowerId !== "null" && lowerId !== "undefined") {
            counts[lowerId] = (counts[lowerId] || 0) + 1;
          }
        }
      }
    }
    return counts;
  }, [editDraft?.expected_payments]);

  const splitGroupColors = useMemo(() => {
    const counts = paymentIdCounts;
    const splits = Object.keys(counts).filter(id => counts[id] > 1);
    const colorPalettes = [
      { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", hoverBg: "bg-indigo-100" },
      { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", hoverBg: "bg-emerald-100" },
      { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", hoverBg: "bg-amber-100" },
      { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-600", hoverBg: "bg-rose-100" },
      { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", hoverBg: "bg-purple-100" },
      { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", hoverBg: "bg-cyan-100" },
      { bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-600", hoverBg: "bg-fuchsia-100" },
    ];
    const mapping = {};
    splits.forEach((id, idx) => {
      mapping[id] = colorPalettes[idx % colorPalettes.length];
    });
    return mapping;
  }, [paymentIdCounts]);
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState("");

  useEffect(() => {
    const key = editDraft.selfie_key;
    if (!key) {
      setSelfiePreviewUrl("");
      return;
    }
    if (/^blob:/i.test(key) || /^data:/i.test(key) || /^https?:\/\//i.test(key)) {
      return;
    }
    paymentsAdminApi.getPaymentDocumentDownloadUrl(key)
      .then((res) => {
        if (res.data?.downloadUrl) {
          setSelfiePreviewUrl(res.data.downloadUrl);
        }
      })
      .catch((err) => {
        console.error("Failed to load selfie preview URL:", err);
      });
  }, [editDraft.selfie_key]);
  const [batchLogs, setBatchLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [statusLogs, setStatusLogs] = useState([]);
  const [loadingStatusLogs, setLoadingStatusLogs] = useState(false);
  const [isEditingCandidateId, setIsEditingCandidateId] = useState(false);
  const [isEditingEnrollmentDate, setIsEditingEnrollmentDate] = useState(false);
  const [hoveredSplitId, setHoveredSplitId] = useState(null);

  const expectedPaymentsRef = useRef(null);
  const [lastAddedKey, setLastAddedKey] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideState, setOverrideState] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  useEffect(() => {
    setIsEditingCandidateId(false);
    setIsEditingEnrollmentDate(false);
    setOverrideState(editDraft?.state_override?.state || "");
    setOverrideReason(editDraft?.state_override?.reason || "");
    setOverrideError("");
  }, [editDraft?.enrollment_id]);

  const handleApplyOverride = async (e) => {
    e?.preventDefault();
    if (overrideState && !overrideReason.trim()) {
      setOverrideError("Reason is required to override lifecycle state.");
      return;
    }
    setIsSubmittingOverride(true);
    setOverrideError("");
    try {
      const res = await paymentsAdminApi.overrideEnrollmentState(editDraft.enrollment_id, {
        state: overrideState || null,
        reason: overrideReason.trim(),
      });
      if (res.data?.success) {
        setEditDraft((p) => ({
          ...p,
          notes: res.data.notes,
          status: res.data.status ?? p.status,
          state_override: res.data.notes?.state_override || null,
          lifecycle_state: res.data.lifecycle_state ?? p.lifecycle_state,
        }));
        setIsOverrideModalOpen(false);
        onRefresh?.();
      }
    } catch (err) {
      console.error(err);
      setOverrideError(err.response?.data?.msg || "Failed to save state override.");
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  useEffect(() => {
    if (!editDraft) return;

    const defaults = {
      student_name: "",
      student_phone: "",
      student_email: "",
      batch_id: "",
      dob: "",
      gender: "",
      nationality: "-",
      current_location_city: "-",
      state: "",
      educational_qualification: "",
      terms_ack_status: "",
      shift_pattern: "",
      daily_shift_timing: "-",
      lead_owner: "-",
      year_of_passing: "",
      alternate_number: "-",
      first_shift_timing: "-",
      second_shift_timing: "-",
      third_shift_timing: "-",
      internal_remark: "-",
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
      setStatusLogs([]);
      return;
    }
    let active = true;
    async function loadLogs() {
      setLoadingLogs(true);
      setLoadingStatusLogs(true);
      try {
        const res = await paymentsAdminApi.getRawLogs({
          enrollment_id: editDraft.enrollment_id,
          limit: 200,
        });
        if (active) {
          const allRows = res.data.rows || [];
          setBatchLogs(allRows.filter((log) => log.event_type === "admin.batch_changed"));
          setStatusLogs(parseStatusLogs(allRows));
        }
      } catch (err) {
        console.error("Failed to load history logs", err);
      } finally {
        if (active) {
          setLoadingLogs(false);
          setLoadingStatusLogs(false);
        }
      }
    }
    loadLogs();
    return () => {
      active = false;
    };
  }, [editDraft?.enrollment_id, isCreateMode, editDraft?.notes, editDraft?.status]);

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
      if (fieldKey === "selfie_key" && file) {
        setSelfiePreviewUrl(URL.createObjectURL(file));
      }
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
      const ids = row.actual_payment_id_list
        ? String(row.actual_payment_id_list).split(",").map(id => id.trim())
        : [];
      if (row.actual_payment_list) {
        const amounts = String(row.actual_payment_list).split(",").map(a => Number(a.trim()) || 0);
        const dates = String(row.actual_date || "").split(",").map(d => d.trim());
        for (let i = 0; i < amounts.length; i++) {
          if (amounts[i] > 0) {
            rawPool.push({
              amount: amounts[i],
              date: dates[i] || "",
              id: ids[i] || "",
            });
          }
        }
      } else {
        const amount = Number(row.actual_payment_inr || 0);
        if (amount > 0) {
          rawPool.push({
            amount,
            date: row.actual_date ? String(row.actual_date).slice(0, 10) : "",
            id: ids[0] || "",
          });
        }
      }
    }

    // Club and sum actual payments with the exact same date to rebuild original transaction totals
    const clubbedMap = new Map();
    for (const item of rawPool) {
      const key = item.date;
      if (clubbedMap.has(key)) {
        const existing = clubbedMap.get(key);
        clubbedMap.set(key, {
          amount: existing.amount + item.amount,
          ids: [...existing.ids, item.id].filter(Boolean),
        });
      } else {
        clubbedMap.set(key, {
          amount: item.amount,
          ids: [item.id].filter(Boolean),
        });
      }
    }

    const actualsPool = [];
    for (const [date, val] of clubbedMap.entries()) {
      actualsPool.push({ date, amount: val.amount, ids: val.ids });
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
        const matchedId = act.ids.shift() || "";
        allocations.push({
          date: act.date,
          amount: allocated,
          id: matchedId,
        });

        act.amount -= allocated;
        needed -= allocated;
      }

      const actualPaymentListStr = allocations.map((a) => String(a.amount)).join(", ");
      const actualDateStr = allocations.map((a) => a.date).join(", ");
      const actualPaymentIdListStr = allocations.map((a) => a.id).join(", ");
      
      return {
        ...row,
        actual_payment_list: actualPaymentListStr,
        actual_date: actualDateStr,
        actual_payment_id_list: actualPaymentIdListStr,
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
          actual_payment_id_list: act.ids.join(", "),
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
        <div className="grid gap-5 md:grid-cols-2">
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
                  const effectiveMonthYear = log.received_at
                    ? new Date(log.received_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "";
                  const effectiveStr = effectiveMonthYear ? `(Effective ${effectiveMonthYear})` : "";
                  return (
                    <div
                      key={log.raw_log_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {fromBatch}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-semibold text-slate-900">
                          {toBatch}
                        </span>
                        {effectiveStr && (
                          <span className="text-[10px] text-slate-500 italic">
                            {effectiveStr}
                          </span>
                        )}
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
              Status Change History
            </h3>
            {loadingStatusLogs ? (
              <p className="text-xs text-slate-500 font-semibold">
                Loading status history...
              </p>
            ) : statusLogs.length > 0 ? (
              <div className="space-y-2.5">
                {statusLogs.map((log) => {
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {log.fromStatus}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-semibold text-slate-900">
                          {log.toStatus}
                        </span>
                        {log.effectiveStr && (
                          <span className="text-[10px] text-slate-500 italic">
                            {log.effectiveStr}
                          </span>
                        )}
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
                No status change history found for this candidate.
              </div>
            )}
          </section>
        </div>
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
                      setEditDraft((p) => ({ ...p, status: "pending" }));
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
          {!isCreateMode && (
            <Field label="Lifecycle State">
              <div className="flex items-center gap-2">
                <div className="relative flex h-10 flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const st = String(editDraft.state_override?.state || editDraft.lifecycle_state || editDraft.status || "active").toLowerCase();
                      if (st === "archived" || st === "dropped" || st === "rejected") {
                        return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-100">Dropped</span>;
                      }
                      if (st === "on_hold") {
                        return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-100">On Hold</span>;
                      }
                      if (st === "completed") {
                        return <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 border border-sky-100">Completed</span>;
                      }
                      if (st === "refunded") {
                        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">Refunded</span>;
                      }
                      return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">Active</span>;
                    })()}
                  </div>

                  {editDraft.state_override?.state ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 animate-pulse">
                      Manual Override
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Auto (System)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(true)}
                  className="flex h-10 px-4 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 shadow-sm transition active:scale-95"
                  title="Override State"
                >
                  Override
                </button>
              </div>
            </Field>
          )}
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

          <Field label="Selfie / Profile Picture (Optional)">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                onChange={(e) =>
                  uploadDocument("selfie_key", "selfie", e.target.files?.[0])
                }
                disabled={uploadingDoc === "selfie_key"}
              />

              {selfiePreviewUrl ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mt-2">
                  <img
                    src={selfiePreviewUrl}
                    alt="Selfie Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              {isCreateMode ? (
                <p className="text-xs text-amber-700">
                  Save candidate first; upload will work after the profile has
                  an ID.
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2">
                <span className="truncate text-xs text-slate-500">
                  {editDraft.selfie_key
                    ? String(editDraft.selfie_key).split("/").pop()
                    : "No selfie uploaded"}
                </span>
                {editDraft.selfie_key ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-800 underline"
                      onClick={() =>
                        openDocument(editDraft.selfie_key).catch((err) =>
                          setUploadError(
                            err?.response?.data?.msg ||
                              "Could not open selfie",
                          ),
                        )
                      }
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose-600 underline"
                      onClick={() => {
                        if (window.confirm("Remove selfie?")) {
                          setEditDraft((p) => ({ ...p, selfie_key: null }));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>

              {uploadingDoc === "selfie_key" ? (
                <p className="text-xs text-slate-500 animate-pulse">Uploading...</p>
              ) : null}
            </div>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-slate-500">
          Education Qualifications
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Educational Qualification" required={requiredFieldKeys.has("educational_qualification")}>
            <ControlSelect
              value={editDraft.educational_qualification || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, educational_qualification: e.target.value }))
              }
              className="w-full"
            >
              <option value="">Select Qualification</option>
              <option value="BSc Nursing">BSc Nursing</option>
              <option value="MSc Nursing">MSc Nursing</option>
              <option value="Post BSc Nursing">Post BSc Nursing</option>
              <option value="GNM Nursing">GNM Nursing</option>
              <option value="Phd Nursing">Phd Nursing</option>
              <option value="Others">Others</option>
            </ControlSelect>
          </Field>
          <Field label="Year of Passing" required={requiredFieldKeys.has("year_of_passing")}>
            <ControlSelect
              value={editDraft.year_of_passing || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, year_of_passing: e.target.value }))
              }
              className="w-full"
            >
              <option value="">Select Year</option>
              {Array.from({ length: 2035 - 1990 + 1 }, (_, i) => 1990 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </ControlSelect>
          </Field>
          <Field label="Shift Pattern">
            <ControlSelect
              value={editDraft.shift_pattern || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, shift_pattern: e.target.value }))
              }
              className="w-full"
            >
              <option value="">Select Shift Pattern</option>
              <option value="Daily Shift Pattern">Daily Shift Pattern (Fixed Hours)</option>
              <option value="Rotating Shifts">Rotating Shifts (Multiple Timings)</option>
            </ControlSelect>
          </Field>
          {educationFields.slice(3).map(textField)}
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
            const actualPaymentIds = row.actual_payment_id_list
              ? String(row.actual_payment_id_list).split(",").map(id => id.trim())
              : [];
            const subRowCount = Math.max(1, actualDates.length);
            const expectedPaymentsList = row.expected_payment_list
              ? row.expected_payment_list.split(",").map(s => s.trim())
              : [String(row.expected_payment_inr ?? row.expected_amount_inr ?? editDraft.monthly_fee_inr ?? "")];

            const totalActual = actualPayments.reduce((sum, a) => sum + Math.abs(Number(a) || 0), 0);
            const expectedVal = expectedPaymentsList.reduce((sum, s) => sum + (Number(s) || 0), 0);
            const isPaid = row.row_kind !== "actual_only" && expectedVal > 0 && totalActual >= expectedVal;

            return (
              <div
                key={row.schedule_id || row.manual_payment_key || index}
                className={`grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_2fr] items-start cursor-default
                  border-slate-200 bg-slate-50/60
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
                  <div className="space-y-3">
                    {expectedPaymentsList.map((expectedVal, expIdx) => (
                      <div key={expIdx} className="relative">
                        <ControlInput
                          value={expectedVal || "-"}
                          disabled
                          placeholder="-"
                          className="w-full bg-slate-100 text-slate-500 cursor-not-allowed font-medium pr-16"
                        />
                        {isPaid && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-emerald-600 pointer-events-none">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={3}
                              stroke="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                            <span>Paid</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Field>
                <div className="space-y-3">
                  {Array.from({ length: subRowCount }).map((_, subIdx) => {
                    const actDate = actualDates[subIdx] || "";
                    const actAmt = actualPayments[subIdx] || "";
                    const actId = actualPaymentIds[subIdx] || "";

                    return (
                      <div key={subIdx} className="grid gap-2 grid-cols-3">
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
                        <Field label={subIdx === 0 ? "Payment ID" : ""}>
                          <div
                            className="relative w-full"
                            onMouseEnter={() =>
                              actId &&
                              actId !== "-" &&
                              paymentIdCounts[actId.toLowerCase()] > 1 &&
                              setHoveredSplitId(actId.toLowerCase())
                            }
                            onMouseLeave={() => setHoveredSplitId(null)}
                          >
                            <ControlInput
                              value={actId || "-"}
                              disabled
                              placeholder="-"
                              className={`w-full bg-slate-100 text-slate-500 cursor-not-allowed text-xs font-mono transition-all duration-200 ${
                                actId && actId !== "-" && paymentIdCounts[actId.toLowerCase()] > 1 ? "pr-14" : ""
                              } ${
                                actId &&
                                hoveredSplitId === actId.toLowerCase()
                                  ? "!border-slate-400 !bg-white !text-slate-900 ring-2 ring-slate-200 ring-offset-1"
                                  : ""
                              }`}
                            />
                            {actId && actId !== "-" && paymentIdCounts[actId.toLowerCase()] > 1 && (() => {
                              const palette = splitGroupColors[actId.toLowerCase()] || {
                                bg: "bg-indigo-50",
                                border: "border-indigo-200",
                                text: "text-indigo-600",
                                hoverBg: "bg-indigo-100",
                              };
                              const isHovered = hoveredSplitId === actId.toLowerCase();
                              return (
                                <span
                                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider select-none transition-all duration-200 ${
                                    isHovered ? `${palette.hoverBg} ${palette.border} ${palette.text} scale-105 shadow-sm` : `${palette.bg} ${palette.border} ${palette.text}`
                                  }`}
                                  title={`Split payment: ${actId} (matches other rows with this color)`}
                                >
                                  Split
                                </span>
                              );
                            })()}
                          </div>
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

      {/* State Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              State Override
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Manually force this candidate into a specific lifecycle state, bypassing auto sweeps. To restore auto-calculation, select "Restore Auto-Calculation (Clear Override)".
            </p>

            <form onSubmit={handleApplyOverride} className="space-y-4">
              {overrideError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                  {overrideError}
                </div>
              )}

              <Field label="Target Lifecycle State">
                <ControlSelect
                  value={overrideState}
                  onChange={(e) => setOverrideState(e.target.value)}
                  className="w-full"
                >
                  <option value="">-- Restore Auto (No Override) --</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="dropped">Dropped</option>
                  <option value="completed">Completed</option>
                </ControlSelect>
              </Field>

              <Field label="Reason / Documentation" required={!!overrideState}>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Provide details on why this override is being applied..."
                  rows={3}
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400 resize-none min-h-[90px]"
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  disabled={isSubmittingOverride}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <ControlButton
                  type="submit"
                  disabled={isSubmittingOverride}
                >
                  {isSubmittingOverride ? "Saving..." : "Apply Override"}
                </ControlButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
