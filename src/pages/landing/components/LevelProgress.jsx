/* German Language Level Progress Bar */

export default function LevelProgress({ currentLevel = "A1" }) {
  const levels = ["A1", "A2", "B1", "B2"];
  const currentIndex = levels.indexOf(currentLevel);

  return (
    <div className="px-4 pb-4 mt-10">
      {/* Header Text */}
      <div className="mb-4">
        <h2 className="text-[#002856] text-base font-semibold mb-1.5">
          Your current German language level is {currentLevel}
        </h2>
        <p className="text-black text-xs opacity-70">
          B1 level is minimum to work as a nurse in Germany
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-0.5">
        {levels.map((level, index) => (
          <div key={level} className="flex-1 flex flex-col items-center gap-1">
            {/* Bar */}
            <div
              className={`
                h-3 w-full rounded-full
                ${index <= currentIndex ? "bg-[#edb843]" : "bg-[#f0f0f0]"}
              `}
            />

            {/* Label */}
            <span className="text-[#002856] text-[10px] font-medium">
              {level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
