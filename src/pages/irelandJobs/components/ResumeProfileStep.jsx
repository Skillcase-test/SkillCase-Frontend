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
} from "lucide-react";
import RejectionNote from "../../../components/RejectionNote";
import StepSubHeader from "./StepSubHeader";
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

const formatYears = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${n} year${n === 1 ? "" : "s"}`;
};

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
      <div className="flex items-center gap-3 min-w-0">
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
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          {editing ? (
            editControl
          ) : (
            <p
              className={`text-sm font-semibold truncate ${
                missing ? "text-amber-600" : "text-slate-800"
              }`}
            >
              {missing
                ? extracting
                  ? "Extracting..."
                  : "Not found — tap to add"
                : display}
            </p>
          )}
        </div>
      </div>
      {!locked && !editing && (
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

  const extracting = Boolean(resume.extractionPending);

  // Poll while the AI pass is still working — dob lands a few seconds after
  // the upload returns (years is already there from the deterministic pass).
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
        return;
      }
      refreshProgress?.();
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
    setDraft((d) => ({ ...d, [key]: current ?? "" }));
    setEditingKey(key);
  };

  const cancelEdit = () => setEditingKey(null);

  const saveField = async (key) => {
    try {
      setSavingField(key);
      const payload = {};
      if (key === "experience_years") payload.experience_years = draft[key];
      else if (key === "dob") payload.dob = draft[key];
      else if (key === "qualification") payload.qualification = draft[key];
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

  // ── Upload view ──────────────────────────────────────────────────────────
  if (!resume.uploaded) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
        <StepSubHeader onBack={onBack} />

        <div className="text-left w-full mb-6">
          <h2 className="text-[#002856] text-2xl font-bold tracking-tight mb-2">
            Upload your CV
          </h2>
          <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
            We read your resume to pick out your experience and date of birth,
            then match you to Irish roles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full p-6 bg-slate-50/20 hover:bg-slate-50/55 rounded-xl border border-dashed border-slate-200 hover:border-slate-350 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 disabled:opacity-60"
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
        {error && (
          <div className="w-full mt-4 flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Extracted-profile view ────────────────────────────────────────────────
  const rowValue = (key) =>
    key === "qualification" ? progress?.qualification : fields[key];
  const rowDisplay = (key) => {
    const v = rowValue(key);
    if (key === "experience_years") return formatYears(v);
    if (key === "dob") return formatDob(v);
    return v;
  };

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative gap-5">
      <StepSubHeader onBack={onBack} />

      {rejected && (
        <div className="w-full">
          <RejectionNote
            message={resume.rejectionReason}
            viewedAt={resume.rejectionViewed ? "seen" : null}
            onView={markIrelandResumeRejectionViewed}
          />
        </div>
      )}

      <div className="text-left w-full">
        <h2 className="text-[#002856] text-2xl font-bold tracking-tight mb-2">
          {extracting ? "Reading your resume..." : "Your details"}
        </h2>
        <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
          {rejected
            ? "Please fix the flagged details or upload a new resume."
            : "Check what we pulled from your resume — tap the pencil to fix anything."}
        </p>
      </div>

      {/* File row */}
      <div className="w-full p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-[#083262] flex items-center justify-center shrink-0">
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
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl px-4 divide-y divide-slate-100 shadow-[0_2px_8px_rgba(0,40,86,0.03)]">
        {fieldRows.map((f, idx) => {
          const v = rowValue(f.key);
          const missing = v === null || v === undefined || v === "";
          const editing = editingKey === f.key;
          const isAuto = meta[f.key] === "auto";
          const stillExtracting =
            extracting && missing && f.key !== "qualification";
          let editControl = null;
          if (editing) {
            if (f.key === "qualification") {
              editControl = (
                <select
                  className="mt-0.5 w-full text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                  value={draft[f.key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                  }
                  onBlur={() => saveField(f.key)}
                >
                  <option value="">Select...</option>
                  {qualificationOptions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              );
            } else if (f.key === "dob") {
              editControl = (
                <input
                  type="date"
                  className="mt-0.5 w-full text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5"
                  value={draft[f.key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                  }
                  onBlur={() => saveField(f.key)}
                />
              );
            } else {
              editControl = (
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="0.5"
                  placeholder="e.g. 4"
                  className="mt-0.5 w-full text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5"
                  value={draft[f.key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                  }
                  onBlur={() => saveField(f.key)}
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
        <p className="text-[11px] text-slate-400 font-medium -mt-3">Saving...</p>
      )}

      {/* Re-upload + status */}
      <div className="w-full flex flex-col gap-3">
        {!locked && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-[#002856] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {uploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {rejected ? "Upload a new resume" : "Replace resume"}
          </button>
        )}

        {resume.status === "pending" && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <Clock className="w-4 h-4 text-[#1d4ed8] shrink-0" />
            <p className="text-xs font-semibold text-[#1d4ed8] leading-relaxed">
              Submitted — our team is reviewing your details. This step completes
              once approved.
            </p>
          </div>
        )}
        {locked && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            <Check className="w-4 h-4 text-[#15803d] shrink-0" />
            <p className="text-xs font-semibold text-[#15803d]">
              Your profile has been approved.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onComplete?.()}
          className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm transition-all active:scale-[0.99] cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default ResumeProfileStep;
