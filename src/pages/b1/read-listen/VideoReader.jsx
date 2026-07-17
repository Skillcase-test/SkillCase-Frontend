import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  Volume2,
  Play,
  Pause,
  FileText,
  Maximize,
  Minimize,
} from "lucide-react";
import {
  getB1VideoById,
  submitB1VideoQuiz,
  updateB1VideoProgress,
} from "../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";
import { trackLearningEvent } from "../../../telemetry/events";

export default function VideoReader() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const progressBarRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Checks if we are visiting in "Review Mode" (from success page or if already completed)
  const reviewMode =
    location.state?.reviewMode ||
    (data?.video?.is_quiz_completed &&
      !location.state?.reattemptMode) ||
    false;

  const reviewAnswers = location.state?.answers;
  const quizResults = location.state?.results || [];

  // 1. Fetch video details
  useEffect(() => {
    if (!user?.user_id) return;

    const fetchVideo = async () => {
      setLoading(true);
      try {
        const res = await getB1VideoById(videoId);
        const fetchedData = res.data;

        if (
          fetchedData?.video?.is_quiz_completed &&
          !location.state?.reattemptMode &&
          !location.state?.reviewMode
        ) {
          const savedAnswers = fetchedData.video.user_answers || {};
          const generatedResults = getSavedResultsArray(
            savedAnswers,
            fetchedData.video.questions || [],
          );

          navigate("/b1/read-listen/video-success", {
            state: {
              contentId: parseInt(videoId),
              score: parseFloat(fetchedData.video.quiz_score || 0),
              correctCount: parseInt(fetchedData.video.correct_count || 0),
              incorrectCount: parseInt(fetchedData.video.incorrect_count || 0),
              skippedCount: parseInt(fetchedData.video.skipped_count || 0),
              answers: savedAnswers,
              results: generatedResults,
              chapterId: fetchedData.video.course_id || "unassigned",
              totalQuestions: fetchedData.video.questions?.length || 0,
            },
            replace: true,
          });
          return;
        }

        setData(fetchedData);
      } catch (err) {
        console.error("Error fetching B1 video details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [user?.user_id, videoId]);

  // 2. Prepopulate answers when reviewMode is active
  useEffect(() => {
    if (data) {
      if (reviewMode) {
        const initialAnswers = reviewAnswers || data.video?.user_answers || {};
        setAnswers(initialAnswers);
      } else {
        setAnswers({});
      }
    }
  }, [data, reviewMode, reviewAnswers]);

  useEffect(() => {
    if (!data?.video) return undefined;
    const startedAt = performance.now();
    trackLearningEvent("content_presented", {
      level: "B1", module: "listening", contentId: videoId, entityId: videoId,
      total: data.video.questions?.length,
    });
    return () => trackLearningEvent("content_left", {
      level: "B1", module: "listening", contentId: videoId, entityId: videoId,
      activeMs: Math.round(performance.now() - startedAt),
    });
  }, [data?.video, videoId]);

  // 3. Heartbeat progress updates (every 10 seconds)
  useEffect(() => {
    if (reviewMode || !videoId || !user?.user_id) return;

    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const watchTime = Math.floor(videoRef.current.currentTime);
        const completed = videoRef.current.duration
          ? videoRef.current.currentTime / videoRef.current.duration > 0.9
          : false;

        updateB1VideoProgress(videoId, {
          watch_time_seconds: watchTime,
          completed,
        }).catch((err) => {
          console.error("Failed to update video progress:", err);
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [videoId, reviewMode, user?.user_id]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      trackLearningEvent("media_played", { level: "B1", module: "listening", contentId: videoId, entityId: videoId, mediaState: "playing", progressBucket: Math.floor((video.currentTime / (video.duration || 1)) * 10) * 10 });
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      trackLearningEvent("media_paused", { level: "B1", module: "listening", contentId: videoId, entityId: videoId, mediaState: "paused", progressBucket: Math.floor((video.currentTime / (video.duration || 1)) * 10) * 10 });
      video.pause();
      setIsPlaying(false);
    }
  };

  const skipBackward = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      trackLearningEvent("media_seeked", { level: "B1", module: "listening", contentId: videoId, entityId: videoId, direction: "backward" });
      video.currentTime = Math.max(0, video.currentTime - 10);
    }
  };

  const skipForward = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      trackLearningEvent("media_seeked", { level: "B1", module: "listening", contentId: videoId, entityId: videoId, direction: "forward" });
      video.currentTime = Math.min(duration, video.currentTime + 10);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    trackLearningEvent("media_completed", { level: "B1", module: "listening", contentId: videoId, entityId: videoId, mediaState: "ended", progressBucket: 100 });
  };

  const toggleSpeed = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.25;
    else if (playbackRate === 1.25) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;

    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    trackLearningEvent("media_speed_changed", { level: "B1", module: "listening", contentId: videoId, entityId: videoId, speed: nextRate });
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    const container = videoContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isFullscreen]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.min(1, Math.max(0, clickX / width));
    const video = videoRef.current;
    if (video) {
      video.currentTime = percentage * duration;
      setCurrentTime(percentage * duration);
    }
  };

  const handleChapterClick = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = parseFloat(seconds);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatTime = (secs) => {
    const s = parseFloat(secs) || 0;
    const m = Math.floor(s / 60);
    const remainingSecs = Math.floor(s % 60);
    return `${m}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const getDifficultyBadgeStyle = (diff) => {
    const d = String(diff || "Easy").toLowerCase();
    if (d === "easy") {
      return "bg-green-700/10 border-green-700/20 text-green-700";
    }
    if (d === "medium" || d === "intermediate" || d === "moderate") {
      return "bg-amber-100/60 border-orange-400/20 text-orange-500";
    }
    return "bg-red-100 border-red-500/20 text-red-500";
  };

  const handleOptionClick = (qIdx, optIdx) => {
    trackLearningEvent("answer_selected", { level: "B1", module: "listening", contentId: videoId, questionId: data?.video?.questions?.[qIdx]?.id, index: qIdx, total: data?.video?.questions?.length, questionType: data?.video?.questions?.[qIdx]?.type });
    if (reviewMode) return; // Cannot modify answers in review mode
    const q = data?.video?.questions?.[qIdx];
    const qType = q?.type || "mcq_single";

    if (qType === "mcq_multi") {
      const currentSelection = Array.isArray(answers[qIdx])
        ? answers[qIdx]
        : [];
      const nextSelection = currentSelection.includes(optIdx)
        ? currentSelection.filter((i) => i !== optIdx)
        : [...currentSelection, optIdx];
      setAnswers((prev) => ({
        ...prev,
        [qIdx]: nextSelection,
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [qIdx]: optIdx,
      }));
    }
  };

  const handleViewSavedResult = () => {
    if (!data || !data.video) return;

    const savedAnswers = data.video.user_answers || {};
    const generatedResults = getSavedResultsArray(savedAnswers);

    navigate("/b1/read-listen/video-success", {
      state: {
        contentId: parseInt(videoId),
        score: parseFloat(data.video.quiz_score || 0),
        correctCount: parseInt(data.video.correct_count || 0),
        incorrectCount: parseInt(data.video.incorrect_count || 0),
        skippedCount: parseInt(data.video.skipped_count || 0),
        answers: savedAnswers,
        results: generatedResults,
        chapterId: data.video.course_id || "unassigned",
        totalQuestions: data.video.questions?.length || 0,
      },
    });
  };

  const getSavedResultsArray = (
    savedAnswers,
    questionsList = data?.video?.questions || [],
  ) => {
    return questionsList.map((q, i) => {
      const userAns = savedAnswers[i];
      const type = q.type || "mcq_single";

      if (userAns === undefined || userAns === null) {
        return {
          questionIndex: i,
          status: "skipped",
          correctAnswer: q.correct,
        };
      }
      if (typeof userAns === "string" && !userAns.trim()) {
        return {
          questionIndex: i,
          status: "skipped",
          correctAnswer: q.correct,
        };
      }
      if (Array.isArray(userAns) && userAns.length === 0) {
        return {
          questionIndex: i,
          status: "skipped",
          correctAnswer: q.correct,
        };
      }

      let status = "incorrect";

      if (type === "mcq_single" || type === "true_false") {
        const selectedOptText = q.options?.[userAns];
        if (selectedOptText !== undefined) {
          const isCorrect =
            String(selectedOptText).trim().toLowerCase() ===
            String(q.correct).trim().toLowerCase();
          status = isCorrect ? "correct" : "incorrect";
        }
      } else if (type === "mcq_multi") {
        const selectedIndices = Array.isArray(userAns) ? userAns : [userAns];
        const userArr = selectedIndices
          .map((idx) =>
            String(q.options?.[idx] || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean);

        let correctArr = [];
        if (Array.isArray(q.correct)) {
          correctArr = q.correct.map((v) => String(v).trim().toLowerCase());
        } else if (typeof q.correct === "string") {
          correctArr = q.correct
            .split(",")
            .map((v) => v.trim().toLowerCase())
            .filter(Boolean);
        }

        if (userArr.length === 0) {
          status = "skipped";
        } else {
          const match =
            userArr.length === correctArr.length &&
            userArr.every((v) => correctArr.includes(v));
          status = match ? "correct" : "incorrect";
        }
      } else if (type === "fill_blanks") {
        const userStr = String(userAns).trim().toLowerCase();
        if (Array.isArray(q.correct)) {
          const isCorrect = q.correct.some(
            (opt) => String(opt).trim().toLowerCase() === userStr,
          );
          status = isCorrect ? "correct" : "incorrect";
        } else {
          const isCorrect = String(q.correct).trim().toLowerCase() === userStr;
          status = isCorrect ? "correct" : "incorrect";
        }
      }

      return {
        questionIndex: i,
        status,
        correctAnswer: q.correct,
      };
    });
  };

  const handleSubmit = async () => {
    trackLearningEvent("quiz_submitted", { level: "B1", module: "listening", contentId: videoId, entityId: videoId, total: data?.video?.questions?.length, lifecycle: "started" });
    if (reviewMode) {
      navigate(`/b1/read-listen/list/video/${data?.video?.course_id || "unassigned"}`);
      return;
    }

    try {
      const payload = {
        answers,
      };

      const res = await submitB1VideoQuiz(videoId, payload);
      if (res.data) {
        const qCount = data?.video?.questions?.length || 0;
        if (qCount > 0) {
          import("../../../api/streakApi")
            .then(({ logStreakPoints }) => {
              logStreakPoints({ points: qCount }).catch(() => {});
            })
            .catch(() => {});
        }

        navigate("/b1/read-listen/video-success", {
          state: {
            contentId: parseInt(videoId),
            score: res.data.score,
            correctCount: res.data.correctCount,
            incorrectCount: res.data.incorrectCount,
            skippedCount: res.data.skippedCount,
            answers,
            results: res.data.results,
            chapterId: data?.video?.course_id || "unassigned",
            totalQuestions: qCount,
          },
        });
      }
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      toast.error("Failed to submit quiz results. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (!data || !data.video) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white p-6 flex flex-col shadow-sm">
        <p className="text-center text-slate-400 py-12">
          Video details not found.
        </p>
      </div>
    );
  }

  const { video, timestamps } = data;
  const questions = video.questions || [];
  const alphabet = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      <Toaster position="top-center" />

      {/* Back & Module Title navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate(`/b1/read-listen/list/video/${video.course_id || "unassigned"}`)}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Video &amp; Audio
          </span>
        </div>
      </div>

      {/* Video Content Scroll Area */}
      <div className="flex-1 w-full overflow-y-auto">
        <div className="self-stretch px-4 relative flex flex-col justify-start items-center">
          {/* Custom Video Player wrapper */}
          <div
            ref={videoContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() =>
              isFullscreen && isPlaying && setShowControls(false)
            }
            className="self-stretch bg-black rounded-lg flex flex-col justify-start items-center relative overflow-hidden"
          >
            {/* Video Box */}
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
                  className="w-full h-full object-contain cursor-pointer"
                  poster={video.thumbnail_url}
                  onTimeUpdate={handleTimeUpdate}
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

                {/* Loader Spinner Overlay */}
                {isVideoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}

                {/* Big Center Play Button (only when paused and not loading) */}
                {!isPlaying && !isVideoLoading && (
                  <div
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer z-10"
                  >
                    <div className="w-10 h-10 bg-white rounded-full shadow-[0px_0px_8px_0px_rgba(0,0,0,0.10)] flex items-center justify-center hover:scale-105 transition-all">
                      <Play className="w-4 h-4 text-[#002856] fill-[#002856]" />
                    </div>
                  </div>
                )}

                {/* Fullscreen Button overlay */}
                <div
                  onClick={toggleFullscreen}
                  className={`p-1 right-2 top-2 absolute bg-black/60 rounded-sm inline-flex justify-start items-center gap-2.5 cursor-pointer z-20 hover:bg-black/80 transition-opacity duration-300 ${
                    showControls
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                  title="Fullscreen"
                >
                  <div className="w-4 h-4 relative overflow-hidden flex items-center justify-center text-white">
                    {isFullscreen ? (
                      <Minimize className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Video Control bar beneath the video */}
            <div
              className={`w-full h-12 bg-black inline-flex justify-center items-center gap-4 transition-all duration-300 ${
                isFullscreen
                  ? "absolute bottom-0 left-0 right-0 z-30"
                  : "rounded-bl-lg rounded-br-lg"
              } ${
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex-1 px-3 flex justify-start items-center gap-4">
                <div className="flex justify-start items-center gap-2.5 text-white">
                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlay}
                    className="bg-transparent border-none text-white hover:text-yellow-400 transition-colors cursor-pointer outline-none flex items-center justify-center"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white" />
                    )}
                  </button>

                  {/* Skip backward 10s */}
                  <button
                    onClick={skipBackward}
                    className="bg-transparent border-none text-white hover:text-yellow-400 transition-colors cursor-pointer outline-none flex items-center justify-center"
                    title="Rewind 10s"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <text
                        x="12"
                        y="15.5"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                        fill="currentColor"
                        stroke="none"
                        className="font-sans font-bold"
                      >
                        10
                      </text>
                    </svg>
                  </button>

                  {/* Skip forward 10s */}
                  <button
                    onClick={skipForward}
                    className="bg-transparent border-none text-white hover:text-yellow-400 transition-colors cursor-pointer outline-none flex items-center justify-center"
                    title="Forward 10s"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <text
                        x="12"
                        y="15.5"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                        fill="currentColor"
                        stroke="none"
                        className="font-sans font-bold"
                      >
                        10
                      </text>
                    </svg>
                  </button>
                </div>

                {/* Custom progress slider bar */}
                <div className="flex-1 flex justify-center items-center gap-1">
                  <div
                    ref={progressBarRef}
                    onClick={handleProgressClick}
                    className="flex-1 h-6 relative inline-flex flex-col justify-center items-center gap-1.5 cursor-pointer"
                  >
                    <div className="self-stretch h-2.5 bg-neutral-800 rounded-full relative overflow-hidden">
                      <div
                        className="h-full bg-[#F5A623] rounded-full"
                        style={{
                          width: `${(currentTime / (duration || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Playback speed toggle button */}
                <button
                  onClick={toggleSpeed}
                  className="bg-transparent border-none text-white hover:text-[#F5A623] font-bold transition-all cursor-pointer flex items-center justify-center text-xs outline-none"
                  title="Playback Speed"
                >
                  <span>{playbackRate} x</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Chapters bar */}
        {timestamps && timestamps.length > 0 && (
          <div className="self-stretch px-4 py-3 flex flex-col gap-2 bg-slate-50 border-b border-zinc-100 shrink-0">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider text-left">
              Chapters
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
              {timestamps.map((t) => (
                <button
                  key={t.timestamp_id}
                  onClick={() => handleChapterClick(t.time_seconds)}
                  className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-[#002856] text-[#002856] text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer"
                >
                  {formatTime(t.time_seconds)} - {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title & Metadata */}
        <div className="self-stretch px-4 pt-4 flex flex-col justify-start items-start gap-3">
          <h1 className="justify-start text-sky-950 text-base font-semibold leading-5 text-left">
            {video.title}
          </h1>

          <div className="self-stretch inline-flex justify-between items-center">
            <div className="flex justify-start items-start gap-1.5">
              <div className="px-2 py-0.5 bg-black/5 rounded-[40px] flex justify-center items-center">
                <span className="text-center text-neutral-500 text-xs font-medium leading-5">
                  {video.proficiency_level || "B1"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-[40px] border flex justify-center items-center gap-1.5 ${getDifficultyBadgeStyle(
                  video.difficulty || "Medium",
                )}`}
              >
                <span className="text-center text-xs font-medium leading-5 capitalize">
                  {video.difficulty || "Medium"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Section Header */}
        <div className="self-stretch w-full px-4 py-4 mt-6 bg-black/5 inline-flex justify-center items-center gap-3.5">
          <div className="w-9 h-9 relative bg-blue-950 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">?</span>
          </div>
          <h2 className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left">
            Questions
          </h2>
        </div>

        {/* Questions Cards */}
        <div className="self-stretch px-4 pt-4 pb-24 bg-black/5 flex flex-col justify-start items-center gap-6">
          {questions.map((q, qIdx) => {
            const userSelectedIdx = answers[qIdx];
            const result = quizResults.find((r) => r.questionIndex === qIdx);
            const isQuestionSkipped = result?.status === "skipped";
            const qType = q.type || "mcq_single";

            if (qType === "fill_blanks") {
              const value = String(answers[qIdx] || "").trim();
              const isCorrect = result?.status === "correct";
              let inputClass =
                "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white border-zinc-300 text-xs text-slate-800";
              if (reviewMode) {
                if (isCorrect) {
                  inputClass =
                    "w-full px-3 py-2 border rounded-lg bg-emerald-50/20 border-green-700 text-green-700 font-semibold";
                } else {
                  inputClass =
                    "w-full px-3 py-2 border rounded-lg bg-red-50/20 border-red-600 text-red-500 font-semibold";
                }
              }

              return (
                <div
                  key={qIdx}
                  className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4"
                >
                  <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                    {qIdx + 1}. {q.question}
                  </div>
                  <div className="self-stretch w-full">
                    <input
                      type="text"
                      value={answers[qIdx] || ""}
                      disabled={reviewMode}
                      onChange={(e) => {
                        if (reviewMode) return;
                        setAnswers((prev) => ({
                          ...prev,
                          [qIdx]: e.target.value,
                        }));
                      }}
                      placeholder="Schreibe die Antwort hier..."
                      className={inputClass}
                    />
                  </div>
                  {reviewMode && (
                    <div className="self-stretch border-t border-zinc-100 pt-2.5 mt-1">
                      {!isCorrect ? (
                        <div className="text-left">
                          <span className="text-red-500 text-xs font-semibold">
                            Incorrect / Skipped:
                          </span>
                          <p className="text-red-500 text-[11px] font-normal leading-normal mt-0.5">
                            Your answer: "{value || "(empty)"}".
                          </p>
                          <span className="text-green-700 text-xs font-semibold mt-1 block">
                            Correct Answer:
                          </span>
                          <p className="text-green-700 text-[11px] font-normal leading-normal mt-0.5">
                            {Array.isArray(q.correct)
                              ? q.correct.join(" or ")
                              : q.correct}
                          </p>
                        </div>
                      ) : (
                        <div className="text-left">
                          <span className="text-green-700 text-xs font-semibold">
                            Correct:
                          </span>
                          <p className="text-green-700 text-[11px] font-normal leading-normal mt-0.5">
                            {`The correct answer is "${
                              Array.isArray(q.correct)
                                ? q.correct.join(" or ")
                                : q.correct
                            }".`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={qIdx}
                className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4"
              >
                <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                  {qIdx + 1}. {q.question}
                </div>

                <div className="self-stretch flex flex-col justify-start items-start gap-2">
                  {q.options?.map((opt, optIdx) => {
                    let isSelected = false;
                    let isCorrectAnswer = false;

                    if (qType === "mcq_multi") {
                      isSelected =
                        Array.isArray(userSelectedIdx) &&
                        userSelectedIdx.includes(optIdx);
                      let correctArr = [];
                      if (Array.isArray(q.correct)) {
                        correctArr = q.correct.map((v) =>
                          String(v).trim().toLowerCase(),
                        );
                      } else if (typeof q.correct === "string") {
                        correctArr = q.correct
                          .split(",")
                          .map((v) => v.trim().toLowerCase())
                          .filter(Boolean);
                      }
                      isCorrectAnswer = correctArr.includes(
                        String(opt).trim().toLowerCase(),
                      );
                    } else {
                      isSelected = userSelectedIdx === optIdx;
                      isCorrectAnswer =
                        String(opt).trim().toLowerCase() ===
                        String(q.correct).trim().toLowerCase();
                    }

                    let cardClass = "bg-white border-zinc-200";
                    let letterContainerClass = "bg-black/5 text-gray-900/30";
                    let letterTextClass = "text-gray-900/30";
                    let optionTextClass = "text-slate-900";
                    let showGreenDot = false;
                    let showRedCross = false;

                    if (reviewMode) {
                      if (isCorrectAnswer) {
                        cardClass = "bg-emerald-100/30 border-green-700";
                        letterContainerClass = "bg-green-700/10 text-green-700";
                        letterTextClass = "text-green-700";
                        optionTextClass = "text-green-700 font-semibold";
                        showGreenDot = true;
                      } else if (isSelected) {
                        cardClass = "bg-red-100/40 border-red-600";
                        letterContainerClass = "bg-red-500/10 text-red-500";
                        letterTextClass = "text-red-500";
                        optionTextClass = "text-red-500 font-semibold";
                        showRedCross = true;
                      } else {
                        cardClass = "bg-white border-zinc-200 opacity-60";
                        letterContainerClass = "bg-black/5 text-gray-900/20";
                        letterTextClass = "text-gray-900/20";
                        optionTextClass = "text-slate-400";
                      }
                    } else if (isSelected) {
                      cardClass = "bg-blue-600/5 border-blue-600";
                      letterContainerClass = "bg-blue-600/10 text-blue-600";
                      letterTextClass = "text-blue-600";
                      optionTextClass = "text-blue-600 font-semibold";
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleOptionClick(qIdx, optIdx)}
                        className={`w-full p-2.5 rounded-lg border inline-flex justify-start items-center gap-3 transition-all ${
                          reviewMode
                            ? "cursor-default"
                            : "cursor-pointer hover:bg-slate-50/50"
                        } ${cardClass}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-sm overflow-hidden shrink-0 flex items-center justify-center ${letterContainerClass}`}
                        >
                          <span
                            className={`text-sm font-medium leading-6 ${letterTextClass}`}
                          >
                            {alphabet[optIdx]}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-start items-center gap-2.5 min-w-0">
                          <span
                            className={`flex-1 justify-start text-xs font-medium leading-5 text-left break-words ${optionTextClass}`}
                          >
                            {opt}
                          </span>
                          {showGreenDot && (
                            <span className="w-4 h-4 rounded-full bg-green-700 flex items-center justify-center shrink-0">
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          )}
                          {showRedCross && (
                            <span className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Correct answer in Review Mode */}
                {reviewMode && (
                  <div className="self-stretch border-t border-zinc-100 pt-2.5 mt-1">
                    <div className="text-left">
                      <span className="text-green-700 text-xs font-semibold">
                        Correct Option:
                      </span>
                      <p className="text-green-700 text-[11px] font-normal leading-normal mt-0.5">
                        The correct answer is Option{" "}
                        {qType === "mcq_multi"
                          ? (() => {
                              let correctArr = [];
                              if (Array.isArray(q.correct)) {
                                correctArr = q.correct.map((v) =>
                                  String(v).trim().toLowerCase(),
                                );
                              } else if (typeof q.correct === "string") {
                                correctArr = q.correct
                                  .split(",")
                                  .map((v) => v.trim().toLowerCase())
                                  .filter(Boolean);
                              }
                              return q.options
                                ?.map((o, oi) =>
                                  correctArr.includes(
                                    String(o).trim().toLowerCase(),
                                  )
                                    ? alphabet[oi]
                                    : null,
                                )
                                .filter(Boolean)
                                .join(", ");
                            })()
                          : alphabet[
                              q.options?.findIndex(
                                (o) =>
                                  String(o).trim().toLowerCase() ===
                                  String(q.correct).trim().toLowerCase(),
                              )
                            ]}
                        : "
                        {Array.isArray(q.correct)
                          ? q.correct.join(", ")
                          : q.correct}
                        "
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Button Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-100/95 backdrop-blur-sm border-t border-zinc-100 flex flex-col items-center gap-2.5 z-40 shrink-0">
        <button
          onClick={reviewMode ? handleViewSavedResult : handleSubmit}
          className="w-full max-w-[380px] bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-center text-sm"
        >
          {reviewMode ? "View Overall Result" : "Check Result"}
        </button>
      </div>
    </div>
  );
}
