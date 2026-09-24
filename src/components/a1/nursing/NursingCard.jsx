import React, { useState } from "react";
import { RotateCcw, Volume2, Loader2, FileText } from "lucide-react";
import ArticleText from "./ArticleText";

// Renders one authored nursing card (word/pattern/phrase/emergency/document/
// spelling) with the same flip interaction as the A1 flashcard deck.
export default function NursingCard({
  cardData,
  isFrontCard,
  isFlipped,
  swipeDirection,
  onSpeak,
  isSpeaking,
  isLoadingAudio,
  onViewDocument,
}) {
  const [activeSpeech, setActiveSpeech] = useState(null);
  if (!cardData) return null;

  const { type, front = {}, back = {}, audio = {}, word, spelling, document: doc } =
    cardData;
  const hasImage = !!cardData.image_url;

  const speak = (audioNode, e, id) => {
    e.stopPropagation();
    if (!audioNode?.text) return;
    setActiveSpeech(id);
    onSpeak?.(audioNode.text, audioNode.lang || "de-DE");
  };

  const speakerButton = (audioNode, id, dark = false) => {
    if (!audioNode?.text) return null;
    return (
      <button
        onClick={(e) => speak(audioNode, e, id)}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={isLoadingAudio || isSpeaking}
        className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ${
          isSpeaking && activeSpeech === id
            ? "bg-[#edb843] text-white animate-pulse scale-105 shadow-md border-transparent"
            : dark
              ? "bg-black/5 text-[#3a2806] hover:bg-black/10 border-[1.5px] border-black/10"
              : "bg-[#f5f7fa] text-[#002856] hover:bg-[#ebf0f5] border-[1.5px] border-[#e4e9f0]"
        }`}
      >
        {isLoadingAudio && activeSpeech === id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Volume2 className="w-[18px] h-[18px] ml-[2px]" />
        )}
      </button>
    );
  };

  // Patterns highlight the swap-in part: "Ich bin [Priya], Ihre Pflegekraft."
  const renderGerman = (text) => {
    const pattern = front.pattern_de || text || "";
    const parts = pattern.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) =>
      part.startsWith("[") ? (
        <span key={i} className="bg-[#ffefc4] text-[#002856] px-1 rounded">
          {part.slice(1, -1)}
        </span>
      ) : (
        <ArticleText key={i} text={part} />
      ),
    );
  };

  const speakerInitials = (front.speaker_name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const frontTag =
    front.label ||
    (type === "spelling" && spelling?.letters
      ? spelling.letters.map((l) => l.letter).join(" · ")
      : null);

  return (
    <>
      {/* FRONT — image over German line */}
      <div
        className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden flex flex-col bg-white select-none"
        style={{
          boxShadow: isFrontCard ? "0 10px 25px -4px rgba(0,0,0,0.12)" : "none",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          willChange: "transform",
          transform:
            isFrontCard && isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.5s ease-in-out",
          ...(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
            ? { transition: "none" }
            : {}),
          pointerEvents: isFrontCard ? (isFlipped ? "none" : "auto") : "none",
          zIndex: isFlipped ? 1 : 2,
        }}
      >
        <div className="w-full aspect-[3/2] relative overflow-hidden bg-[#f3f6fb] flex items-center justify-center pointer-events-none">
          {hasImage ? (
            <img
              src={cardData.image_url}
              alt={front.german || ""}
              loading="eager"
              decoding="async"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          ) : speakerInitials ? (
            <div className="flex flex-col items-center gap-2">
              <span className="w-[72px] h-[72px] rounded-full bg-[#E4EFFF] text-[#002856] flex items-center justify-center text-[22px] font-semibold shadow-[inset_0_0_0_2px_#fff]">
                {speakerInitials}
              </span>
              {front.speaker_name && (
                <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#535862]">
                  {front.speaker_name}
                </span>
              )}
            </div>
          ) : (
            <FileText className="w-12 h-12 text-gray-300" />
          )}
          {frontTag && (
            <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate bg-[#002856]/80 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
              {frontTag}
            </span>
          )}
        </div>

        <div className="flex-1 w-full flex flex-col items-center justify-center px-4 pb-9 text-center">
          {front.speaker_name && (
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {front.speaker_name}
            </span>
          )}
          <p className="text-[20px] font-extrabold text-[#002856] tracking-tight mb-3 leading-tight">
            {renderGerman(front.german)}
          </p>
          {speakerButton(audio.front, "front")}
        </div>

        <div
          className="absolute bottom-3.5 left-0 right-0 flex items-center justify-center gap-2 transition-opacity duration-300"
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

      {/* BACK — gold dictionary face */}
      {isFrontCard && (
        <div
          className="absolute inset-0 w-full h-full rounded-[24px] flex flex-col items-center justify-center p-4 overflow-hidden select-none"
          style={{
            backgroundColor: "#ebaf44",
            boxShadow: "0 10px 25px -4px rgba(0,0,0,0.12)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            willChange: "transform",
            transform: isFlipped ? "rotateY(0deg)" : "rotateY(-180deg)",
            transition: "transform 0.5s ease-in-out",
            ...(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
              ? { transition: "none" }
              : {}),
            pointerEvents: isFlipped ? "auto" : "none",
            zIndex: isFlipped ? 2 : 1,
          }}
        >
          <span className="text-[10px] font-black text-[#5a4a1a]/60 uppercase tracking-[0.2em] mb-1">
            Meaning
          </span>
          <p className="text-[22px] font-extrabold text-[#3a2806] text-center leading-tight mb-1 tracking-tight">
            {back.meaning_en}
          </p>
          {word?.false_friend && (
            <span className="text-[10px] font-bold text-[#8a2c0b] bg-white/40 px-2 py-0.5 rounded-full mb-1">
              Not what it sounds like
            </span>
          )}

          <div className="w-[60px] h-[2px] bg-[#664b0f]/15 rounded-full my-2" />

          {back.label && (
            <span className="text-[10px] font-black text-[#5a4a1a]/60 uppercase tracking-[0.2em] mb-1">
              {back.label}
            </span>
          )}
          <p className="text-[15px] font-bold text-[#3a2806] text-center italic leading-snug">
            {back.german}
          </p>
          {back.english && (
            <p className="text-[12px] text-[#5a4a1a] text-center leading-snug mt-1 mb-2">
              {back.english}
            </p>
          )}
          {speakerButton(audio.back, "back", true)}

          {back.note && (
            <p className="text-[11px] text-[#5a4a1a]/80 text-center leading-snug mt-2 px-1">
              {back.note}
            </p>
          )}
          {doc && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDocument?.(doc);
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="mt-2 flex items-center gap-1.5 bg-white/50 text-[#3a2806] text-[11px] font-bold px-3 py-1.5 rounded-full"
            >
              <FileText className="w-3.5 h-3.5" />
              View document
            </button>
          )}

          <div
            className="flex items-center justify-center gap-2 transition-opacity duration-300 absolute bottom-4"
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
