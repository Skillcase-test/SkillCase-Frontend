import React, { useEffect, useState, useRef } from "react";
import { Volume2, Rabbit, Languages, Square } from "lucide-react";
import { hapticMedium } from "../../../utils/haptics";

export default function NewsReelCard({
  article,
  onSpeak,
  onSpeakSlow,
  onStop,
  isSpeaking,
  isLoadingAudio,
  activeSpeed,
  isActive,
}) {
  const [language, setLanguage] = useState("de");
  const textTouchStartPos = useRef({ y: 0, atTop: false, atBottom: false });

  const handleTouchStart = (e) => {
    const target = e.currentTarget;
    textTouchStartPos.current = {
      y: e.touches[0].clientY,
      atTop: target.scrollTop <= 1,
      atBottom:
        target.scrollHeight - target.scrollTop <= target.clientHeight + 2,
    };
  };

  const handleTouchEnd = (e) => {
    const target = e.currentTarget;
    const isScrollable = target.scrollHeight > target.clientHeight + 2;
    if (!isScrollable) return;

    const endY = e.changedTouches[0].clientY;
    const deltaY = textTouchStartPos.current.y - endY;

    if (deltaY > 0 && textTouchStartPos.current.atBottom) return;
    if (deltaY < 0 && textTouchStartPos.current.atTop) return;

    e.stopPropagation();
  };

  const handleWheel = (e) => {
    const target = e.currentTarget;
    const isScrollable = target.scrollHeight > target.clientHeight + 2;
    if (!isScrollable) return;

    const atTop = target.scrollTop <= 1;
    const atBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 2;

    if (e.deltaY > 0 && atBottom) return;
    if (e.deltaY < 0 && atTop) return;

    e.stopPropagation();
  };

  useEffect(() => {
    if (isActive) {
      setLanguage("de");
    }
  }, [isActive]);

  if (!article) return null;

  const contentItem = language === "en" ? article.english : article.german;
  const title = contentItem?.title || "";
  const summary = contentItem?.content || contentItem?.summary || "";

  return (
    <article className="h-full w-full rounded-[24px] bg-white border border-[#d8e0ed] shadow-[0_16px_36px_rgba(13,38,76,0.12)] overflow-hidden grid grid-rows-[32%_1fr]">
      <div className="bg-gray-100 overflow-hidden relative">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.classList.add(
                "bg-gradient-to-br",
                "from-[#d7e4f8]",
                "to-[#edf3ff]",
              );
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#d7e4f8] to-[#edf3ff]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />

        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={() => {
              hapticMedium();
              setLanguage((l) => (l === "de" ? "en" : "de"));
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/88 text-[#002856] border border-[#dbe3f0] text-xs font-semibold shadow-sm transition-all duration-200 active:scale-95 hover:bg-white hover:shadow-md"
          >
            <Languages className="w-3.5 h-3.5" />
            {language === "de" ? "German" : "English"}
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-6 flex flex-col min-h-0">
        <div
          key={`${article.id}-${language}`}
          className="animate-news-lang-swap flex-1 min-h-0 overflow-y-auto pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <div className="flex items-center justify-between mb-2 text-[0.65rem] text-[#6b7280] font-bold uppercase tracking-wide">
            <span>{article.sourceName || "Skillcase News"}</span>
            <span>
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
            </span>
          </div>

          <h2 className="text-lg md:text-xl font-bold leading-[1.3] text-[#121a28] mb-3">
            {title}
          </h2>
          <p className="text-sm md:text-md leading-[1.6] text-[#3f4b5d] whitespace-pre-wrap">
            {summary}
          </p>
        </div>

        <div className="mt-auto space-y-2 pt-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLoadingAudio}
              onClick={() => {
                hapticMedium();
                isSpeaking && activeSpeed === "normal"
                  ? onStop()
                  : onSpeak(title, summary, language);
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl  text-[0.82rem] font-semibold disabled:opacity-60 transition-all duration-200 active:scale-95 shadow-md ${isSpeaking && activeSpeed === "normal" ? "bg-[#002856] text-white" : "bg-[#bbd4f0] text-[#002856]"}`}
            >
              {isSpeaking && activeSpeed === "normal" ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> Stop
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" /> Fast
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isLoadingAudio}
              onClick={() => {
                hapticMedium();
                isSpeaking && activeSpeed === "slow"
                  ? onStop()
                  : onSpeakSlow(title, summary, language);
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#d7e3f8] text-[0.82rem] font-semibold disabled:opacity-60 transition-all duration-200 active:scale-95 shadow-md hover:bg-[#e4ecfa] ${isSpeaking && activeSpeed === "slow" ? "bg-[#002856] text-white" : "bg-[#bbd4f0] text-[#002856]"}`}
            >
              {isSpeaking && activeSpeed === "slow" ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> Stop
                </>
              ) : (
                <>
                  <Rabbit className="w-4 h-4" /> Slow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
