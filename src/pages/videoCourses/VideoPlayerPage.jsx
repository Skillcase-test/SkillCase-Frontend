import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
  MessageCircle,
  Minimize,
  Pause,
  Play,
} from "lucide-react";
import {
  getVideoCourse,
  getVideoCourseVideo,
  updateVideoCourseProgress,
} from "../../api/videoCourseApi";
import ChatDrawer from "./components/ChatDrawer";
import { trackLearningEvent } from "../../telemetry/events";
import { useUsageLimitGate } from "../../hooks/useUsageLimits";

const formatTime = (secs) => {
  const s = Math.floor(Number(secs) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function VideoPlayerPage() {
  const { videoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  useUsageLimitGate("ALL", "video_courses");

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const progressBarRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const resumedRef = useRef(false);
  const completionReportedRef = useRef(false);

  const [data, setData] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const video = data?.video;
  const timestamps = data?.timestamps || [];
  const level = video?.proficiency_level;

  useEffect(() => {
    if (!user?.user_id) return;
    resumedRef.current = false;
    setLoading(true);
    getVideoCourseVideo(videoId)
      .then((res) => {
        const nextData = res.data?.data || null;
        setData(nextData);
        completionReportedRef.current = Boolean(nextData?.video?.completed);
      })
      .catch((err) => console.error("Error fetching course video:", err))
      .finally(() => setLoading(false));
  }, [user?.user_id, videoId]);

  // Prev/next is derived from the owning course's ordered video list.
  useEffect(() => {
    if (!video?.course_id) return;
    getVideoCourse(video.course_id)
      .then((res) => setSiblings(res.data?.data?.videos || []))
      .catch(() => setSiblings([]));
  }, [video?.course_id]);

  useEffect(() => {
    if (!video) return undefined;
    const startedAt = performance.now();
    trackLearningEvent("content_presented", {
      level, module: "video_course", contentId: videoId, entityId: videoId,
      entityType: "course_video",
    });
    return () => trackLearningEvent("content_left", {
      level, module: "video_course", contentId: videoId, entityId: videoId,
      entityType: "course_video",
      activeMs: Math.round(performance.now() - startedAt),
    });
  }, [video, videoId, level]);

  const saveProgress = (forceComplete = false, element = null) => {
    const el = element || videoRef.current;
    if (!el || !videoId) return;
    const reachedCompletion = forceComplete || (el.duration && el.currentTime / el.duration > 0.9);
    const shouldReportCompletion = reachedCompletion && !completionReportedRef.current;
    if (shouldReportCompletion) completionReportedRef.current = true;
    updateVideoCourseProgress(videoId, {
      watch_time_seconds: Math.floor(el.currentTime),
      completed: shouldReportCompletion,
    }).catch((err) => {
      if (shouldReportCompletion) completionReportedRef.current = false;
      console.error("Failed to update video progress:", err);
    });
  };

  // Heartbeat every 10s while playing, plus a final save on unmount so a
  // back-navigation mid-video still resumes where the learner left off.
  useEffect(() => {
    if (!videoId || !user?.user_id) return undefined;
    const videoElement = videoRef.current;
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) saveProgress();
    }, 10000);
    return () => {
      clearInterval(interval);
      if (videoElement?.currentTime > 0) saveProgress(false, videoElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, user?.user_id, video]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    const progressBucket = Math.floor((el.currentTime / (el.duration || 1)) * 10) * 10;
    if (el.paused) {
      trackLearningEvent("media_played", { level, module: "video_course", contentId: videoId, entityId: videoId, mediaState: "playing", progressBucket });
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      trackLearningEvent("media_paused", { level, module: "video_course", contentId: videoId, entityId: videoId, mediaState: "paused", progressBucket });
      el.pause();
      setIsPlaying(false);
    }
  };

  const skip = (delta) => (e) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    trackLearningEvent("media_seeked", { level, module: "video_course", contentId: videoId, entityId: videoId, direction: delta > 0 ? "forward" : "backward" });
    el.currentTime = Math.min(duration, Math.max(0, el.currentTime + delta));
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    setDuration(el.duration);
    if (resumedRef.current) return;
    resumedRef.current = true;

    const requested = parseFloat(searchParams.get("t"));
    const resumeAt = Number.isFinite(requested)
      ? requested
      : Number(video?.watch_time_seconds) || 0;
    // Resuming at the very end would just replay the completion frame.
    if (resumeAt > 0 && resumeAt < el.duration - 5) {
      el.currentTime = resumeAt;
      setCurrentTime(resumeAt);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    trackLearningEvent("media_completed", { level, module: "video_course", contentId: videoId, entityId: videoId, mediaState: "ended", progressBucket: 100 });
    saveProgress(true);
  };

  const toggleSpeed = (e) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    const nextRate = { 1: 1.25, 1.25: 1.5, 1.5: 2 }[playbackRate] || 1;
    el.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    trackLearningEvent("media_speed_changed", { level, module: "video_course", contentId: videoId, entityId: videoId, speed: nextRate });
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    const container = videoContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isFullscreen]);

  const handleProgressClick = (e) => {
    e.stopPropagation();
    const rect = progressBarRef.current?.getBoundingClientRect();
    const el = videoRef.current;
    if (!rect || !el) return;
    const percentage = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
    trackLearningEvent("media_seeked", { level, module: "video_course", contentId: videoId, entityId: videoId, direction: "scrub" });
  };

  const handleChapterClick = (seconds) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = parseFloat(seconds);
    el.play().catch(() => {});
    setIsPlaying(true);
    trackLearningEvent("media_seeked", {
      level,
      module: "video_course",
      contentId: videoId,
      entityId: videoId,
      entityType: "course_video",
      direction: "chapter",
      attributes: {
        chapter_id: timestamps.find(
          (t) => Number(t.time_seconds) === Number(seconds),
        )?.timestamp_id,
      },
    });
  };

  const index = siblings.findIndex((v) => String(v.video_id) === String(videoId));
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white p-6 shadow-sm">
        <p className="text-center text-slate-400 py-12">Video not found.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-sm relative">
      <div className="self-stretch px-4 py-2.5 flex justify-between items-center bg-white">
        <button
          onClick={() => navigate(`/video-courses/${video.course_id || ""}`)}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">Back</span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6 truncate max-w-[55%]">
          {video.course_name || "Video Course"}
        </span>
      </div>

      <div className="flex-1 w-full overflow-y-auto pb-24">
        <div className="px-4 flex flex-col items-center">
          <div
            ref={videoContainerRef}
            onMouseMove={resetControlsTimeout}
            onMouseLeave={() => isFullscreen && isPlaying && setShowControls(false)}
            className="self-stretch bg-black rounded-lg flex flex-col items-center relative overflow-hidden"
          >
            <div
              className={`w-full bg-black relative overflow-hidden flex items-center justify-center ${
                isFullscreen ? "flex-1" : "aspect-video"
              }`}
            >
              <div className="relative aspect-video max-w-full max-h-full w-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={video.video_url}
                  playsInline
                  data-testid="course-video"
                  className="w-full h-full object-contain cursor-pointer"
                  poster={video.thumbnail_url}
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleVideoEnded}
                  onClick={togglePlay}
                  onWaiting={() => setIsVideoLoading(true)}
                  onPlaying={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onSeeking={() => setIsVideoLoading(true)}
                  onSeeked={() => setIsVideoLoading(false)}
                  onLoadStart={() => setIsVideoLoading(true)}
                />

                {isVideoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}

                {!isPlaying && !isVideoLoading && (
                  <div
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer z-10"
                  >
                    <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-all">
                      <Play className="w-4 h-4 text-[#002856] fill-[#002856]" />
                    </div>
                  </div>
                )}

                <div
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  className={`p-1 right-2 top-2 absolute bg-black/60 rounded-sm flex items-center cursor-pointer z-20 hover:bg-black/80 transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="w-4 h-4 flex items-center justify-center text-white">
                    {isFullscreen ? (
                      <Minimize className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`w-full h-12 bg-black flex items-center gap-4 transition-all duration-300 ${
                isFullscreen
                  ? "absolute bottom-0 left-0 right-0 z-30"
                  : "rounded-bl-lg rounded-br-lg"
              } ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <div className="flex-1 px-3 flex items-center gap-4">
                <div className="flex items-center gap-2.5 text-white">
                  <button
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="bg-transparent border-none text-white hover:text-yellow-400 cursor-pointer outline-none flex items-center"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white" />
                    )}
                  </button>
                  <button
                    onClick={skip(-10)}
                    title="Rewind 10s"
                    className="bg-transparent border-none text-white hover:text-yellow-400 cursor-pointer outline-none text-[11px] font-bold"
                  >
                    -10
                  </button>
                  <button
                    onClick={skip(10)}
                    title="Forward 10s"
                    className="bg-transparent border-none text-white hover:text-yellow-400 cursor-pointer outline-none text-[11px] font-bold"
                  >
                    +10
                  </button>
                </div>

                <div
                  ref={progressBarRef}
                  onClick={handleProgressClick}
                  className="flex-1 h-6 relative flex flex-col justify-center cursor-pointer"
                >
                  <div className="self-stretch h-2.5 bg-neutral-800 rounded-full relative overflow-hidden">
                    <div
                      className="h-full bg-[#F5A623] rounded-full"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                    {/* Chapter ticks */}
                    {duration > 0 &&
                      timestamps.map((t) => (
                        <span
                          key={t.timestamp_id}
                          className="absolute top-0 h-full w-0.5 bg-white/60"
                          style={{ left: `${(t.time_seconds / duration) * 100}%` }}
                        />
                      ))}
                  </div>
                </div>

                <span className="text-white text-[10px] font-medium whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <button
                  onClick={toggleSpeed}
                  title="Playback Speed"
                  className="bg-transparent border-none text-white hover:text-[#F5A623] font-bold cursor-pointer text-xs outline-none"
                >
                  {playbackRate} x
                </button>
              </div>
            </div>
          </div>
        </div>

        {timestamps.length > 0 && (
          <div className="px-4 py-3 mt-3 flex flex-col gap-2 bg-slate-50 border-y border-zinc-100">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider text-left">
              Chapters
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {timestamps.map((t) => (
                <button
                  key={t.timestamp_id}
                  onClick={() => handleChapterClick(t.time_seconds)}
                  className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-[#002856] text-[#002856] text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {formatTime(t.time_seconds)} - {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pt-4 flex flex-col gap-3">
          <h1 className="text-sky-950 text-base font-semibold leading-5 text-left">
            {video.title}
          </h1>
          <div className="flex gap-1.5">
            <span className="px-2 py-0.5 bg-black/5 rounded-[40px] text-neutral-500 text-xs font-medium">
              {video.proficiency_level}
            </span>
            <span className="px-2 py-0.5 bg-black/5 rounded-[40px] text-neutral-500 text-xs font-medium">
              {formatTime(video.video_duration)}
            </span>
          </div>

          {video.description && (
            <p className="text-slate-600 text-xs leading-5 text-left whitespace-pre-line">
              {video.description}
            </p>
          )}

          {video.transcript && (
            <details className="border border-zinc-200 rounded-xl p-3">
              <summary className="text-sky-950 text-sm font-semibold cursor-pointer">
                Transcript
              </summary>
              <p className="mt-2 text-slate-600 text-xs leading-5 text-left whitespace-pre-line">
                {video.transcript}
              </p>
            </details>
          )}

          <div className="flex justify-between items-center gap-2 py-2">
            <button
              disabled={!prev}
              onClick={() => {
                if (!prev) return;
                trackLearningEvent("video_navigated", {
                  level,
                  module: "video_course",
                  contentId: prev.video_id,
                  entityId: prev.video_id,
                  entityType: "course_video",
                  direction: "previous",
                  attributes: { from_video_id: videoId },
                });
                navigate(`/video-course/${prev.video_id}`);
              }}
              className="px-3 py-2 flex items-center gap-1 text-xs font-semibold text-[#002856] disabled:opacity-40 bg-transparent border border-zinc-200 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={!next}
              onClick={() => {
                if (!next) return;
                trackLearningEvent("video_navigated", {
                  level,
                  module: "video_course",
                  contentId: next.video_id,
                  entityId: next.video_id,
                  entityType: "course_video",
                  direction: "next",
                  attributes: { from_video_id: videoId },
                });
                navigate(`/video-course/${next.video_id}`);
              }}
              className="px-3 py-2 flex items-center gap-1 text-xs font-semibold text-[#002856] disabled:opacity-40 bg-transparent border border-zinc-200 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-100/95 backdrop-blur-sm border-t border-zinc-100 flex justify-center z-40">
        <button
          onClick={() => setChatOpen(true)}
          className="w-full max-w-[380px] bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" /> Ask about this video
        </button>
      </div>

      <ChatDrawer
        videoId={videoId}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
