import React from "react";
import { RotateCcw, Volume2, Loader2 } from "lucide-react";
import ArticleInfoIcon from "./ArticleInfoIcon";
import {
  detectArticles,
  hasSingularPlural,
  hasSeenArticle,
} from "../../../utils/articleUtils";
import "../../../tour/tourStyles.css";

const FlashcardCard = ({
  cardData,
  isFrontCard,
  isFlipped,
  bgColor,
  swipeDirection,
  onSpeak,
  isSpeaking,
  isLoadingAudio,
  isTourMode = false,
  userId, // For user-specific article education
  onShowExplanation,
  chapterNumber,
}) => {
  if (!cardData) return null;

  // Detect all articles in back content (German answer)
  const detectedArticles = detectArticles(cardData?.back_content);
  const hasArticles = detectedArticles.length > 0;
  const showSingularPlural = hasSingularPlural(cardData?.back_content);

  // Show tour hint on the "Click to reveal" text when in tour mode and not flipped
  const showTourHint = isTourMode && isFrontCard && !isFlipped;

  // Render back content with interactive tooltips for unseen articles
  const renderBackContent = () => {
    const text = cardData?.back_content || "";
    if (!hasArticles || !onShowExplanation) return text;

    // Split text but keep delimiters to preserve sentence structure
    const words = text.split(/(\s+|[.,!?;])/);

    // Find the first unseen article to highlight (show only one at a time to avoid clutter)
    let firstUnseenFound = false;

    return (
      <span className="inline-block relative">
        {words.map((part, i) => {
          const lowerPart = part.toLowerCase();
          const isArticle = ["der", "die", "das"].includes(lowerPart);

          if (isArticle) {
            const isUnseen = !hasSeenArticle(lowerPart, userId);

            // Only show tooltip for the FIRST unseen article finding
            if (isUnseen && !firstUnseenFound) {
              firstUnseenFound = true;
              return (
                <span key={i} className="relative inline-block group">
                  {/* Highlighted Word */}
                  <span
                    className="cursor-pointer font-bold text-[#002856] underline decoration-[#002856] decoration-2 drop-shadow-sm transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowExplanation(lowerPart);
                    }}
                  >
                    {part}
                  </span>

                  {/* Floating "Learn" Button/Tooltip */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowExplanation(lowerPart);
                    }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#002856] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-bounce z-10 flex flex-col items-center"
                  >
                    <span>Tap to learn</span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-t-4 border-t-[#002856] border-x-4 border-x-transparent border-b-0 w-0 h-0"></div>
                  </button>
                </span>
              );
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <>
      {/* FRONT FACE - Question */}
      <div
        className="absolute inset-0 w-full h-full rounded-[20px] flex flex-col p-3"
        style={{
          backgroundColor: bgColor,
          boxShadow: "4px 4px 36px 0px rgba(0,0,0,0.1)",
          backfaceVisibility: "hidden",
          transform:
            isFrontCard && isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.5s ease-in-out",
        }}
      >
        <div className="flex items-center justify-between h-8 mb-2">
          <div className="w-8 h-8" />
          {isFrontCard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeak();
              }}
              disabled={isLoadingAudio || isSpeaking}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                isSpeaking
                  ? "bg-[#EDB843] text-[#FFF5DF] animate-pulse"
                  : "bg-[#FFF5DF] text-[#EDB843] hover:bg-[#fbedcf]"
              }`}
              style={{ opacity: swipeDirection ? 0 : 1 }}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-2xl font-medium text-[#002856] text-center leading-[1.2] mb-4 px-2">
            {cardData?.front_content}
          </p>
        </div>
        <div
          className={`flex items-center justify-center gap-2 mb-2 relative ${
            showTourHint ? "tour-hint-highlight" : ""
          }`}
          style={{ opacity: isFrontCard && !swipeDirection ? 1 : 0 }}
        >
          {showTourHint && (
            <div className="tour-button-hint" style={{ top: "-45px" }}>
              👆 Tap to Reveal
            </div>
          )}
          <RotateCcw className="w-3.5 h-3.5 text-[#7b7b7b]" />
          <span className="text-sm text-[#7b7b7b]">Click to reveal answer</span>
        </div>
      </div>
      {/* BACK FACE - Answer (gold) - Only for front card */}
      {isFrontCard && (
        <div
          className="absolute inset-0 w-full h-full rounded-[20px] flex flex-col p-3"
          style={{
            backgroundColor: "#edb843",
            boxShadow: "4px 4px 36px 0px rgba(0,0,0,0.1)",
            backfaceVisibility: "hidden",
            transform: isFlipped ? "rotateY(0deg)" : "rotateY(-180deg)",
            transition: "transform 0.5s ease-in-out",
          }}
        >
          <div className="flex items-center justify-between h-8 mb-2">
            {hasArticles ? (
              <ArticleInfoIcon
                article={detectedArticles[0]}
                userId={userId}
                chapterNumber={chapterNumber}
              />
            ) : (
              <div className="w-8 h-8" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeak();
              }}
              disabled={isLoadingAudio || isSpeaking}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                isSpeaking
                  ? "bg-white text-[#edb843] animate-pulse"
                  : "bg-white/30 text-white hover:bg-white/40"
              }`}
              style={{ opacity: swipeDirection ? 0 : 1 }}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-2xl font-medium text-[#002856] text-center leading-[1.2] mb-4 px-2">
              {renderBackContent()}
            </p>
            {showSingularPlural && (
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-xs text-[#7b7b7b]">Singular, Plural</span>
              </div>
            )}
          </div>
          <div
            className="flex items-center justify-center gap-2 mb-2"
            style={{ opacity: !swipeDirection ? 1 : 0 }}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#7b7b7b]" />
            <span className="text-sm text-[#7b7b7b]">
              Click to see the question
            </span>
          </div>
        </div>
      )}
    </>
  );
};
export default FlashcardCard;
