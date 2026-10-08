import { useState, useRef } from "react";
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
} from "lucide-react";
import StepSubHeader from "./StepSubHeader";
import { toast } from "react-hot-toast";

const ANSWER_OPTIONS = [
  { value: "have", label: "Yes, I have it" },
  { value: "none", label: "No, I don't" },
  { value: "preparing", label: "I'm preparing" },
];

const STATUS_CHIP = {
  pending: { label: "Under review", cls: "bg-blue-50 text-[#1d4ed8] border-blue-100", Icon: Clock },
  approved: { label: "Approved", cls: "bg-green-50 text-[#15803d] border-green-100", Icon: BadgeCheck },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-600 border-red-100", Icon: XCircle },
};

function DocCard({ doc, entry, uploading, onAnswer, onUpload, onDelete }) {
  const fileRef = useRef(null);
  const status = entry?.status;
  const chip = status ? STATUS_CHIP[status] : null;

  return (
    <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-3.5 text-left">
      <div className="flex justify-between items-center w-full">
        <div className="min-w-0">
          <h3 className="text-[#002856] text-base font-semibold leading-tight truncate pr-2">
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

      {/* Three-state answer */}
      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={doc.label}>
        {ANSWER_OPTIONS.map((opt) => {
          const selected = entry?.answer === opt.value;
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

      {/* Upload zone — only meaningful when the candidate says they have it */}
      {entry?.answer === "have" && (
        <div className="flex flex-col gap-2">
          {entry?.filename ? (
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-[#083262] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-slate-700 text-xs sm:text-sm font-semibold truncate flex-1 min-w-0">
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
                Supported files: PDF, DOC, DOCX, PNG, JPG
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

const IrelandDocumentsStep = ({ progress, onComplete, onBack, onProgressUpdate }) => {
  const requiredDocs = progress?.requiredDocuments || [];
  const documents = progress?.documents || {};
  const [answers, setAnswers] = useState(() => {
    const seed = {};
    for (const doc of requiredDocs) {
      if (documents[doc.id]?.answer) seed[doc.id] = documents[doc.id].answer;
    }
    return seed;
  });
  const [uploadingId, setUploadingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // All answered, and every "have" has a file attached.
  const allDone = requiredDocs.every((d) => {
    const answer = answers[d.id];
    if (!answer) return false;
    if (answer === "have" && !documents[d.id]?.filename) return false;
    return true;
  });

  const handleAnswer = (docId, answer) => {
    setAnswers((a) => ({ ...a, [docId]: answer }));
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
      onProgressUpdate?.(data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError("");
      const { data } = await setIrelandDocAnswers(answers);
      if (data?.success) {
        onComplete?.(data.data);
      } else {
        setError("Failed to save. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const pendingReview = requiredDocs.some(
    (d) => documents[d.id]?.filename && documents[d.id]?.status === "pending",
  );

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
      <StepSubHeader onBack={onBack} />

      <div className="text-left w-full mb-6">
        <h2 className="text-[#002856] text-2xl font-bold tracking-tight mb-2">
          Your documents
        </h2>
        <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
          Tell us which certificates you already have. Each file you upload is
          reviewed by our team.
        </p>
      </div>

      <div className="w-full flex flex-col gap-4 mb-6">
        {requiredDocs.map((doc) => (
          <DocCard
            key={doc.id}
            doc={doc}
            entry={{ ...(documents[doc.id] || {}), answer: answers[doc.id] ?? documents[doc.id]?.answer }}
            uploading={uploadingId === doc.id}
            onAnswer={handleAnswer}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {pendingReview && (
        <div className="w-full flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-4">
          <Clock className="w-4 h-4 text-[#1d4ed8] shrink-0" />
          <p className="text-xs font-semibold text-[#1d4ed8] leading-relaxed">
            Some files are waiting for review. This step completes once each
            uploaded document is approved.
          </p>
        </div>
      )}

      {error && (
        <div className="w-full flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allDone || saving}
        className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm sm:text-base transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Save &amp; Continue
          </>
        )}
      </button>
    </div>
  );
};

export default IrelandDocumentsStep;
