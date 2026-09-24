import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";
import { getNursingChapters } from "../../../api/a1NursingApi";
import { useUsageLimits } from "../../../hooks/useUsageLimits";
import FeatureStatusChip from "../../ui/FeatureStatusChip";
import { hapticLight } from "../../../utils/haptics";

// Top banner above the A1 grid — same slate+Maya language as the B2 test
// banner. Deep-links into the nursing chapter hub and shows live path
// progress ("Chapter X of 22").
export default function NursingBanner() {
  const { eligible, getState } = useUsageLimits();
  const moduleState = getState("A1", "nursing");
  const isLocked = Boolean(moduleState?.locked);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNursingChapters()
      .then((res) => setOverview(res.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openLockModal = () => {
    if (!isLocked || !moduleState) return;
    window.dispatchEvent(
      new CustomEvent("skillcase:usage-limit", {
        detail: {
          locked: true,
          reason: "usage_limit",
          module_key: "nursing",
          level: "A1",
          limit_value: moduleState.limit_value,
          periods: moduleState.periods,
          reset_at: moduleState.reset_at,
          msg: moduleState.hard_locked
            ? "This feature is currently locked."
            : "Your limit for this feature has been reached.",
        },
      }),
    );
  };

  const Wrapper = isLocked ? "div" : Link;
  const started = overview?.chapters?.some(
    (c) => c.quiz_passed || c.current_index > 0,
  );

  return (
    <Wrapper
      to={isLocked ? undefined : "/a1/nursing"}
      onClick={isLocked ? openLockModal : undefined}
      onTouchStart={() => !isLocked && hapticLight()}
      className="mb-3 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-200/80 pl-3 pr-4 py-0 overflow-hidden flex items-end gap-3 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all shadow-sm/10"
    >
      <div className="w-16 h-18 sm:w-20 sm:h-20 relative flex items-end justify-center shrink-0 self-end -mb-0.5">
        <img
          src={mayaThumbsup}
          alt="Maya"
          className="w-full h-full object-contain object-bottom select-none pointer-events-none"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1 py-3 self-center">
        {loading ? (
          <>
            <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-44 bg-slate-200/70 rounded animate-pulse" />
          </>
        ) : (
          <>
            <span className="text-slate-900 text-sm font-bold leading-5">
              Nursing German
            </span>
            <span className="text-slate-500 text-[11px] font-medium leading-4">
              {started && overview?.current_chapter
                ? `Chapter ${overview.current_chapter} of ${overview.total_chapters} — keep going`
                : "German for your first weeks on the ward"}
            </span>
            {eligible && moduleState && (
              <div className="pt-0.5">
                <FeatureStatusChip state={moduleState} />
              </div>
            )}
          </>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-slate-700 shrink-0 self-center" />
    </Wrapper>
  );
}
