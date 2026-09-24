import React from "react";

// Deck progress split into `every`-card segments — the navy dividers mark the
// quick-check boundaries. A fully-seen segment turns green.
export default function NursingSegmentedBar({ current, total, every = 20 }) {
  const sets = Math.max(1, Math.ceil((total || 1) / every));
  return (
    <div className="flex items-center w-full">
      {Array.from({ length: sets }, (_, k) => {
        const a = k * every;
        const b = Math.min((k + 1) * every, total);
        const fill = current >= b ? 100 : current > a ? ((current - a) / (b - a)) * 100 : 0;
        return (
          <React.Fragment key={k}>
            <div className="flex-1 h-2.5 rounded-full bg-[#f0f0f0] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fill === 100 ? "bg-[#019035]" : "bg-[#edb843]"
                }`}
                style={{ width: `${fill}%` }}
              />
            </div>
            {k < sets - 1 && (
              <div className="w-1 h-2.5 bg-[#002856] rounded-full opacity-70 flex-none mx-1" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
