import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProgressBar from "./shared/ProgressBar";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import handtap from "../../../../assets/handtap.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import WaveformIcon from "./shared/WaveformIcon";

export default function VocabScreen({
  screen,
  onNext,
  onPrev,
  canGoPrev = false,
  speakWord,
  isSpeaking,
  progressRatio,
  title,
  level,
}) {
  const vocab = {
    img: screen?.image || fallbackImg,
    word: screen?.word || "Word",
    translation: screen?.translation || "Translation",
    tts: screen?.word || "Word",
    dialogue: screen?.dialogue || "You look at the items infront of you.",
  };

  return (
    <motion.div
      key={`vocab-layout-${vocab.word}`}
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
          <MayaDialogueBubble text={vocab.dialogue} />
        </motion.div>
      </div>

      <motion.div
        className="flex-1 w-full bg-white rounded-t-[32px] p-5 flex flex-col justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.08)] relative z-20 safe-bottom-pad"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", bounce: 0.3 }}
      >
        <motion.div
          key={`vocab-${vocab.word}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full flex-1 min-h-0 flex flex-col items-center"
        >
          <img
            src={vocab.img}
            className="w-full h-48 sm:h-52 object-cover rounded-2xl shadow-sm border border-gray-100"
          />
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="relative">
              {/* Outgoing sonar pulses behind the button */}
              {!isSpeaking && (
                <>
                  <div className="absolute inset-0 rounded-xl bg-[#002856]/30 animate-ping pointer-events-none" />
                  <div className="absolute inset-0 rounded-xl bg-[#002856]/20 animate-pulse pointer-events-none" />
                </>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSpeaking) speakWord(vocab.tts, true);
                }}
                className="relative z-10 w-12 h-12 bg-white rounded-xl border border-blue-950/50 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all cursor-pointer overflow-hidden"
              >
                <WaveformIcon isPlaying={isSpeaking} className="w-7 h-7" />
              </button>
              {/* Tapping hand overlay using handtap.webp */}
              {!isSpeaking && (
                <motion.img
                  src={handtap}
                  alt="Tap Guide"
                  className="absolute bottom-[-27px] right-[-27px] w-[54px] h-auto pointer-events-none z-20 select-none"
                  style={{
                    transformOrigin: "30% 33%",
                    filter: "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.12))",
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
            <div className="text-center">
              <h2 className="text-black text-[22px] font-semibold">
                {vocab.word}
              </h2>
              <p className="text-gray-400 text-base font-medium mt-1">
                {vocab.translation}
              </p>
            </div>
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
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className={`${
              canGoPrev ? "w-6/5" : "w-full"
            } py-3.5 bg-gradient-to-r from-amber-200 to-amber-300 rounded-xl shadow-sm text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform border border-[#eec139] flex items-center justify-center gap-1.5`}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
