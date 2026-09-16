import React from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
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

      <div className="w-full px-5 pt-10 pb-6 bg-gradient-to-b from-blue-100 to-blue-50 rounded-2xl flex flex-col items-center gap-5">
        <motion.img
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          src={mayaSad}
          alt=""
          aria-hidden="true"
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl select-none"
          draggable="false"
        />

        <div className="text-center w-full">
          <h2 className="text-[#002856] text-2xl font-semibold tracking-tight">
            You need to prepare a bit more
          </h2>
          <p className="text-[#002856]/70 text-sm sm:text-base font-medium mt-2 max-w-[300px] mx-auto leading-relaxed">
            Your interview score didn't meet the benchmark for this role. Keep
            learning and come back stronger.
          </p>
        </div>

        {/* Interview assessment — static guidance for below-threshold reviews */}
        <div className="w-full p-4 bg-white/60 rounded-xl flex flex-col gap-3 text-left">
          <h3 className="text-[#002856] text-sm sm:text-base font-semibold">
            Interview assessment
          </h3>
          <div className="flex flex-col gap-1.5">
            {ASSESSMENT_POINTS.map((point) => (
              <div key={point} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red-500/80 shrink-0" />
                <p className="text-slate-700 text-xs sm:text-sm font-normal leading-normal">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation card */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3 text-left">
          <img
            src={mayaShocked}
            alt=""
            aria-hidden="true"
            className="w-14 h-16 object-contain shrink-0 select-none"
            draggable="false"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-slate-700 text-sm font-semibold leading-tight">
              Our recommendation
            </h4>
            <p className="text-slate-500 text-xs mt-1 leading-normal">
              Opt into our German speaking crash course to lift your fluency
              before the next review.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleExplore}
            className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm cursor-pointer border-none flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-4.5 h-4.5" />
            <span>Explore curated courses</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full h-12 bg-transparent text-[#002856] border border-slate-400 rounded-xl font-bold text-sm sm:text-base transition-all hover:bg-white/60 cursor-pointer flex items-center justify-center"
          >
            Back to job progress
          </button>
        </div>
      </div>
    </div>
  );
};

export default LowScoreCoursePrompt;
