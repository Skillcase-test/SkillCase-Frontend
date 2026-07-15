import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProgressBar from "./shared/ProgressBar";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";

// screen.leftItems: [{ id, label, letter, matchId }]
// screen.rightItems: [{ id, label }]
export default function MatchFollowingScreen({
  screen,
  selectedLeft,
  selectedRight,
  wrongPair,
  matchedPairs,
  recentMatch,
  onLeftClick,
  onRightClick,
  onNext,
  onPrev,
  canGoPrev = false,
  progressRatio,
  title,
  level,
}) {
  const leftItems = screen?.leftItems || [];
  const rightItems = screen?.rightItems || [];

  return (
    <motion.div
      key="vocab-quiz-layout-match"
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
          <MayaDialogueBubble text={screen?.dialogue || "Match the following"} />
        </motion.div>
      </div>

      <motion.div
        className="flex-1 w-full bg-white rounded-t-[32px] p-5 flex flex-col justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.08)] relative z-20 safe-bottom-pad"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", bounce: 0.3 }}
      >
        <motion.div
          key="match-following"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full flex-1 min-h-0 flex flex-col gap-3"
        >
          {leftItems.map((leftItem, idx) => {
            const rightItem = rightItems[idx];
            if (!rightItem) return null;

            const isLeftRecentMatch = recentMatch?.left === leftItem.id;
            const isLeftMatched =
              matchedPairs.includes(leftItem.id) && !isLeftRecentMatch;
            const isLeftSelected = selectedLeft === leftItem.id;
            const isLeftWrong = wrongPair?.left === leftItem.id;

            const correspondingLeftForRight = leftItems.find(
              (l) => l.matchId === rightItem.id,
            );
            const isRightRecentMatch = recentMatch?.right === rightItem.id;
            const isRightMatched =
              correspondingLeftForRight &&
              matchedPairs.includes(correspondingLeftForRight.id) &&
              !isRightRecentMatch;
            const isRightSelected = selectedRight === rightItem.id;
            const isRightWrong = wrongPair?.right === rightItem.id;

            return (
              <div
                key={idx}
                className="w-full inline-flex justify-start items-start gap-3 sm:gap-4"
              >
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLeftClick(leftItem.id);
                  }}
                  animate={{
                    rotate: isLeftWrong ? [-4, 4, -4, 4, 0] : 0,
                    scale: isLeftRecentMatch ? 1.02 : 1,
                    opacity: isLeftMatched ? 0.4 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`flex-1 px-3 py-3 rounded-lg outline-1 outline-offset-[-1px] flex justify-start items-center gap-2 sm:gap-4 transition-colors duration-300
                    ${
                      isLeftRecentMatch
                        ? "bg-emerald-100/50 outline-[2px] outline-green-700 shadow-md z-10"
                        : isLeftMatched
                        ? "bg-emerald-100/50 outline-green-700 cursor-default"
                        : isLeftWrong
                        ? "bg-rose-100 outline-red-500"
                        : isLeftSelected
                        ? "bg-blue-50 outline-blue-600"
                        : "bg-white outline-zinc-300 hover:bg-gray-50"
                    }`}
                >
                  <div className="flex-1 flex justify-start items-center gap-2">
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 relative rounded-sm flex items-center justify-center font-medium text-xs sm:text-sm transition-colors duration-300
                      ${
                        isLeftRecentMatch || isLeftMatched
                          ? "bg-green-700/10 text-green-700/80"
                          : isLeftWrong
                          ? "bg-red-500/10 text-red-500/80"
                          : isLeftSelected
                          ? "bg-blue-600/10 text-blue-600/80"
                          : "bg-black/5 text-gray-500"
                      }`}
                    >
                      {leftItem.letter}
                    </div>
                    <div
                      className={`flex-1 text-left font-medium text-[13px] sm:text-[15px] leading-tight transition-colors duration-300
                      ${
                        isLeftRecentMatch || isLeftMatched
                          ? "text-green-700"
                          : isLeftWrong
                          ? "text-red-500"
                          : isLeftSelected
                          ? "text-blue-600"
                          : "text-gray-900"
                      }`}
                    >
                      {leftItem.label}
                    </div>
                  </div>
                  {(isLeftRecentMatch || isLeftMatched || isLeftWrong) && (
                    <div
                      className="w-2 h-2 rounded-full hidden sm:block shrink-0 bg-current opacity-80 transition-colors duration-300"
                      style={{
                        color:
                          isLeftRecentMatch || isLeftMatched
                            ? "#15803d"
                            : "#ef4444",
                      }}
                    />
                  )}
                </motion.button>

                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRightClick(rightItem.id);
                  }}
                  animate={{
                    rotate: isRightWrong ? [-4, 4, -4, 4, 0] : 0,
                    scale: isRightRecentMatch ? 1.02 : 1,
                    opacity: isRightMatched ? 0.4 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`flex-1 px-3 py-7 h-10 sm:h-12 rounded-lg outline-1 outline-offset-[-1px] flex justify-start items-center gap-2 sm:gap-4 transition-colors duration-300
                    ${
                      isRightRecentMatch
                        ? "bg-emerald-100/50 outline-[2px] outline-green-700 shadow-md z-10"
                        : isRightMatched
                        ? "bg-emerald-100/50 outline-green-700 cursor-default"
                        : isRightWrong
                        ? "bg-rose-100 outline-red-500"
                        : isRightSelected
                        ? "bg-blue-50 outline-blue-600"
                        : "bg-white outline-zinc-300 hover:bg-gray-50"
                    }`}
                >
                  <div className="flex-1 flex justify-start items-center gap-2 sm:gap-4">
                    <div
                      className={`flex-1 text-left font-medium text-[13px] sm:text-[15px] leading-tight transition-colors duration-300
                      ${
                        isRightRecentMatch || isRightMatched
                          ? "text-green-700"
                          : isRightWrong
                          ? "text-red-500"
                          : isRightSelected
                          ? "text-blue-600"
                          : "text-gray-900"
                      }`}
                    >
                      {rightItem.label}
                    </div>
                  </div>
                  {(isRightRecentMatch || isRightMatched || isRightWrong) && (
                    <div
                      className="w-2 h-2 rounded-full hidden sm:block shrink-0 bg-current opacity-80 transition-colors duration-300"
                      style={{
                        color:
                          isRightRecentMatch || isRightMatched
                            ? "#15803d"
                            : "#ef4444",
                      }}
                    />
                  )}
                </motion.button>
              </div>
            );
          })}
        </motion.div>

        <div className="w-full pt-4 flex items-center gap-3">
          {canGoPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev?.();
              }}
              className="w-2/5 py-3.5 rounded-xl border border-zinc-300 bg-white text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-1 shadow-sm"
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
            disabled={matchedPairs.length < leftItems.length}
            className={`${
              canGoPrev ? "w-6/5" : "w-full"
            } py-3.5 rounded-xl font-semibold text-[15px] transition-all flex items-center justify-center gap-1.5 ${
              matchedPairs.length === leftItems.length
                ? "bg-gradient-to-r from-amber-200 to-amber-400 text-blue-950 shadow-sm active:scale-[0.98] border border-[#eec139]"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
