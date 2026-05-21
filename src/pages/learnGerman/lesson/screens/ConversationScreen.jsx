import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import WaveformIcon from "./shared/WaveformIcon";
import { hapticMedium, hapticHeavy } from "../../../../utils/haptics";

// Derive the set of correct option indices for a screen.
// Supports both:
//   correctOptionIndex: 0              (single correct answer — legacy)
//   correctOptionIndexes: [0, 1]       (any one of these is accepted as correct)
function getCorrectIndexSet(screen) {
  if (
    Array.isArray(screen?.correctOptionIndexes) &&
    screen.correctOptionIndexes.length > 0
  ) {
    return new Set(screen.correctOptionIndexes);
  }
  if (
    screen?.correctOptionIndex !== undefined &&
    screen.correctOptionIndex !== null
  ) {
    return new Set([screen.correctOptionIndex]);
  }
  return new Set([0]);
}

export default function ConversationScreen({
  screen,
  currentScreenIndex,
  conversationHistory = [],
  conversationSelections = {},
  selectedOption,
  setSelectedOption,
  onCheck,
  onNext,
  onPrev,
  canGoPrev = false,
  speakWord,
  isSpeaking,
  currentlySpeakingText = "",
  showCompletedFallback = false,
  onCompletedFallbackClick,
  floatingHeader = false,
  progressRatio,
  title,
  level,
}) {
  const options = screen?.options || [];
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const correctSet = getCorrectIndexSet(screen);
  const currentSelectionFromHistory =
    conversationSelections[currentScreenIndex];
  const isCurrentTurnCommitted = currentSelectionFromHistory !== undefined;

  // Auto-scroll to bottom when new history or options appear
  useEffect(() => {
    if (bottomRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [screen, conversationHistory, selectedOption]);

  const renderCharacterBubble = (msgScreen, isPast) => {
    const dialogue = msgScreen.characterDialogue || msgScreen.dialogue;
    const meaning = msgScreen.englishMeaning;
    const hasImage = !!msgScreen.characterImage;
    const img = msgScreen.characterImage;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full inline-flex justify-start items-start gap-3 mb-6"
      >
        <div className="w-8 h-8 shrink-0 relative bg-gradient-to-b from-white to-orange-300 rounded-[357px] outline outline-neutral-300 overflow-hidden shadow-sm">
          {hasImage ? (
            <img
              className="w-full h-full object-cover"
              src={img}
              alt="Character"
            />
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
              <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
              <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
              <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
            </svg>
          )}
        </div>
        <div className="p-3 bg-white/20 rounded-tr-xl rounded-bl-xl rounded-br-xl flex justify-center items-center gap-2.5 shadow-md/20 max-w-[75%]">
          <div className="flex flex-col justify-start items-start">
            <div className="flex justify-between items-start gap-4 w-full">
              <div className="text-black text-[15px] font-medium font-['Poppins']">
                {dialogue}
              </div>
              {dialogue && (
                <button
                  onClick={() => {
                    if (!isSpeaking) speakWord(dialogue, true);
                  }}
                  className="text-blue-950 shrink-0 hover:opacity-70 transition-opacity overflow-hidden"
                >
                  <WaveformIcon
                    isPlaying={isSpeaking && currentlySpeakingText === dialogue}
                    className="w-5 h-5"
                  />
                </button>
              )}
            </div>
            {meaning && (
              <div className="text-black/50 text-[13px] font-medium font-['Poppins'] mt-1">
                {meaning}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderUserPastBubble = (msgScreen, msgScreenIndex) => {
    // Show what the user actually selected for this turn, falling back to first correct option
    const actualSelection = conversationSelections[msgScreenIndex];
    const pastCorrectSet = getCorrectIndexSet(msgScreen);
    const displayIdx =
      actualSelection !== undefined
        ? actualSelection
        : Math.min(...pastCorrectSet);
    const reply = msgScreen.options?.[displayIdx];
    if (!reply) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full inline-flex justify-end items-start gap-3 mb-6"
      >
        <div className="p-3 bg-white rounded-tl-xl rounded-bl-xl rounded-br-xl flex justify-center items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-[75%]">
          <div className="text-black text-[15px] font-medium font-['Poppins']">
            {reply}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col relative bg-gradient-to-b from-blue-100 to-sky-100">
      {/* Chat History & Current Turn */}
      <div
        ref={scrollRef}
        className={`w-full flex-1 overflow-y-auto px-4 pb-32 scroll-smooth ${
          floatingHeader ? "pt-24" : "pt-4"
        }`}
      >
        <div className="flex flex-col justify-start items-start w-full max-w-[500px] mx-auto">
          {/* Past History */}
          {conversationHistory.map(
            ({ screen: pastScreen, screenIndex: pastIdx }, idx) => (
              <React.Fragment key={`history-${idx}`}>
                {renderCharacterBubble(pastScreen, true)}
                {renderUserPastBubble(pastScreen, pastIdx)}
              </React.Fragment>
            ),
          )}

          {/* Current Turn Character Bubble */}
          {renderCharacterBubble(screen, false)}

          {!isCurrentTurnCommitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full inline-flex justify-end items-start gap-3 mb-4"
            >
              <div className="w-[75%] p-4 bg-white rounded-tl-xl rounded-bl-xl rounded-br-xl flex flex-col justify-start items-start gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="text-black text-[15px] font-medium font-['Poppins']">
                  {screen.question || "Select the correct reply"}
                </div>

                <div className="w-full flex flex-col gap-2.5">
                  {options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = correctSet.has(idx);

                    let containerClasses =
                      "bg-white outline-zinc-300 hover:bg-gray-50";
                    let textClasses = "text-gray-900";

                    if (isSelected) {
                      if (isCorrect) {
                        containerClasses =
                          "bg-emerald-100/50 outline-green-600";
                        textClasses = "text-green-700";
                      } else {
                        containerClasses = "bg-rose-200/40 outline-red-500";
                        textClasses = "text-red-600";
                      }
                    }

                    return (
                      <motion.button
                        key={idx}
                        onClick={() => {
                          // Lock out once a correct answer has been chosen
                          if (
                            selectedOption !== null &&
                            correctSet.has(selectedOption)
                          )
                            return;

                          setSelectedOption(idx);

                          if (correctSet.has(idx)) {
                            hapticMedium();
                            setTimeout(() => {
                              onNext(idx);
                            }, 1000);
                          } else {
                            hapticHeavy();
                            setTimeout(() => {
                              setSelectedOption(null);
                            }, 600);
                          }
                        }}
                        animate={{
                          x: isSelected && !isCorrect ? [-5, 5, -5, 5, 0] : 0,
                          scale: isSelected && isCorrect ? 1.02 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                        className={`w-full px-3 py-3 rounded-lg outline-1 outline-offset-[-1px] inline-flex justify-between items-center transition-all ${containerClasses}`}
                      >
                        <div
                          className={`flex-1 text-left text-[15px] font-medium font-['Inter'] leading-snug ${textClasses}`}
                        >
                          {option}
                        </div>
                        {isSelected && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 ml-2 shrink-0" />
                        )}
                        {isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-red-500 ml-2 shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            renderUserPastBubble(screen, currentScreenIndex)
          )}

          {showCompletedFallback && (
            <div className="w-full mt-2 mb-4 flex items-center gap-3 justify-end">
              {canGoPrev && (
                <button
                  onClick={onPrev}
                  className="w-2/5 py-3.5 rounded-xl border border-zinc-300 shadow-sm bg-white text-blue-950 font-semibold text-[15px] flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Prev
                </button>
              )}
              <button
                onClick={onCompletedFallbackClick}
                className={`${
                  canGoPrev ? "w-6/5" : "w-full"
                } py-3.5 bg-gradient-to-r from-amber-200 to-amber-400 text-blue-950 rounded-xl font-semibold text-[15px] border border-[#eec139] shadow-sm flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-[0.98] transition-transform`}
              >
                Completed
              </button>
            </div>
          )}
          <div ref={bottomRef} className="h-4 w-full shrink-0" />
        </div>
      </div>
    </div>
  );
}
