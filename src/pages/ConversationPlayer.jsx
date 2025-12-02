import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
export default function ConversationPlayer() {
  const { prof_level, conversation_id } = useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  const audioRef = useRef(null);
  const sentenceRefs = useRef([]);
  // Fetch conversation data
  useEffect(() => {
    const fetchConversation = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/conversation/${conversation_id}`);

        setConversation(res.data.data.conversation);
        setSentences(res.data.data.sentences);
        setProgress(res.data.data.progress);

        // Set initial sentence based on progress
        if (res.data.data.progress.current_sentence > 0) {
          setCurrentSentenceIndex(res.data.data.progress.current_sentence);
        }
      } catch (err) {
        console.error("Error fetching conversation:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversation();
  }, [conversation_id]);
  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Find current sentence based on time
      const currentIndex = sentences.findIndex(
        (s) =>
          audio.currentTime >= s.start_time && audio.currentTime < s.end_time
      );

      if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
        setCurrentSentenceIndex(currentIndex);

        // Auto-scroll to current sentence
        sentenceRefs.current[currentIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      updateProgress(sentences.length - 1, true);
    };
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [sentences, currentSentenceIndex]);
  // Update progress in database
  const updateProgress = async (sentenceIndex, completed = false) => {
    try {
      await api.put(`/conversation/${conversation_id}/progress`, {
        current_sentence: sentenceIndex,
        last_sentence_completed: sentenceIndex,
        completed: completed,
      });
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };
  // Playback controls
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };
  const goToPreviousSentence = () => {
    if (currentSentenceIndex > 0) {
      const prevIndex = currentSentenceIndex - 1;
      jumpToSentence(prevIndex);
    }
  };
  const goToNextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      const nextIndex = currentSentenceIndex + 1;
      jumpToSentence(nextIndex);
    }
  };
  const jumpToSentence = (index) => {
    const audio = audioRef.current;
    if (!audio || !sentences[index]) return;
    audio.currentTime = sentences[index].start_time;
    setCurrentSentenceIndex(index);

    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
    updateProgress(index);
  };
  const handleProgressBarClick = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/conversation/${prof_level}`)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Back</span>
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">
              {conversation?.title}
            </h1>
            {conversation?.topic && (
              <p className="text-xs md:text-sm text-gray-500">
                {conversation.topic}
              </p>
            )}
          </div>
          {progress?.completed && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="hidden md:inline text-sm">Completed</span>
            </div>
          )}
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Sentences Display */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6 max-h-[50vh] overflow-y-auto">
          <div className="space-y-3">
            {sentences.map((sentence, index) => {
              const isActive = index === currentSentenceIndex;
              const isCompleted = index < currentSentenceIndex;
              return (
                <div
                  key={sentence.sentence_id}
                  ref={(el) => (sentenceRefs.current[index] = el)}
                  onClick={() => jumpToSentence(index)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? "bg-slate-100 border-2 border-slate-900 shadow-md"
                      : isCompleted
                      ? "bg-gray-50 text-gray-500"
                      : "bg-white hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm md:text-base leading-relaxed ${
                          isActive ? "font-medium text-gray-900" : ""
                        }`}
                      >
                        {sentence.speaker && (
                          <strong className="text-slate-900">
                            {sentence.speaker}:{" "}
                          </strong>
                        )}
                        {sentence.sentence_text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Player Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div
              onClick={handleProgressBarClick}
              className="w-full h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
            >
              <div
                className="h-full bg-slate-900 transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPreviousSentence}
              disabled={currentSentenceIndex === 0}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <SkipBack className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={togglePlayPause}
              className="p-4 rounded-full bg-slate-800 hover:bg-slate-900 transition shadow-lg cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={goToNextSentence}
              disabled={currentSentenceIndex === sentences.length - 1}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <SkipForward className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          {/* Current Sentence Info */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Sentence {currentSentenceIndex + 1} of {sentences.length}
          </div>
        </div>
      </div>
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={conversation?.audio_url} preload="metadata" />
    </div>
  );
}
