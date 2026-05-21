import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  hapticHeavy,
  hapticLight,
} from "../../../../../utils/haptics";

export default function DragResultModal({
  dragQuizState,
  onClose,
  onNext,
  correctText,
  incorrectText,
}) {
  const lastDragStateRef = useRef("idle");

  useEffect(() => {
    if (
      dragQuizState === "correct" &&
      lastDragStateRef.current !== "correct"
    ) {
      hapticLight();
    }
    if (
      dragQuizState === "incorrect" &&
      lastDragStateRef.current !== "incorrect"
    ) {
      hapticHeavy();
    }
    lastDragStateRef.current = dragQuizState;
  }, [dragQuizState]);

  return (
    <AnimatePresence>
      {dragQuizState === "incorrect" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-[340px] rounded-3xl p-6 flex flex-col items-center relative shadow-2xl bg-red-50"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                onClose();
              }}
              className="absolute top-4 right-4 p-1 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-red-500">
              <X className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-red-700">Incorrect!</h3>
            <div className="text-center mb-6">
              <p className="text-red-800/80 text-sm">{incorrectText}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                onClose();
              }}
              className="w-full py-3.5 rounded-xl font-semibold text-[15px] text-white active:scale-[0.98] transition-transform bg-red-500 hover:bg-red-600"
            >
              Try again
            </button>
          </motion.div>
        </motion.div>
      )}

      {dragQuizState === "correct" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-[340px] rounded-3xl p-6 flex flex-col items-center relative shadow-2xl bg-green-50"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                onNext();
              }}
              className="absolute top-4 right-4 p-1 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-green-600">
              <Check className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-green-800">
              Excellent!
            </h3>
            <div className="text-center mb-6">
              <p className="text-green-900 font-semibold mb-1">{correctText}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                onNext();
              }}
              className="w-full py-3.5 rounded-xl font-semibold text-[15px] text-white active:scale-[0.98] transition-transform bg-green-700 hover:bg-green-800"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
