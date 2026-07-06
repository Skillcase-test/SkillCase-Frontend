import React from "react";

const StepProgressTracker = ({ steps = [], currentStepId }) => {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
  const totalSteps = steps.length;
  const activeStep = steps[currentStepIndex];

  const progressPercent = totalSteps > 0
    ? (activeStep?.status === "completed" || currentStepIndex === totalSteps - 1
        ? 100
        : Math.round((currentStepIndex / totalSteps) * 100))
    : 0;

  return (
    <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm w-full">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 mb-2">
        <span>
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <span className="text-[#002856] font-bold">
          {progressPercent}% Completed
        </span>
      </div>

      <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden mb-3.5">
        <div
          className="h-full bg-gradient-to-r from-amber-200 to-amber-300 border-r border-[#eec139] transition-all duration-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          Current Step
        </span>
        <span className="text-base font-bold text-[#002856]">
          {activeStep?.title || "Welcome"}
        </span>
      </div>
    </div>
  );
};

export default StepProgressTracker;
