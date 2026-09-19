import React from "react";
import { Check } from "lucide-react";

// Emerald rocket card shown on the select_opportunity lobby step once an
// admin shortlists at least one of the candidate's picks — same visual slot
// and styling as ReferralPromoCard's rewarded state, but purely
// informational (no click target).
const ShortlistedPromoCard = () => (
  <div className="w-full rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r from-emerald-50 to-teal-100 border border-emerald-200/80 shadow-xs flex items-center justify-between text-left overflow-hidden">
    <div className="min-w-0 flex-1 flex flex-col justify-start items-start">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-xs">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </span>
        <h4 className="text-[#14532d] text-sm sm:text-base font-bold leading-tight">
          You&apos;re shortlisted!
        </h4>
      </div>
      <p className="text-[#14532d]/80 text-[11px] sm:text-xs font-normal leading-relaxed mt-1">
        Congratulations! An opportunity has shortlisted you. Open it to view
        your next steps.
      </p>
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
  </div>
);

export default ShortlistedPromoCard;
