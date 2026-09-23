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
export default function B2TestBanner({ overview }) {
  const latest = overview?.latest || null;

  return (
    <Link
      to="/b2/test"
      onTouchStart={hapticLight}
      className="mb-3 rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 flex items-center gap-3 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
    >
      <img
        src={mayaThumbsup}
        alt="Maya"
        className="w-12 h-12 object-contain shrink-0"
      />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {latest ? (
          <>
            <span className="text-sky-950 text-sm font-bold leading-5">
              Your last test: {latest.overallScore ?? 0}%
            </span>
            <span className="text-sky-900/60 text-[11px] font-medium leading-4">
              See your score and take the next one
            </span>
          </>
        ) : (
          <>
            <span className="text-sky-950 text-sm font-bold leading-5">
              Take a test to check where you stand
            </span>
            <span className="text-sky-900/60 text-[11px] font-medium leading-4">
              Reading, Listening, Writing &amp; Speaking
            </span>
          </>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-sky-950 shrink-0" />
    </Link>
  );
}
