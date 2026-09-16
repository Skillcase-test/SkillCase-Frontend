import React from "react";
import { ArrowLeft, X } from "lucide-react";
import { motion } from "framer-motion";
import mayaSad from "../../../assets/onboarding/mayaSad.webp";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";
import { trackFeatureEvent } from "../../../telemetry/events";

// Shown on review_pending when the interview review passed but the score is
// below INTERVIEW_MIN_SCORE — the pipeline holds here until the candidate
// opts into the crash course and an admin releases the hold.
const ASSESSMENT_POINTS = [
  "Speaking fluency needs more practice",
  "Interview answers lacked structure",
  "Core German vocabulary felt limited",
];

const LowScoreCoursePrompt = ({ onBack, onExplore }) => {
  const handleExplore = () => {
    trackFeatureEvent("job_screening", "low_score_course_explore", {
      entityType: "funnel_step",
      entityId: "review_pending",
      lifecycle: "started",
    });
    onExplore?.();
  };

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
      {/* Sub-header — same pattern as the step's normal view */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-slate-400 text-sm font-semibold">
          Job Progress
        </span>
      </div>

      {/* Main light blue gradient container */}
      <div className="w-full px-5 pt-8 pb-6 bg-gradient-to-b from-[#dbeafe] to-[#eff6ff] rounded-lg border border-blue-100/60 flex flex-col items-center gap-5 text-center shadow-xs">
        {/* Maya Mascot in soft peach rounded box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-t from-[#FC837A] to-[#FFCBC7] overflow-hidden flex items-end justify-center shadow-2xs shrink-0"
        >
          <img
            src={mayaSad}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-contain select-none pointer-events-none translate-y-1"
            draggable="false"
          />
        </motion.div>

        {/* Headings */}
        <div className="text-center w-full">
          <h2 className="text-[#002856] text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            You need to prepare a bit more
          </h2>
          <p className="text-[#002856]/70 text-sm sm:text-base font-medium mt-2 max-w-[310px] mx-auto leading-relaxed">
            Your interview couldn’t meet the expectations. Keep learning and
            come back stronger.
          </p>
        </div>

        {/* Interview Assessment Card */}
        <div className="w-full p-4 sm:p-5 bg-white/50 backdrop-blur-xs rounded-2xl border border-white/40 flex flex-col gap-3 text-left shadow-2xs">
          <h3 className="text-[#002856] text-xs sm:text-sm font-bold">
            Interview assessment
          </h3>
          <div className="flex flex-col gap-2">
            {ASSESSMENT_POINTS.map((point) => (
              <div key={point} className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <X className="w-2 h-2 stroke-[3.5]" />
                </span>
                <p className="text-slate-700 text-[10px] font-normal leading-normal">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Our recommendation Card */}
        <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-200/80 pl-2.5 sm:pl-3.5 pr-3.5 sm:pr-4 py-2 flex items-center gap-3 text-left overflow-hidden relative">
          <div className="shrink-0 self-end -mb-2 flex items-end justify-center">
            <img
              src={mayaShocked}
              alt=""
              aria-hidden="true"
              className="w-14 h-16 sm:w-16 sm:h-18 object-contain object-bottom shrink-0 select-none pointer-events-none translate-y-1"
              draggable="false"
            />
          </div>
          <div className="min-w-0 flex-1 py-1">
            <h4 className="text-slate-900 text-xs sm:text-sm font-semibold leading-tight">
              Our recommendation
            </h4>
            <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug">
              Opt our German speaking crash course to improve your fluency.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleExplore}
            className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm cursor-pointer border-none flex items-center justify-center"
          >
            Explore curated courses
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full h-12 bg-white/80 hover:bg-white text-[#002856] border border-slate-300 rounded-xl font-bold text-sm sm:text-base transition-all shadow-2xs cursor-pointer flex items-center justify-center"
          >
            Back to job progress
          </button>
        </div>
      </div>
    </div>
  );
};

export default LowScoreCoursePrompt;
