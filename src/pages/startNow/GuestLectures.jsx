import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

function LectureCard({ lecture, isPlaying, onPlay, onStop, style, onClick }) {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isPlaying) {
      setIsLoading(true);
      vid.play().catch(() => {
        setIsLoading(false);
        onStop();
      });
    } else {
      vid.pause();
      vid.currentTime = 0;
      setIsLoading(false);
    }
  }, [isPlaying]);

  const handleTap = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      onStop();
    } else {
      onPlay();
    }
  };

  return (
    <div
      style={style}
      className="absolute w-72 sm:w-80 md:w-96 bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-xl transition-all duration-500 ease-in-out cursor-pointer select-none"
      onClick={(e) => { onClick?.(); handleTap(e); }}
    >
      {/* Video block */}
      <div className="aspect-video bg-slate-950 relative w-full overflow-hidden">
        {/* Video — preload=metadata shows first frame as thumbnail */}
        <video
          ref={videoRef}
          src={lecture.video_url}
          preload="metadata"
          playsInline
          className="w-full h-full object-cover"
          onPlaying={() => setIsLoading(false)}
          onWaiting={() => isPlaying && setIsLoading(true)}
          onEnded={onStop}
          onError={() => { setIsLoading(false); onStop(); }}
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Play/Pause overlay */}
        {!isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            {isPlaying ? (
              <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                <Pause className="w-6 h-6 fill-current text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-[#002856] hover:bg-[#001c3d] rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 hover:scale-110 active:scale-90">
                <Play className="w-5 h-5 fill-current text-[#F9C53D] translate-x-0.5" />
              </div>
            )}
          </div>
        )}

        {/* Subtle dark overlay when thumbnail showing */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />
        )}
      </div>

      {/* Title & description */}
      <div className="p-5 bg-white border-t border-slate-50 flex flex-col gap-1.5">
        <h4 className="font-extrabold text-base text-[#002856] line-clamp-1">{lecture.title}</h4>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{lecture.description}</p>
      </div>
    </div>
  );
}

export default function GuestLectures({ videos = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const lectures = videos.filter(v => v.type === "guest_lecture");
  if (lectures.length === 0) return null;

  const list = lectures;

  const handlePrev = () => {
    setPlayingIndex(null);
    setActiveIndex(prev => (prev - 1 + list.length) % list.length);
  };

  const handleNext = () => {
    setPlayingIndex(null);
    setActiveIndex(prev => (prev + 1) % list.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 50) handleNext();
    else if (delta < -50) handlePrev();
    touchStartX.current = null;
  };

  const getCardStyle = (index) => {
    let offset = index - activeIndex;
    const total = list.length;

    if (total > 2) {
      if (offset < -Math.floor(total / 2)) offset += total;
      if (offset > Math.floor(total / 2)) offset -= total;
    }

    const translateAmount = isMobile ? "68%" : "78%";

    if (offset === 0) {
      return { transform: "translateX(0) scale(1.04)", zIndex: 30, opacity: 1, pointerEvents: "auto" };
    } else if (offset === -1) {
      return { transform: `translateX(-${translateAmount}) scale(0.82)`, zIndex: 20, opacity: 0.4, pointerEvents: "auto" };
    } else if (offset === 1) {
      return { transform: `translateX(${translateAmount}) scale(0.82)`, zIndex: 20, opacity: 0.4, pointerEvents: "auto" };
    } else {
      return {
        transform: offset < 0 ? "translateX(-160%) scale(0.6)" : "translateX(160%) scale(0.6)",
        zIndex: 10,
        opacity: 0,
        pointerEvents: "none",
      };
    }
  };

  return (
    <section className="mb-16 py-8 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-4 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          Professional Guest Lectures
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Learn directly from senior clinical consultants and settled Indian nurses sharing clinical onboarding insights.
        </p>
      </div>

      <div
        className="relative flex items-center justify-center min-h-[320px] sm:min-h-[380px] overflow-hidden w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Card carousel container */}
        <div className="relative w-72 sm:w-80 md:w-96 h-[260px] sm:h-[300px] flex items-center justify-center scale-[0.88] sm:scale-95 md:scale-100 origin-center shrink-0">
          {list.map((lecture, index) => (
            <LectureCard
              key={lecture.id}
              lecture={lecture}
              style={getCardStyle(index)}
              isPlaying={playingIndex === index}
              onPlay={() => { setActiveIndex(index); setPlayingIndex(index); }}
              onStop={() => setPlayingIndex(null)}
              onClick={() => { if (index !== activeIndex) { setPlayingIndex(null); setActiveIndex(index); } }}
            />
          ))}
        </div>

        {/* Arrow Controls */}
        <button
          onClick={handlePrev}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white border border-slate-100 shadow-md hover:bg-slate-50 text-slate-600 active:scale-95 transition-all duration-150 z-40"
          aria-label="Previous lecture"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white border border-slate-100 shadow-md hover:bg-slate-50 text-slate-600 active:scale-95 transition-all duration-150 z-40"
          aria-label="Next lecture"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPlayingIndex(null); setActiveIndex(i); }}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-6 h-2 bg-[#002856]"
                : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
            }`}
            aria-label={`Go to lecture ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
