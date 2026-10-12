import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import FeatureCardsGrid from "./components/FeatureCardsGrid";
import DemoClassSection from "./components/DemoClassSection";
import SalaryInfoCard from "./components/SalaryInfoCard";
import TalkToTeamSection from "./components/TalkToTeamSection";
import { useLandingSections } from "../../hooks/useLandingSections";
import { isB1PracticeLevel, isB2PracticeLevel } from "../../utils/b1Progress";
import { resolveHomeRedirect } from "../../utils/homeRoute";
import { isHubSwitchPending } from "../../router/navigation";
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
  // HomeRoute redirects before this mounts; this catches mode changes while open.
  useEffect(() => {
    if (isHubSwitchPending()) return;
    const target = resolveHomeRedirect(user, lgMode);
    if (target) navigate(target, { replace: true });
  }, [navigate, user, lgMode]);

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
