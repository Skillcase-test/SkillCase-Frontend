import { useState, useEffect } from "react";
import StreakCelebrationModal from "../../../components/StreakCelebrationModal";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Lock,
  CheckCircle,
  Play,
  Eye,
} from "lucide-react";
import { getTestProgress } from "../../../api/a2Api";

export default function A2TestLevel() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [streakInfo, setStreakInfo] = useState({ streakDays: 0 });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await getTestProgress(topicId);
        setTopic(res.data.topic);
        setProgress(res.data.progress);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [topicId]);

  useEffect(() => {
    const raw = sessionStorage.getItem("streak_test_completed");
    if (raw) {
      sessionStorage.removeItem("streak_test_completed");
      try {
        const data = JSON.parse(raw);
        setStreakInfo({ streakDays: data.streakDays || 1 });
        setShowStreakCelebration(true);
      } catch {
        // Fallback: if parse fails, still show celebration
        setStreakInfo({ streakDays: 1 });
        setShowStreakCelebration(true);
      }
    }
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-white"
        aria-label="Loading test levels"
        role="status"
      >
        <div
          className="px-4 pb-3 border-b border-[#E5E7EB]"
          style={{
            paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="p-6">
          <div className="h-6 w-40 bg-slate-200 rounded mb-2 animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-100 rounded mb-6 animate-pulse" />
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-full p-4 rounded-xl border-2 border-slate-100 flex items-center gap-4 animate-pulse"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-3 w-36 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const levelsCompleted = progress?.levels_completed || 0;
  const isFullyCompleted = progress?.is_fully_completed || levelsCompleted >= 5;

  const handleLevelClick = (level, isCompleted) => {
    if (isCompleted) {
      // Review mode for completed levels
      navigate(`/a2/test/${topicId}/${level}?mode=review`);
    } else {
      // Take test for current/accessible level
      navigate(`/a2/test/${topicId}/${level}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div
        className="px-4 pb-3 flex items-center border-b border-[#E5E7EB]"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex w-full justify-between items-center">
          <button
            onClick={() => navigate("/a2/test")}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            Test Levels
          </span>
        </div>
      </div>
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-2">{topic?.name}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Complete all 5 levels to master this topic
        </p>

        <div id="a2-test-levels" className="space-y-3">
          {[1, 2, 3, 4, 5].map((level) => {
            // FIX: Correct logic
            // - isCompleted: levels that have been passed (1 to levelsCompleted)
            // - isCurrent: the next level to attempt (levelsCompleted + 1)
            // - isLocked: levels beyond current (levelsCompleted + 2 and above)
            const isCompleted = level <= levelsCompleted;
            const isCurrent = level === levelsCompleted + 1;
            const isLocked = level > levelsCompleted + 1;

            return (
              <button
                key={level}
                onClick={() =>
                  !isLocked && handleLevelClick(level, isCompleted)
                }
                disabled={isLocked}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                  isCompleted
                    ? "border-green-500 bg-green-50"
                    : isCurrent
                      ? "border-[#002856] bg-[#edfaff]"
                      : "border-gray-200 opacity-60"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "bg-[#002856] text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {level}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">Level {level}</p>
                  <p className="text-xs text-gray-500">
                    {isCompleted
                      ? "Completed - Tap to Review"
                      : isCurrent
                        ? "Current Level"
                        : "Locked"}
                  </p>
                </div>
                {isCompleted ? (
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600" />
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                ) : isLocked ? (
                  <Lock className="w-5 h-5 text-gray-400" />
                ) : (
                  <Play className="w-5 h-5 text-[#002856]" />
                )}
              </button>
            );
          })}
        </div>

        {isFullyCompleted && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-700">Topic Completed!</p>
            <p className="text-sm text-green-600">
              You've mastered all 5 levels
            </p>
          </div>
        )}
      </div>

      <StreakCelebrationModal
        showStreakCelebration={showStreakCelebration}
        setShowStreakCelebration={setShowStreakCelebration}
        streakInfo={streakInfo}
      />
    </div>
  );
}
