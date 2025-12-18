import React from "react";
const ProgressBar = ({ currentCard, totalCards }) => {
  const numSets = Math.ceil(totalCards / 20);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: numSets }).map((_, setIndex) => {
        const setStart = setIndex * 20;
        const setEnd = Math.min((setIndex + 1) * 20, totalCards);
        const setSize = setEnd - setStart;
        let fillPercent = 0;
        if (currentCard >= setEnd) {
          fillPercent = 100;
        } else if (currentCard > setStart) {
          fillPercent = ((currentCard - setStart) / setSize) * 100;
        }
        const isComplete = fillPercent === 100;
        return (
          <div key={setIndex} className="flex-1">
            <div className="h-3 w-full rounded-full bg-[#f0f0f0] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? "bg-[#019035]" : "bg-[#edb843]"
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default ProgressBar;
