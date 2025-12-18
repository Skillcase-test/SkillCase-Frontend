import React from "react";
const ProgressBar = ({ currentCard, totalCards }) => {
  const numSets = Math.ceil(totalCards / 20);

  return (
    <div className="flex items-center gap-0">
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
        const isLastSet = setIndex === numSets - 1;

        return (
          <React.Fragment key={setIndex}>
            {/* Progress bar segment */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-3 w-full rounded-full bg-[#f0f0f0] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isComplete ? "bg-[#019035]" : "bg-[#edb843]"
                  }`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            {/* Vertical bar between progress bars (not after last) */}
            {!isLastSet && (
              <div className="w-1 h-3 bg-[#002856] rounded-full mx-1 opacity-70" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
export default ProgressBar;
