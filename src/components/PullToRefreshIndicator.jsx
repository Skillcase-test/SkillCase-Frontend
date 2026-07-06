export default function PullToRefreshIndicator({ pullProgress, isRefreshing }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - pullProgress * circumference;

  if (!pullProgress && !isRefreshing) return null;

  const showPill = pullProgress > 0.15 || isRefreshing;

  return (
    <div
      className="fixed left-0 right-0 top-[68px] z-[998] flex flex-col items-center justify-center pointer-events-none gap-2"
      aria-hidden
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
        {isRefreshing ? (
          <svg
            className="h-5 w-5 animate-spin text-[#002856]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="31.4"
              strokeDashoffset="10"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="2.5"
              fill="none"
            />
            <circle
              cx="12"
              cy="12"
              r={radius}
              stroke="#002856"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 12 12)"
              style={{ transition: "stroke-dashoffset 0.05s linear" }}
            />
            <path
              d="M12 8v8M9 13l3 3 3-3"
              stroke={pullProgress >= 1 ? "#edb843" : "#002856"}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "stroke 0.2s" }}
            />
          </svg>
        )}
      </div>

      {/* Dynamic Instruction Badge */}
      <div
        className="transition-all duration-200 transform origin-top"
        style={{
          opacity: showPill ? 1 : 0,
          transform: `scale(${showPill ? 1 : 0.8})`,
        }}
      >
        <span
          className="text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full shadow-md border"
          style={{
            backgroundColor: pullProgress >= 1 && !isRefreshing ? "#002856" : "#ffffff",
            color: pullProgress >= 1 && !isRefreshing ? "#ffffff" : "#002856",
            borderColor: pullProgress >= 1 && !isRefreshing ? "#002856" : "#f1f5f9",
          }}
        >
          {isRefreshing
            ? "Refreshing..."
            : pullProgress >= 1
            ? "Release to refresh"
            : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
