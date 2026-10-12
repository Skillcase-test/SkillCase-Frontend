import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { images } from "../../../assets/images";
import { getNursingChapters } from "../../../api/a1NursingApi";
import { useUsageLimits } from "../../../hooks/useUsageLimits";
import FeatureStatusChip from "../../ui/FeatureStatusChip";
import { hapticLight } from "../../../utils/haptics";

// Full-width grid banner, rendered at every level; usage-gated under the shared ALL/nursing pool.
export default function NursingBanner({ className = "" }) {
  const { eligible, getState } = useUsageLimits();
  const moduleState = getState("ALL", "nursing");
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
          level: "ALL",
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
  const totalChapters = overview?.total_chapters ?? overview?.chapters?.length ?? 0;

  return (
    <Wrapper
      to={isLocked ? undefined : "/a1/nursing"}
      onClick={isLocked ? openLockModal : undefined}
      onTouchStart={() => !isLocked && hapticLight()}
      className={`rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all shadow-sm ${className}`}
    >
      <div className="size-20 sm:size-24 shrink-0 rounded-xl border border-slate-200 p-1 bg-white">
        <img
          src={images.nursingGerman}
          alt="Nurse using her phone"
          className="size-full rounded-lg object-cover object-[70%_center] select-none pointer-events-none"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {loading ? (
          <>
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-44 bg-slate-200/70 rounded animate-pulse" />
            <div className="h-3 w-28 bg-slate-200/70 rounded animate-pulse" />
          </>
        ) : (
          <>
            <span className="text-[#002856] text-base sm:text-lg font-bold leading-6">
              Medical German
            </span>
            <span className="text-slate-500 text-xs sm:text-sm leading-5">
              Words for patients &amp; life on the ward.
            </span>
            <span className="text-slate-500 text-xs sm:text-sm leading-5 pt-0.5">
              {started && overview?.current_chapter
                ? `Chapter ${overview.current_chapter} of ${totalChapters} · keep going`
                : `${totalChapters} chapters to explore`}
            </span>
            {eligible && moduleState && (
              <div className="pt-1">
                <FeatureStatusChip state={moduleState} />
              </div>
            )}
          </>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-[#002856] shrink-0" />
    </Wrapper>
  );
}
