import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  uploadIrelandResume,
  updateIrelandProfileFields,
  markIrelandResumeRejectionViewed,
} from "../../../api/irelandJobsApi";
import {
  Upload,
  FileText,
  Pencil,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import RejectionNote from "../../../components/RejectionNote";
import StepSubHeader from "./StepSubHeader";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";
import mayaSad from "../../../assets/onboarding/mayaSad.webp";
import { toast } from "react-hot-toast";

const formatDob = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Experience is stored as a number (backend field) but presented as buckets.
// Auto-extracted values snap to the nearest bucket for display.
const EXPERIENCE_OPTIONS = [
  { value: 0, label: "Fresher" },
  { value: 1, label: "1 to 2 Years" },
  { value: 2, label: "2 to 4 Years" },
  { value: 4, label: "4+ Years" },
];

const experienceOptionValue = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 1) return 0;
  if (n < 2) return 1;
  if (n < 4) return 2;
  return 4;
};

const experienceLabel = (v) =>
  EXPERIENCE_OPTIONS.find((o) => o.value === experienceOptionValue(v))?.label ||
  "";

// Compact app-styled dropdown — same pattern as the CustomDropdown used in the
// learning screens, sized for the inline field rows.
function FieldDropdown({ options, value, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-0.5 w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 bg-white flex items-center justify-between gap-2"
      >
        <span className={`truncate text-left ${selected ? "" : "text-slate-400"}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                o.value === value
                  ? "bg-[#edfaff] text-[#002856]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// One row in the extraction review card — ticks in when `revealed`, shows the
// value or a "not found" alert, and supports inline editing.
function FieldRow({
  label,
  display,
  missing,
  extracting,
  revealed,
  locked,
  editing,
  editControl,
  onEdit,
  onCancel,
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: revealed ? 1 : 0.45 }}
      className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0"
    >
      <div className={`flex items-center gap-3 min-w-0 ${editing ? "flex-1" : ""}`}>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
            missing && !extracting
              ? "bg-amber-100 border border-amber-200 text-amber-600"
              : "bg-[#15803d] text-white"
          }`}
        >
          {extracting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#002856]" />
          ) : missing ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          )}
        </div>
        <div className={`min-w-0 ${editing ? "flex-1" : ""}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          {editing ? (
            editControl
          ) : (
            <p
              className={`text-xs font-semibold truncate ${
                missing && !extracting ? "text-amber-600" : "text-slate-800"
              }`}
            >
              {extracting
                ? "Extracting..."
                : missing
                  ? "Not found, tap to add"
                  : display}
            </p>
          )}
        </div>
      </div>
      {!locked && !editing && !extracting && (
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#002856] transition-colors cursor-pointer shrink-0"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {editing && (
        <button
          type="button"
          // preventDefault keeps focus on the input so its onBlur save doesn't
          // fire before the cancel click lands.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer shrink-0"
          aria-label={`Cancel ${label} edit`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

const ResumeProfileStep = ({
  progress,
  onComplete,
  onBack,
  refreshProgress,
  onProgressUpdate,
}) => {
  const resume = progress?.resume || {};
  const fields = progress?.profileFields || {};
  const meta = progress?.profileFieldsMeta || {};
  const qualificationOptions = progress?.qualificationOptions || [];
  const locked = resume.status === "approved";

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // Staggered tick reveal — only for the just-uploaded viewing pass.
  const [revealCount, setRevealCount] = useState(0);
  const [savingField, setSavingField] = useState(null);
  const [draft, setDraft] = useState({});
  const pollRef = useRef(null);
  // Details-confirm gate: a fresh upload shows the extracted-fields view until
  // the user confirms; reopening an already-submitted resume lands straight on
  // the under-review screen.
  const [detailsConfirmed, setDetailsConfirmed] = useState(
    () => Boolean(resume.uploaded) && !resume.extractionPending,
  );
  const [refreshing, setRefreshing] = useState(false);

  // After polling gives up, let the candidate fill the fields by hand; the
  // server sweep keeps retrying the extraction.
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const extracting = Boolean(resume.extractionPending) && !pollTimedOut;

  // Latest ref — the parent passes an inline callback, so depending on it
  // would restart the poll interval on every render.
  const refreshRef = useRef(refreshProgress);
  useEffect(() => {
    refreshRef.current = refreshProgress;
  }, [refreshProgress]);

  // Poll while the AI pass is still working — dob lands a few seconds after
  // the upload returns (years is already there from the deterministic pass).
  useEffect(() => {
    if (!resume.extractionPending) setPollTimedOut(false);
  }, [resume.extractionPending]);

  useEffect(() => {
    if (!extracting) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }
    const started = Date.now();
    pollRef.current = setInterval(() => {
      if (Date.now() - started > 45000) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPollTimedOut(true);
        return;
      }
      refreshRef.current?.();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [extracting]);

  // Cascade the three field rows in after an upload lands.
  const fieldRows = [
    { key: "experience_years", label: "Experience" },
    { key: "dob", label: "Date of Birth" },
    { key: "qualification", label: "Qualification" },
  ];
  useEffect(() => {
    if (!resume.uploaded) return;
    setRevealCount(0);
    const t1 = setTimeout(() => setRevealCount(1), 300);
    const t2 = setTimeout(() => setRevealCount(2), 800);
    const t3 = setTimeout(() => setRevealCount(3), 1300);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [resume.downloadUrl, resume.uploaded]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("resume", file);
      const { data } = await uploadIrelandResume(formData);
      if (data?.success) {
        // Mutation returns fresh progress — commit directly, no second GET.
        if (data.data) onProgressUpdate?.(data.data);
        else await refreshProgress?.();
        // Fresh upload → show the extracted fields again for confirmation
        // before the under-review screen takes over.
        setDetailsConfirmed(false);
        setPollTimedOut(false);
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to upload resume");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [editingKey, setEditingKey] = useState(null);
  const startEdit = (key, current) => {
    setSavingField(null);
    // input[type=date] needs YYYY-MM-DD — the stored value is a full ISO string.
    const seed =
      key === "dob" && current ? String(current).slice(0, 10) : current;
    setDraft((d) => ({ ...d, [key]: seed ?? "" }));
    setEditingKey(key);
  };

  const cancelEdit = () => setEditingKey(null);

  const saveField = async (key, valueOverride) => {
    try {
      setSavingField(key);
      const value = valueOverride !== undefined ? valueOverride : draft[key];
      const payload = {};
      if (key === "experience_years") payload.experience_years = value;
      else if (key === "dob") payload.dob = value;
      else if (key === "qualification") payload.qualification = value;
      const { data } = await updateIrelandProfileFields(payload);
      if (data?.success) {
        setEditingKey(null);
        if (data.data) onProgressUpdate?.(data.data);
        else await refreshProgress?.();
      } else {
        toast.error("Failed to save");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSavingField(null);
    }
  };

  const rejected = resume.status === "rejected";

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true);
      await refreshProgress?.();
    } finally {
      setRefreshing(false);
    }
  };

  // ── Upload view ──────────────────────────────────────────────────────────
  if (!resume.uploaded) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
        <StepSubHeader onBack={onBack} />

        <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl flex flex-col items-center gap-6">
          <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center shrink-0">
            {uploading ? (
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-white" />
            )}
          </div>

          <div className="w-full text-center">
            <h2 className="text-blue-950 text-2xl font-semibold">
              Upload your CV
            </h2>
            <p className="text-blue-950/70 text-xs sm:text-sm font-medium leading-relaxed mt-2">
              We read your resume to pick out your experience and date of
              birth, then match you to Irish roles
            </p>
          </div>

          {/* Dropzone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full p-6 bg-white rounded-xl border border-dashed border-slate-300 hover:border-[#002856]/40 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center text-slate-500 mb-2">
              {uploading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>
            <span className="text-[#002856] text-xs sm:text-sm font-semibold">
              {uploading ? "Uploading..." : "Click to upload"}
            </span>
            <span className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
              Supported file: PDF, up to 10MB
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleUpload}
          />

          {/* Maya note — same component as Job Screening */}
          <div className="w-full bg-white rounded-2xl border border-slate-200/80 flex items-center gap-2.5 shadow-sm text-left">
            <img
              src={mayaShocked}
              alt="Mascot Alert"
              className="w-20 h-20 object-contain shrink-0 select-none"
              draggable="false"
            />
            <div className="min-w-0 flex-1 pr-3">
              <h5 className="text-slate-800 text-xs sm:text-sm font-bold">
                Please note
              </h5>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                Make sure your experience and date of birth are clearly
                mentioned in the CV
              </p>
            </div>
          </div>

          {error && (
            <div className="w-full flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Under-review view (submitted, awaiting admin approval) ────────────────
  const REVIEW_TIMELINE = [
    {
      state: "done",
      title: "Resume uploaded",
      subtitle: "Your CV and profile details were submitted",
    },
    {
      state: "current",
      title: "Profile under review",
      subtitle: "Our team is verifying your experience and details",
    },
    {
      state: "upcoming",
      title: "Pick your opportunity",
      subtitle: "Choose Nurse or Caregiver once approved",
    },
  ];

  if (resume.status === "pending" && !extracting && detailsConfirmed) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
        <StepSubHeader onBack={onBack} />

        {/* Blue review card */}
        <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl flex flex-col items-center gap-6">
          <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-white" />
          </div>

          <div className="w-full text-center">
            <h2 className="text-blue-950 text-2xl font-semibold">
              Profile under review
            </h2>
            <p className="text-blue-950/70 text-xs sm:text-sm font-medium leading-relaxed mt-2">
              Our team is checking your resume and profile details
            </p>
          </div>

          {/* Vertical timeline */}
          <div className="w-full flex flex-col pt-2 px-2">
            {REVIEW_TIMELINE.map((step, idx) => (
              <div key={step.title} className="w-full flex items-stretch gap-3.5">
                <div className="w-6 flex flex-col items-center shrink-0">
                  {step.state === "done" ? (
                    <div className="w-6 h-6 bg-green-700 rounded-full flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                  ) : step.state === "current" ? (
                    <div className="w-6 h-6 bg-blue-950 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-black/50" />
                  )}
                  {idx < REVIEW_TIMELINE.length - 1 && (
                    <div className="w-[1.5px] bg-black/30 flex-1 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-5 text-left min-w-0">
                  <h4 className="text-slate-900 text-sm font-semibold leading-6">
                    {step.title}
                  </h4>
                  <p className="opacity-70 text-black text-xs font-normal leading-4 mt-0.5">
                    {step.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Maya note — same component as Job Screening */}
          <div className="w-full bg-white rounded-2xl border border-slate-200/80 flex items-center gap-2.5 shadow-sm text-left">
            <img
              src={mayaShocked}
              alt="Mascot Alert"
              className="w-20 h-20 object-contain shrink-0 select-none"
              draggable="false"
            />
            <div className="min-w-0 flex-1 pr-3">
              <h5 className="text-slate-800 text-xs sm:text-sm font-bold">
                Please note
              </h5>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                Typically takes around 24-48 hrs. You will be notified on
                WhatsApp
              </p>
            </div>
          </div>

          {/* Refresh status */}
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={refreshing}
            className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-[#002856] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Syncing status..." : "Refresh status"}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Extracted-profile view ────────────────────────────────────────────────
  const rowValue = (key) =>
    key === "qualification" ? progress?.qualification : fields[key];
  const rowDisplay = (key) => {
    const v = rowValue(key);
    if (key === "experience_years") return experienceLabel(v);
    if (key === "dob") return formatDob(v);
    return v;
  };

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
      <StepSubHeader onBack={onBack} />

      {rejected && (
        <div className="w-full mb-4">
          <RejectionNote
            message={resume.rejectionReason}
            viewedAt={resume.rejectionViewed ? "seen" : null}
            onView={markIrelandResumeRejectionViewed}
          />
        </div>
      )}

      <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl flex flex-col items-center gap-5">
        {rejected ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-t from-[#FC837A] to-[#FFCBC7] overflow-hidden flex items-end justify-center shrink-0">
            <img
              src={mayaSad}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-contain select-none pointer-events-none translate-y-1"
              draggable="false"
            />
          </div>
        ) : (
          <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center shrink-0">
            {extracting ? (
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
            ) : (
              <FileText className="w-6 h-6 text-white" />
            )}
          </div>
        )}

        <div className="w-full text-center">
          <h2 className="text-blue-950 text-2xl font-semibold">
            {extracting
              ? "Reading your resume..."
              : rejected
                ? "Resume was rejected"
                : "Your details"}
          </h2>
          <p className="text-blue-950/70 text-xs sm:text-sm font-medium leading-relaxed mt-2">
            {rejected
              ? "Please fix the flagged details or upload a new resume."
              : "Check what we pulled from your resume. Tap the pencil to fix anything."}
          </p>
        </div>

        {/* File row */}
        <div className="w-full p-4 bg-white rounded-xl border border-zinc-300/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-black/5 text-[#083262] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-700 text-xs sm:text-sm font-semibold truncate">
                {resume.filename || "resume.pdf"}
              </p>
              <p className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
                Your uploaded resume
              </p>
            </div>
          </div>
          {resume.downloadUrl && (
            <a
              href={resume.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Field rows with staggered tick reveal */}
        <div className="w-full bg-white border border-zinc-300/60 rounded-xl px-4 divide-y divide-slate-100">
          {fieldRows.map((f, idx) => {
          const v = rowValue(f.key);
          const missing = v === null || v === undefined || v === "";
          const editing = editingKey === f.key;
          const isAuto = meta[f.key] === "auto";
          // While the AI pass runs, every auto field shows "Extracting..." —
          // the old value is stale, not confirmed.
          const stillExtracting = extracting && f.key !== "qualification";
          let editControl = null;
          if (editing) {
            if (f.key === "qualification") {
              editControl = (
                <FieldDropdown
                  options={qualificationOptions.map((q) => ({
                    value: q,
                    label: q,
                  }))}
                  value={draft[f.key]}
                  onChange={(v) => saveField(f.key, v)}
                  placeholder="Select qualification"
                />
              );
            } else if (f.key === "dob") {
              editControl = (
                <input
                  type="date"
                  className="mt-0.5 w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5"
                  value={draft[f.key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                  }
                  onBlur={() => saveField(f.key)}
                />
              );
            } else {
              editControl = (
                <FieldDropdown
                  options={EXPERIENCE_OPTIONS}
                  value={experienceOptionValue(draft[f.key])}
                  onChange={(v) => saveField(f.key, v)}
                  placeholder="Select experience"
                />
              );
            }
          }
          return (
            <FieldRow
              key={f.key}
              label={
                f.key === "experience_years"
                  ? isAuto
                    ? "Experience (auto)"
                    : "Experience"
                  : f.label
              }
              display={rowDisplay(f.key)}
              missing={missing}
              extracting={stillExtracting}
              revealed={revealCount > idx}
              locked={locked}
              editing={editing}
              editControl={editControl}
              onEdit={() => startEdit(f.key, v)}
              onCancel={cancelEdit}
            />
          );
          })}
        </div>

        {savingField && (
          <p className="text-[11px] text-slate-400 font-medium -mt-3">
            Saving...
          </p>
        )}

        {/* Re-upload + status */}
        <div className="w-full flex flex-col gap-3">
          {locked && (
            <div className="flex items-center gap-3 bg-white border border-green-200/70 rounded-xl px-4 py-3">
              <Check className="w-4 h-4 text-[#15803d] shrink-0" />
              <p className="text-xs font-semibold text-[#15803d]">
                Your profile has been approved.
              </p>
            </div>
          )}

          {/* Hidden file input — the upload view has its own; this one backs
              the Replace/Upload buttons in the details view. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleUpload}
          />

          {!locked && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200/80 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {uploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {rejected ? "Upload a new resume" : "Replace resume"}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              resume.status === "pending"
                ? setDetailsConfirmed(true)
                : onComplete?.()
            }
            disabled={extracting}
            className="w-full px-4 py-3 bg-blue-950 rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] shadow-[inset_0px_-2px_0px_0px_rgba(10,13,18,0.05)] shadow-[inset_0px_0px_0px_1px_rgba(10,13,18,0.18)] outline outline-offset-[-2px] outline-white/10 flex justify-center items-center gap-1.5 overflow-hidden cursor-pointer disabled:opacity-60 transition-opacity"
          >
            <span className="text-white text-sm font-semibold">
              {resume.status === "pending" ? "Confirm details" : "Done"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeProfileStep;
