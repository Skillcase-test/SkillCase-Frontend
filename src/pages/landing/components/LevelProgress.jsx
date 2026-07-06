export default function LevelProgress({
  currentLevel = "A1",
  progress = 0,
  isDynamic = false,
}) {
  const levels = ["A1", "A2", "B1", "B2"];
  const normalizedLevel = String(currentLevel || "A1").toUpperCase();
  const currentIndex = levels.indexOf(normalizedLevel);
  const boundedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="px-4 pb-2 mt-4">
      {/* Header Text */}
      <div className="mb-1">
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="text-[#002856] text-base font-semibold">
            Your current German language level is {normalizedLevel}
          </h2>
        </div>
        <p className="text-black text-xs opacity-70">
          B1 level is minimum to work as a nurse in Germany
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full">
        {/* Track Row */}
        <div className="flex relative items-center h-6">
          {levels.map((level, index) => {
            const fillPercent = isDynamic
              ? boundedProgress >= (index + 1) * 25
                ? 100
                : boundedProgress <= index * 25
                  ? 0
                  : ((boundedProgress - index * 25) / 25) * 100
              : index <= currentIndex
                ? 100
                : 0;

            const trackBg = isDynamic ? "bg-slate-300" : "bg-[#f0f0f0]";
            const fillBg = isDynamic ? "bg-[#00c853]" : "bg-[#edb843]";

            const isBallOnThisSegment =
              isDynamic &&
              (index === 0
                ? boundedProgress >= 0 && boundedProgress <= 25
                : boundedProgress > index * 25 &&
                  boundedProgress <= (index + 1) * 25);

            return (
              <div
                key={level}
                className="flex-1 relative h-4 flex items-center px-1"
              >
                {/* Bar Track */}
                <div
                  className={`h-2.5 w-full rounded-full overflow-hidden ${trackBg}`}
                >
                  {/* Bar Fill */}
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${fillBg}`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>

                {/* Simplified Solid Green Progress Ball */}
                {isBallOnThisSegment && (
                  <div
                    className="absolute w-3 h-3 bg-[#EDB843] border-3 border-[#002856] rounded-full -translate-y-1/2 top-1/2 transition-all duration-500 ease-out z-10 pointer-events-none"
                    style={{
                      left: `calc(${((boundedProgress - index * 25) / 25) * 100}%)`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Labels Row */}
        <div className="w-full -mt-1.5 -ml-0.5">
          {isDynamic ? (
            <div className="flex gap-1 w-full">
              {levels.map((level, index) => (
                <div key={level} className="flex-1 flex justify-end">
                  <span className="text-[9px] font-bold text-[#002856]/50">
                    {(index + 1) * 25}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between w-full">
              {levels.map((level) => (
                <span
                  key={level}
                  className="text-[#002856] text-[10px] font-medium w-1/4 text-center"
                >
                  {level}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
