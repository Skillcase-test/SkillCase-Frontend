import React from "react";

export default function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div className="w-full py-4 px-2 sm:px-4">
      <div className="flex items-center justify-between w-full">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="relative flex flex-col items-center">
              <button
                onClick={() => onStepClick(s.id)}
                className={`z-10 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold transition-all duration-300 cursor-pointer text-sm sm:text-base ${
                  currentStep === s.id
                    ? "bg-[#1976D2] text-white shadow-md scale-110"
                    : currentStep > s.id
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {s.id}
              </button>

              {/* Title below step */}
              <div
                className={`absolute top-10 sm:top-12 w-20 sm:w-32 text-center text-[10px] sm:text-xs font-medium transition-colors duration-300 ${
                  currentStep === s.id ? "text-[#1976D2]" : "text-slate-500"
                }`}
                style={{ left: "50%", transform: "translateX(-50%)" }}
              >
                {s.title}
              </div>
            </div>

            {/* Connector line between steps */}
            {idx < steps.length - 1 && (
              <div
                className={`flex-auto h-0.5 sm:h-1 mx-1 sm:mx-2 transition-all duration-300 ${
                  currentStep > s.id + 1 ||
                  (currentStep > s.id && currentStep > idx + 1)
                    ? "bg-green-500"
                    : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
