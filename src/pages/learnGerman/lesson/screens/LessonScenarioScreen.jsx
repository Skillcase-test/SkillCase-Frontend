import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import { useEffect, useState } from "react";
import ProgressBar from "./shared/ProgressBar";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import { resolveAssetUrl } from "../../../../utils/imageUtils";

export default function LessonScenarioScreen({
  screen,
  progressRatio,
  title,
  level,
  showTapGuide = false,
  onTapDetected,
  onDialogueDone,
  guidedTapNonce = 0,
  onGuidedCompleteTap,
}) {
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const dialogues = screen.dialogues || [];

  const handleTap = (e) => {
    if (showTapGuide) {
      onTapDetected?.({
        hasMoreDialogue: dialogueIndex < dialogues.length - 1,
      });
    }
    if (dialogueIndex < dialogues.length - 1) {
      e.stopPropagation();
      setDialogueIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (!guidedTapNonce) return;
    const hasMoreDialogue = dialogueIndex < dialogues.length - 1;
    onTapDetected?.({ hasMoreDialogue });
    if (hasMoreDialogue) {
      setDialogueIndex((prev) => prev + 1);
    } else {
      onGuidedCompleteTap?.();
    }
  }, [guidedTapNonce]);

  return (
    <motion.div
      key="lesson-scenario"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full lg-screen-height flex flex-col relative"
      onClick={handleTap}
    >
      <ProgressBar progressRatio={progressRatio} title={title} level={level} />
      <div className="flex-1 w-full flex flex-col p-4 gap-3 overflow-hidden">
        <div className="w-full flex-1 relative min-h-0">
          {screen?.image && !imgError && (
            <motion.img
              layoutId="lessonBg"
              src={resolveAssetUrl(screen.image)}
              className="w-full h-full object-cover rounded-2xl shadow-md"
              transition={{
                layout: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              }}
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-black/5 rounded-2xl relative flex items-center shadow-inner shrink-0 p-4 min-h-[140px]"
        >
          <motion.img
            layoutId="mayaMascot"
            src={screen.mayaImage ? resolveAssetUrl(screen.mayaImage) : mayaLooking}
            className="absolute -left-2 bottom-0 w-[110px] sm:w-32 h-auto object-contain z-20"
            transition={{
              layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            }}
            style={{ transformOrigin: "bottom center" }}
          />
          <div className="ml-[95px] sm:ml-[110px] w-full relative z-10">
            <motion.div
              layoutId="dialogBubble"
              className="bg-white p-4 rounded-xl shadow-sm relative w-full flex items-center"
              transition={{
                layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45" />
              <AnimatePresence mode="wait">
                <MayaDialogueBubble
                  text={dialogues[dialogueIndex] || "..."}
                  onDone={onDialogueDone}
                />
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* Continue Button */}
        <div className="w-full shrink-0 z-20 mt-1">
          <button
            id={showTapGuide ? "lg-tap-indicator" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              const hasMoreDialogue = dialogueIndex < dialogues.length - 1;
              if (showTapGuide) {
                onTapDetected?.({ hasMoreDialogue });
              }
              if (hasMoreDialogue) {
                setDialogueIndex((prev) => prev + 1);
              } else {
                onGuidedCompleteTap?.();
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-200 to-amber-300 rounded-xl shadow-sm text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform border border-[#eec139] flex items-center justify-center gap-1.5"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
