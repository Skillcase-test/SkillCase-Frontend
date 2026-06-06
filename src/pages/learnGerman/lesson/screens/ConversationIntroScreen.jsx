import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProgressBar from "./shared/ProgressBar";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import TypewriterText from "./shared/TypewriterText";
import { hapticLight } from "../../../../utils/haptics";

export default function ConversationIntroScreen({
  screen,
  onNext,
  onPrev,
  canGoPrev = false,
  progressRatio,
  title,
  level,
}) {
  const mayaDialogues =
    Array.isArray(screen?.dialogues) && screen.dialogues.length
      ? screen.dialogues
      : [
          screen?.mayaDialogue ||
            "Great! Now, try talking to the baker in German",
        ];
  const [mayaDialogueIndex, setMayaDialogueIndex] = useState(0);
  const [mayaDone, setMayaDone] = useState(false);
  const [currentDialogueFinished, setCurrentDialogueFinished] = useState(false);

  const handleBubbleClick = () => {
    if (!currentDialogueFinished) return;
    if (mayaDialogueIndex < mayaDialogues.length - 1) {
      setMayaDialogueIndex((prev) => prev + 1);
      setCurrentDialogueFinished(false);
    } else {
      setMayaDone(true);
    }
  };

  return (
    <motion.div
      key={`screen-conversation-intro`}
      className="w-full flex-1 flex flex-col relative bg-gradient-to-b from-blue-100 to-sky-100 overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
    >
      <ProgressBar progressRatio={progressRatio} title={title} level={level} />

      {/* Maya Top Area */}
      <div className="absolute left-0 top-5 z-0 flex items-center pl-2">
        <motion.img
          layoutId="mayaMascot"
          className="w-22 z-10 drop-shadow-md"
          src={mayaLooking}
        />
        <motion.div
          layoutId="mayaDialog"
          onClick={handleBubbleClick}
          className={`px-4 py-2.5 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-0 ml-1 relative flex items-center border border-gray-100 mb-5 ${
            currentDialogueFinished && !mayaDone ? "cursor-pointer active:bg-zinc-50" : ""
          }`}
        >
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-gray-100" />
          <div className="w-[210px] pr-2">
            <MayaDialogueBubble
              key={`maya-dialog-${mayaDialogueIndex}`}
              text={mayaDialogues[mayaDialogueIndex]}
              className="block"
              onDone={() => {
                setCurrentDialogueFinished(true);
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Main Image Area */}
      <div
        onClick={!mayaDone ? handleBubbleClick : undefined}
        className={`w-full flex-1 mt-28 rounded-tl-3xl rounded-tr-3xl relative overflow-hidden flex flex-col justify-end ${
          currentDialogueFinished && !mayaDone ? "cursor-pointer" : ""
        }`}
      >
        {screen?.image && (
          <img
            src={screen.image}
            alt="Scenario"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Character Dialogue Bubble — fades in only after Maya finishes */}
        <AnimatePresence>
          {mayaDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute right-4 left-[40%] z-10"
              style={{ bottom: "55%" }}
            >
              <div className="p-3 bg-white rounded-xl shadow-md relative">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45 -z-10" />
                <div className="text-black text-[13px] font-medium font-['Poppins']">
                  <TypewriterText
                    text={
                      screen?.characterDialogue || "Hi, I am Jacob, the baker."
                    }
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Fade */}
        <div className="w-full h-44 absolute bottom-0 mix-blend-multiply bg-gradient-to-b from-white/0 to-black z-10 pointer-events-none" />

        {/* Continue / Start Conversation Button Panel */}
        <AnimatePresence mode="wait">
          {currentDialogueFinished && (
            <motion.div
              key={mayaDialogueIndex === mayaDialogues.length - 1 ? "start-btn" : "continue-btn"}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full px-4 z-20 relative safe-bottom-pad flex items-center gap-3"
            >
              {canGoPrev && (
                <button
                  onClick={() => {
                    hapticLight();
                    onPrev?.();
                  }}
                  className="w-2/5 py-3.5 rounded-xl border border-zinc-300 shadow-sm bg-white text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Prev
                </button>
              )}
              <button
                onClick={() => {
                  hapticLight();
                  if (mayaDialogueIndex < mayaDialogues.length - 1) {
                    handleBubbleClick();
                  } else {
                    onNext();
                  }
                }}
                className={`${
                  canGoPrev ? "w-6/5" : "w-full"
                } py-3.5 bg-gradient-to-r from-amber-200 to-amber-300 rounded-xl shadow-sm text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform border border-[#eec139] flex items-center justify-center gap-1.5`}
              >
                <span>
                  {mayaDialogueIndex < mayaDialogues.length - 1
                    ? "Continue"
                    : "Start Conversation"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
