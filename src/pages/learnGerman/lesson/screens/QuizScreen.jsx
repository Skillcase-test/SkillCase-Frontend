import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Volume,
  Volume1,
  Volume2,
  Volume2Icon,
  VolumeIcon,
  VolumeX,
} from "lucide-react";
import ProgressBar from "./shared/ProgressBar";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import handtap from "../../../../assets/handtap.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import WaveformIcon from "./shared/WaveformIcon";
import { hapticLight } from "../../../../utils/haptics";

const LETTERS = ["A", "B", "C", "D"];

export default function QuizScreen({
  screen,
  onPrev,
  canGoPrev = false,
  selectedOption,
  setSelectedOption,
  onCheck,
  speakWord,
  isSpeaking,
  progressRatio,
  title,
  level,
}) {
  const options = screen?.options || ["Option 1", "Option 2", "Option 3"];
  const question = screen?.question || "What is the answer?";

  return (
    <motion.div
      key="quiz-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 w-full flex flex-col z-30 relative"
    >
      <ProgressBar progressRatio={progressRatio} title={title} level={level} />

      <div className="flex items-center px-4 mt-2 shrink-0 z-20 relative">
        <motion.img
          layoutId="mayaMascot"
          src={mayaLooking}
          className="w-24 sm:w-28 h-auto object-contain"
        />
        <motion.div
          layoutId="dialogBubble"
          className="ml-2 bg-white p-3 rounded-xl shadow-sm relative flex-1"
        >
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45" />
          <MayaDialogueBubble
            text={
              screen?.dialogue || "Quick! Before you forget...answer these!"
            }
          />
        </motion.div>
      </div>

      <motion.div
        className="flex-1 w-full bg-white rounded-t-[32px] p-5 flex flex-col justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.08)] relative z-20 safe-bottom-pad"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", bounce: 0.3 }}
      >
        <motion.div
          key="quiz"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full flex-1 min-h-0 flex flex-col items-center"
        >
          {screen?.image && (
            <img
              src={screen.image}
              className="w-full h-48 sm:h-52 object-cover rounded-2xl shadow-sm border border-gray-100 mb-4"
              onError={(e) => {
                e.target.src = fallbackImg;
              }}
            />
          )}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative">
              {/* Outgoing sonar pulses behind the button */}
              {!isSpeaking && (
                <>
                  <div className="absolute inset-0 rounded-lg bg-[#002856]/30 animate-ping pointer-events-none" />
                  <div className="absolute inset-0 rounded-lg bg-[#002856]/20 animate-pulse pointer-events-none" />
                </>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSpeaking) speakWord(question, true);
                }}
                className="relative z-10 w-10 h-10 flex items-center justify-center active:scale-95 transition-transform border border-blue-950/50 rounded-lg shrink-0 overflow-hidden bg-white"
              >
                <WaveformIcon isPlaying={isSpeaking} className="w-5 h-5" />
              </button>
              {/* Tapping hand overlay using handtap.webp */}
              {!isSpeaking && (
                <motion.img
                  src={handtap}
                  alt="Tap Guide"
                  className="absolute bottom-[-24px] right-[-27px] w-[54px] h-auto pointer-events-none z-20 select-none"
                  style={{
                    transformOrigin: "30% 33%",
                    filter: "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.80))",
                  }}
                  animate={{
                    scale: [1, 0.94, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut",
                  }}
                />
              )}
            </div>
            <h2 className="text-black text-[20px] font-semibold tracking-tight">
              {question}
            </h2>
          </div>

          <div className="flex flex-col gap-3 w-full">
            {options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    setSelectedOption(idx);
                  }}
                  className={`w-full px-3 py-3 rounded-xl border-1 flex items-center gap-4 transition-all ${
                    isSelected
                      ? "bg-blue-100 border-[#1E76F3]"
                      : "bg-white border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium text-sm ${
                      isSelected
                        ? "bg-blue-200 text-[#1E76F3]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {LETTERS[idx] || idx + 1}
                  </div>
                  <span
                    className={`font-medium text-[15px] ${
                      isSelected ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="w-full pt-4 flex items-center gap-3">
          {canGoPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev?.();
              }}
              className="w-2/5 py-3.5 rounded-xl border border-zinc-300 shadow-sm bg-white text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Prev
            </button>
          )}
          <button
            onClick={onCheck}
            disabled={selectedOption === null}
            className={`${
              canGoPrev ? "w-6/5" : "w-full"
            } py-3.5 rounded-xl font-semibold text-[15px] transition-all flex items-center justify-center gap-1.5 ${
              selectedOption !== null
                ? "bg-gradient-to-r from-amber-200 to-amber-400 text-blue-950 shadow-sm active:scale-[0.98] border border-[#eec139]"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            <span>Check</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
