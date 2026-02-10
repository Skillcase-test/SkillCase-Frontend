import React from "react";
import { RotateCcw, Volume2, Loader2 } from "lucide-react";

const A2FlashcardCard = ({
  cardData,
  isFrontCard,
  isFlipped,
  bgColor,
  swipeDirection,
  onSpeak,
  isSpeaking,
  isLoadingAudio,
}) => {
  if (!cardData) return null;

  return (
    <>
      {/* FRONT FACE - German Word + English Meaning */}
      <div
        className="absolute inset-0 w-full h-full rounded-[20px] flex flex-col p-3"
        style={{
          backgroundColor: bgColor,
          boxShadow: "4px 4px 36px 0px rgba(0,0,0,0.1)",
          backfaceVisibility: "hidden",
          transform: isFrontCard && isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.5s ease-in-out",
        }}
      >
        <div className="flex items-center justify-between h-8 mb-2">
          <div className="w-8 h-8" />
          {isFrontCard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeak?.(cardData.front_de);
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
          <p className="text-2xl font-bold text-[#002856] text-center leading-[1.2] mb-4 px-2">
            {cardData.front_de}
          </p>
          <p className="text-base text-[#002856]/60 text-center px-2">
            {cardData.front_meaning}
          </p>
        </div>
        <div
          className="flex items-center justify-center gap-2 mb-2"
          style={{ opacity: isFrontCard && !swipeDirection ? 1 : 0 }}
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#7b7b7b]" />
          <span className="text-sm text-[#7b7b7b]">Tap to see example</span>
        </div>
      </div>

      {/* BACK FACE - German Example + English Translation (Gold) */}
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
            <div className="w-8 h-8" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeak?.(cardData.back_de);
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
          <div className="flex-1 flex flex-col items-center justify-center px-2">
            <p className="text-xl font-medium text-[#002856] text-center leading-relaxed mb-4">
              {cardData.back_de}
            </p>
            <p className="text-base text-[#5a4a1a] opacity-90 text-center">
              {cardData.back_en}
            </p>
          </div>
          <div
            className="flex items-center justify-center gap-2 mb-2"
            style={{ opacity: !swipeDirection ? 1 : 0 }}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#5a4a1a]" />
            <span className="text-sm text-[#5a4a1a]">Tap to see word</span>
          </div>
        </div>
      )}
    </>
  );
};

export default A2FlashcardCard;
