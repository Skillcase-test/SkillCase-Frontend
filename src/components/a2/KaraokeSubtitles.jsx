import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function KaraokeSubtitles({
  subtitles, // Array of { start, end, text }
  currentTime,
  isVisible,
  onToggle,
  onSeek,
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  // Touch handling state
  const touchStartY = useRef(0);
  // Throttle scroll events
  const lastScrollTime = useRef(0);

  useEffect(() => {
    if (!subtitles || !isVisible) return;

    const idx = subtitles.findIndex(
      (sub) => currentTime >= sub.start && currentTime < sub.end,
    );
    // console.log(`[KaraokeDebug] Time: ${currentTime}, Idx: ${idx}`);
    setActiveIndex(idx !== -1 ? idx : activeIndex);
  }, [currentTime, subtitles, isVisible]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!subtitles || !onSeek) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;

    // Threshold for swipe
    if (Math.abs(deltaY) < 30) return;

    if (deltaY > 0) {
      // Swipe Down -> Prev (Like pulling down)
      if (activeIndex > 0) {
        onSeek(subtitles[activeIndex - 1].start);
        setActiveIndex(activeIndex - 1);
      }
    } else {
      // Swipe Up -> Next
      if (activeIndex < subtitles.length - 1) {
        const nextIdx = activeIndex === -1 ? 0 : activeIndex + 1;
        onSeek(subtitles[nextIdx].start);
        setActiveIndex(nextIdx);
      }
    }
  };

  const handleWheel = (e) => {
    // ... existing wheel logic ...
    // Simplifying to reuse logic if needed, but keeping separate is fine for now
    e.preventDefault();
    if (!subtitles || !onSeek) return;

    const now = Date.now();
    if (now - lastScrollTime.current < 200) return; // Reduced debounce for laptop trackpads

    if (e.deltaY > 0) {
      if (activeIndex > 0) {
        onSeek(subtitles[activeIndex - 1].start);
        setActiveIndex(activeIndex - 1);
      }
    } else {
      if (activeIndex < subtitles.length - 1) {
        const nextIdx = activeIndex === -1 ? 0 : activeIndex + 1;
        onSeek(subtitles[nextIdx].start);
        setActiveIndex(nextIdx);
      }
    }
    lastScrollTime.current = now;
  };

  if (!subtitles || subtitles.length === 0) return null;

  return (
    <div className="mt-4">
      {/* Toggle Button */}
      <button
        id="a2-listening-subtitle-btn"
        onClick={() => {
          window.dispatchEvent(new Event("tour:a2ListeningSubtitle"));
          onToggle();
        }}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition-colors mb-3 "
      >
        {isVisible ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        {isVisible ? "Hide Subtitles" : "Show Subtitles"}
      </button>

      {/* Wheel Picker Container */}
      <div
        id="a2-listening-subtitles-area"
        className={`
          transition-all duration-500 ease-out overflow-hidden
          ${isVisible ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="bg-gray-200 rounded-2xl h-[110px] relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          {/* Top/Bottom Fade Masks (Reduced height to reveal items) */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-200 to-transparent z-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-200 to-transparent z-20 pointer-events-none" />

          {/* Items Container */}
          <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 h-[60px]">
            {subtitles.map((sub, idx) => {
              const baseIndex = activeIndex === -1 ? -1 : activeIndex;
              const offset = idx - activeIndex; // Use simple offset (idx - activeIndex)

              if (Math.abs(offset) > 2) return null;

              let styleClass = "";
              let yOffset = "";

              if (offset === 0) {
                // Current
                styleClass =
                  "opacity-100 scale-100 blur-none z-10 text-[#002856] font-bold text-lg";
                yOffset = "0%";
              } else if (offset === -1) {
                // Previous
                styleClass =
                  "opacity-50 scale-90 blur-[0.5px] z-0 text-gray-500 font-medium text-sm";
                yOffset = "-70%"; // Closer spacing
              } else if (offset === 1) {
                // Next
                styleClass =
                  "opacity-50 scale-90 blur-[0.5px] z-0 text-gray-500 font-medium text-sm";
                yOffset = "70%"; // Closer spacing
              } else {
                styleClass = "opacity-0 scale-75";
                yOffset = offset > 0 ? "200%" : "-200%";
              }

              return (
                <div
                  key={idx}
                  className={`
                    absolute top-0 left-0 w-full h-[60px] flex items-center justify-center text-center px-8 transition-all duration-300 ease-out
                    ${styleClass}
                  `}
                  style={{ transform: `translateY(${yOffset})` }}
                >
                  <p className="leading-tight line-clamp-2">{sub.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
