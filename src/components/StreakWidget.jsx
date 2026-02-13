import { useState, useEffect } from "react";
import { Flame, Info, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";
import { hapticMedium } from "../utils/haptics";

export default function StreakWidget() {
  const { user } = useSelector((state) => state.auth);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    todayPoints: 0,
    dailyGoal: 20,
    dailyGoalMet: false,
  });
  const [lastChapter, setLastChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const profLevel = user?.user_prof_level?.toUpperCase() || "A1";

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
        <div
          id="streak-widget"
          className="bg-[#002856] shadow-xl border border-slate-100 rounded-2xl p-5 flex items-center justify-between"
        >
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

  // Build continue link - handle A2 vs A1 default routing
  let continueLink =
    profLevel === "A2"
      ? "/a2/flashcard" // A2 default
      : `/practice/${profLevel}`; // A1 default

  if (lastChapter?.hasProgress) {
    if (lastChapter.isA2) {
      // A2 user with progress - route to specific chapter at last unflipped card
      continueLink = `/a2/flashcard/${lastChapter.chapterId}?start_index=${
        lastChapter.currentIndex || 0
      }`;
    } else if (lastChapter.setId) {
      // A1 user - route to A1 practice
      continueLink = `/practice/${lastChapter.proficiencyLevel}/${
        lastChapter.setId
      }?set_name=${encodeURIComponent(lastChapter.setName)}&start_index=${
        lastChapter.currentIndex
      }`;
    }
  }

  return (
    <>
      <Link to={continueLink} className="block px-4 py-4" id="streak-widget">
        <div className="bg-[#002856] shadow-xl border border-slate-100 rounded-2xl p-5 flex items-center justify-between hover:shadow-2xl transition-shadow cursor-pointer">
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
            <div className="text-md opacity-90 flex items-center justify-end gap-1.5">
              Today's Progress
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowInfo(true);
                }}
                className="pointer-events-auto opacity-70 hover:opacity-100 transition-opacity"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-md font-bold">
              {streakData.todayPoints}/{streakData.dailyGoal}
              <span className="text-sm font-normal ml-1">Points</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Point System Info Tooltip */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          onClick={() => setShowInfo(false)}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl mb-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-bold text-gray-800">
                Daily Point System
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Earn{" "}
              <span className="font-semibold text-gray-800">
                20 points daily
              </span>{" "}
              to extend your streak:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              {profLevel === "A2" ? (
                <>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0" />
                    Flashcards — <span className="font-medium">+1</span> per
                    flip
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                    Speaking — <span className="font-medium">+1</span> per
                    recording
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                    Listening / Grammar / Reading —{" "}
                    <span className="font-medium">+1</span> per question
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0" />
                    Tests — <span className="font-medium">+20</span> per
                    completed test
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0" />
                    Flashcards — <span className="font-medium">+1</span> per
                    flip
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                    Pronunciation — <span className="font-medium">+1</span> per
                    recording
                  </li>
                </>
              )}
            </ul>
          </div>
          <style>{`
          @keyframes slide-up {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up { animation: slide-up 0.3s ease-out; }
        `}</style>
        </div>
      )}
    </>
  );
}
