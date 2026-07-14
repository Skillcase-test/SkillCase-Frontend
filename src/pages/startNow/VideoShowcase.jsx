import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

function VideoCard({ video, isPlaying, onPlay, onStop, style, onClick }) {
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
      className="absolute w-64 md:w-72 aspect-[9/16] bg-slate-950 rounded-3xl overflow-hidden shadow-xl  transition-all duration-500 ease-in-out cursor-pointer select-none"
      onClick={(e) => {
        onClick?.();
        handleTap(e);
      }}
    >
      {/* Video — preload=metadata shows first frame as thumbnail */}
      <video
        ref={videoRef}
        src={video.video_url}
        preload="metadata"
        playsInline
        className="w-full h-full object-cover z-0"
        onPlaying={() => setIsLoading(false)}
        onWaiting={() => isPlaying && setIsLoading(true)}
        onEnded={onStop}
        onError={() => {
          setIsLoading(false);
          onStop();
        }}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent z-10 pointer-events-none" />

      {/* Play/Pause icon */}
      {!isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          {isPlaying ? (
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
              <Pause className="w-6 h-6 fill-current text-white" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-[#F9C53D] hover:bg-[#e0b02f] rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 hover:scale-110 active:scale-90">
              <Play className="w-5 h-5 fill-current text-[#002856] translate-x-0.5" />
            </div>
          )}
        </div>
      )}

      {/* Title & description */}
      <div className="absolute bottom-6 inset-x-0 px-5 z-20 text-white flex flex-col gap-1 text-left pointer-events-none">
        <h4 className="font-extrabold text-sm sm:text-base leading-tight">
          {video.title}
        </h4>
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {video.description}
        </p>
      </div>
    </div>
  );
}

export default function VideoShowcase({ videos = [] }) {
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

  const studentVideos = videos.filter((v) => v.type === "student_applying");
  if (studentVideos.length === 0) return null;

  const list = studentVideos;

  const handlePrev = () => {
    setPlayingIndex(null);
    setActiveIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  const handleNext = () => {
    setPlayingIndex(null);
    setActiveIndex((prev) => (prev + 1) % list.length);
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

    const translateAmount = isMobile ? "62%" : "72%";

    if (offset === 0) {
      return {
        transform: "translateX(0) scale(1.05)",
        zIndex: 30,
        opacity: 1,
        pointerEvents: "auto",
      };
    } else if (offset === -1) {
      return {
        transform: `translateX(-${translateAmount}) scale(0.82)`,
        zIndex: 20,
        opacity: 0.4,
        pointerEvents: "auto",
      };
    } else if (offset === 1) {
      return {
        transform: `translateX(${translateAmount}) scale(0.82)`,
        zIndex: 20,
        opacity: 0.4,
        pointerEvents: "auto",
      };
    } else {
      return {
        transform:
          offset < 0
            ? "translateX(-150%) scale(0.6)"
            : "translateX(150%) scale(0.6)",
        zIndex: 10,
        opacity: 0,
        pointerEvents: "none",
      };
    }
  };

  return (
    <section className="mb-16 py-6 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-4 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          100s of Students Are Applying
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Listen to direct audio-visual reports from candidates who have made
          the transition.
        </p>
      </div>

      <div
        className="relative flex items-center justify-center min-h-[480px] sm:min-h-[560px] overflow-hidden w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Card carousel container */}
        <div className="relative w-64 md:w-72 h-[380px] sm:h-[450px] flex items-center justify-center scale-[0.85] sm:scale-95 md:scale-100 origin-center shrink-0">
          {list.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              style={getCardStyle(index)}
              isPlaying={playingIndex === index}
              onPlay={() => {
                setActiveIndex(index);
                setPlayingIndex(index);
              }}
              onStop={() => setPlayingIndex(null)}
              onClick={() => {
                if (index !== activeIndex) {
                  setPlayingIndex(null);
                  setActiveIndex(index);
                }
              }}
            />
          ))}
        </div>

        {/* Arrow Controls */}
        <button
          onClick={handlePrev}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white border border-slate-100 shadow-md hover:bg-slate-50 text-slate-600 active:scale-95 transition-all duration-150 z-40"
          aria-label="Previous video"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white border border-slate-100 shadow-md hover:bg-slate-50 text-slate-600 active:scale-95 transition-all duration-150 z-40"
          aria-label="Next video"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-2">
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setPlayingIndex(null);
              setActiveIndex(i);
            }}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-6 h-2 bg-[#002856]"
                : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
            }`}
            aria-label={`Go to video ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
