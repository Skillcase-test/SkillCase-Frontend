import { AnimatePresence, motion } from "framer-motion";
import { X, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import germanFlag from "../../assets/onboarding/germanFlag.webp";

const COIN_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg";
const STREAK_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg";

const DAILY_GOAL_KEY_PREFIX = "lg_daily_goal_shown";
const DAILY_GOAL_COMPLETED_KEY_PREFIX = "lg_daily_goal_completed_shown";

function getTodayISTKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function shouldShowDailyGoal(userId) {
  if (!userId) return false;
  const key = `${DAILY_GOAL_KEY_PREFIX}:${userId}:${getTodayISTKey()}`;
  return !localStorage.getItem(key);
}

export function markDailyGoalShown(userId) {
  if (!userId) return;
  const key = `${DAILY_GOAL_KEY_PREFIX}:${userId}:${getTodayISTKey()}`;
  localStorage.setItem(key, "1");
}

// Guards for the "Daily goal completed" modal — shown at most once per day
export function shouldShowDailyGoalCompleted(userId) {
  if (!userId) return false;
  const key = `${DAILY_GOAL_COMPLETED_KEY_PREFIX}:${userId}:${getTodayISTKey()}`;
  return !localStorage.getItem(key);
}

export function markDailyGoalCompletedShown(userId) {
  if (!userId) return;
  const key = `${DAILY_GOAL_COMPLETED_KEY_PREFIX}:${userId}:${getTodayISTKey()}`;
  localStorage.setItem(key, "1");
}

export default function DailyGoalModal({ isOpen, onClose, nextLesson, userId }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleContinue = () => {
    onClose();
    if (nextLesson?.lesson_id) {
      navigate(`/learn-german/lesson/${nextLesson.lesson_id}`);
    }
  };

  const lessonTitle = nextLesson?.title || "Your next lesson";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-[400px] relative bg-gradient-to-b from-blue-100 to-orange-200 rounded-[24px] overflow-hidden shadow-2xl flex flex-col items-center pt-10 pb-6 px-4 gap-6"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 w-6 h-6 bg-black/25 rounded-full flex items-center justify-center hover:bg-black/40 transition-colors z-50"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-blue-950 font-bold text-2xl leading-tight">
              Today&apos;s Goal
            </h2>
            <p className="text-blue-950 font-semibold text-sm">
              Takes less than 10 mins
            </p>
          </div>

          {/* Tasks + Rewards */}
          <div className="w-full flex flex-col gap-4">
            {/* Task list — locked state */}
            <div className="flex flex-col gap-1.5">
              <TaskRow label={`Complete: ${lessonTitle}`} locked />
              <TaskRow label="Maintain your streak" locked />
            </div>

            {/* Gray rewards card (locked) */}
            <div className="w-full bg-gradient-to-br from-neutral-200 to-zinc-400 rounded-2xl shadow-lg p-4 flex flex-col gap-5 outline-4 outline-offset-[-4px] outline-white">
              <div className="flex items-center justify-between">
                <span className="text-black/60 text-xs font-semibold tracking-widest uppercase flex-1 text-center">
                  Rewards
                </span>
                <div className="w-8 h-8 rounded-full border-2 border-white/60 bg-white/40 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-white/70" />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <RewardCard icon={COIN_URL} value="+20" label="coins" />
                <RewardCard icon={STREAK_URL} value="+1" label="day streak" />
                <RewardCard icon={germanFlag} value="+5" label="readiness" />
              </div>

              <button
                onClick={handleContinue}
                className="w-full py-3.5 bg-gradient-to-r from-blue-900 to-blue-950 rounded-full text-white font-semibold text-base shadow-[0_3px_8px_rgba(0,0,0,0.25)] active:scale-[0.98] transition-all"
              >
                Continue my goal
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TaskRow({ label, locked }) {
  return (
    <div className="w-full px-3 py-2.5 bg-white/30 rounded-xl flex items-center justify-between gap-3">
      <span className="text-blue-950 text-sm font-medium flex-1">{label}</span>
      {locked ? (
        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
            <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}

function RewardCard({ icon, value, label }) {
  return (
    <div className="flex-1 px-2.5 py-2 bg-white/50 rounded-xl flex flex-col items-center gap-1">
      <div className="w-11 h-11 flex items-center justify-center overflow-hidden">
        <img src={icon} alt={label} className="w-10 h-10 object-contain" />
      </div>
      <span className="text-blue-950 font-semibold text-sm">{value}</span>
      <span className="text-blue-950/70 text-[11px] font-medium">{label}</span>
    </div>
  );
}
