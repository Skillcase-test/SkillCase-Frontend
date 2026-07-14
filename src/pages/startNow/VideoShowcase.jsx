import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

function VideoCard({ video, uniqueKey, isPlaying, onPlay, onStop }) {
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
      className="flex-shrink-0 w-64 md:w-72 aspect-[9/16] bg-slate-950 rounded-3xl overflow-hidden shadow-md relative cursor-pointer select-none"
      onClick={handleTap}
    >
      {/* Single video element — shows first frame as thumbnail when paused */}
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

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent z-10 pointer-events-none" />

      {/* Center Play/Pause Icon */}
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
  );
}

export default function VideoShowcase({ videos = [] }) {
  const [playingId, setPlayingId] = useState(null);

  const studentVideos = videos.filter((v) => v.type === "student_applying");
  if (studentVideos.length === 0) return null;

  const loopedList = [...studentVideos, ...studentVideos];

  return (
    <section className="mb-16 py-6 overflow-hidden w-full bg-slate-50/30">
      <div className="max-w-7xl mx-auto px-4 mb-4 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          100s of Students Are Applying
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Listen to direct audio-visual reports from candidates who have made
          the transition.
        </p>
      </div>

      {/* Marquee Viewport */}
      <div className="relative w-full flex overflow-x-hidden py-8 group/vs">

        <div
          className="flex gap-6 animate-vs-marquee"
          style={{
            animationPlayState: playingId !== null ? "paused" : "running",
          }}
        >
          {loopedList.map((video, index) => {
            const uniqueKey = `${video.id}-${index}`;
            return (
              <VideoCard
                key={uniqueKey}
                video={video}
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
        @keyframes vs-marquee {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-vs-marquee {
          animation: vs-marquee 30s linear infinite;
        }
        .group\/vs:hover .animate-vs-marquee {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
