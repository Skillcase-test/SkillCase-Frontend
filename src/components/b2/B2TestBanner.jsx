import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import mayaThumbsup from "../../assets/onboarding/mayaThumbsup.webp";
import { hapticLight } from "../../utils/haptics";

/**
 * B2 test banner — sits above the feature grid. Shows the last test score
 * once a test exists, otherwise invites the learner to take their first.
 * Always deep-links into the "Your Test" hub screen.
 */
export default function B2TestBanner({ overview, loading }) {
  const latest = overview?.latest || null;

  return (
    <Link
      to="/b2/test"
      onTouchStart={hapticLight}
      className="mb-3 rounded-2xl bg-gradient-to-r from-white to-slate-100 border border-slate-200/80 pl-3 pr-4 py-0 overflow-hidden flex items-end gap-3 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
    >
      <div className="w-16 h-18 sm:w-20 sm:h-20 relative flex items-end justify-center shrink-0 self-end -mb-0.5">
        <img
          src={mayaThumbsup}
          alt="Maya"
          className="w-full h-full object-contain object-bottom select-none pointer-events-none"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1 py-3 self-center">
        {loading ? (
          <>
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-48 bg-slate-200/70 rounded animate-pulse" />
          </>
        ) : latest ? (
          <>
            <span className="text-slate-900 text-sm font-bold leading-5">
              Your last test: {latest.overallScore ?? 0}%
            </span>
            <span className="text-slate-500 text-[11px] font-medium leading-4">
              {overview?.nextPaper
                ? "See your score and take the next one"
                : "Review your score and performance"}
            </span>
          </>
        ) : (
          <>
            <span className="text-slate-900 text-sm font-bold leading-5">
              Take a test to check where you stand
            </span>
          </>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-slate-700 shrink-0 self-center" />
    </Link>
  );
}
