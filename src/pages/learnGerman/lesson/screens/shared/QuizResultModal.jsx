import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { hapticLight } from "../../../../../utils/haptics";

// correctAnswer = the correct option text from the screen config
// selectedOptionLabel = what the user actually selected (could be correct or wrong)
export default function QuizResultModal({
  quizState,
  onClose,
  onNext,
  correctAnswer,
  selectedOptionLabel,
}) {
  const isCorrect = quizState === "correct";
  const lastQuizStateRef = useRef("idle");

  useEffect(() => {
    if (quizState === "correct" && lastQuizStateRef.current !== "correct") {
      hapticLight();
    }
    lastQuizStateRef.current = quizState;
  }, [quizState]);

  // Modal shows the selected answer in context:
  //   correct  → "[selectedOption] is the right answer"
  //   incorrect → "[selectedOption] is not the right answer"
  const selectedLabel = selectedOptionLabel || correctAnswer || "";

  return (
    <AnimatePresence>
      {quizState !== "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className={`w-full max-w-[340px] rounded-3xl p-6 flex flex-col items-center relative shadow-2xl ${
              isCorrect ? "bg-green-50" : "bg-red-50"
            }`}
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

            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                isCorrect ? "bg-green-600" : "bg-red-500"
              }`}
            >
              {isCorrect ? (
                <Check className="w-7 h-7 text-white" />
              ) : (
                <X className="w-7 h-7 text-white" />
              )}
            </div>

            <h3
              className={`text-2xl font-bold mb-3 ${
                isCorrect ? "text-green-800" : "text-red-700"
              }`}
            >
              {isCorrect ? "Correct!" : "Incorrect!"}
            </h3>

            <div className="text-center mb-6">
              {isCorrect ? (
                <>
                  <p className={`font-semibold mb-1 text-green-900`}>
                    {correctAnswer}
                  </p>
                  <p className="text-green-800/80 text-sm">
                    {selectedLabel} is the right answer
                  </p>
                </>
              ) : (
                <p className="text-red-800/80 text-sm">
                  {selectedLabel} is not the right answer
                </p>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                if (isCorrect) {
                  onNext();
                } else {
                  onClose();
                }
              }}
              className={`w-full py-3.5 rounded-xl font-semibold text-[15px] text-white active:scale-[0.98] transition-transform ${
                isCorrect
                  ? "bg-green-700 hover:bg-green-800"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isCorrect ? "Next" : "Try again"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
