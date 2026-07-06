import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import mayaThumbsup from "../../../../assets/onboarding/mayaThumbsup.webp";
import ProgressBar from "./shared/ProgressBar";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import { resolveAssetUrl } from "../../../../utils/imageUtils";

export default function IntroScreen({
  screen,
  title,
  progressRatio,
  level,
  showTapGuide = false,
  onDialogueDone,
  onNext,
}) {
  const bgImage = screen.image ? resolveAssetUrl(screen.image) : lesson1Bg;
  const dialogueText =
    screen.dialogue ||
    "You will learn about food items and how to pronounce them. Lets start.";
  const levelText = screen.level || "Level 1";

  return (
    <motion.div
      key="screen0"
      className="w-full flex-1 flex flex-col relative overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProgressBar progressRatio={progressRatio} title={title} level={level} />
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-0">
        <motion.img
          layoutId="lessonBg"
          src={bgImage}
          className="absolute inset-0 w-full h-full object-cover z-0"
          transition={{ layout: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
        />
        <div className="w-full max-w-[300px] py-5 bg-black/50 rounded-[20px] relative shadow-2xl z-10 flex flex-col items-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2 w-full px-4"
          >
            <span className="text-white/90 text-base font-normal">
              {levelText}
            </span>
            <h1 className="text-white text-2xl font-bold text-center">
              {title || "The Bakery Window"}
            </h1>
          </motion.div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative w-[85%] mt-10 ml-8 z-20 top-6"
          >
            <motion.div
              layoutId="dialogBubble"
              className="bg-white rounded-xl px-4 py-2 shadow-lg relative"
              transition={{
                layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              <MayaDialogueBubble text={dialogueText} onDone={onDialogueDone} />
              <div className="absolute -bottom-1 left-[110px] -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
            </motion.div>
          </motion.div>
          <motion.img
            layoutId="mayaMascot"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 21, opacity: 1 }}
            transition={{ delay: 0.3 }}
            src={mayaThumbsup}
            className="w-42 h-auto object-contain z-10 mt-2"
            style={{ transformOrigin: "bottom center" }}
          />
          {/* Continue Button */}
          <div className="w-full px-4 mt-4 z-20">
            <button
              id={showTapGuide ? "lg-tap-indicator" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onNext?.();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-200 to-amber-300 rounded-xl shadow-sm text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform border border-[#eec139] flex items-center justify-center gap-1.5"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
