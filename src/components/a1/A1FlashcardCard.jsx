import React, { useState, useEffect } from "react";
import { RotateCcw, Volume2, Loader2 } from "lucide-react";

export default function A1FlashcardCard({
  cardData,
  isFrontCard,
  isFlipped,
  bgColor,
  swipeDirection,
  onSpeak,
  isSpeaking,
  isLoadingAudio,
}) {
  const [activeSpeech, setActiveSpeech] = useState(null);
  const hasImage = !!cardData?.front_image_url;

  if (!cardData) return null;

  const callSpeak = (text, lang, e, id) => {
    e.stopPropagation();
    setActiveSpeech(id);
    onSpeak?.(text, lang);
  };

  return (
    <>
      {/* FRONT FACE - image layout when present, centered text layout when missing */}
      <div
        className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden flex flex-col bg-white"
        style={{
          boxShadow: isFrontCard ? "0 10px 25px -4px rgba(0,0,0,0.12)" : "none",
          backfaceVisibility: "hidden",
          transform:
            isFrontCard && isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.5s ease-in-out",
        }}
      >
        {hasImage ? (
          <>
            {/* Top Half: Image Container */}
            <div className="h-1/2 w-full relative overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={cardData.front_image_url}
                alt={cardData.word_de}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Half: German Word */}
            <div className="h-1/2 w-full flex flex-col items-center justify-center px-4 text-center">
              <p className="text-[24px] font-extrabold text-[#002856] tracking-tight mb-4 leading-tight">
                {cardData.word_de}
              </p>
              <button
                onClick={(e) => callSpeak(cardData.word_de, "de-DE", e, "word")}
                disabled={isLoadingAudio || isSpeaking}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 mb-5 ${
                  isSpeaking && activeSpeech === "word"
                    ? "bg-[#edb843] text-white animate-pulse scale-105 shadow-md border-transparent"
                    : "bg-[#f5f7fa] text-[#002856] hover:bg-[#ebf0f5] border-[1.5px] border-[#e4e9f0]"
                }`}
              >
                {isLoadingAudio && activeSpeech === "word" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-[18px] h-[18px] ml-[2px]" />
                )}
              </button>

              {/* Footer Front */}
              <div
                className="flex items-center justify-center gap-2 transition-opacity duration-300"
                style={{
                  opacity: !swipeDirection && isFrontCard ? 0.4 : 0,
                  pointerEvents: "none",
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#002856]" />
                <span className="text-[10px] font-bold text-[#002856] uppercase tracking-[0.1em]">
                  Tap to flip
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center px-6 text-center">
            <p className="text-[32px] font-extrabold text-[#002856] tracking-tight mb-5 leading-tight">
              {cardData.word_de}
            </p>
            <button
              onClick={(e) => callSpeak(cardData.word_de, "de-DE", e, "word")}
              disabled={isLoadingAudio || isSpeaking}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 mb-6 ${
                isSpeaking && activeSpeech === "word"
                  ? "bg-[#edb843] text-white animate-pulse scale-105 shadow-md border-transparent"
                  : "bg-[#f5f7fa] text-[#002856] hover:bg-[#ebf0f5] border-[1.5px] border-[#e4e9f0]"
              }`}
            >
              {isLoadingAudio && activeSpeech === "word" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-[18px] h-[18px] ml-[2px]" />
              )}
            </button>
            <div
              className="flex items-center justify-center gap-2 transition-opacity duration-300"
              style={{
                opacity: !swipeDirection && isFrontCard ? 0.4 : 0,
                pointerEvents: "none",
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#002856]" />
              <span className="text-[10px] font-bold text-[#002856] uppercase tracking-[0.1em]">
                Tap to flip
              </span>
            </div>
          </div>
        )}
      </div>

      {/* BACK FACE - Golden Dictionary Style */}
      {isFrontCard && (
        <div
          className="absolute inset-0 w-full h-full rounded-[24px] flex flex-col items-center justify-center p-4 overflow-hidden"
          style={{
            backgroundColor: "#ebaf44",
            boxShadow: "0 10px 25px -4px rgba(0,0,0,0.12)",
            backfaceVisibility: "hidden",
            transform: isFlipped ? "rotateY(0deg)" : "rotateY(-180deg)",
            transition: "transform 0.5s ease-in-out",
          }}
        >
          {/* Meaning Section */}
          <span className="text-[10px] font-black text-[#5a4a1a]/60 uppercase tracking-[0.2em] mb-2">
            Meaning
          </span>
          <p className="text-[24px] font-extrabold text-[#3a2806] text-center leading-none mb-3 tracking-tight">
            {cardData.meaning_en}
          </p>
          <button
            onClick={(e) =>
              callSpeak(cardData.meaning_en, "en-US", e, "meaning")
            }
            disabled={isLoadingAudio || isSpeaking}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 mb-4 ${
              isSpeaking && activeSpeech === "meaning"
                ? "bg-white text-[#ebaf44] animate-pulse scale-105 shadow-md border-transparent"
                : "bg-black/5 text-[#3a2806] hover:bg-black/10 border-[1.5px] border-black/10"
            }`}
          >
            {isLoadingAudio && activeSpeech === "meaning" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-[18px] h-[18px] ml-[2px]" />
            )}
          </button>

          {/* Divider */}
          <div className="w-[60px] h-[2px] bg-[#664b0f]/15 rounded-full mb-4" />

          {/* Example Section */}
          <span className="text-[10px] font-black text-[#5a4a1a]/60 uppercase tracking-[0.2em] mb-2">
            Example
          </span>
          <p className="text-[15px] font-bold text-[#3a2806] text-center italic leading-snug mb-3">
            "{cardData.sample_sentence_de}"
          </p>
          <button
            onClick={(e) =>
              callSpeak(cardData.sample_sentence_de, "de-DE", e, "sentence")
            }
            disabled={isLoadingAudio || isSpeaking}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 mb-5 ${
              isSpeaking && activeSpeech === "sentence"
                ? "bg-white text-[#ebaf44] animate-pulse scale-105 shadow-md border-transparent"
                : "bg-black/5 text-[#3a2806] hover:bg-black/10 border-[1.5px] border-black/10"
            }`}
          >
            {isLoadingAudio && activeSpeech === "sentence" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-[18px] h-[18px] ml-[2px]" />
            )}
          </button>

          {/* Footer Back */}
          <div
            className="flex items-center justify-center gap-2 transition-opacity duration-300 absolute bottom-5"
            style={{
              opacity: !swipeDirection && isFrontCard ? 0.5 : 0,
              pointerEvents: "none",
            }}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#664b0f]" />
            <span className="text-[10px] font-bold text-[#664b0f] uppercase tracking-[0.1em]">
              Tap for word
            </span>
          </div>
        </div>
      )}
    </>
  );
}
