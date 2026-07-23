import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AppScreenshots({ screenshots = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(null);

  // Resize listener to adapt translate values for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (screenshots.length === 0) return null;

  const list = screenshots;

  // Auto-scroll loop
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % list.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [list.length]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  const handleNext = () => {
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

  // Helper to calculate translate offsets dynamically
  const getCardStyle = (index) => {
    let offset = index - activeIndex;
    const total = list.length;

    // Handle circular wrap around
    if (total > 2) {
      if (offset < -Math.floor(total / 2)) offset += total;
      if (offset > Math.floor(total / 2)) offset -= total;
    }

    const translateAmount = isMobile ? "55%" : "75%";

    if (offset === 0) {
      // Center Active Phone
      return {
        transform: "translateX(0) scale(1.05)",
        zIndex: 30,
        opacity: 1,
        pointerEvents: "auto",
      };
    } else if (offset === -1) {
      // Left Peeking Phone
      return {
        transform: `translateX(-${translateAmount}) scale(0.8)`,
        zIndex: 20,
        opacity: 0.35,
        pointerEvents: "auto",
      };
    } else if (offset === 1) {
      // Right Peeking Phone
      return {
        transform: `translateX(${translateAmount}) scale(0.8)`,
        zIndex: 20,
        opacity: 0.35,
        pointerEvents: "auto",
      };
    } else {
      // Out of view
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
    <section className="px-4 max-w-5xl mx-auto w-full relative overflow-hidden">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          Learn Anywhere with the Skillcase App
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Review flashcards, clinical audios, and check-lists on-the-go.
        </p>
      </div>

      {/* Sliding Smartphone mockup wrapper */}
      <div
        className="relative flex items-center justify-center min-h-[580px] sm:min-h-[820px] md:min-h-[920px] -mt-16 md:mt-4 overflow-hidden w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-[#002856]/5 blur-[100px] rounded-full scale-75 -z-10" />

        {/* Sliding Phone Cards Container (Exactly 390x844 with responsive scale scaling) */}
        <div className="relative w-[390px] h-[844px] flex items-center justify-center scale-[0.6] min-[400px]:scale-[0.7] sm:scale-[0.9] md:scale-100 origin-center transition-transform duration-300 shrink-0">
          {list.map((item, index) => {
            const cardStyle = getCardStyle(index);
            const isCenter = index === activeIndex;

            return (
              <div
                key={item.id}
                onClick={() => !isCenter && setActiveIndex(index)}
                style={cardStyle}
                className="absolute w-full h-full aspect-[9/19] rounded-[2.5rem] p-3 bg-slate-900 border-[4px] border-slate-700 shadow-2xl transition-all duration-500 ease-in-out cursor-pointer select-none"
              >
                {/* Inner Screen */}
                <div className="w-full h-full bg-white rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden relative aspect-[9/19]">
                  {/* Phone Notch/Speaker */}
                  <div className="absolute top-0 inset-x-0 h-4 flex justify-center pt-1.5 z-20 pointer-events-none">
                    <div className="w-14 sm:w-16 h-1 sm:h-1.5 bg-slate-900 rounded-full" />
                  </div>

                  <img
                    src={item.image_url}
                    alt={`App screen view ${index}`}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Arrow Controls */}
        <button
          onClick={handlePrev}
          className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white border border-slate-100 shadow-md hover:bg-slate-50 text-slate-600 active:scale-95 transition-all duration-150 z-40"
          aria-label="Previous screenshot"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white border border-slate-100 shadow-md hover:bg-slate-50 text-slate-600 active:scale-95 transition-all duration-150 z-40"
          aria-label="Next screenshot"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
