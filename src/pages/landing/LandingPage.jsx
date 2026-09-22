import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import FeatureCardsGrid from "./components/FeatureCardsGrid";
import DemoClassSection from "./components/DemoClassSection";
import SalaryInfoCard from "./components/SalaryInfoCard";
import TalkToTeamSection from "./components/TalkToTeamSection";
import { useLandingSections } from "../../hooks/useLandingSections";
import {
  isB1PracticeLevel,
  isB2PracticeLevel,
  isPracticeSuiteLevel,
} from "../../utils/b1Progress";
import { getLandingVisibility } from "../../api/scholarshipExamApi";
import ScholarshipEntryCard, {
  hasScholarshipAccess,
} from "../../components/ScholarshipEntryCard";

export default function LandingPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const rawLevel = (user?.user_prof_level || "A1").toUpperCase();
  const contentLevel = isB1PracticeLevel(rawLevel)
    ? "B1"
    : isB2PracticeLevel(rawLevel)
      ? "B2"
      : ["A1", "A2", "B1", "B2"].includes(rawLevel)
        ? rawLevel
        : "A1";
  const { sections } = useLandingSections(contentLevel);
  const isPaidUser = Boolean(user?.is_paid);
  const showLandingSections = !isPaidUser;

  // Scholarship re-entry card. Candidates who switched to learn/practice keep
  // scholarship_candidate_at, so this is how they get back to the exam funnel.
  // Skip the round trip for everyone who could never see the card anyway.
  const [showScholarshipCard, setShowScholarshipCard] = useState(false);
  const canSeeScholarship = hasScholarshipAccess(user);
  useEffect(() => {
    if (!canSeeScholarship) return;
    getLandingVisibility()
      .then((r) => setShowScholarshipCard(!!r.data?.show_on_landing))
      .catch(() => {});
  }, [canSeeScholarship]);

  const [lgMode, setLgMode] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("lg_preferred_mode") || "";
  });
  useEffect(() => {
    const handleModeChange = (event) => {
      setLgMode(
        event?.detail?.mode || localStorage.getItem("lg_preferred_mode") || "",
      );
    };
    window.addEventListener("lgModeChange", handleModeChange);
    return () => window.removeEventListener("lgModeChange", handleModeChange);
  }, []);
  const prefersLearnMode =
    (lgMode || user?.lg_preferred_mode) === "learn" ||
    (!lgMode &&
      (user?.german_preference === "1" ||
        String(user?.german_preference || "").toLowerCase().includes("learn")));

  // B1/B2 users own the mode switcher (Exam & Practice / Jobs) and may keep
  // their saved mode as job_screening while viewing the practice hub — only
  // non-B1 job candidates get force-redirected into the pipeline here.
  const isB1User = isPracticeSuiteLevel(user?.user_prof_level);

  // German Classes is a client-side-only mode (the /user/lg-mode server
  // whitelist has no such value) — selecting its tab persists "courses" in
  // lg_preferred_mode, so Home lands back here instead of the practice hub.
  // Applies to every level: B1/B2 users get the tab via the german_classes
  // feature flag, so their saved "courses" mode must redirect too.
  const prefersCoursesMode =
    (lgMode || user?.lg_preferred_mode) === "courses";

  const isJobScreening =
    !isB1User &&
    lgMode !== "practice" &&
    lgMode !== "learn" &&
    (user?.german_preference === "3" ||
      user?.lg_preferred_mode === "job_screening");
  // Scholarship candidates live in the exam funnel until they opt into a
  // learning/practicing mode — the practice hub is not their home screen.
  // Keyed on the mode only: german_preference is analytics data, and once a
  // candidate switches to practice their mode is the single source of truth.
  const isScholarshipUser =
    (lgMode || user?.lg_preferred_mode) === "scholarship";

  const isTopTourCompleted = Boolean(
    !user?.user_id ||
      user?.top_switcher_tour_completed ||
      (user?.user_id &&
        localStorage.getItem(`top_switcher_tour_completed_${user.user_id}`) === "true"),
  );

  const isTopSwitcherTourActive =
    !isTopTourCompleted ||
    Boolean(typeof window !== "undefined" && window.__topSwitcherTourActive) ||
    (typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("top_switcher_tour_active") === "true");

  useEffect(() => {
    if (isScholarshipUser) {
      navigate("/scholarship", { replace: true });
      return;
    }
    if (isTopSwitcherTourActive) {
      return;
    }
    if (isJobScreening) {
      navigate("/job-screening", { replace: true });
    } else if (prefersCoursesMode) {
      navigate("/video-courses", { replace: true });
    } else if (prefersLearnMode) {
      navigate("/learn-german", { replace: true });
    }
  }, [
    navigate,
    isJobScreening,
    prefersCoursesMode,
    prefersLearnMode,
    isScholarshipUser,
    isTopSwitcherTourActive,
  ]);

  return (
    <div className="bg-white">
      <main className="max-w-lg mx-auto lg:max-w-6xl xl:max-w-7xl lg:px-8 pt-4 sm:pt-6 pb-28">
        <FeatureCardsGrid />

        {showScholarshipCard && (
          <div className="px-4 mt-4">
            <ScholarshipEntryCard visible user={user} />
          </div>
        )}

        {showLandingSections && (
          <div className="space-y-4 mt-4">
            {sections?.demo_class && sections.demo_class.is_visible !== false && (
              <DemoClassSection data={sections.demo_class} />
            )}
            {sections?.salary_info && sections.salary_info.is_visible !== false && (
              <SalaryInfoCard data={sections.salary_info} />
            )}
            {sections?.talk_to_team && sections.talk_to_team.is_visible !== false && (
              <TalkToTeamSection data={sections.talk_to_team} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
