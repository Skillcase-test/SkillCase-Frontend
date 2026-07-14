import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

function StackVideoPlayer({ videoUrl }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      setIsLoading(true);
      vid.scrollIntoView({ behavior: "smooth", block: "center" });
      vid.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    } else {
      vid.pause();
      vid.currentTime = 0;
      setIsLoading(false);
    }
  }, [isPlaying]);

  const handleTap = () => {
    if (videoUrl) setIsPlaying(prev => !prev);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden bg-slate-900 aspect-video relative w-full max-w-2xl mt-1 mx-auto shadow-inner cursor-pointer select-none"
      onClick={handleTap}
    >
      {videoUrl ? (
        <>
          {/* Video — preload=metadata so browser shows actual first frame as thumbnail */}
          <video
            ref={videoRef}
            src={videoUrl}
            preload="metadata"
            playsInline
            className="w-full h-full object-cover"
            onPlaying={() => setIsLoading(false)}
            onWaiting={() => isPlaying && setIsLoading(true)}
            onEnded={() => setIsPlaying(false)}
            onError={() => { setIsLoading(false); setIsPlaying(false); }}
          />

          {/* Loading Spinner */}
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
                <div className="w-14 h-14 bg-[#F9C53D] hover:bg-[#e0b02f] rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 hover:scale-110 active:scale-90">
                  <Play className="w-5 h-5 fill-current text-[#002856] translate-x-0.5" />
                </div>
              )}
            </div>
          )}

          {/* Subtle overlay when thumbnail is showing */}
          {!isPlaying && !isLoading && (
            <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />
          )}
        </>
      ) : (
        // No video uploaded — show empty placeholder
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#002856] text-white gap-3">
          <div className="w-14 h-14 bg-[#F9C53D] rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-current text-[#002856]" />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Video Class Preview
          </span>
        </div>
      )}
    </div>
  );
}

export default function LearningStack({ components = [] }) {
  if (components.length === 0) return null;

  const list = components;

  return (
    <section className="px-4 mb-16 mt-2 max-w-4xl mx-auto w-full">
      <div className="max-w-7xl mx-auto px-4 mb-10 text-center md:text-left">
        <h3 className="text-xl md:text-2xl font-extrabold text-[#002856]">
          Learning beyond the books
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          German doesn't have to feel like a subject.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {list.map((item, index) => {
          // Alternate borders between yellow and blue

          return (
            <div key={item.id} className="flex flex-col gap-4">
              {/* Main Heading outside the card (e.g. Learning is Simple) */}
              {item.heading && (
                <h2 className="text-lg md:text-2xl font-extrabold text-[#002856] tracking-tight px-1">
                  {item.heading}
                </h2>
              )}

              {/* Styled Card Component */}
              <div
                className={`border-l-4 py-6 px-3 sm:p-8 rounded-r-3xl shadow-xs border-y border-r border-slate-300 flex flex-col gap-4 transition-all duration-300 hover:shadow-md  bg-slate-100`}
              >
                {/* Playable Video Block (Interchanged to be above description) */}
                <StackVideoPlayer videoUrl={item.video_url} />

                {/* Short Description (Interchanged to be below video) */}
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                  {item.short_description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
