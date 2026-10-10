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
  ArrowLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import OpportunitySheet from "./OpportunitySheet";
import {
  normalizeHex,
  oppAlpha,
  oppShade,
} from "../../../components/opportunity/opportunityTheme";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";
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

// Uploaded certificate (IELTS / NMBI) on Choose your path: name + View link.
const UploadedFileRow = ({ filename, downloadUrl }) => (
  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
    <FileText className="w-4 h-4 text-[#002856] shrink-0" />
    <span className="text-xs font-semibold text-slate-700 truncate flex-1">
      {filename}
    </span>
    {downloadUrl && (
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
      >
        <span>View</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    )}
  </div>
);

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
  const sheetIeltsFileRef = useRef(null);
  const sheetNmbiFileRef = useRef(null);

  const opportunities = progress?.opportunities || {};

  const ieltsPending = ielts.pending;
  const ieltsRejected = ielts.rejected;
  const nmbiPending = nmbi.pending;
  const nmbiRejected = nmbi.rejected;

  // Gate check for ANY role — nurse needs IELTS (approved / interest-noted /
  // pending) AND NMBI (approved or pending); caregiver has none. Used both
  // for the selected card's CTA and to lock the sheet's Interested button.
  const roleGatesSettled = (id) =>
    !(
      id === "nurse" &&
      ((!ielts.approved && !interestNoted && !ieltsPending) ||
        (!nmbi.approved && !nmbiPending))
    );

  // All requirements for the *previewed* role are satisfied (docs settled,
  // gates cleared) — that's when the Interested CTA may appear.
  const gatesSettled = Boolean(role && roleGatesSettled(role));

  // The selection only becomes real when the candidate presses "I'm
  // Interested" — that single click commits the role AND the interest and
  // finishes the step (there is no separate Continue). A card tap is just a
  // preview and never touches the server.
  const stepCompleted =
    (progress?.steps || []).find((s) => s.id === "role_select")?.status ===
    "completed";
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
      // Keeps the Documents-step answer so that step doesn't reopen.
      const { data } = await uploadIrelandDocument("ielts", formData, {
        source: "role_select",
      });
      if (data?.success) {
        toast.success("IELTS certificate uploaded. Waiting for review");
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
        toast.success("NMBI certificate uploaded. Waiting for review");
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

  // Nurse requirements (IELTS + NMBI), rendered inline and in the opportunity
  // sheet. Each placement has its own refs; a shared one is nulled on unmount.
  const ieltsOutstanding = !ielts.approved && !interestNoted;
  const ieltsFile = progress?.documents?.ielts;
  const renderNurseGates = (ieltsRef, nmbiRef) => (
    <>
      {/* Nurse gate — IELTS states */}
      {ielts.approved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
          <BadgeCheck className="w-4 h-4 text-[#15803d] shrink-0" />
          <p className="text-xs font-semibold text-[#15803d]">
            Your IELTS certificate is approved. You're set for the Nurse opportunity.
          </p>
        </div>
      )}

      {ieltsOutstanding && ieltsPending && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <Clock className="w-4 h-4 text-[#1d4ed8] shrink-0" />
          <p className="text-xs font-semibold text-[#1d4ed8] leading-relaxed">
            Your IELTS certificate is under review. We'll move you forward as
            soon as it's approved.
          </p>
        </div>
      )}

      {ieltsOutstanding && !ieltsPending && (
        <div className="flex flex-col gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-800 leading-relaxed">
            {ieltsRejected
              ? "Your IELTS certificate was rejected. Please upload a valid certificate."
              : "Please upload your IELTS certificate to continue on the Nurse opportunity."}
          </p>
          <button
            type="button"
            onClick={() => ieltsRef.current?.click()}
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
            ref={ieltsRef}
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

      {ieltsFile?.filename && !ieltsRejected && (
        <UploadedFileRow
          filename={ieltsFile.filename}
          downloadUrl={ieltsFile.downloadUrl}
        />
      )}

      {interestNoted && !ielts.approved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
          <Check className="w-4 h-4 text-[#15803d] shrink-0" />
          <p className="text-xs font-semibold text-[#15803d] leading-relaxed">
            Interest noted. Our team will reach out to help you get your IELTS
            certificate.
          </p>
        </div>
      )}

      {/* Nurse gate — NMBI states (hospital-required, no interest alternative) */}
      {nmbi.approved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
          <BadgeCheck className="w-4 h-4 text-[#15803d] shrink-0" />
          <p className="text-xs font-semibold text-[#15803d]">
            Your NMBI certificate is approved.
          </p>
        </div>
      )}

      {nmbiPending && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <Clock className="w-4 h-4 text-[#1d4ed8] shrink-0" />
          <p className="text-xs font-semibold text-[#1d4ed8] leading-relaxed">
            Your NMBI certificate is under review. We'll move you forward as
            soon as it's approved.
          </p>
        </div>
      )}

      {!nmbi.approved && !nmbiPending && (
        <div className="flex flex-col gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-800 leading-relaxed">
            {nmbiRejected
              ? `Your NMBI certificate was rejected${nmbi.rejectionReason ? `. ${nmbi.rejectionReason}` : ""}. Please upload a valid certificate.`
              : "Please upload your NMBI certificate. Irish hospitals require it to proceed on the Nurse opportunity."}
          </p>
          <button
            type="button"
            onClick={() => nmbiRef.current?.click()}
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
            ref={nmbiRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleNmbiUpload}
          />
        </div>
      )}

      {nmbi.filename && !nmbiRejected && (
        <UploadedFileRow filename={nmbi.filename} downloadUrl={nmbi.downloadUrl} />
      )}
    </>
  );

  return (
    // Mirrors the German SelectOpportunityStep: own subheader bar, then a
    // full-height gradient page. Mounted full-bleed so it provides the gutters.
    <div className="w-full min-h-screen flex-1 bg-white text-[#002856] flex flex-col relative">
      <div
        className="w-full px-4 sm:px-6 pb-3 bg-white flex items-center gap-3 border-b border-slate-200/80 sticky top-0 z-20 shrink-0"
        style={{
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-[#002856] tracking-tight truncate">
          Opportunities
        </h2>
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 pt-6 pb-12 bg-gradient-to-b from-[#eff6ff] to-white flex flex-col gap-6">
        <div className="flex items-end gap-1 w-full">
          <div className="flex-1 flex flex-col gap-2 text-left min-w-0">
            <h1 className="text-[#002856] text-xl font-bold tracking-tight leading-snug">
              Choose your opportunity
            </h1>
            <p className="text-[#002856]/70 text-xs font-medium leading-relaxed">
              Pick the role you want to be placed in.
            </p>
          </div>
          <img
            src={mayaThumbsup}
            alt=""
            className="w-24 h-24 object-contain shrink-0 select-none"
            draggable="false"
          />
        </div>

      <div className="w-full flex flex-col gap-3">
        {ROLE_CARDS.map(({ id, title, desc, Icon }, i) => {
          const selected = role === id;
          // Admin-picked theme color per role (falls back to the blue-600
          // default inside oppAlpha when unset).
          const color = opportunities[id]?.color;
          return (
            <motion.button
              key={id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => pickRole(id)}
              disabled={markingOpp}
              className="w-full p-3 rounded-2xl border text-left flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition-transform disabled:opacity-60"
              style={{
                borderColor: selected ? normalizeHex(color) : oppAlpha(color, 0.5),
                backgroundColor: selected ? oppAlpha(color, 0.06) : "#ffffff",
              }}
            >
              {/* Media tile — Ireland has no image field, icon on tint instead */}
              <div
                className="w-20 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                style={{ backgroundColor: oppAlpha(color, 0.12) }}
              >
                <Icon
                  className="w-7 h-7"
                  style={{ color: oppShade(color, 0.45) }}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 text-slate-900 text-sm font-bold leading-snug">
                    {title}
                  </h3>
                  {selected ? (
                    <Check
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: oppShade(color, 0.5) }}
                    />
                  ) : (
                    <ChevronRight
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: oppShade(color, 0.5) }}
                    />
                  )}
                </div>
                <p className="text-slate-600/80 text-[11px] font-medium leading-snug">
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
                    className="inline-block mt-0.5 text-[11px] font-bold hover:underline cursor-pointer"
                    style={{ color: oppShade(color, 0.45) }}
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
          <>
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
              <Check className="w-4 h-4 text-[#15803d] shrink-0" />
              <p className="text-xs font-semibold text-[#15803d] leading-relaxed">
                Interested ✓ Our team will reach out about the {role === "nurse" ? "Nursing" : "Caregiver"} opportunity.
              </p>
            </div>
            {stepCompleted && (
              <button
                type="button"
                onClick={() => onComplete?.(progress)}
                className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                Continue
              </button>
            )}
          </>
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

      {role === "nurse" && renderNurseGates(ieltsFileRef, nmbiFileRef)}
      </div>

      {previewRole && opportunities[previewRole] && (
        // pb-24 clears the fixed bottom tab bar (~72px + safe-area inset);
        // on sm+ the sheet centers so the padding is harmless.
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] px-0 pt-0 sm:p-4"
          onClick={() => setPreviewRole(null)}
        >
          <div
            className="w-full max-w-lg max-h-[calc(100dvh-9rem)] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#f8fafc] p-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <OpportunitySheet
              content={opportunities[previewRole]}
              primaryBusy={markingOpp}
              primaryLocked={!roleGatesSettled(previewRole)}
              primaryLockedHint="Upload the required documents to unlock this opportunity"
              lockedContent={
                previewRole === "nurse"
                  ? renderNurseGates(sheetIeltsFileRef, sheetNmbiFileRef)
                  : null
              }
              onPrimary={async () => {
                const picked = previewRole;
                if (!roleGatesSettled(picked)) return;
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
