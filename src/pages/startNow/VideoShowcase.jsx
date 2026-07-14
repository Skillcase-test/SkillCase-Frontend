import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

export default function VideoShowcase({ videos = [] }) {
  const scrollRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Filter videos for student applications
  const studentVideos = videos.filter(v => v.type === "student_applying");

  if (studentVideos.length === 0) return null;

  const list = studentVideos;

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
    const isMobile = window.innerWidth < 768;
    const cardWidth = isMobile ? 256 : 288;
    const singleSectionWidth = sectionList.length * (cardWidth + 24);

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
    <section className="mb-16 py-6 overflow-hidden w-full bg-slate-50/30">
      <div className="max-w-7xl mx-auto px-4 mb-4 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          100s of Students Are Applying
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Listen to direct audio-visual reports from candidates who have made the transition.
        </p>
      </div>

      {/* Scrolling Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto py-8 px-4 no-scrollbar scroll-smooth"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loopedList.map((video, index) => {
          const uniqueKey = `${video.id}-${index}`;
          const isPlaying = playingId === uniqueKey;
          const isFocussed = focusedIndex === index;

          return (
            <div
              key={uniqueKey}
              className={`flex-shrink-0 w-64 md:w-72 aspect-[9/16] bg-slate-950 rounded-3xl overflow-hidden shadow-md transition-all duration-300 relative border border-slate-800/10 ${
                isFocussed 
                  ? "scale-105 shadow-lg border-[#F9C53D]/40 opacity-100" 
                  : "scale-95 opacity-60"
              }`}
            >
              {/* Video Player Block */}
              <div className="w-full h-full bg-slate-950 relative overflow-hidden">
                {isPlaying ? (
                  <video
                    key={video.video_url}
                    src={video.video_url}
                    autoPlay
                    controls
                    className="w-full h-full object-cover z-0"
                    onPlay={() => setPlayingId(uniqueKey)}
                    onPause={() => setPlayingId(null)}
                    onEnded={() => setPlayingId(null)}
                    preload="auto"
                    playsInline
                  />
                ) : (
                  <>
                    <img
                      src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600"
                      alt={video.title}
                      className="w-full h-full object-cover opacity-50 z-0"
                    />
                    {/* Centered Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayToggle(uniqueKey);
                        }}
                        className="w-14 h-14 bg-[#F9C53D] hover:bg-[#e0b02f] rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 active:scale-90"
                      >
                        <Play className="w-5 h-5 fill-current text-[#002856] translate-x-0.5" />
                      </button>
                    </div>
                  </>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent z-10 pointer-events-none" />

                {/* Title & Description Overlay */}
                <div className="absolute bottom-6 inset-x-0 px-5 z-20 text-white flex flex-col gap-1 text-left pointer-events-none">
                  <h4 className="font-extrabold text-sm sm:text-base leading-tight">
                    {video.title}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>
              </div>

              {isPlaying && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlayingId(null);
                  }}
                  className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
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
