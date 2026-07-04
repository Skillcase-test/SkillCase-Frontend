import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import {
  getB1DescribeSpeakContent,
  getB1DescribeSpeakChapters,
  resetB1DescribeSpeakProgress,
} from "../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

import WorkspaceHeader from "./components/WorkspaceHeader";
import OverallResultsView from "./components/OverallResultsView";
import ReviewAnswersView from "./components/ReviewAnswersView";
import { formatSeconds } from "./utils/timeUtils";

export default function DescribeSpeakSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const stateFromLocation = location.state;

  // localStorage key is scoped per user so shared devices don't bleed state across accounts
  const localStorageKey = `b1_describe_speak_last_topic_id_${user?.user_id || "guest"}`;

  // Retrieve or recover topic ID
  const [topicId] = useState(() => {
    return (
      stateFromLocation?.topicId ||
      parseInt(localStorage.getItem(`b1_describe_speak_last_topic_id_${user?.user_id || "guest"}`) || "0") ||
      null
    );
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("overall"); // 'overall' | 'review'

  // Audio Playback states
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(() => {
    return stateFromLocation?.recordDuration || 0;
  });
  const audioRef = useRef(null);

  // Button interaction states
  const [navigatingNext, setNavigatingNext] = useState(false);
  const [resettingProgress, setResettingProgress] = useState(false);
  const navigatingRef = useRef(false); // ref guard — prevents double-tap race on handleTryNext

  // Recover state or load from database on manual refresh
  useEffect(() => {
    if (!user?.user_id) return;

    if (stateFromLocation?.topicId) {
      localStorage.setItem(
        localStorageKey,
        String(stateFromLocation.topicId),
      );
      setData({
        topicId: stateFromLocation.topicId,
        writingText: stateFromLocation.writingText,
        writingFeedback: stateFromLocation.writingFeedback,
        speakingFeedback: stateFromLocation.speakingFeedback,
        audioUrl: stateFromLocation.audioUrl,
        topic: stateFromLocation.topic,
      });
      setLoading(false);
    } else if (topicId) {
      const loadProgress = async () => {
        try {
          const res = await getB1DescribeSpeakContent(topicId);
          const topicInfo = res.data;
          if (topicInfo && topicInfo.progress) {
            setData({
              topicId: topicInfo.id,
              writingText: topicInfo.progress.writing_text,
              writingFeedback: topicInfo.progress.writing_feedback,
              speakingFeedback: topicInfo.progress.speaking_feedback,
              audioUrl: topicInfo.progress.audio_url,
              recordDuration: topicInfo.progress.record_duration
                ? parseFloat(topicInfo.progress.record_duration)
                : null,
              topic: {
                id: topicInfo.id,
                title: topicInfo.title,
                prompt_image_url: topicInfo.prompt_image_url,
                helpful_words: topicInfo.helpful_words,
              },
            });
          } else {
            toast.error("No progress found for this chapter.");
            navigate("/b1/describe-speak");
          }
        } catch (err) {
          console.error("Error recovering progress data:", err);
          toast.error("Failed to load results details.");
          navigate("/b1/describe-speak");
        } finally {
          setLoading(false);
        }
      };
      loadProgress();
    } else {
      navigate("/b1/describe-speak");
    }
  }, [topicId, stateFromLocation, user?.user_id, navigate]);

  // Audio Playback listeners setup
  useEffect(() => {
    const audioUrl = data?.audioUrl;
    // Resolve the best known duration: navigation state > DB value > 0
    const knownDuration =
      stateFromLocation?.recordDuration || data?.recordDuration || 0;

    if (audioUrl) {
      const audio = new Audio();

      // Pre-populate immediately from the known duration so the display
      // is correct before any async metadata event fires
      if (knownDuration) {
        setPlaybackDuration(knownDuration);
      }

      const updateDuration = () => {
        const d = audio.duration;
        if (d && isFinite(d) && !isNaN(d)) {
          setPlaybackDuration(d);
        }
        // Otherwise keep the knownDuration value already set above
      };

      const onLoadedMetadata = () => {
        updateDuration();
      };
      const onTimeUpdate = () => {
        setPlaybackTime(audio.currentTime || 0);
        updateDuration();
      };
      const onEnded = () => {
        setIsPlayingBack(false);
        setPlaybackTime(0);
      };

      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("durationchange", onLoadedMetadata);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);

      audio.preload = "auto";
      audio.src = audioUrl;
      audioRef.current = audio;
      audio.load();

      return () => {
        audio.pause();
        audio.src = "";  // cancels any pending browser network fetch
        audio.load();
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("durationchange", onLoadedMetadata);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
      };
    } else {
      audioRef.current = null;
      setIsPlayingBack(false);
      setPlaybackTime(0);
      setPlaybackDuration(knownDuration);
    }
  }, [data?.audioUrl, data?.recordDuration, stateFromLocation?.recordDuration]);

  const handlePlaybackPlayPause = () => {
    if (!audioRef.current) return;
    if (isPlayingBack) {
      audioRef.current.pause();
      setIsPlayingBack(false);
    } else {
      // Wait for play() to resolve before marking as playing
      audioRef.current
        .play()
        .then(() => setIsPlayingBack(true))
        .catch((err) => {
          console.error("Audio playback error:", err);
          toast.error("Could not play audio. Please tap again.");
        });
    }
  };

  const handleTryNext = async () => {
    // Ref-based guard — prevents a second tap from firing a concurrent API call
    // before the first one navigates away (state update alone is too slow on laggy devices)
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setNavigatingNext(true);
    try {
      const res = await getB1DescribeSpeakChapters();
      const list = Array.isArray(res.data) ? res.data : [];
      const nextTopic = list.find((t) => !t.is_completed && t.id !== topicId);

      if (nextTopic) {
        navigate(`/b1/describe-speak/workspace/${nextTopic.id}`);
      } else {
        const currentIdx = list.findIndex((t) => t.id === topicId);
        if (currentIdx !== -1 && currentIdx < list.length - 1) {
          navigate(`/b1/describe-speak/workspace/${list[currentIdx + 1].id}`);
        } else {
          toast.success(
            "Congratulations! You have completed all Describe & Speak chapters!",
          );
          navigate("/b1/describe-speak");
        }
      }
    } catch (err) {
      console.error("Error finding next topic:", err);
      navigate("/b1/describe-speak");
    } finally {
      navigatingRef.current = false;
      setNavigatingNext(false);
    }
  };

  const handleReattempt = async () => {
    setResettingProgress(true);
    try {
      await resetB1DescribeSpeakProgress(topicId);
      toast.success("Progress reset successfully. Starting fresh!");
      navigate(`/b1/describe-speak/workspace/${topicId}`);
    } catch (err) {
      console.error("Error resetting progress:", err);
      toast.error("Failed to reset progress. Please try again.");
      setResettingProgress(false);
    }
  };

  const handleBackPress = () => {
    if (viewMode === "review") {
      setViewMode("overall");
    } else {
      navigate("/b1/describe-speak");
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  const writingScore = Number(data?.writingFeedback?.score || 0);
  const speakingScore = Number(data?.speakingFeedback?.overallScore || 0);
  const combinedScore = Math.round((writingScore + speakingScore) / 2);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-start items-center overflow-hidden shadow-sm relative ">
      <Toaster position="top-center" />

      {/* Top Header bar */}
      <WorkspaceHeader onBack={handleBackPress} />

      {/* Main Results Scroll Area */}
      <div
        className={`flex-1 w-full overflow-y-auto ${
          viewMode === "review" ? "pb-40" : "pb-4"
        }`}
      >
        {viewMode === "overall" ? (
          <OverallResultsView
            writingScore={writingScore}
            speakingScore={speakingScore}
            combinedScore={combinedScore}
            onReviewAnswers={() => setViewMode("review")}
            onTryNext={handleTryNext}
            onReattempt={handleReattempt}
            navigatingNext={navigatingNext}
            resettingProgress={resettingProgress}
          />
        ) : (
          <ReviewAnswersView
            data={data}
            isPlayingBack={isPlayingBack}
            playbackTime={playbackTime}
            playbackDuration={playbackDuration}
            onPlayPause={handlePlaybackPlayPause}
            formatSeconds={formatSeconds}
          />
        )}
      </div>

      {/* Floating Bottom Button Action Panel — only shown on the review screen */}
      {viewMode === "review" && (
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center gap-3 z-50 shrink-0">
          <div className="w-full max-w-[380px] flex flex-col gap-2">
            <button
              onClick={handleTryNext}
              disabled={navigatingNext || resettingProgress}
              className="w-full bg-blue-950 hover:bg-blue-900 disabled:bg-blue-950/70 text-white font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-center text-sm flex items-center justify-center gap-2 border-0 outline-none active:scale-95"
            >
              {navigatingNext ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finding Next...</span>
                </>
              ) : (
                <span>Try Next Topic</span>
              )}
            </button>

            <button
              onClick={() => setViewMode("overall")}
              disabled={navigatingNext || resettingProgress}
              className="w-full py-3 rounded-lg border border-zinc-300 bg-white hover:bg-slate-50 text-blue-950 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer active:scale-95"
            >
              <span>See Overall Results</span>
            </button>

            <button
              type="button"
              onClick={handleReattempt}
              disabled={navigatingNext || resettingProgress}
              className="text-sm text-blue-950 font-bold hover:underline transition-all bg-transparent border-0 outline-none cursor-pointer flex items-center justify-center gap-1 mx-auto disabled:opacity-50 py-3"
            >
              {resettingProgress ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reattempt Writing &amp; Speaking</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
