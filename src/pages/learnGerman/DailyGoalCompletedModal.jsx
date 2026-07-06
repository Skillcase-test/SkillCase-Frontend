import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import germanFlag from "../../assets/onboarding/germanFlag.webp";

const COIN_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg";
const STREAK_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg";

function CheckRow({ label }) {
  return (
    <div className="w-full px-3 py-2.5 bg-white/30 rounded-xl flex items-center justify-between gap-3">
      <span className="text-blue-950 text-sm font-medium flex-1">{label}</span>
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 12 10" className="w-3 h-3" fill="none">
          <path
            d="M1 5l3.5 3.5L11 1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
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

export default function DailyGoalCompletedModal({
  isOpen,
  onClose,
  nextLesson,
  streakUpdated = false,
  coinsAwarded = 0,
  vocabWordCount = 0,
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleContinue = () => {
    onClose();
    if (nextLesson?.lesson_id) {
      navigate(`/learn-german/lesson/${nextLesson.lesson_id}`);
    }
  };

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
          className="w-full max-w-[400px] relative bg-gradient-to-b from-blue-100 to-orange-200 rounded-[24px] overflow-hidden shadow-2xl flex flex-col items-center pt-7 pb-3 px-4 gap-2"
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
              Daily goal completed
            </h2>
            <p className="text-blue-950 font-semibold text-sm">
              Well done! Keep learning
            </p>
          </div>

          {/* Tasks + Rewards */}
          <div className="w-full flex flex-col gap-4">
            {/* Completed task list */}
            <div className="flex flex-col gap-1.5">
              <CheckRow label="Complete 1 challenge" />
              <CheckRow label="Maintain your streak" />
            </div>

            {/* Golden rewards card (unlocked) */}
            <div className="w-full bg-gradient-to-br from-yellow-200 to-orange-400 rounded-2xl shadow-lg p-4 flex flex-col gap-5 outline-4 outline-offset-[-4px] outline-yellow-50">
              <span className="text-black/50 text-xs font-semibold tracking-widest uppercase text-center">
                Rewards Unlocked
              </span>

              <div className="flex items-center gap-1.5">
                <RewardCard
                  icon={COIN_URL}
                  value={`+${coinsAwarded}`}
                  label="coins"
                />
                <RewardCard
                  icon={STREAK_URL}
                  value={streakUpdated ? "+1" : "+0"}
                  label="day streak"
                />
                <RewardCard icon={germanFlag} value={`+${vocabWordCount}`} label="words learnt" />
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
