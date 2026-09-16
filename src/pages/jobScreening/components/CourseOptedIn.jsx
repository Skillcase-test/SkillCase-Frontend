import React from "react";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";

// Shown after a held candidate opts into the crash course — and on every
// revisit of the review_pending step afterwards (course_optin_at is set).
// `onDone` is the "Okay got it" action: back to the lobby/step container.
const NEXT_STEPS = [
  {
    state: "done",
    title: "Course opt-in confirmed",
  },
  {
    state: "active",
    title: "Our team calls you within 24 hours",
  },
  {
    state: "pending",
    title: "Your Batch is scheduled",
  },
];

const CourseOptedIn = ({ onDone, onBack }) => {
  const handleBack = onBack || onDone;

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
      {/* Sub-header bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleBack}
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
      <div className="w-full px-5 sm:px-6 pt-8 pb-6 bg-gradient-to-b from-[#dbeafe] to-[#eff6ff] rounded-3xl border border-blue-100/60 flex flex-col items-center gap-5 text-center shadow-xs">
        {/* Large green check badge */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="w-13 h-13 bg-[#15803d] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
        >
          <Check className="w-6 h-6 stroke-[3.5]" />
        </motion.div>

        {/* Headings */}
        <div className="text-center w-full">
          <h2 className="text-[#002856] text-xl sm:text-2xl font-bold tracking-tight leading-tight max-w-[260px] mx-auto">
            Thank you for opting the crash course
          </h2>
          <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-1.5 max-w-[260px] mx-auto leading-relaxed">
            Our team will reach out to you within next 24 hours.
          </p>
        </div>

        {/* What happens next — done / active / pending timeline */}
        <div className="w-full flex flex-col pl-2 sm:pl-4 mt-1">
          {NEXT_STEPS.map((step, idx) => (
            <div key={step.title} className="flex gap-3 items-start w-full">
              <div className="flex flex-col items-center shrink-0 w-6">
                {step.state === "done" ? (
                  <div className="w-5.5 h-5.5 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : step.state === "active" ? (
                  <div className="w-5.5 h-5.5 bg-[#002856] rounded-full flex items-center justify-center shadow-2xs">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full border-2 border-slate-400 bg-white" />
                )}
                {idx < NEXT_STEPS.length - 1 && (
                  <div className="w-0 my-1 border-l-2 border-dashed border-slate-300 h-6.5" />
                )}
              </div>
              <div className="text-left flex-1 min-w-0 pt-0.5 pb-3.5 pr-2">
                <h4 className="text-xs sm:text-[13px] font-semibold leading-snug text-[#002856]">
                  {step.title}
                </h4>
              </div>
            </div>
          ))}
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={onDone}
          className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm cursor-pointer border-none flex items-center justify-center mt-1"
        >
          Okay got it
        </button>
      </div>
    </div>
  );
};

export default CourseOptedIn;
