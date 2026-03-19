import { useSelector } from "react-redux";
import LevelProgress from "./components/LevelProgress";
import FeatureCardsGrid from "./components/FeatureCardsGrid";
import DemoClassSection from "./components/DemoClassSection";
import SalaryInfoCard from "./components/SalaryInfoCard";
import TalkToTeamSection from "./components/TalkToTeamSection";
import StreakWidget from "../../components/StreakWidget";
import { useLandingSections } from "../../hooks/useLandingSections";

export default function LandingPage() {
  const { user } = useSelector((state) => state.auth);
  const currentLevel = user?.user_prof_level || "A1";
  const { sections } = useLandingSections(currentLevel);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-lg mx-auto lg:max-w-6xl xl:max-w-7xl lg:px-8">
        <LevelProgress currentLevel={currentLevel} />
        <FeatureCardsGrid />
        <StreakWidget />
        <DemoClassSection data={sections?.demo_class} />
        <SalaryInfoCard data={sections?.salary_info} />
        <TalkToTeamSection data={sections?.talk_to_team} />
        <div className="px-4">
          <hr className="border-gray-200" />
        </div>
      </main>
    </div>
  );
}
