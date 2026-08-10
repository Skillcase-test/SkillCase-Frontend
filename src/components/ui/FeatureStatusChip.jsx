export default function FeatureStatusChip({ state }) {
  const periods = state?.periods || [];

  // No configured cap at all (no state returned by the backend, or an
  // explicit "unlimited" grant) → free forever.
  if (!state || state.unlimited) {
    return (
      <Pill className="bg-green-700/10 text-green-700">Unlimited usage</Pill>
    );
  }

  // Hard-locked modules (admin "lock" period, or excluded by an active
  // bundle) carry an empty period set and are subscriber-only. This MUST be
  // checked before treating an empty period set as "unlimited".
  const isHardLocked =
    Boolean(state.hard_locked) || (state.locked && periods.length === 0);

  if (isHardLocked) {
    return <Pill className="bg-yellow-100 text-yellow-700">Premium</Pill>;
  }

  // Defensive fallback: a non-hard-locked state with no periods has no cap.
  if (periods.length === 0) {
    return (
      <Pill className="bg-green-700/10 text-green-700">Unlimited usage</Pill>
    );
  }

  // Prefer the daily cap (Figma label); fall back to the first configured
  // period for modules that only have weekly/monthly caps.
  const primary = periods.find((p) => p.period === "day") || periods[0];
  const limit = Number(primary?.limit_value) || 0;
  const used = Math.min(Number(primary?.used) || 0, limit);
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return (
    <div className="w-full md:w-32 p-1 bg-black/5 rounded-md flex flex-col justify-start items-start gap-2.5">
      <div className="self-stretch flex flex-col justify-start items-start gap-px">
        <span className="self-stretch whitespace-nowrap text-black/50 text-[6px] md:text-[8px] font-medium leading-[7.80px] md:leading-[10px]">
          Free Plan - Daily limit
        </span>
        <div className="self-stretch inline-flex justify-start items-center gap-1.5">
          <div className="flex-1 h-1 bg-black/20 rounded-[31px] overflow-hidden">
            <div
              className="h-full bg-blue-950 rounded-[31px] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-black/80 text-[6px] md:text-[8px] font-medium leading-[7.80px] md:leading-[10px]">
            {used}/{limit}
          </span>
        </div>
      </div>
    </div>
  );
}

function Pill({ className = "", children }) {
  return (
    <span
      className={`px-1 py-0.5 rounded-[40px] inline-flex justify-center items-center gap-1.5 ${className}`}
    >
      <span className="text-[8px] md:text-[10px] font-medium leading-[10.40px] md:leading-[13px]">
        {children}
      </span>
    </span>
  );
}
