import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BriefcaseBusiness, ChevronDown } from "lucide-react";
import OpportunitySheet from "./OpportunitySheet";
import StepSubHeader from "./StepSubHeader";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";

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
}) => {
  const role = progress?.role;
  const interestNoted = Boolean(progress?.ieltsInterestAt);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const roleLabel =
    role === "nurse" ? "Nurse" : role === "caregiver" ? "Caregiver" : null;
  const opportunity = progress?.opportunities?.[role];

  const body = (
    <div className="w-full bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4 flex flex-col gap-3 text-left">
      {/* Status banner — "Please note" Maya component, green gradient */}
      <div className="w-full bg-gradient-to-r from-emerald-50 to-teal-100 rounded-2xl border border-emerald-200/80 flex items-center gap-2.5 shadow-xs text-left overflow-hidden">
        <img
          src={mayaThumbsup}
          alt=""
          aria-hidden="true"
          className="w-20 h-20 object-contain shrink-0 self-end select-none pointer-events-none"
          draggable="false"
        />
        <div className="min-w-0 flex-1 pr-3 py-3">
          <h4 className="text-[#14532d] text-xs sm:text-sm font-bold leading-tight">
            Our team is working on your request
          </h4>
          <p className="text-[#14532d]/80 text-[10px] sm:text-xs font-normal leading-normal mt-0.5">
            We have all your documents. We&apos;re now looking for the best
            {roleLabel ? ` ${roleLabel} opportunities` : " opportunities"} for
            you in Ireland.
            {interestNoted
              ? " IELTS interest noted. We'll help you get certified too."
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
                  {/* Read-only detail — cta stripped so no button renders */}
                  <OpportunitySheet content={{ ...opportunity, cta: {} }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      {onChangeRole && (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onChangeRole}
            className="w-full h-9 text-[11px] font-bold text-[#083262] hover:underline cursor-pointer"
          >
            Change opportunity
          </button>
        </div>
      )}
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
          Your pipeline is complete. Here's where things stand.
        </p>
      </div>
      {body}
    </div>
  );
};

export default MatchingScreen;
