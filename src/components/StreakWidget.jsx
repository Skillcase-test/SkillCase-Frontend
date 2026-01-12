import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";
import { hapticMedium } from "../utils/haptics";

export default function StreakWidget() {
  const { user } = useSelector((state) => state.auth);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    todayFlashcards: 0,
    dailyGoal: 20,
    dailyGoalMet: false,
  });
  const [lastChapter, setLastChapter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    const fetchData = async () => {
      try {
        const [streakRes, chapterRes] = await Promise.all([
          api.get("/streak"),
          api.get("/streak/last-chapter"),
        ]);
        if (streakRes.data) setStreakData(streakRes.data);
        if (chapterRes.data?.hasProgress) setLastChapter(chapterRes.data);
      } catch (err) {
        console.error("Error fetching streak data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.user_id]);

  if (!user?.user_id) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="px-4 py-4">
        <div id="streak-widget" className="bg-[#002856] shadow-xl border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-400 rounded-full" />
            <div>
              <div className="w-12 h-8 bg-gray-400 rounded mb-1" />
              <div className="w-20 h-4 bg-gray-400 rounded" />
            </div>
          </div>
          <div className="text-right animate-pulse">
            <div className="w-24 h-4 bg-gray-400 rounded mb-1 ml-auto" />
            <div className="w-20 h-6 bg-gray-400 rounded ml-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Build continue link
  let continueLink = user?.user_prof_level
    ? `/practice/${user.user_prof_level}`
    : "/practice/A1";

  if (lastChapter?.setId) {
    continueLink = `/practice/${lastChapter.proficiencyLevel}/${
      lastChapter.setId
    }?set_name=${encodeURIComponent(lastChapter.setName)}&start_index=${lastChapter.currentIndex}`;
  }

  return (
    <Link to={continueLink} onClick={hapticMedium} className="block px-4 py-4">
      <div id="streak-widget" className="bg-[#002856] shadow-xl border border-slate-100 rounded-2xl p-5 flex items-center justify-between hover:shadow-2xl transition-shadow cursor-pointer">
        {/* Left Side - Streak */}
        <div className="flex items-center gap-3">
          <Flame className="w-10 h-10 text-orange-400" />
          <div className="text-[#EDB843]">
            <div className="text-3xl font-bold leading-tight">
              {streakData.currentStreak}
            </div>
            <div className="text-sm opacity-90">Days Streak</div>
          </div>
        </div>

        {/* Right Side - Today's Progress */}
        <div className="text-right text-[#EDB843]">
          <div className="text-md opacity-90">Today's Progress</div>
          <div className="text-md font-bold">
            {streakData.todayFlashcards}/{streakData.dailyGoal}
            <span className="text-sm font-normal ml-1">Flashcards</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
