import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { markIrelandOpportunityInterest } from "../../../api/irelandJobsApi";
import OpportunitySheet from "./OpportunitySheet";
import StepSubHeader from "./StepSubHeader";

// Terminal state of the Ireland pipeline. Two render contexts:
//  - inline (lobby, below the completed timeline): the compact status banner —
//    "we have your documents / we're looking for opportunities" — with the
//    opportunity details folded behind an expander and a change-opportunity link.
//  - executed step (?step=matching): same content under a step header/back.
// No modal, no full-screen takeover card.
const MatchingScreen = ({
  progress,
  inline = false,
  onBack,
  onChangeRole,
  onProgressUpdate,
}) => {
  const { user } = useSelector((state) => state.auth);
  const role = progress?.role;
  const interestNoted = Boolean(progress?.ieltsInterestAt);
  const [oppInterestDone, setOppInterestDone] = useState(
    Boolean(progress?.opportunityInterestAt),
  );
  const [oppInterestBusy, setOppInterestBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const roleLabel =
    role === "nurse" ? "Nurse" : role === "caregiver" ? "Caregiver" : null;
  const opportunity = progress?.opportunities?.[role];

  const handleInterested = async () => {
    try {
      setOppInterestBusy(true);
      const { data } = await markIrelandOpportunityInterest(role);
      if (data?.success) {
        setOppInterestDone(true);
        onProgressUpdate?.(data.data);
        toast.success("Interest noted — our team will reach out soon.");
      } else {
        toast.error("Could not save your interest");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not save your interest",
      );
    } finally {
      setOppInterestBusy(false);
    }
  };

  const body = (
    <div className="w-full bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4 flex flex-col gap-3 text-left">
      {/* Status banner */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-[#15803d]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-[#002856]">
            We have all your documents
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
            {user?.fullname
              ? `${user.fullname.split(" ")[0]}, our`
              : "Our"}{" "}
            team is now looking for the best
            {roleLabel ? ` ${roleLabel} opportunities` : " opportunities"} for
            you in Ireland.
            {interestNoted
              ? " IELTS interest noted — we'll help you get certified too."
              : ""}
          </p>
        </div>
      </div>

      {/* Opportunity details — folded by default so the banner stays slim */}
      {opportunity && (
        <div className="border-t border-slate-100 pt-2.5">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 py-1 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-[#083262] flex items-center justify-center shrink-0">
              <BriefcaseBusiness className="w-4 h-4" />
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-slate-800 truncate">
                {opportunity.header?.title || "Your opportunity"}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">
                {detailsOpen ? "Hide details" : "View opportunity details"}
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                detailsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence initial={false}>
            {detailsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  {/* CTA block stripped — the banner's own buttons own it. */}
                  <OpportunitySheet content={{ ...opportunity, cta: {} }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
        {opportunity && (
          <button
            type="button"
            onClick={handleInterested}
            disabled={oppInterestBusy || oppInterestDone}
            className={`w-full h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              oppInterestDone
                ? "bg-green-50 border border-green-100 text-[#15803d] cursor-default"
                : "bg-[#002856] hover:bg-[#001f42] text-white active:scale-[0.99] cursor-pointer disabled:opacity-60"
            }`}
          >
            {oppInterestDone ? (
              <>
                <BadgeCheck className="w-4 h-4" />
                Interested — noted for the team
              </>
            ) : oppInterestBusy ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              opportunity.cta?.primaryLabel || "I'm Interested"
            )}
          </button>
        )}
        {onChangeRole && (
          <button
            type="button"
            onClick={onChangeRole}
            className="w-full h-9 text-[11px] font-bold text-[#083262] hover:underline cursor-pointer"
          >
            Change opportunity — reselect Nurse / Caregiver
          </button>
        )}
      </div>
    </div>
  );

  if (inline) return body;

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative gap-5 pb-6">
      <StepSubHeader onBack={onBack} />
      <div className="text-left w-full">
        <h2 className="text-[#002856] text-2xl font-bold tracking-tight mb-2">
          Opportunity matching
        </h2>
        <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
          Your pipeline is complete — here's where things stand.
        </p>
      </div>
      {body}
    </div>
  );
};

export default MatchingScreen;
