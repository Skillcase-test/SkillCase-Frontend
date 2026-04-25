import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

function formatTime(seconds, { ceil = false } = {}) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const safeSeconds = ceil ? Math.ceil(seconds) : Math.floor(seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getEffectiveDuration(video, fallback = 0) {
  if (!video) return fallback;

  const candidates = [];
  if (Number.isFinite(video.duration) && video.duration > 0) {
    candidates.push(video.duration);
  }
  if (Number.isFinite(fallback) && fallback > 0) candidates.push(fallback);

  if (!candidates.length) return 0;
  return Math.max(...candidates);
}

export default function InterviewVideoPlayer({
  src,
  poster = "",
  title = "",
  autoPlay = false,
  onEnded,
  initialDurationSeconds = 0,
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
  const [forceNativeControls, setForceNativeControls] = useState(false);
  const [knownDuration, setKnownDuration] = useState(
    Number.isFinite(initialDurationSeconds) && initialDurationSeconds > 0
      ? Number(initialDurationSeconds)
      : 0,
  );

  const isMinimal = variant === "minimal";

  useEffect(() => {
    setPlaying(false);
    setLoadError("");
    setForceNativeControls(false);
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);
    setKnownDuration(
      Number.isFinite(initialDurationSeconds) && initialDurationSeconds > 0
        ? Number(initialDurationSeconds)
        : 0,
    );
  }, [src]);

  useEffect(() => {
    if (!src) return undefined;
    const probe = document.createElement("video");
    let isDisposed = false;
    const handleLoadedMetadata = () => {
      if (isDisposed) return;
      if (probe.duration === Infinity) {
        probe.currentTime = 1e101;
        probe.ontimeupdate = () => {
          probe.ontimeupdate = null;
          if (!isDisposed && Number.isFinite(probe.duration) && probe.duration > 0) {
            setKnownDuration((prev) => Math.max(prev, probe.duration));
          }
        };
      } else {
        const d = Number.isFinite(probe.duration) ? Number(probe.duration) : 0;
        if (d > 0) setKnownDuration((prev) => Math.max(prev, d));
      }
    };
    probe.preload = "metadata";
    probe.muted = true;
    probe.src = src;
    probe.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      isDisposed = true;
      probe.removeEventListener("loadedmetadata", handleLoadedMetadata);
      probe.ontimeupdate = null;
      probe.src = "";
    };
  }, [src]);

  useEffect(() => {
    let rafId = null;
    const tick = () => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        const nextDuration = getEffectiveDuration(video, knownDuration);
        const nextTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        if (nextDuration > 0) setKnownDuration((prev) => Math.max(prev, nextDuration));
        setDuration(nextDuration);
        setCurrentTime(nextTime);
        setProgress(nextDuration > 0 ? (nextTime / nextDuration) * 100 : 0);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [knownDuration]);

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

    const nextDuration = getEffectiveDuration(video, knownDuration);
    const nextTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;

    if (nextDuration > 0) setKnownDuration((prev) => Math.max(prev, nextDuration));
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
    const safeDuration = getEffectiveDuration(video, duration || knownDuration);
    if (!video || !safeDuration) return;

    const nextProgress = Number(event.target.value);
    video.currentTime = (nextProgress / 100) * safeDuration;
    setProgress(nextProgress);
  };

  const handleVideoError = () => {
    const mediaError = videoRef.current?.error;
    console.warn("Interview video playback error", {
      src,
      code: mediaError?.code,
      message: mediaError?.message,
    });
    setPlaying(false);
    
    if (mediaError?.code === 4) {
      setForceNativeControls(false);
      setLoadError("This video appears to be corrupted or incomplete. The candidate's recording may have been interrupted.");
    } else {
      setForceNativeControls(true);
      setLoadError("Playback issue detected. Trying browser-native player fallback.");
    }
  };

  const toggleFullscreen = (event) => {
    event.stopPropagation();
    containerRef.current?.requestFullscreen?.();
  };

  const handleEnded = () => {
    const videoDuration = Number.isFinite(videoRef.current?.duration)
      ? videoRef.current.duration
      : 0;
    const finalDuration = Math.max(videoDuration || 0, knownDuration || 0, currentTime || 0);
    setCurrentTime(finalDuration || 0);
    setDuration(finalDuration || 0);
    if (finalDuration > 0) setKnownDuration(finalDuration);
    setProgress(100);
    setPlaying(false);
    onEnded?.();
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
          onCanPlay={updateTimingState}
          onProgress={updateTimingState}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={handleEnded}
          onError={handleVideoError}
          playsInline
          controls={forceNativeControls}
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

        {loadError && !forceNativeControls ? (
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
            className="absolute inset-y-0 left-0 rounded-full bg-[#083262]"
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
              {formatTime(currentTime)} /{" "}
              {duration || knownDuration
                ? formatTime(duration || knownDuration, { ceil: true })
                : "00:--"}
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
