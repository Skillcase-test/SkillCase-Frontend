import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import ProgressBar from "./shared/ProgressBar";
import mayaThumbsup from "../../../../assets/onboarding/mayaThumbsup.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import TapIndicator from "./shared/TapIndicator";

// screen.dialogues: string[] — Maya speaks these one by one as user taps
// Tapping through all dialogues advances to the level-complete modal
export default function OutroScreen({ screen, progressRatio, title, level }) {
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const dialogues = screen?.dialogues || ["Great job! See you next time."];

  const handleTap = (e) => {
    if (dialogueIndex < dialogues.length - 1) {
      e.stopPropagation();
      setDialogueIndex((prev) => prev + 1);
    }
    // If on the last dialogue, the parent onClick handler fires (handleNext → level complete)
  };

  return (
    <motion.div
      key="screen-outro"
      className="w-full flex-1 flex flex-col relative bg-gradient-to-b from-blue-100 to-sky-100 overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      onClick={handleTap}
    >
      <ProgressBar progressRatio={1} title={title} level={level} />

      {/* Maya fills the lower half of the screen */}
      <div className="flex-1 flex flex-col items-center justify-end pb-0 relative">
        {/* Dialogue bubble sits above Maya */}
        <div className="w-full px-6 mb-6 flex justify-center">
          <div className="relative bg-white rounded-2xl shadow-lg px-5 py-4 max-w-[280px] text-center">
              <AnimatePresence mode="wait">
              <motion.div
                key={dialogueIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <MayaDialogueBubble text={dialogues[dialogueIndex]} />
              </motion.div>
              </AnimatePresence>
            {/* triangle pointer pointing down toward Maya */}
            <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-sm" />
          </div>
        </div>

        {/* Tap hint */}
        {dialogueIndex < dialogues.length - 1 && (
          <p className="text-blue-900/40 text-xs font-medium mb-4 tracking-wide">
            tap to continue
          </p>
        )}

        {/* Maya mascot — large, standing proud */}
        <motion.img
          layoutId="mayaMascot"
          src={mayaThumbsup}
          className="w-56 object-contain"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4, delay: 0.15 }}
        />
      </div>
      <TapIndicator />
    </motion.div>
  );
}
