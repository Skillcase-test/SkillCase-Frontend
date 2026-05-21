import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ProgressBar from "./shared/ProgressBar";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import WaveformIcon from "./shared/WaveformIcon";
import { hapticLight } from "../../../../utils/haptics";

export default function GrammarScreen({
  screen,
  onNext,
  onPrev,
  canGoPrev = false,
  speakWord,
  isSpeaking = false,
  currentlySpeakingText = "",
  progressRatio,
  title,
  level,
  onBackClick,
}) {
  const grammar = {
    text: screen?.text || "",
    dialogue: screen?.dialogue || "Let's look at some grammar!",
    word: screen?.word || "",
    meaning: screen?.meaning || "",
  };
  const hasSpeakableWord =
    typeof grammar.word === "string" && grammar.word.trim().length > 0;

  return (
    <motion.div
      key={`grammar-layout`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 w-full flex flex-col z-30 relative"
    >
      <ProgressBar
        progressRatio={progressRatio}
        title={title}
        level={level}
        onBackClick={onBackClick}
      />

      <div className="flex items-center px-4 mt-2 shrink-0 z-20 relative">
        <motion.img
          layoutId="mayaMascot"
          src={mayaLooking}
          className="w-24 sm:w-28 h-auto object-contain self-end"
        />
        <motion.div
          layoutId="dialogBubble"
          className="ml-2 bg-white p-3 rounded-xl shadow-sm relative flex-1 mb-5"
        >
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45" />
          <MayaDialogueBubble text={grammar.dialogue} />
        </motion.div>
      </div>

      <motion.div
        className="flex-1 w-full bg-white rounded-t-[32px] p-5 flex flex-col justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.08)] relative z-20 safe-bottom-pad mt-4"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", bounce: 0.3 }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full flex-1 min-h-0 flex flex-col items-center overflow-y-auto"
        >
          {hasSpeakableWord && (
            <div className="w-full flex flex-col items-center mb-6">
              <button
                onClick={() => {
                  hapticLight();
                  speakWord?.(grammar.word, true);
                }}
                className="w-20 h-20 rounded-2xl border-2 border-blue-900 bg-white flex items-center justify-center mb-4 active:scale-[0.98] transition-transform"
                aria-label={`Play pronunciation for ${grammar.word}`}
              >
                <WaveformIcon
                  isPlaying={
                    isSpeaking && currentlySpeakingText === grammar.word
                  }
                  className="w-9 h-9"
                />
              </button>
              <div className="text-black text-[46px] leading-none font-bold font-['Poppins'] mb-1">
                {grammar.word}
              </div>
              {!!grammar.meaning && (
                <div className="text-slate-500 text-[34px] leading-none font-medium font-['Poppins']">
                  {grammar.meaning}
                </div>
              )}
            </div>
          )}

          <div className="w-full p-5 bg-white rounded-2xl border border-slate-300 shadow-sm">
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-slate-900 mb-3">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-md font-semibold text-slate-900 mb-3">
                      {children}
                    </h2>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-800 leading-relaxed mb-4 text-sm">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-medium text-slate-900">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-4 text-slate-800">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => <li>{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ),
                }}
              >
                {grammar.text}
              </ReactMarkdown>
            </div>
          </div>
        </motion.div>

        <div className="w-full pt-6 flex items-center gap-3">
          {canGoPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev?.();
              }}
              className="w-2/5 py-4 rounded-2xl border border-zinc-300 shadow-sm bg-white text-blue-950 font-semibold text-[16px] active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
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
            } py-4 bg-gradient-to-r from-amber-200 to-amber-300 rounded-2xl shadow-sm text-blue-950 font-bold text-[16px] active:scale-[0.98] transition-transform border border-[#eec139] flex items-center justify-center gap-1.5`}
          >
            <span>Got it!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
