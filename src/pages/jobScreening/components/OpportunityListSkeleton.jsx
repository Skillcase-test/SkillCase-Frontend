import React from "react";

// Skeleton for the opportunity screen while opportunities/progress fetch —
// mirrors the real list layout (sub-header, intro row, cards) so nothing
// jumps when data lands. `cardsOnly` renders just the card stack for use
// inside SelectOpportunityStep, whose header is static and already visible.
const CardSkeleton = () => (
  <div className="w-full p-3 rounded-2xl border border-slate-200/80 bg-white flex flex-col gap-3 animate-pulse">
    <div className="flex items-center gap-3.5">
      <div className="w-20 h-16 rounded-xl bg-slate-200/80 shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-3.5 w-4/5 bg-slate-200 rounded" />
        <div className="h-2.5 w-full bg-slate-100 rounded" />
      </div>
    </div>
    <div className="flex gap-1.5">
      <div className="h-5 w-16 rounded-full bg-slate-100" />
      <div className="h-5 w-20 rounded-full bg-slate-100" />
      <div className="h-5 w-14 rounded-full bg-slate-100" />
    </div>
  </div>
);

const OpportunityListSkeleton = ({ cardsOnly = false, cards = 3 }) => {
  const cardStack = (
    <div className="flex flex-col gap-3">
      {Array.from({ length: cards }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );

  if (cardsOnly) return cardStack;

  return (
    <div className="w-full min-h-screen flex-1 bg-white flex flex-col">
      {/* Sub-header replica */}
      <div
        className="w-full px-4 sm:px-6 pb-3 bg-white flex items-center gap-3 border-b border-slate-200/80 shrink-0"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="w-7 h-7 rounded-md bg-slate-200 animate-pulse" />
        <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="flex-1 px-4 sm:px-6 pt-6 pb-12 bg-gradient-to-b from-[#eff6ff] to-white flex flex-col gap-6">
        <div className="flex items-end gap-1 animate-pulse">
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
          </div>
          <div className="w-24 h-24 rounded-2xl bg-slate-100 shrink-0" />
        </div>
        {cardStack}
      </div>
    </div>
  );
};

export default OpportunityListSkeleton;
