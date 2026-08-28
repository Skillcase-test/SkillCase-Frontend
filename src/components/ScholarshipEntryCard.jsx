import { GraduationCap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Who is allowed to see the scholarship entry card at all.
 * scholarship_candidate_at is stamped once at onboarding (or by the sweeper
 * backfill) and never cleared, so the card survives a switch to
 * learning/practicing mode. has_scholarship_access covers candidates an admin
 * added manually — they never went through scholarship onboarding, so this card
 * is their only way in.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const hasScholarshipAccess = (user) =>
  !!user?.scholarship_candidate_at || user?.has_scholarship_access === true;

/**
 * Scholarship exam re-entry point, shared by ProfilePage and LandingPage.
 * Renders nothing unless an admin enabled the surface (`visible`) and the user
 * is in the audience. Layout-neutral: the caller owns any outer spacing.
 */
export default function ScholarshipEntryCard({ visible, user }) {
  const navigate = useNavigate();
  if (!visible || !hasScholarshipAccess(user)) return null;

  return (
    <div className="w-full p-3 bg-gradient-to-r from-[#002856] to-[#1A4B9F] rounded-xl flex flex-col gap-2.5">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-[#edb843] rounded-3xl flex items-center justify-center">
                <GraduationCap className="size-4 text-[#002856]" />
              </div>
              <span className="text-white text-base font-semibold leading-5">
                Scholarship Exam
              </span>
            </div>
            <p className="text-white/80 text-xs font-normal leading-4">
              Check your exam status or view your results.
            </p>
          </div>
          <button
            onClick={() => navigate("/scholarship")}
            className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-amber-300 text-xs font-medium">
              Open Scholarship Exam
            </span>
            <ChevronRight className="size-3 text-amber-300" />
          </button>
        </div>
        <div className="size-20 rounded-2xl overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
          <GraduationCap className="size-10 text-[#edb843]" />
        </div>
      </div>
    </div>
  );
}
