import React from "react";
import { Check } from "lucide-react";
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
    title: "Your batch schedule is shared on WhatsApp",
  },
];

const CourseOptedIn = ({ onDone }) => {
  return (
    <div className="w-full px-5 py-7 bg-gradient-to-b from-blue-100 to-blue-50 rounded-2xl border border-white/20 flex flex-col items-center gap-5">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="w-12 h-12 bg-[#15803d] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
      >
        <Check className="w-6 h-6 stroke-[3]" />
      </motion.div>

      <div className="text-center w-full">
        <h2 className="text-[#002856] text-2xl font-semibold tracking-tight">
          Thanks for opting in!
        </h2>
        <p className="text-[#002856]/70 text-sm sm:text-base font-medium mt-2 max-w-[300px] mx-auto leading-relaxed">
          Our team will reach out to you within the next 24 hours.
        </p>
      </div>

      {/* What happens next — done / active / pending timeline */}
      <div className="w-full flex flex-col px-2 mt-1">
        {NEXT_STEPS.map((step, idx) => (
          <div key={step.title} className="flex gap-3.5 items-stretch">
            <div className="flex flex-col items-center shrink-0 w-6">
              {step.state === "done" ? (
                <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : step.state === "active" ? (
                <div className="w-6 h-6 bg-[#002856] rounded-full flex items-center justify-center shadow-sm">
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white" />
              )}
              {idx < NEXT_STEPS.length - 1 && (
                <div
                  className={`w-[1.5px] flex-1 my-1 ${
                    step.state === "done" ? "bg-[#15803d]" : "bg-slate-300/70"
                  }`}
                />
              )}
            </div>
            <div className="pb-5 text-left flex-1 min-w-0">
              <h4
                className={`text-sm font-semibold leading-tight ${
                  step.state === "pending" ? "text-slate-400" : "text-[#002856]"
                }`}
              >
                {step.title}
              </h4>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm cursor-pointer border-none flex items-center justify-center"
      >
        Okay, got it
      </button>
    </div>
  );
};

export default CourseOptedIn;
