import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { images } from "../../../assets/images";
import { getNursingChapters } from "../../../api/a1NursingApi";
import { useUsageLimits } from "../../../hooks/useUsageLimits";
import FeatureStatusChip from "../../ui/FeatureStatusChip";
import { hapticLight } from "../../../utils/haptics";

// Top banner above the A1 grid — deep-links into the nursing chapter hub and
// shows live path progress ("Chapter X of 22").
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
  const started = overview?.chapters?.some((c) => c.quiz_passed || c.current_index > 0);

  return (
    <Wrapper
      to={isLocked ? undefined : "/a1/nursing"}
      onClick={isLocked ? openLockModal : undefined}
      onTouchStart={() => !isLocked && hapticLight()}
      className="mb-3 rounded-2xl bg-gradient-to-r from-[#002856] to-[#1E5CA2] px-4 py-0 flex items-center justify-between gap-3 overflow-hidden shadow-sm cursor-pointer hover:shadow-lg active:scale-[0.99] transition-all"
    >
      <div className="flex-1 flex flex-col justify-between py-3 min-w-0">
        <div className="flex flex-col gap-1">
          <h3 className="text-white text-base font-bold leading-snug">
            Nursing German
          </h3>
          <p className="text-white/80 text-xs font-normal leading-normal">
            {loading
              ? "German for your first weeks on the ward"
              : started && overview?.current_chapter
                ? `Chapter ${overview.current_chapter} of ${overview.total_chapters}`
                : "German for your first weeks on the ward"}
          </p>
        </div>
        {eligible && moduleState && (
          <div className="pt-2">
            <FeatureStatusChip state={moduleState} />
          </div>
        )}
        <div className="mt-2">
          <span className="inline-flex items-center justify-center px-4 py-1.5 bg-amber-400 text-[#002856] text-xs font-bold rounded-xl shadow-sm gap-1">
            {started ? "Continue" : "Start"}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
      <div className="w-20 h-24 sm:w-24 sm:h-28 relative shrink-0 self-end overflow-hidden rounded-xl">
        <img
          src={images.nursingGerman}
          alt="Nursing German"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />
      </div>
    </Wrapper>
  );
}
