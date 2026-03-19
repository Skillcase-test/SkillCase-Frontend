import React, { useEffect, useMemo, useRef, useState } from "react";
import NewsReelCard from "./NewsReelCard";
import { hapticLight } from "../../../utils/haptics";
import { getNewsHintStatus, markNewsHintSeen } from "../../../api/newsApi";

export default function NewsReel({
  articles,
  onSpeak,
  onSpeakSlow,
  onStop,
  isSpeaking,
  isLoadingAudio,
  activeSpeed,
  onIndexChange,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bump, setBump] = useState(false);
  const lastWheelAt = useRef(0);
  const touchStartY = useRef(0);
  const bumpTimers = useRef([]);
  const hintMarked = useRef(false);

  useEffect(() => {
    setCurrentIndex(0);
    if (onIndexChange) onIndexChange(0);
  }, [articles.length, onIndexChange]);

  useEffect(() => {
    let cancelled = false;

    const initHint = async () => {
      try {
        const res = await getNewsHintStatus();
        if (cancelled) return;

        const alreadySeen = res?.data?.seen === true;
        if (alreadySeen) return;

        const t1 = setTimeout(() => setBump(true), 1200);
        const t2 = setTimeout(() => setBump(false), 2100);
        const t3 = setTimeout(() => setBump(true), 3100);
        const t4 = setTimeout(() => setBump(false), 4000);
        bumpTimers.current = [t1, t2, t3, t4];
      } catch {
        // If API fails, silently skip the hint — do not break the page
      }
    };

    initHint();

    return () => {
      cancelled = true;
      bumpTimers.current.forEach(clearTimeout);
    };
  }, []);

  const hideHint = () => {
    setBump(false);
    bumpTimers.current.forEach(clearTimeout);

    if (!hintMarked.current) {
      hintMarked.current = true;
      markNewsHintSeen().catch(() => {});
    }
  };

  const goNext = () => {
    onStop?.();
    setCurrentIndex((prev) => {
      const next = Math.min(prev + 1, Math.max(articles.length - 1, 0));
      if (prev !== next) {
        if (onIndexChange) onIndexChange(next);
        hapticLight();
      }
      return next;
    });
  };

  const goPrev = () => {
    onStop?.();
    setCurrentIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (prev !== next) {
        if (onIndexChange) onIndexChange(next);
        hapticLight();
      }
      return next;
    });
  };

  const onWheel = (e) => {
    const now = Date.now();
    if (now - lastWheelAt.current < 450) return;
    if (Math.abs(e.deltaY) < 10) return;

    hideHint();
    lastWheelAt.current = now;
    if (e.deltaY > 0) goNext();
    else goPrev();
  };

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0]?.clientY || 0;
  };

  const onTouchEnd = (e) => {
    const endY = e.changedTouches[0]?.clientY || 0;
    const delta = touchStartY.current - endY;
    if (Math.abs(delta) < 40) return;

    hideHint();
    if (delta > 0) goNext();
    else goPrev();
  };

  const layers = useMemo(
    () =>
      articles
        .map((article, idx) => ({ article, idx }))
        .filter(({ idx }) => Math.abs(idx - currentIndex) <= 1),
    [articles, currentIndex],
  );

  const cardStyle = (idx) => {
    if (idx === currentIndex) {
      return {
        transform: `translateY(${bump ? -35 : 0}px) rotateX(0deg) scale(1) translateZ(0px)`,
        opacity: 1,
        zIndex: 30,
      };
    }
    if (idx === currentIndex - 1) {
      return {
        transform:
          "translateY(-88%) rotateX(-12deg) scale(0.97) translateZ(-52px)",
        opacity: 0.2,
        zIndex: 20,
      };
    }
    return {
      transform: "translateY(88%) rotateX(12deg) scale(0.97) translateZ(-52px)",
      opacity: 0.2,
      zIndex: 10,
    };
  };

  return (
    <div className="w-full h-full relative" style={{ perspective: "1200px" }}>
      <div
        className="w-full h-full absolute inset-0 transform-style-3d touch-none select-none overscroll-none"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {layers.map(({ article, idx }) => (
          <div
            key={article.id}
            className="absolute inset-0 w-full h-full will-change-transform"
            style={{
              ...cardStyle(idx),
              transition:
                idx === currentIndex
                  ? "transform 800ms cubic-bezier(0.4, 0, 0.2, 1), opacity 800ms"
                  : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms",
            }}
          >
            <NewsReelCard
              article={article}
              onSpeak={onSpeak}
              onSpeakSlow={onSpeakSlow}
              onStop={onStop}
              isSpeaking={isSpeaking}
              isLoadingAudio={isLoadingAudio}
              activeSpeed={activeSpeed}
              isActive={idx === currentIndex}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
