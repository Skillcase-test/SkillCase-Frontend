import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  selectIrelandRole,
  markIrelandIeltsInterest,
  markIrelandOpportunityInterest,
  uploadIrelandDocument,
} from "../../../api/irelandJobsApi";
import {
  Stethoscope,
  HeartHandshake,
  RefreshCw,
  Check,
  Clock,
  Upload,
  FileText,
  BadgeCheck,
} from "lucide-react";
import StepSubHeader from "./StepSubHeader";
import OpportunitySheet from "./OpportunitySheet";
import { toast } from "react-hot-toast";

const ROLE_CARDS = [
  {
    id: "nurse",
    title: "Nurse",
    desc: "Registered nursing roles in Irish hospitals and care homes. Requires IELTS and NMBI certificates.",
    Icon: Stethoscope,
  },
  {
    id: "caregiver",
    title: "Caregiver",
    desc: "Care assistant and caregiver roles across Ireland. No IELTS required.",
    Icon: HeartHandshake,
  },
];

const RoleSelectStep = ({ progress, onComplete, onBack, onProgressUpdate }) => {
  const ielts = progress?.ielts || {};
  const nmbi = progress?.nmbi || {};
  const [role, setRole] = useState(progress?.role || null);
  const [notingInterest, setNotingInterest] = useState(false);
  const [interestNoted, setInterestNoted] = useState(
    Boolean(progress?.ieltsInterestAt),
  );
  const [uploadingIelts, setUploadingIelts] = useState(false);
  const [uploadingNmbi, setUploadingNmbi] = useState(false);
  const [previewRole, setPreviewRole] = useState(null);
  const [markingOpp, setMarkingOpp] = useState(false);
  const [oppInterested, setOppInterested] = useState(
    Boolean(progress?.opportunityInterestAt),
  );
  const [error, setError] = useState("");
  const ieltsFileRef = useRef(null);
  const nmbiFileRef = useRef(null);

  const opportunities = progress?.opportunities || {};

  const needsIelts = role === "nurse" && !ielts.approved && !interestNoted;
  const ieltsPending = ielts.pending;
  const ieltsRejected = ielts.rejected;
  const nmbiPending = nmbi.pending;
  const nmbiRejected = nmbi.rejected;

  // All requirements for the *previewed* role are satisfied (docs settled,
  // gates cleared) — that's when the Interested CTA may appear.
  const gatesSettled = Boolean(
    role &&
      !(role === "nurse" &&
        ((needsIelts && !ieltsPending) || (!nmbi.approved && !nmbiPending))),
  );

  // The selection only becomes real when the candidate presses "I'm
  // Interested" — that single click commits the role AND the interest and
  // finishes the step (there is no separate Continue). A card tap is just a
  // preview and never touches the server.
  const committed =
    oppInterested ||
    (progress?.role === role && Boolean(progress?.opportunityInterestAt));

  const pickRole = (id) => {
    if (markingOpp) return;
    setRole(id);
    setError("");
    // Picking a different card re-arms the Interested button — committing it
    // switches the role and records interest for the new one.
    if (id !== role) setOppInterested(false);
  };

  // "I'm Interested" — the actual selection: persist the role first (a switch
  // clears opportunity_interest_at server-side), then record interest.
  const handleInterested = async (targetRole = role) => {
    if (markingOpp || !targetRole) return;
    try {
      setMarkingOpp(true);
      setError("");
      const { data: sel } = await selectIrelandRole(targetRole);
      if (!sel?.success) {
        setError("Failed to save your selection");
        return;
      }
      onProgressUpdate?.(sel.data);
      const { data: mark } = await markIrelandOpportunityInterest(targetRole);
      if (mark?.success) {
        setOppInterested(true);
        // Interest committed = the step's outcome — hand the fresh payload up
        // and exit straight to the lobby.
        onComplete?.(mark.data || sel.data);
      } else {
        toast.error("Could not save your interest");
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || "Failed to save your selection");
    } finally {
      setMarkingOpp(false);
    }
  };

  const handleIeltsUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingIelts(true);
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await uploadIrelandDocument("ielts", formData);
      if (data?.success) {
        toast.success("IELTS certificate uploaded — waiting for review");
        onProgressUpdate?.(data.data);
      } else {
        toast.error("Upload failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingIelts(false);
      e.target.value = "";
    }
  };

  const handleNmbiUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingNmbi(true);
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await uploadIrelandDocument("nmbi", formData);
      if (data?.success) {
        toast.success("NMBI certificate uploaded — waiting for review");
        onProgressUpdate?.(data.data);
      } else {
        toast.error("Upload failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingNmbi(false);
      e.target.value = "";
    }
  };

  const handleInterest = async () => {
    try {
      setNotingInterest(true);
      const { data } = await markIrelandIeltsInterest();
      if (data?.success) {
        setInterestNoted(true);
        onProgressUpdate?.(data.data);
      } else {
        toast.error("Could not save your interest");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save your interest");
    } finally {
      setNotingInterest(false);
    }
  };

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative gap-5">
      <StepSubHeader onBack={onBack} />

      <div className="text-left w-full">
        <h2 className="text-[#002856] text-2xl font-bold tracking-tight mb-2">
          Choose your opportunity
        </h2>
        <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
          Pick the role you want to be placed in.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        {ROLE_CARDS.map(({ id, title, desc, Icon }) => {
          const selected = role === id;
          return (
            <motion.button
              key={id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => pickRole(id)}
              disabled={markingOpp}
              className={`w-full text-left bg-white border rounded-2xl p-4 flex items-start gap-3 transition-all cursor-pointer disabled:opacity-60 ${
                selected
                  ? "border-[#002856] shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selected
                    ? "bg-[#002856] text-white"
                    : "bg-blue-50 border border-blue-100 text-[#083262]"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[#002856] text-base font-semibold">{title}</h4>
                  {selected && (
                    <Check className="w-4 h-4 text-[#002856] shrink-0" />
                  )}
                </div>
                <p className="text-slate-500 text-[11px] sm:text-xs font-normal leading-relaxed mt-1">
                  {desc}
                </p>
                {opportunities[id] && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewRole(id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setPreviewRole(id);
                      }
                    }}
                    className="inline-block mt-2 text-[11px] font-bold text-[#083262] hover:underline cursor-pointer"
                  >
                    View opportunity details →
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* "I'm Interested" IS the selection — card taps only preview. It
          appears once every requirement for the picked role is done. */}
      {role && gatesSettled &&
        (committed ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            <Check className="w-4 h-4 text-[#15803d] shrink-0" />
            <p className="text-xs font-semibold text-[#15803d] leading-relaxed">
              Interested ✓ — our team will reach out about the {role === "nurse" ? "Nursing" : "Caregiver"} opportunity.
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-[#f0f7ff] border border-[#bfdbfe] rounded-2xl px-4 py-3">
            <p className="flex-1 text-xs font-semibold text-[#083262] leading-relaxed">
              Tap "I'm Interested" to choose the {role === "nurse" ? "Nursing" : "Caregiver"} opportunity and let our team know.
            </p>
            <button
              type="button"
              onClick={() => handleInterested()}
              disabled={markingOpp}
              className="shrink-0 h-10 px-5 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              {markingOpp ? "Saving..." : "I'm Interested"}
            </button>
          </div>
        ))}

      {error && (
        <div className="w-full flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100">
          <span>{error}</span>
        </div>
      )}

      {/* Nurse gate — IELTS states */}
      {role === "nurse" && ielts.approved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
          <BadgeCheck className="w-4 h-4 text-[#15803d] shrink-0" />
          <p className="text-xs font-semibold text-[#15803d]">
            Your IELTS certificate is approved — you're set for the Nurse opportunity.
          </p>
        </div>
      )}

      {needsIelts && ieltsPending && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <Clock className="w-4 h-4 text-[#1d4ed8] shrink-0" />
          <p className="text-xs font-semibold text-[#1d4ed8] leading-relaxed">
            Your IELTS certificate is under review. We'll move you forward as
            soon as it's approved.
          </p>
        </div>
      )}

      {needsIelts && !ieltsPending && (
        <div className="flex flex-col gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-800 leading-relaxed">
            {ieltsRejected
              ? "Your IELTS certificate was rejected — please upload a valid certificate."
              : "Please upload your IELTS certificate to continue on the Nurse opportunity."}
          </p>
          <button
            type="button"
            onClick={() => ieltsFileRef.current?.click()}
            disabled={uploadingIelts}
            className="w-full border-2 border-dashed border-amber-300 rounded-xl px-3 py-3.5 flex items-center justify-center gap-2 text-xs font-bold text-amber-800 hover:border-[#002856]/40 hover:text-[#002856] transition-colors cursor-pointer disabled:opacity-60"
          >
            {uploadingIelts ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploadingIelts ? "Uploading..." : "Upload IELTS certificate"}
          </button>
          <input
            ref={ieltsFileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleIeltsUpload}
          />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-amber-200" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
              or
            </span>
            <div className="flex-1 h-px bg-amber-200" />
          </div>
          <button
            type="button"
            onClick={handleInterest}
            disabled={notingInterest}
            className="w-full h-12 bg-white border border-amber-200 hover:bg-amber-100/60 text-amber-800 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {notingInterest ? "Saving..." : "Want to get an IELTS certificate?"}
          </button>
        </div>
      )}

      {needsIelts && ieltsPending && progress?.documents?.ielts?.filename && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          <FileText className="w-4 h-4 text-[#002856] shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate flex-1">
            {progress.documents.ielts.filename}
          </span>
        </div>
      )}

      {role === "nurse" && interestNoted && !ielts.approved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
          <Check className="w-4 h-4 text-[#15803d] shrink-0" />
          <p className="text-xs font-semibold text-[#15803d] leading-relaxed">
            Interest noted — our team will reach out to help you get your IELTS
            certificate.
          </p>
        </div>
      )}

      {/* Nurse gate — NMBI states (hospital-required, no interest alternative) */}
      {role === "nurse" && nmbi.approved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
          <BadgeCheck className="w-4 h-4 text-[#15803d] shrink-0" />
          <p className="text-xs font-semibold text-[#15803d]">
            Your NMBI certificate is approved.
          </p>
        </div>
      )}

      {role === "nurse" && nmbiPending && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <Clock className="w-4 h-4 text-[#1d4ed8] shrink-0" />
          <p className="text-xs font-semibold text-[#1d4ed8] leading-relaxed">
            Your NMBI certificate is under review. We'll move you forward as
            soon as it's approved.
          </p>
        </div>
      )}

      {role === "nurse" && !nmbi.approved && !nmbiPending && (
        <div className="flex flex-col gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-800 leading-relaxed">
            {nmbiRejected
              ? `Your NMBI certificate was rejected${nmbi.rejectionReason ? ` — ${nmbi.rejectionReason}` : ""}. Please upload a valid certificate.`
              : "Please upload your NMBI certificate — Irish hospitals require it to proceed on the Nurse opportunity."}
          </p>
          <button
            type="button"
            onClick={() => nmbiFileRef.current?.click()}
            disabled={uploadingNmbi}
            className="w-full border-2 border-dashed border-amber-300 rounded-xl px-3 py-3.5 flex items-center justify-center gap-2 text-xs font-bold text-amber-800 hover:border-[#002856]/40 hover:text-[#002856] transition-colors cursor-pointer disabled:opacity-60"
          >
            {uploadingNmbi ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploadingNmbi ? "Uploading..." : "Upload NMBI certificate"}
          </button>
          <input
            ref={nmbiFileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleNmbiUpload}
          />
        </div>
      )}

      {role === "nurse" && nmbiPending && nmbi.filename && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          <FileText className="w-4 h-4 text-[#002856] shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate flex-1">
            {nmbi.filename}
          </span>
        </div>
      )}

      {previewRole && opportunities[previewRole] && (
        // pb-24 clears the fixed bottom tab bar (~72px + safe-area inset);
        // on sm+ the sheet centers so the padding is harmless.
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] px-0 pt-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[calc(100dvh-9rem)] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#f8fafc] p-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <OpportunitySheet
              content={opportunities[previewRole]}
              primaryBusy={markingOpp}
              onPrimary={async () => {
                const picked = previewRole;
                setPreviewRole(null);
                pickRole(picked);
                await handleInterested(picked);
              }}
              onSecondary={() => setPreviewRole(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelectStep;
