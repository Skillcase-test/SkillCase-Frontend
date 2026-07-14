import React from "react";

export default function CandidateMarquee({ candidates = [] }) {
  // Filter candidates for marquee section
  const marqueeCandidates = candidates.filter(
    (c) => c.section_type === "marquee",
  );

  if (marqueeCandidates.length === 0) return null;

  const list = marqueeCandidates;

  // Quadruple the list to ensure infinite wrapping covers all screen widths
  const loopedList = [...list, ...list, ...list, ...list];

  return (
    <section className="mb-16 pb-4 pt-2 overflow-hidden w-full bg-slate-50/50">
      {/* Infinite Marquee viewport */}
      <div className="relative w-full flex overflow-x-hidden group/marquee">
        {/* Left & Right fading masking borders */}
        <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Marquee Row */}
        <div className="flex gap-4 py-4 animate-marquee whitespace-nowrap group-hover/marquee:[animation-play-state:paused]">
          {loopedList.map((candidate, index) => {
            // Generate initials for avatar fallback if no image is available
            const initials = candidate.name
              ? candidate.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "SC";

            return (
              <div
                key={`${candidate.id}-${index}`}
                className="flex-shrink-0 w-36 sm:w-40 aspect-[3/4] bg-white border border-slate-100 rounded-2xl shadow-xs transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-[#F9C53D]/30 cursor-pointer relative overflow-hidden group"
              >
                {/* Image Background */}
                {candidate.image_url ? (
                  <img
                    src={candidate.image_url}
                    alt={candidate.name}
                    className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-[#002856] text-[#F9C53D] flex items-center justify-center font-bold text-base">
                    <span>{initials}</span>
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent z-10" />

                {/* Text Content */}
                <div className="absolute bottom-3 left-3 right-3 z-20 text-left">
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                    {candidate.name}
                  </h4>
                  <p className="text-[10px] text-slate-200 truncate mt-0.5">
                    {candidate.state || "India"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded CSS for marquee animation */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-25%, 0, 0);
          }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </section>
  );
}
