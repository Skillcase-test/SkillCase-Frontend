import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mayaThumbsup from "../../../../assets/onboarding/mayaThumbsup.webp";
import germanFlag from "../../../../assets/onboarding/germanFlag.webp";
import TypewriterText from "./shared/TypewriterText";
import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
} from "../../../../utils/haptics";

const COIN_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg";
const STREAK_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg";

function StatRow({ icon, label, value, barWidth, delay }) {
  useEffect(() => {
    const widthPercent = parseInt(barWidth, 10) || 0;
    if (!widthPercent) return;

    // Fire haptics as the bar fills: Light → Medium → Heavy over 1.1s animation
    const ANIM_DURATION = 1100;
    const ticks = Math.max(1, Math.min(Math.ceil(widthPercent / 4), 22));
    const intervalMs = Math.max(40, ANIM_DURATION / ticks);
    const delayMs = (delay || 0) * 1000;

    let count = 0;
    let intervalId = null;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        count++;
        const progress = count / ticks;
        if (progress < 0.34) hapticLight();
        else if (progress < 0.67) hapticMedium();
        else hapticHeavy();
        if (count >= ticks) clearInterval(intervalId);
      }, intervalMs);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-black/70 text-[10px] font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {/* Bar track — overflow-visible so the icon bubble pokes out at the end */}
        <div className="flex-1 h-4 bg-black/50 rounded-full relative overflow-visible">
          {/* Filled portion */}
          <motion.div
            className="absolute top-[3px] left-[3px] h-[10px] bg-gradient-to-r from-red-400 to-orange-300 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: barWidth }}
            transition={{ duration: 1.1, ease: "easeOut", delay }}
          />
          {/* Icon bubble — floats at the right end of the fill */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-md border-2 border-orange-300 flex items-center justify-center overflow-hidden z-10"
            initial={{ left: "0%" }}
            animate={{ left: barWidth }}
            transition={{ duration: 1.1, ease: "easeOut", delay }}
          >
            <img src={icon} alt={label} className="w-5 h-5 object-contain" />
          </motion.div>
        </div>
        <span className="text-black/50 font-semibold text-sm shrink-0 ml-3">
          {value}
        </span>
      </div>
    </div>
  );
}

export default function LevelCompleteModal({
  onClose,
  onContinue,
  dialogueText,
  completedLessonId,
  streakUpdated,
  coinsAwarded = 20,
}) {
  const navigate = useNavigate();

  const handleNext = async () => {
    if (onContinue) {
      await onContinue();
      return;
    }
    navigate("/learn-german", {
      state: {
        fromLessonComplete: true,
        completedLessonId,
        streakUpdated,
        coinsAwarded,
        autoStartNext: true, // Tell the home screen to automatically start the next lesson after animation
      },
    });
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
          className="w-full max-w-[400px] relative bg-gradient-to-b from-blue-100 to-sky-100 rounded-[24px] overflow-hidden shadow-2xl flex flex-col items-center pt-10 pb-6 px-4 gap-5"
        >
          {/* Close button */}
          <button
            onClick={() => {
              hapticLight();
              onClose?.();
            }}
            className="absolute right-3 top-3 w-6 h-6 bg-black/25 rounded-full flex items-center justify-center hover:bg-black/40 transition-colors z-50"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>

          {/* Title */}
          <h2 className="text-blue-950 font-bold text-2xl text-center leading-tight z-10">
            Level Complete!
          </h2>

          {/* Dialogue bubble + Maya in circular rings */}
          <div className="w-full flex flex-col items-center gap-0 relative z-30">
            {/* Speech bubble */}
            <div className="relative z-40 flex flex-col items-center">
              <div className="relative bg-white rounded-2xl shadow-sm px-5 py-3 max-w-[270px] text-center border border-slate-200">
                <p className="relative z-20 text-black text-[15px] font-medium leading-snug">
                  <TypewriterText
                    text={
                      dialogueText ||
                      "Awesome! Now you can talk to the baker in German."
                    }
                  />
                </p>
              </div>
              <div className="relative -mt-[1px] h-3 w-4">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-slate-200" />
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-white" />
              </div>
            </div>

            {/* Maya + circles */}
            <div
              className="relative w-full flex justify-center z-20"
              style={{ height: 156 }}
            >
              <div className="absolute w-[240px] h-[240px] bg-white/40 rounded-full top-[-60px] z-0" />
              <div className="absolute w-[160px] h-[160px] bg-white rounded-full top-[-20px] z-0" />
              <motion.img
                src={mayaThumbsup}
                alt="Maya"
                className="relative z-10 h-40 object-contain drop-shadow-md self-end"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.4, delay: 0.15 }}
              />
            </div>
          </div>

          {/* Golden stats card */}
          <div className="w-full bg-gradient-to-br from-yellow-200 to-orange-400 rounded-2xl shadow-lg p-4 flex flex-col gap-4 outline-4 outline-offset-[-4px] outline-yellow-50">
            <span className="text-black/50 text-xs font-semibold tracking-widest text-center uppercase">
              Today&apos;s Goal Progress
            </span>

            <div className="flex flex-col gap-2 px-1">
              <StatRow
                icon={COIN_URL}
                label="Coins"
                value={`+${coinsAwarded}`}
                barWidth={coinsAwarded > 0 ? "80%" : "0%"}
                delay={0.3}
              />
              {streakUpdated && (
                <StatRow
                  icon={STREAK_URL}
                  label="Days Streak"
                  value="+1"
                  barWidth="92%"
                  delay={0.5}
                />
              )}
              <StatRow
                icon={germanFlag}
                label="German Readiness"
                value="+5"
                barWidth="75%"
                delay={streakUpdated ? 0.7 : 0.5}
              />
            </div>

            <button
              onClick={() => {
                hapticLight();
                handleNext();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-blue-900 to-blue-950 rounded-full text-white font-semibold text-base shadow-[0_3px_8px_rgba(0,0,0,0.25)] active:scale-[0.98] transition-all"
            >
              Start next lesson
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
