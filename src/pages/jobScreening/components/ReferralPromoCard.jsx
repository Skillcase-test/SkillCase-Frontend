import React from "react";
import { Zap, Check } from "lucide-react";
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
      <div className="w-full rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 border border-green-200/70 shadow-sm p-4 flex items-center gap-3.5 text-left">
        <div className="w-10 h-10 rounded-xl bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Check className="w-5 h-5 stroke-[3]" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[#14532d] text-sm font-bold leading-tight">
            You're fast-forwarded!
          </h4>
          <p className="text-green-800/70 text-[11px] sm:text-xs font-medium mt-1 leading-normal">
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
      className="w-full rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200/70 shadow-sm p-4 flex items-center gap-3 text-left cursor-pointer hover:shadow-md hover:border-amber-300 transition-all active:scale-[0.99]"
    >
      <img
        src="/rocket.webp"
        alt=""
        aria-hidden="true"
        className="w-11 h-11 object-contain shrink-0 -rotate-[17deg] select-none"
        draggable="false"
      />
      <div className="min-w-0 flex-1">
        <h4 className="text-amber-900 text-sm font-bold leading-tight">
          Want faster processing?
        </h4>
        <p className="text-amber-800/80 text-[11px] sm:text-xs font-medium mt-1 leading-normal">
          Refer a friend — when they join, your review jumps the queue.
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 bg-[#002856] text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg">
        <Zap className="w-3 h-3" />
        Skip queue
      </span>
    </button>
  );
};

export default ReferralPromoCard;
