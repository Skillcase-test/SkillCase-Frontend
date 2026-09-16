import React from "react";
import { ArrowRight, Check } from "lucide-react";
import { trackFeatureEvent } from "../../../telemetry/events";

// Shown while a candidate waits on review_pending. Promo state pushes the
// referral link; once a friend finishes onboarding the backend sets
// priority_review_at and the card flips to the rewarded "fast-forwarded"
// state — same slot, no layout jump.
const ReferralPromoCard = ({ rewarded = false, completedCount = 0, onRefer }) => {
  const handleClick = (event) => {
    // The lobby step card is itself clickable — keep the promo tap from
    // bubbling up and opening the step.
    event?.stopPropagation?.();
    trackFeatureEvent("job_screening", "referral_promo_clicked", {
      entityType: "referral",
      entityId: "review_pending",
      lifecycle: "started",
      attributes: { rewarded },
    });
    onRefer?.();
  };

  if (rewarded) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-r from-emerald-50 to-green-100 border border-green-200/80 shadow-xs p-3.5 sm:p-4 flex items-center gap-3.5 text-left">
        <div className="w-10 h-10 rounded-xl bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Check className="w-5 h-5 stroke-[3]" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[#14532d] text-sm sm:text-base font-bold leading-tight">
            You're fast-forwarded!
          </h4>
          <p className="text-green-800/80 text-[11px] sm:text-xs font-medium mt-1 leading-relaxed">
            {completedCount > 0
              ? `${completedCount} friend${completedCount === 1 ? "" : "s"} joined — your review is now a priority.`
              : "Your friend joined — your review is now a priority."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Refer a friend to skip review queue"
      className="group w-full rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-100/90 border border-amber-200/70 shadow-xs flex items-center justify-between gap-3 text-left transition-all hover:shadow-sm hover:border-amber-300 active:scale-[0.99] cursor-pointer overflow-hidden"
    >
      <div className="min-w-0 flex-1 flex flex-col justify-start items-start">
        <h4 className="text-[#002856] text-sm sm:text-base font-semibold leading-tight">
          Want faster processing?
        </h4>
        <p className="text-[#002856]/80 text-[11px] sm:text-xs font-normal leading-relaxed mt-1">
          Get 10x faster processing and 30 mins career guidance call
        </p>
        <div className="mt-2.5 inline-flex items-center gap-1 text-[#002856] text-xs font-semibold group-hover:underline">
          <span>Refer &amp; skip queue</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-center pl-1">
        <img
          src="/rocket.webp"
          alt=""
          aria-hidden="true"
          className="w-14 h-14 sm:w-16 sm:h-16 object-contain -rotate-[17deg] select-none pointer-events-none drop-shadow-xs"
          draggable="false"
        />
      </div>
    </button>
  );
};

export default ReferralPromoCard;
