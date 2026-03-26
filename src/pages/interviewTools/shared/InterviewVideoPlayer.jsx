import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function InterviewVideoPlayer({
  src,
  poster = "",
  title = "",
  autoPlay = false,
  onEnded,
  className = "",
  variant = "default",
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadError, setLoadError] = useState("");

  const isMinimal = variant === "minimal";

  useEffect(() => {
    setPlaying(false);
    setLoadError("");
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !autoPlay) return;

    video.play().then(() => {
      setPlaying(true);
    }).catch((error) => {
      // Mobile browsers often block autoplay with sound before user interaction.
      // Keep this silent in UI and let the candidate/admin press play explicitly.
      if (error?.name !== "NotAllowedError") {
        console.error("Video autoplay failed:", error);
      }
      setPlaying(false);
    });
  }, [autoPlay, src]);

  const updateTimingState = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const nextTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;

    setDuration(nextDuration);
    setCurrentTime(nextTime);
    setProgress(nextDuration > 0 ? (nextTime / nextDuration) * 100 : 0);
  };

  const togglePlay = async (event) => {
    event?.stopPropagation();
    const video = videoRef.current;
    if (!video || !src) return;

    if (video.paused) {
      try {
        await video.play();
        setPlaying(true);
        setLoadError("");
      } catch (error) {
        if (error?.name !== "NotAllowedError") {
          console.error("Video play failed:", error);
        }
        setPlaying(false);
        setLoadError("This video could not be played in your browser.");
      }
      return;
    }

    video.pause();
    setPlaying(false);
  };

  const toggleMute = (event) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleSeek = (event) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;

    const nextProgress = Number(event.target.value);
    video.currentTime = (nextProgress / 100) * duration;
    setProgress(nextProgress);
  };

  const handleVideoError = () => {
    setPlaying(false);
    setLoadError("This video could not be loaded.");
  };

  const toggleFullscreen = (event) => {
    event.stopPropagation();
    containerRef.current?.requestFullscreen?.();
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-2xl border ${
        isMinimal
          ? "border-slate-200 bg-white shadow-sm"
          : "border-slate-200 bg-white shadow-sm"
      } ${className}`}
    >
      <div
        className={`relative aspect-video ${
          isMinimal ? "bg-slate-950" : "bg-[#041122]"
        }`}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="h-full w-full object-contain"
          onTimeUpdate={updateTimingState}
          onLoadedMetadata={updateTimingState}
          onDurationChange={updateTimingState}
          onLoadedData={updateTimingState}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={onEnded}
          onError={handleVideoError}
          playsInline
          controls={false}
          preload="metadata"
        />

        {title ? (
          <div className="absolute left-4 top-4 z-10">
            <div
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                isMinimal
                  ? "bg-white/90 text-slate-700"
                  : "bg-black/75 text-white"
              }`}
            >
              {title}
            </div>
          </div>
        ) : null}

        {!playing && !loadError ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6">
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              <AlertCircle className="h-4 w-4" />
              {loadError}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-3">
        <div className="group relative mb-3 h-1.5 rounded-full bg-slate-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#083262] transition-all"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="flex items-center justify-between text-slate-700">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-lg p-2 transition hover:bg-slate-50"
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg p-2 transition hover:bg-slate-50"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            <div className="pl-2 font-mono text-xs font-semibold text-slate-500 sm:pl-3">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
