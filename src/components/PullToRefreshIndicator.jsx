export default function PullToRefreshIndicator({ pullProgress, isRefreshing }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - pullProgress * circumference;

  if (!pullProgress && !isRefreshing) return null;

  return (
    <div
      className="fixed left-0 right-0 top-[68px] z-[998] flex justify-center pointer-events-none"
      aria-hidden
    >
      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
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
    </div>
  );
}
