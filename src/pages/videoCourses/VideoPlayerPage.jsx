import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Globe,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getVideoCourse,
  getVideoCourseVideo,
  updateVideoCourseProgress,
} from "../../api/videoCourseApi";
import ChatDrawer from "./components/ChatDrawer";
import PdfViewer from "../notes/components/PdfViewer";
import { trackLearningEvent } from "../../telemetry/events";

import { useUsageLimitGate } from "../../hooks/useUsageLimits";

const formatTime = (secs) => {
  const s = Math.floor(Number(secs) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const LANGUAGE_LABELS = { en: "English", hi: "Hindi", kn: "Kannada" };
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const DEFAULT_LANG_PREFS = { audioLang: "en", noteLang: "en" };

function usePersistedState(key, initialValue) {
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);
  const [value, setValue] = useState(read);
  useEffect(() => {
    setValue(read());
  }, [read]);
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable / quota exceeded
    }
  }, [key, value]);
  return [value, setValue];
}

function LanguageDropdown({ options = [], value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const measure = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
      width: rect.width,
    });
  }, []);

  const toggle = (e) => {
    e?.stopPropagation();
    if (!isOpen) measure();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerOutside = (event) => {
      const insideRoot = rootRef.current?.contains(event.target);
      const insideList = listRef.current?.contains(event.target);
      if (!insideRoot && !insideList) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside, {
      passive: true,
    });
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [isOpen, measure]);

  const selected = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer ${
          isOpen
            ? "bg-[#002856] text-white border-[#002856]"
            : "bg-slate-100 border-zinc-200 text-slate-800 hover:bg-slate-200/70"
        }`}
      >
        <span>{selected?.label || "Language"}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={listRef}
            style={{
              top: coords?.top ?? 0,
              right: coords?.right ?? 8,
              width: coords?.width ?? "auto",
            }}
            className="fixed z-[70] rounded-lg overflow-hidden shadow-xl border bg-white border-zinc-200"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  opt.value === value
                    ? "bg-[#edfaff] text-[#002856]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.fullscreenElement || document.body,
        )}
    </div>
  );
}

export default function VideoPlayerPage() {
  const { videoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  useUsageLimitGate("ALL", "video_courses");

  const videoRef = useRef(null);
  const dubAudioRef = useRef(null);
  const videoContainerRef = useRef(null);
  const progressBarRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const resumedRef = useRef(false);
  const completionReportedRef = useRef(false);
  const activeWatchSecondsRef = useRef(0);
  const lastTickRef = useRef(null);

  // Settings menu state & portal coords
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSubmenu, setSettingsSubmenu] = useState(null); // null | 'speed' | 'language'
  const [settingsCoords, setSettingsCoords] = useState(null);
  const settingsButtonRef = useRef(null);
  const settingsMenuRef = useRef(null);

  // Gesture Coordinator for Double-Tap & Single-Tap
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const accumulatedSecondsRef = useRef(0);
  const [dtFeedback, setDtFeedback] = useState({
    side: null, // 'left' | 'right' | null
    seconds: 10,
    active: false,
    animKey: 0,
  });

  const [data, setData] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const langPrefsKey = `skillcase_video_lang_prefs_${user?.user_id || "guest"}`;
  const [langPrefs, setLangPrefs] = usePersistedState(
    langPrefsKey,
    DEFAULT_LANG_PREFS,
  );
  const updatePref = useCallback(
    (pref, lang) => {
      setLangPrefs((prev) => ({ ...prev, [pref]: lang }));
    },
    [setLangPrefs],
  );
  const audioLang = langPrefs.audioLang;
  const noteLang = langPrefs.noteLang;

  const video = data?.video;
  const timestamps = data?.timestamps || [];
  const audioTracks = data?.audio_tracks || [];
  const notes = data?.notes || [];
  const selectedTrack = audioTracks.find((t) => t.language_code === audioLang);
  const selectedNote =
    notes.find((n) => n.language_code === noteLang) || notes[0];
  const dubUrl = selectedTrack?.audio_url;

  const level = video?.proficiency_level;

  const measureSettings = useCallback(() => {
    const rect = settingsButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSettingsCoords({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, []);

  const toggleSettings = (e) => {
    e?.stopPropagation();
    if (!settingsOpen) measureSettings();
    setSettingsOpen((prev) => !prev);
    setSettingsSubmenu(null);
  };

  // Handle click outside settings menu
  useEffect(() => {
    if (!settingsOpen) return undefined;
    const handleOutside = (e) => {
      const insideBtn = settingsButtonRef.current?.contains(e.target);
      const insideMenu = settingsMenuRef.current?.contains(e.target);
      if (!insideBtn && !insideMenu) {
        setSettingsOpen(false);
        setSettingsSubmenu(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    window.addEventListener("resize", measureSettings);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("resize", measureSettings);
    };
  }, [settingsOpen, measureSettings]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted =
        isMuted || (audioLang !== "en" && Boolean(dubUrl));
    }
    if (dubAudioRef.current && videoRef.current) {
      dubAudioRef.current.muted = isMuted;
      dubAudioRef.current.currentTime = videoRef.current.currentTime;
      dubAudioRef.current.playbackRate = playbackRate;
      if (!videoRef.current.paused && audioLang !== "en" && dubUrl) {
        dubAudioRef.current.play().catch(() => {});
      } else {
        dubAudioRef.current.pause();
      }
    }
  }, [audioLang, dubUrl, playbackRate, isMuted]);

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
      level,
      module: "video_course",
      contentId: videoId,
      entityId: videoId,
      entityType: "course_video",
    });
    return () =>
      trackLearningEvent("content_left", {
        level,
        module: "video_course",
        contentId: videoId,
        entityId: videoId,
        entityType: "course_video",
        activeMs: Math.round(performance.now() - startedAt),
      });
  }, [video, videoId, level]);

  const saveProgress = (forceComplete = false, element = null) => {
    const el = element || videoRef.current;
    if (!el || !videoId) return;
    const reachedCompletion =
      forceComplete || (el.duration && el.currentTime / el.duration > 0.9);
    const shouldReportCompletion =
      reachedCompletion && !completionReportedRef.current;
    if (shouldReportCompletion) completionReportedRef.current = true;

    // Collect accumulated active watch seconds
    const deltaSeconds = Math.max(0, Math.floor(activeWatchSecondsRef.current));
    if (deltaSeconds > 0) {
      activeWatchSecondsRef.current -= deltaSeconds;
    }

    updateVideoCourseProgress(videoId, {
      watch_time_seconds: Math.floor(el.currentTime),
      delta_seconds: deltaSeconds,
      completed: shouldReportCompletion,
    })
      .then((res) => {
        if (res?.data?.usage_locked) {
          el.pause();
          setIsPlaying(false);
          window.dispatchEvent(
            new CustomEvent("skillcase:usage-limit", {
              detail: res.data.usage_state || {
                locked: true,
                reason: "usage_limit",
                module_key: "video_courses",
                level: "ALL",
              },
            }),
          );
        }
      })
      .catch((err) => {
        if (shouldReportCompletion) completionReportedRef.current = false;
        if (deltaSeconds > 0) {
          activeWatchSecondsRef.current += deltaSeconds;
        }
        console.error("Failed to update video progress:", err);
      });
  };

  useEffect(() => {
    if (!videoId || !user?.user_id) return undefined;
    const videoElement = videoRef.current;

    // 1-second active watch heartbeat tick
    const tickInterval = setInterval(() => {
      const now = performance.now();
      if (lastTickRef.current) {
        const elapsed = (now - lastTickRef.current) / 1000;
        if (
          videoRef.current &&
          !videoRef.current.paused &&
          document.visibilityState === "visible" &&
          elapsed > 0 &&
          elapsed < 3
        ) {
          activeWatchSecondsRef.current += elapsed;
        }
      }
      lastTickRef.current = now;

      // Flush progress when >= 30 seconds of active playback accumulated
      if (activeWatchSecondsRef.current >= 30) {
        saveProgress();
      }
    }, 1000);

    return () => {
      clearInterval(tickInterval);
      if (videoElement?.currentTime > 0 || activeWatchSecondsRef.current > 0) {
        saveProgress(false, videoElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, user?.user_id, video]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !settingsOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
  }, [isPlaying, settingsOpen]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    const progressBucket =
      Math.floor((el.currentTime / (el.duration || 1)) * 10) * 10;
    if (el.paused) {
      trackLearningEvent("media_played", {
        level,
        module: "video_course",
        contentId: videoId,
        entityId: videoId,
        mediaState: "playing",
        progressBucket,
      });
      el.play().catch(() => {});
      if (dubAudioRef.current && audioLang !== "en" && dubUrl) {
        dubAudioRef.current.currentTime = el.currentTime;
        dubAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
      resetControlsTimeout();
    } else {
      trackLearningEvent("media_paused", {
        level,
        module: "video_course",
        contentId: videoId,
        entityId: videoId,
        mediaState: "paused",
        progressBucket,
      });
      el.pause();
      if (dubAudioRef.current) dubAudioRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
      if (activeWatchSecondsRef.current >= 1) {
        saveProgress();
      }
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  const skip = (delta) => {
    const el = videoRef.current;
    if (!el) return;
    trackLearningEvent("media_seeked", {
      level,
      module: "video_course",
      contentId: videoId,
      entityId: videoId,
      direction: delta > 0 ? "forward" : "backward",
    });
    const target = Math.min(duration, Math.max(0, el.currentTime + delta));
    el.currentTime = target;
    if (dubAudioRef.current) dubAudioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handlePlayerTap = (e) => {
    // If clicking on settings menu or top/bottom interactive buttons, let those handle it
    if (
      settingsButtonRef.current?.contains(e.target) ||
      settingsMenuRef.current?.contains(e.target)
    ) {
      return;
    }

    const container = videoContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const isLeft = clickX < width * 0.4;
    const isRight = clickX > width * 0.6;

    // If already in an active double-tap ripple on the same side, consecutive taps accumulate seamlessly
    if (
      dtFeedback.active &&
      ((isLeft && dtFeedback.side === "left") ||
        (isRight && dtFeedback.side === "right"))
    ) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      accumulatedSecondsRef.current += 10;
      const delta = dtFeedback.side === "left" ? -10 : 10;
      skip(delta);

      setDtFeedback((prev) => ({
        ...prev,
        seconds: accumulatedSecondsRef.current,
        animKey: prev.animKey + 1,
      }));

      dismissTimerRef.current = setTimeout(() => {
        setDtFeedback((prev) => ({ ...prev, active: false }));
        accumulatedSecondsRef.current = 0;
      }, 650);
      return;
    }

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        setShowControls((prev) => {
          const nextState = !prev;
          if (nextState) resetControlsTimeout();
          return nextState;
        });
      }, 260);
    } else if (clickCountRef.current === 2) {
      clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;

      if (isLeft || isRight) {
        const side = isLeft ? "left" : "right";
        accumulatedSecondsRef.current = 10;
        const delta = isLeft ? -10 : 10;
        skip(delta);

        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

        setDtFeedback({
          side,
          seconds: 10,
          active: true,
          animKey: Date.now(),
        });

        dismissTimerRef.current = setTimeout(() => {
          setDtFeedback((prev) => ({ ...prev, active: false }));
          accumulatedSecondsRef.current = 0;
        }, 650);
      } else {
        togglePlay();
      }
    }
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
    if (resumeAt > 0 && resumeAt < el.duration - 5) {
      el.currentTime = resumeAt;
      if (dubAudioRef.current) dubAudioRef.current.currentTime = resumeAt;
      setCurrentTime(resumeAt);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (dubAudioRef.current) dubAudioRef.current.pause();
    trackLearningEvent("media_completed", {
      level,
      module: "video_course",
      contentId: videoId,
      entityId: videoId,
      mediaState: "ended",
      progressBucket: 100,
    });
    saveProgress(true);
  };

  const selectSpeed = (rate) => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = rate;
    if (dubAudioRef.current) dubAudioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setSettingsOpen(false);
    setSettingsSubmenu(null);
    trackLearningEvent("media_speed_changed", {
      level,
      module: "video_course",
      contentId: videoId,
      entityId: videoId,
      speed: rate,
    });
  };

  const toggleFullscreen = (e) => {
    e?.stopPropagation();
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
    const onFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Draggable Scrubber with Pointer Events API
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const wasPlayingBeforeDragRef = useRef(false);

  const getTimeFromPointer = useCallback(
    (clientX) => {
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (!rect || !duration) return 0;
      const percentage = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      return percentage * duration;
    },
    [duration],
  );

  const handlePointerDown = (e) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const target = getTimeFromPointer(e.clientX);
    const el = videoRef.current;
    wasPlayingBeforeDragRef.current = el ? !el.paused : false;
    if (el && !el.paused) el.pause();
    if (dubAudioRef.current && !dubAudioRef.current.paused) {
      dubAudioRef.current.pause();
    }

    setIsDragging(true);
    setDragTime(target);
    if (el) el.currentTime = target;
    if (dubAudioRef.current) dubAudioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    const target = getTimeFromPointer(e.clientX);
    setDragTime(target);
    const el = videoRef.current;
    if (el) el.currentTime = target;
    if (dubAudioRef.current) dubAudioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const target = getTimeFromPointer(e.clientX);
    const el = videoRef.current;
    if (el) el.currentTime = target;
    if (dubAudioRef.current) dubAudioRef.current.currentTime = target;
    setCurrentTime(target);
    setIsDragging(false);

    trackLearningEvent("media_seeked", {
      level,
      module: "video_course",
      contentId: videoId,
      entityId: videoId,
      direction: "scrub_drag",
    });

    if (wasPlayingBeforeDragRef.current && el) {
      el.play().catch(() => {});
      if (dubAudioRef.current && audioLang !== "en" && dubUrl) {
        dubAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  const index = siblings.findIndex(
    (v) => String(v.video_id) === String(videoId),
  );
  const prev = index > 0 ? siblings[index - 1] : null;
  const next =
    index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  const totalCourseSeconds = siblings.reduce(
    (acc, s) => acc + (Number(s.video_duration) || 0),
    0,
  );
  const totalCourseHours =
    totalCourseSeconds > 0
      ? Math.round((totalCourseSeconds / 3600) * 10) / 10
      : null;

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white shadow-sm flex flex-col">
        <div
          className="px-4 pb-3 border-b border-zinc-100 flex items-center justify-between animate-pulse"
          style={{
            paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
        <div className="w-full aspect-video bg-slate-200 animate-pulse" />
        <div className="p-4 flex flex-col gap-3 animate-pulse">
          <div className="h-5 w-3/4 bg-slate-200 rounded" />
          <div className="h-3.5 w-1/2 bg-slate-100 rounded" />
          <div className="h-24 w-full bg-slate-50 rounded-xl mt-2" />
        </div>
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
    <div className="w-full max-w-md mx-auto min-h-[100dvh] lg:min-h-[100dvh] bg-white flex flex-col shadow-sm relative">
      {/* Header with back button */}
      <div
        className="self-stretch px-4 pb-2.5 flex justify-between items-center bg-white"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          onClick={() => navigate(`/video-courses/${video.course_id || ""}`)}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">
            Back
          </span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6 truncate max-w-[55%]">
          {video.course_name || "Video Classes"}
        </span>
      </div>

      <div className="flex-1 w-full overflow-y-auto pb-32">
        {/* Video Player Container (elevated z-index so scrubber floats above following content) */}
        <div className="w-full flex flex-col items-center relative z-20 overflow-visible">
          <div
            ref={videoContainerRef}
            onClick={handlePlayerTap}
            onMouseMove={resetControlsTimeout}
            className="w-full bg-black flex flex-col items-center relative select-none overflow-visible"
          >
            <div
              className={`w-full bg-black relative flex items-center justify-center overflow-visible ${
                isFullscreen ? "flex-1" : "aspect-video"
              }`}
            >
              <div className="relative aspect-video max-w-full max-h-full w-full flex items-center justify-center overflow-visible">
                <video
                  ref={videoRef}
                  src={video.video_url}
                  playsInline
                  data-testid="course-video"
                  className="w-full h-full object-contain cursor-pointer"
                  poster={video.thumbnail_url}
                  onTimeUpdate={() => {
                    const vTime = videoRef.current?.currentTime || 0;
                    setCurrentTime(vTime);
                    if (dubAudioRef.current && audioLang !== "en" && dubUrl) {
                      if (
                        Math.abs(dubAudioRef.current.currentTime - vTime) > 0.3
                      ) {
                        dubAudioRef.current.currentTime = vTime;
                      }
                    }
                  }}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleVideoEnded}
                  onWaiting={() => setIsVideoLoading(true)}
                  onPlaying={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onSeeking={() => setIsVideoLoading(true)}
                  onSeeked={() => setIsVideoLoading(false)}
                  onLoadStart={() => setIsVideoLoading(true)}
                />

                <audio
                  ref={dubAudioRef}
                  src={dubUrl || undefined}
                  preload="auto"
                  className="hidden"
                />

                {/* Loading spinner */}
                {isVideoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}

                {/* Scoped CSS Keyframes for YouTube-Style Double-Tap Fluid Motion */}
                <style>{`
                  @keyframes ytPulse1 {
                    0%, 100% { opacity: 0.2; transform: scale(0.85); }
                    50% { opacity: 1; transform: scale(1.15); }
                  }
                  @keyframes ytPulse2 {
                    0%, 100% { opacity: 0.2; transform: scale(0.85); }
                    50% { opacity: 1; transform: scale(1.15); }
                  }
                  @keyframes ytPulse3 {
                    0%, 100% { opacity: 0.2; transform: scale(0.85); }
                    50% { opacity: 1; transform: scale(1.15); }
                  }
                  @keyframes ytBadgePop {
                    0% { transform: scale(0.88); }
                    50% { transform: scale(1.12); }
                    100% { transform: scale(1); }
                  }
                `}</style>

                {/* Permanent DOM Left Ripple Layer (GPU-Accelerated) */}
                <div
                  className={`absolute inset-y-0 left-0 w-1/2 rounded-r-[160px] pointer-events-none z-30 flex flex-col items-center justify-center transition-all duration-300 ease-out ${
                    dtFeedback.active && dtFeedback.side === "left"
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-95"
                  }`}
                  style={{
                    background:
                      "radial-gradient(ellipse at 0% 50%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 65%, transparent 100%)",
                  }}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div
                      className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-white"
                      style={{
                        animation: "ytPulse1 600ms infinite 300ms ease-in-out",
                      }}
                    />
                    <div
                      className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-white"
                      style={{
                        animation: "ytPulse2 600ms infinite 150ms ease-in-out",
                      }}
                    />
                    <div
                      className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-white"
                      style={{
                        animation: "ytPulse3 600ms infinite 0ms ease-in-out",
                      }}
                    />
                  </div>
                  <div
                    key={dtFeedback.animKey}
                    className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white text-xs font-bold tracking-wide shadow-2xl select-none"
                    style={{
                      animation: "ytBadgePop 250ms cubic-bezier(0.2, 0, 0, 1)",
                    }}
                  >
                    {dtFeedback.seconds} seconds
                  </div>
                </div>

                {/* Permanent DOM Right Ripple Layer (GPU-Accelerated) */}
                <div
                  className={`absolute inset-y-0 right-0 w-1/2 rounded-l-[160px] pointer-events-none z-30 flex flex-col items-center justify-center transition-all duration-300 ease-out ${
                    dtFeedback.active && dtFeedback.side === "right"
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-95"
                  }`}
                  style={{
                    background:
                      "radial-gradient(ellipse at 100% 50%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 65%, transparent 100%)",
                  }}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div
                      className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-white"
                      style={{
                        animation: "ytPulse3 600ms infinite 0ms ease-in-out",
                      }}
                    />
                    <div
                      className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-white"
                      style={{
                        animation: "ytPulse2 600ms infinite 150ms ease-in-out",
                      }}
                    />
                    <div
                      className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-white"
                      style={{
                        animation: "ytPulse1 600ms infinite 300ms ease-in-out",
                      }}
                    />
                  </div>
                  <div
                    key={dtFeedback.animKey}
                    className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white text-xs font-bold tracking-wide shadow-2xl select-none"
                    style={{
                      animation: "ytBadgePop 250ms cubic-bezier(0.2, 0, 0, 1)",
                    }}
                  >
                    {dtFeedback.seconds} seconds
                  </div>
                </div>

                {/* Top Right Controls Overlay: Volume + Gear Settings (Transparent Background) */}
                <div
                  className={`absolute top-2 right-2.5 flex items-center gap-3 z-30 transition-opacity duration-300 ${
                    showControls || !isPlaying || settingsOpen
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className="p-1 bg-transparent border-0 text-white hover:text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] cursor-pointer outline-none transition-all active:scale-95"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>

                  <button
                    ref={settingsButtonRef}
                    type="button"
                    onClick={toggleSettings}
                    aria-label="Settings"
                    className={`p-1 bg-transparent border-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] cursor-pointer outline-none transition-all active:scale-95 ${
                      settingsOpen
                        ? "text-amber-400 rotate-45"
                        : "text-white hover:text-amber-300"
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>

                {/* Center Translucent Controls (Figma Style: Prev, Play/Pause, Next) */}
                <div
                  className={`absolute inset-0 flex items-center justify-center gap-3 transition-opacity duration-300 z-20 ${
                    showControls || !isPlaying
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <button
                    type="button"
                    disabled={!prev}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!prev) return;
                      navigate(`/video-course/${prev.video_id}`);
                    }}
                    aria-label="Previous video"
                    className="w-9 h-9 rounded-lg bg-black/40 hover:bg-black/60 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white backdrop-blur-sm border-0 cursor-pointer transition-all shadow-md"
                  >
                    <SkipBack className="w-4 h-4 fill-white text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="w-10 h-10 rounded-lg bg-black/40 hover:bg-black/60 active:scale-95 flex items-center justify-center text-white backdrop-blur-sm border-0 cursor-pointer transition-all shadow-md"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-white text-white" />
                    ) : (
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!next}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!next) return;
                      navigate(`/video-course/${next.video_id}`);
                    }}
                    aria-label="Next video"
                    className="w-9 h-9 rounded-lg bg-black/40 hover:bg-black/60 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white backdrop-blur-sm border-0 cursor-pointer transition-all shadow-md"
                  >
                    <SkipForward className="w-4 h-4 fill-white text-white" />
                  </button>
                </div>

                {/* Bottom Overlay Row on Video: Time in Black on Left, White Screen Extender on Right */}
                <div
                  className={`absolute bottom-3.5 left-3 right-3 flex items-center justify-between z-20 pointer-events-none transition-opacity duration-300 ${
                    showControls || !isPlaying ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-slate-900 text-xs font-semibold tracking-tight select-none">
                    {formatTime(isDragging ? dragTime : currentTime)} /{" "}
                    {formatTime(duration)}
                  </span>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title="Fullscreen"
                    className="pointer-events-auto p-1 text-white hover:text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-transparent border-0 cursor-pointer outline-none transition-all active:scale-95"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Edge-to-Edge Draggable Red Scrubber Progress Bar with elevated z-index */}
                <div
                  ref={progressBarRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="absolute -bottom-2 left-0 right-0 h-5 group flex items-center cursor-pointer select-none z-50 overflow-visible touch-none"
                >
                  <div
                    className={`w-full ${
                      isDragging ? "h-1.5" : "h-1 group-hover:h-1.5"
                    } bg-zinc-200/90 relative overflow-hidden transition-all`}
                  >
                    <div
                      className="h-full bg-red-600"
                      style={{
                        width: `${((isDragging ? dragTime : currentTime) / (duration || 1)) * 100}%`,
                      }}
                    />
                    {duration > 0 &&
                      timestamps.map((t) => (
                        <span
                          key={t.timestamp_id}
                          className="absolute top-0 h-full w-0.5 bg-white/80"
                          style={{
                            left: `${(t.time_seconds / duration) * 100}%`,
                          }}
                        />
                      ))}
                  </div>
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      isDragging
                        ? "w-4 h-4 scale-110"
                        : "w-3 h-3 group-hover:scale-110"
                    } bg-red-600 rounded-full shadow-[0px_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-1.5 z-50 transition-transform`}
                    style={{
                      left: `${((isDragging ? dragTime : currentTime) / (duration || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Portaled YouTube-Style Settings Popover Menu (Never clipped by overflow) */}
        {settingsOpen &&
          createPortal(
            <div
              ref={settingsMenuRef}
              style={{
                top: settingsCoords?.top ?? 48,
                right: settingsCoords?.right ?? 12,
              }}
              onClick={(e) => e.stopPropagation()}
              className="fixed w-48 bg-neutral-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-zinc-700/80 p-1.5 z-[100] text-xs flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
            >
              {settingsSubmenu === null && (
                <>
                  <button
                    type="button"
                    onClick={() => setSettingsSubmenu("speed")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer border-0 bg-transparent text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-medium">Playback speed</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400 font-medium text-[11px]">
                      <span>
                        {playbackRate === 1 ? "Normal" : `${playbackRate}x`}
                      </span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>

                  {audioTracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSettingsSubmenu("language")}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer border-0 bg-transparent text-white"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-medium">Audio language</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400 font-medium text-[11px]">
                        <span>{LANGUAGE_LABELS[audioLang] || audioLang}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>
                  )}
                </>
              )}

              {settingsSubmenu === "speed" && (
                <>
                  <button
                    type="button"
                    onClick={() => setSettingsSubmenu(null)}
                    className="w-full flex items-center gap-1 px-2.5 py-1.5 text-zinc-400 hover:text-white font-semibold border-b border-zinc-800 cursor-pointer bg-transparent border-0 text-left mb-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Playback speed</span>
                  </button>
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => selectSpeed(rate)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left cursor-pointer border-0 transition-colors ${
                        playbackRate === rate
                          ? "bg-white/15 text-amber-400 font-bold"
                          : "hover:bg-white/10 text-white"
                      }`}
                    >
                      <span>{rate === 1 ? "Normal" : `${rate}x`}</span>
                      {playbackRate === rate && (
                        <Check className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {settingsSubmenu === "language" && (
                <>
                  <button
                    type="button"
                    onClick={() => setSettingsSubmenu(null)}
                    className="w-full flex items-center gap-1 px-2.5 py-1.5 text-zinc-400 hover:text-white font-semibold border-b border-zinc-800 cursor-pointer bg-transparent border-0 text-left mb-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Audio language</span>
                  </button>
                  {audioTracks.map((t) => (
                    <button
                      key={t.language_code}
                      type="button"
                      onClick={() => {
                        updatePref("audioLang", t.language_code);
                        setSettingsOpen(false);
                        setSettingsSubmenu(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left cursor-pointer border-0 transition-colors ${
                        audioLang === t.language_code
                          ? "bg-white/15 text-amber-400 font-bold"
                          : "hover:bg-white/10 text-white"
                      }`}
                    >
                      <span>
                        {LANGUAGE_LABELS[t.language_code] ||
                          t.language_code.toUpperCase()}
                      </span>
                      {audioLang === t.language_code && (
                        <Check className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>,
            document.fullscreenElement || document.body,
          )}

        {/* Video Info & Metadata Row (Figma Style) */}
        <div className="px-4 pt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-slate-900 text-lg font-bold leading-6 text-left">
              {video.title}
            </h1>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs font-normal">
                {siblings.length > 0
                  ? `${siblings.length} videos | ${totalCourseHours ? `${totalCourseHours} hours` : `${formatTime(video.video_duration)}`}`
                  : `${formatTime(video.video_duration)}`}
              </span>

              {video.completed && (
                <div className="px-2.5 py-0.5 bg-[#eaf7f0] text-[#1e7e34] border border-[#c3ebc6] rounded-full text-xs font-normal flex items-center gap-1">
                  <span>watched</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Description Dropdown Accordion (Closed by default) */}
          {video.description && (
            <details className="group bg-[#F8F9FA] rounded-2xl border border-zinc-100 overflow-hidden">
              <summary className="p-4 flex items-center justify-between gap-2 cursor-pointer list-none select-none hover:bg-zinc-100/50 transition-colors [&::-webkit-details-marker]:hidden">
                <span className="text-left text-slate-900 text-base font-bold">
                  Video Description
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-zinc-200/60">
                <p className="text-slate-700 text-xs font-normal leading-relaxed text-left whitespace-pre-line">
                  {video.description}
                </p>
              </div>
            </details>
          )}

          {/* Video Notes (PDF Viewer) */}
          {notes.length > 0 && (
            <details
              className="group bg-[#F8F9FA] rounded-2xl border border-zinc-100 overflow-hidden"
              onToggle={(e) => {
                if (e.target.open) {
                  trackLearningEvent("content_presented", {
                    level,
                    module: "video_course",
                    contentId: videoId,
                    entityId: videoId,
                    entityType: "video_note",
                    attributes: { language_code: noteLang },
                  });
                }
              }}
            >
              <summary className="p-4 flex items-center justify-between gap-2 cursor-pointer list-none select-none hover:bg-zinc-100/50 transition-colors [&::-webkit-details-marker]:hidden">
                <span className="text-left text-slate-900 text-base font-bold">
                  Video Notes
                </span>
                <div className="flex items-center gap-2">
                  {notes.length > 1 && (
                    <LanguageDropdown
                      options={notes.map((n) => ({
                        value: n.language_code,
                        label:
                          LANGUAGE_LABELS[n.language_code] || n.language_code,
                      }))}
                      value={noteLang}
                      onChange={(lang) => updatePref("noteLang", lang)}
                    />
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180" />
                </div>
              </summary>
              <div className="p-4 bg-white border-t border-zinc-100">
                <PdfViewer fileUrl={selectedNote?.file_url} width={340} />
              </div>
            </details>
          )}

          {/* Previous / Next Navigation */}
          <div className="flex justify-between items-center gap-2 pt-2 pb-2">
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
              className="px-3.5 py-2 flex items-center gap-1.5 text-xs font-semibold text-[#002856] disabled:opacity-40 bg-white border border-zinc-200 hover:bg-slate-50 rounded-xl cursor-pointer disabled:cursor-not-allowed transition-colors"
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
              className="px-3.5 py-2 flex items-center gap-1.5 text-xs font-semibold text-[#002856] disabled:opacity-40 bg-white border border-zinc-200 hover:bg-slate-50 rounded-xl cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom AI Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-black/40 via-black/15 to-transparent pointer-events-none z-40 flex justify-center">
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Ask anything about this video"
          className="pointer-events-auto w-full bg-white hover:bg-slate-50 active:scale-[0.99] rounded-xl border border-zinc-200 shadow-xl p-2.5 flex items-center gap-3 cursor-pointer transition-all outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-100 to-indigo-100 text-[#002856] flex items-center justify-center shrink-0 shadow-sm border border-sky-200/50">
            <Bot className="w-4 h-4 text-[#002856]" />
          </div>
          <span className="flex-1 text-left text-slate-500 text-sm font-normal truncate">
            Ask anything about this video...
          </span>
        </button>
      </div>

      <ChatDrawer
        videoId={videoId}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        language={audioLang}
      />
    </div>
  );
}
