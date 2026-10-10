import { useState, useRef, useEffect } from "react";
import {
  setIrelandDocAnswers,
  uploadIrelandDocument,
  deleteIrelandDocument,
} from "../../../api/irelandJobsApi";
import {
  FileText,
  Upload,
  RefreshCw,
  Check,
  Clock,
  XCircle,
  BadgeCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import StepSubHeader from "./StepSubHeader";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";
import mayaSad from "../../../assets/onboarding/mayaSad.webp";
import { toast } from "react-hot-toast";

const ANSWER_OPTIONS = [
  { value: "have", label: "Yes, I have it" },
  { value: "none", label: "No, I don't" },
  { value: "preparing", label: "I'm preparing" },
];

const ANSWER_LABEL = Object.fromEntries(
  ANSWER_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_CHIP = {
  pending: { label: "Under review", cls: "bg-blue-50 text-[#1d4ed8] border-blue-100", Icon: Clock },
  approved: { label: "Approved", cls: "bg-green-50 text-[#15803d] border-green-100", Icon: BadgeCheck },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-600 border-red-100", Icon: XCircle },
};

// One document requirement. Unanswered → the three options are open. Once the
// candidate picks one, the question collapses to a single tap-to-change row;
// "have" reveals the upload zone underneath.
function DocCard({
  doc,
  entry,
  answer,
  expanded,
  uploading,
  onToggle,
  onAnswer,
  onUpload,
  onDelete,
}) {
  const fileRef = useRef(null);
  const status = entry?.status;
  const chip = status ? STATUS_CHIP[status] : null;

  return (
    <div className="w-full p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-3 text-left">
      <div className="flex justify-between items-center w-full gap-2">
        <div className="min-w-0">
          <h3 className="text-[#002856] text-sm font-semibold leading-tight truncate pr-2">
            {doc.label}
          </h3>
          {doc.id === "ielts" && (
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Required for the Nurse opportunity
            </p>
          )}
        </div>
        {chip && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${chip.cls}`}
          >
            <chip.Icon className="w-3 h-3" />
            {chip.label}
          </span>
        )}
      </div>

      {expanded ? (
        /* Question — three-state answer picker */
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={doc.label}>
          <p className="text-[11px] font-semibold text-slate-500 mb-0.5">
            Do you have your {doc.label}?
          </p>
          {ANSWER_OPTIONS.map((opt) => {
            const selected = answer === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onAnswer(doc.id, opt.value)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                  selected
                    ? "border-[#002856] bg-[#002856]/5 text-[#002856]"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    selected ? "border-[#002856]" : "border-slate-300"
                  }`}
                >
                  {selected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#002856]" />
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : (
        /* Collapsed answer — tap to re-open the options */
        <button
          type="button"
          onClick={() => onToggle(doc.id)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Check className="w-3.5 h-3.5 text-green-700 stroke-[3] shrink-0" />
            <span className="text-xs font-semibold text-[#002856] truncate">
              {ANSWER_LABEL[answer] || "Select an option"}
            </span>
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      )}

      {/* Upload zone — only when the candidate says they have it */}
      {answer === "have" && !expanded && (
        <div className="flex flex-col gap-2">
          {entry?.filename ? (
            <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-[#083262] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <p className="text-slate-700 text-xs font-semibold truncate flex-1 min-w-0">
                  {entry.filename}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {entry.downloadUrl && (
                  <a
                    href={entry.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    className="w-7 h-7 bg-white hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={`Remove ${doc.label}`}
                    title="Delete file"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full p-5 bg-slate-50/20 hover:bg-slate-50/55 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center text-slate-500 mb-1.5">
                {uploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </div>
              <span className="text-[#002856] text-xs font-semibold">
                {uploading ? "Uploading..." : "Click to upload"}
              </span>
              <span className="text-[#002856]/50 text-[10px] font-normal mt-0.5">
                PDF, DOC, DOCX, PNG, JPG
              </span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => onUpload(doc.id, e)}
          />
          {status === "rejected" && entry?.rejectionReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 leading-relaxed">
              Rejected: {entry.rejectionReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const REVIEW_TIMELINE = [
  {
    state: "done",
    title: "Profile reviewed",
    subtitle: "Your resume and details are in place",
  },
  {
    state: "current",
    title: "Documents under review",
    subtitle: "Our team is verifying your uploaded files",
  },
  {
    state: "upcoming",
    title: "Pick your opportunity",
    subtitle: "Choose Nurse or Caregiver once approved",
  },
];

const IrelandDocumentsStep = ({
  progress,
  onComplete,
  onBack,
  onProgressUpdate,
  refreshProgress,
}) => {
  const requiredDocs = progress?.requiredDocuments || [];
  const documents = progress?.documents || {};
  const [answers, setAnswers] = useState(() => {
    const seed = {};
    for (const doc of requiredDocs) {
      if (documents[doc.id]?.answer) seed[doc.id] = documents[doc.id].answer;
    }
    return seed;
  });
  // Docs whose question is expanded for (re)selection — unanswered start open.
  const [openIds, setOpenIds] = useState(
    () =>
      new Set(
        requiredDocs
          .filter((d) => !documents[d.id]?.answer)
          .map((d) => d.id),
      ),
  );
  const [uploadingId, setUploadingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const docStepStatus = progress?.steps?.find(
    (s) => s.id === "documents",
  )?.status;
  const underReview = docStepStatus === "review";

  // Waiting on review → admin approves → status flips to "completed": move
  // straight on, no second confirm needed.
  const prevStatus = useRef(docStepStatus);
  useEffect(() => {
    if (prevStatus.current === "review" && docStepStatus === "completed") {
      onComplete?.(progress);
    }
    prevStatus.current = docStepStatus;
    // onComplete/progress intentionally excluded — fire once on the
    // review → completed transition only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docStepStatus]);

  // Mirrors computeStepStatuses: a rejected "have" file keeps the step pending.
  const allDone = requiredDocs.every((d) => {
    const answer = answers[d.id];
    if (!answer) return false;
    if (answer === "have" && !documents[d.id]?.filename) return false;
    if (answer === "have" && documents[d.id]?.status === "rejected") return false;
    return true;
  });

  const hasPendingUpload = requiredDocs.some(
    (d) => documents[d.id]?.filename && documents[d.id]?.status === "pending",
  );

  const anyRejected = requiredDocs.some(
    (d) => documents[d.id]?.status === "rejected",
  );

  const handleAnswer = (docId, answer) => {
    setAnswers((a) => ({ ...a, [docId]: answer }));
    setOpenIds((s) => {
      const next = new Set(s);
      next.delete(docId);
      return next;
    });
  };

  const handleToggle = (docId) => {
    setOpenIds((s) => {
      const next = new Set(s);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleUpload = async (docId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingId(docId);
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await uploadIrelandDocument(docId, formData);
      if (data?.success) {
        // Upload flips the declaration to "have" server-side; the response
        // already carries fresh progress so no second GET is needed.
        setAnswers((a) => ({ ...a, [docId]: "have" }));
        onProgressUpdate?.(data.data);
      } else {
        toast.error("Upload failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  const handleDelete = async (docId) => {
    try {
      const { data } = await deleteIrelandDocument(docId);
      if (data?.success) {
        onProgressUpdate?.(data.data);
      } else {
        toast.error("Delete failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  // Files pending review → stay put and land on the review screen; nothing
  // uploaded → the step completes straight away and moves to the next step.
  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError("");
      const { data } = await setIrelandDocAnswers(answers);
      if (data?.success) {
        if (hasPendingUpload) {
          onProgressUpdate?.(data.data);
        } else {
          onComplete?.(data.data);
        }
      } else {
        setError("Failed to save. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true);
      await refreshProgress?.();
    } finally {
      setRefreshing(false);
    }
  };

  // ── Under-review view (files uploaded, awaiting admin approval) ───────────
  if (underReview) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
        <StepSubHeader onBack={onBack} />

        <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl flex flex-col items-center gap-6">
          <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-white" />
          </div>

          <div className="w-full text-center">
            <h2 className="text-blue-950 text-2xl font-semibold">
              Documents under review
            </h2>
            <p className="text-blue-950/70 text-xs sm:text-sm font-medium leading-relaxed mt-2">
              Our team is checking your uploaded documents
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

  // ── Questions + uploads view ──────────────────────────────────────────────
  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
      <StepSubHeader onBack={onBack} />

      <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl flex flex-col items-center gap-5">
        {anyRejected ? (
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
            <FileText className="w-6 h-6 text-white" />
          </div>
        )}

        <div className="w-full text-center">
          <h2 className="text-blue-950 text-2xl font-semibold">
            {anyRejected ? "Document was rejected" : "Your documents"}
          </h2>
          <p className="text-blue-950/70 text-xs sm:text-sm font-medium leading-relaxed mt-2">
            {anyRejected
              ? "Please re-upload the flagged document below"
              : "Tell us which certificates you already have. Each file you upload is reviewed by our team"}
          </p>
        </div>

        {/* One card per requirement */}
        <div className="w-full flex flex-col gap-3">
          {requiredDocs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              entry={documents[doc.id] || {}}
              answer={answers[doc.id] ?? documents[doc.id]?.answer}
              expanded={openIds.has(doc.id)}
              uploading={uploadingId === doc.id}
              onToggle={handleToggle}
              onAnswer={handleAnswer}
              onUpload={handleUpload}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {error && (
          <div className="w-full flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allDone || saving}
          className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirm
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default IrelandDocumentsStep;
