import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

export default function GuestLectures({ videos = [] }) {
  const scrollRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Filter videos for guest lectures
  const lectures = videos.filter(v => v.type === "guest_lecture");

  if (lectures.length === 0) return null;

  const list = lectures;

  // Repeat list so one section has at least 6 cards to avoid visual jump on standard screens
  let sectionList = [...list];
  while (sectionList.length < 6) {
    sectionList = [...sectionList, ...list];
  }

  // Triple the list to ensure seamless infinite scroll looping
  const loopedList = [...sectionList, ...sectionList, ...sectionList];

  // Dynamic Scroll Center Calculation (Responsive & Exact)
  // Triggers via native React onScroll asynchronously
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const containerCenter = el.scrollLeft + el.offsetWidth / 2;
    const cards = el.children;
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    setFocusedIndex((prev) => (prev !== closestIndex ? closestIndex : prev));
  };

  // Auto scroll effect
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || playingId !== null || list.length === 0) return;

    let animationFrameId;
    const scrollSpeed = 1; // pixels per frame

    // Pre-calculate loop widths
    const isMobile = window.innerWidth < 640;
    const cardWidth = isMobile ? 320 : 384;
    const singleSectionWidth = sectionList.length * (cardWidth + 32);

    // Start in the middle section so user can scroll left or right infinitely
    if (el.scrollLeft === 0) {
      el.scrollLeft = singleSectionWidth;
    }

    const scroll = () => {
      el.scrollLeft += scrollSpeed;
      
      // Infinite loop wrap
      if (el.scrollLeft >= singleSectionWidth * 2) {
        el.scrollLeft = singleSectionWidth;
      }
      
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [playingId, sectionList.length]);

  const handlePlayToggle = (uniqueKey) => {
    if (playingId === uniqueKey) {
      setPlayingId(null);
    } else {
      setPlayingId(uniqueKey);
    }
  };

  return (
    <section className="mb-16 py-8 overflow-hidden w-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 mb-4 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          Professional Guest Lectures
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Learn directly from senior clinical consultants and settled Indian nurses sharing clinical onboarding insights.
        </p>
      </div>

      {/* Scrolling Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-8 overflow-x-auto py-8 px-4 no-scrollbar scroll-smooth"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loopedList.map((lecture, index) => {
          const uniqueKey = `${lecture.id}-${index}`;
          const isPlaying = playingId === uniqueKey;
          const isFocussed = focusedIndex === index;

          return (
            <div
              key={uniqueKey}
              className={`flex-shrink-0 w-80 sm:w-96 bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-300 relative ${
                isFocussed 
                  ? "scale-105 shadow-xl border-[#F9C53D]/30 opacity-100 z-10" 
                  : "scale-95 opacity-65"
              }`}
            >
              {/* Large Video Player Block */}
              <div className="aspect-video bg-slate-950 relative w-full overflow-hidden">
                {isPlaying ? (
                  <video
                    key={lecture.video_url}
                    src={lecture.video_url}
                    autoPlay
                    controls
                    className="w-full h-full object-cover"
                    onPlay={() => setPlayingId(uniqueKey)}
                    onPause={() => setPlayingId(null)}
                    onEnded={() => setPlayingId(null)}
                    preload="auto"
                    playsInline
                  />
                ) : (
                  <>
                    <img
                      src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800"
                      alt={lecture.title}
                      className="w-full h-full object-cover opacity-50"
                    />
                    {/* Centered Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayToggle(uniqueKey);
                        }}
                        className="w-16 h-16 bg-[#002856] text-[#F9C53D] hover:bg-[#001c3d] rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 active:scale-90"
                      >
                        <Play className="w-5 h-5 fill-current text-[#F9C53D] translate-x-0.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Title & Description Overlay */}
              <div className="p-6 bg-white border-t border-slate-50 flex flex-col gap-2">
                <h4 className="font-extrabold text-base text-[#002856] line-clamp-1">
                  {lecture.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {lecture.description}
                </p>
              </div>

              {isPlaying && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlayingId(null);
                  }}
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                >
                  <Pause className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
