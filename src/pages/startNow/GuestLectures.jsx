import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

function LectureCard({ lecture, uniqueKey, isPlaying, onPlay, onStop }) {
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
      onPlay(uniqueKey);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-80 sm:w-96 bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm relative cursor-pointer select-none"
      onClick={handleTap}
    >
      {/* Video block */}
      <div className="aspect-video bg-slate-950 relative w-full overflow-hidden">
        {/* Single video element — shows first frame as thumbnail when paused at currentTime=0 */}
        <video
          ref={videoRef}
          src={lecture.video_url}
          preload="metadata"
          playsInline
          className="w-full h-full object-cover"
          onPlaying={() => setIsLoading(false)}
          onWaiting={() => isPlaying && setIsLoading(true)}
          onEnded={onStop}
          onError={() => {
            setIsLoading(false);
            onStop();
          }}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Center Play/Pause overlay */}
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

        {/* Subtle dark overlay when showing thumbnail */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />
        )}
      </div>

      {/* Title & Description */}
      <div className="p-6 bg-white border-t border-slate-50 flex flex-col gap-2">
        <h4 className="font-extrabold text-base text-[#002856] line-clamp-1">
          {lecture.title}
        </h4>
        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
          {lecture.description}
        </p>
      </div>
    </div>
  );
}

export default function GuestLectures({ videos = [] }) {
  const [playingId, setPlayingId] = useState(null);

  const lectures = videos.filter(v => v.type === "guest_lecture");
  if (lectures.length === 0) return null;

  const loopedList = [...lectures, ...lectures];

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

      {/* Marquee Viewport */}
      <div className="relative w-full flex overflow-x-hidden py-8 group/gl">

        <div
          className="flex gap-8 animate-gl-marquee"
          style={{ animationPlayState: playingId !== null ? "paused" : "running" }}
        >
          {loopedList.map((lecture, index) => {
            const uniqueKey = `${lecture.id}-${index}`;
            return (
              <LectureCard
                key={uniqueKey}
                lecture={lecture}
                uniqueKey={uniqueKey}
                isPlaying={playingId === uniqueKey}
                onPlay={(id) => setPlayingId(id)}
                onStop={() => setPlayingId(null)}
              />
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes gl-marquee {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-gl-marquee {
          animation: gl-marquee 35s linear infinite;
        }
        .group\/gl:hover .animate-gl-marquee {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
