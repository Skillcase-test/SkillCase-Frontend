import React from "react";
const ProgressBar = ({ current, total }) => {
  const segmentSize = 20;
  const numSets = Math.max(1, Math.ceil(total / segmentSize));
  return (
    <div className="flex items-center gap-0 w-full">
      {Array.from({ length: numSets }).map((_, setIndex) => {
        const setStart = setIndex * segmentSize;
        const setEnd = Math.min((setIndex + 1) * segmentSize, total);
        const setSize = setEnd - setStart;
        let fillPercent = 0;
        if (current >= setEnd) {
          fillPercent = 100;
        } else if (current > setStart) {
          fillPercent = ((current - setStart) / setSize) * 100;
        }
        const isComplete = fillPercent === 100;
        const isLastSet = setIndex === numSets - 1;
        return (
          <React.Fragment key={setIndex}>
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
