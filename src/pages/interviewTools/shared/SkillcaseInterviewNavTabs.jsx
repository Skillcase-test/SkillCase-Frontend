import { useEffect, useState } from "react";
import { skillcaseInterviewToolsApi } from "../../../api/skillcaseInterviewToolsApi";
import {
  hasPermission,
  useAdminAccess,
} from "../../../utils/adminPermissions";

const MODULE = "skillcase_interviews";

// Positions | Reviews tab bar for the Skillcase Interviews module.
// - Positions: visible to admins with module `view` (or manage/super admin).
// - Reviews: visible to super admins and `reviewer`/`manage` holders only.
// The Reviews tab carries a dot with the pending assignment count.
export default function SkillcaseInterviewNavTabs({ active, setActivePage }) {
  const me = useAdminAccess();
  const [pendingCount, setPendingCount] = useState(0);

  const showPositions = hasPermission(me, MODULE, "view");
  const showReviews = hasPermission(me, MODULE, "reviewer");

  useEffect(() => {
    if (!showReviews) return undefined;
    let cancelled = false;
    skillcaseInterviewToolsApi
      .listMyReviewAssignments()
      .then((res) => {
        if (!cancelled) setPendingCount(res.data.pending_count || 0);
      })
      .catch(() => {
        // Non-blocking: admins without access just don't see a dot.
      });
    return () => {
      cancelled = true;
    };
  }, [showReviews]);

  const tabClass = (key) =>
    `relative inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${
      active === key
        ? "bg-[#083262] text-white"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {showPositions && (
        <button
          type="button"
          onClick={() => setActivePage("interview-tools-positions")}
          className={tabClass("positions")}
        >
          Positions
        </button>
      )}
      {showReviews && (
        <button
          type="button"
          onClick={() => setActivePage("interview-tools-reviews")}
          className={tabClass("reviews")}
        >
          Reviews
          {pendingCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
              {pendingCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
