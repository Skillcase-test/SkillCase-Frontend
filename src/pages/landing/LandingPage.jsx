import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// Learn German Tab Components
import LevelProgress from "./components/LevelProgress";
import FeatureCardsGrid from "./components/FeatureCardsGrid";
import DemoClassSection from "./components/DemoClassSection";
import SalaryInfoCard from "./components/SalaryInfoCard";
import PricingCard from "./components/PricingCard";
import ExploreJobsCTA from "./components/ExploreJobsCTA";
import MockInterviewSection from "./components/MockInterviewSection";

// Shared Components (used by both tabs)
import TalkToTeamSection from "./components/TalkToTeamSection";
import CompleteProfileCTA from "./components/CompleteProfileCTA";
export default function LandingPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) {
      navigate("/Login");
    }
  }, [user, navigate]);
  const currentLevel = user?.user_prof_level || "A1";
  if (!user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-lg mx-auto lg:max-w-6xl xl:max-w-7xl lg:px-8">
        <LevelProgress currentLevel={currentLevel} />
        <FeatureCardsGrid />
        <DemoClassSection />
        <SalaryInfoCard />
        <TalkToTeamSection />
        <PricingCard />
        <CompleteProfileCTA />
        <div className="px-4">
          <hr className="border-gray-200" />
        </div>
        <ExploreJobsCTA />
        <MockInterviewSection />
      </main>
    </div>
  );
}
