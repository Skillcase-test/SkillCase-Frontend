import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Clock,
  Volume2,
  Mic,
  Play,
  Pause,
  Square,
} from "lucide-react";
import { hapticMedium } from "../../../utils/haptics";
import {
  getB1ExamSectionContent,
  submitB1ExamSpeakingAudio,
  startB1ExamSubmission,
} from "../../../api/b1Api";
import AudioPlayer from "../describe-speak/components/AudioPlayer";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";
import toast, { Toaster } from "react-hot-toast";

export default function ExamSpeakingWorkspace() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const {
    isSpeaking: isTtsPlaying,
    speakText,
    cancelSpeech,
  } = useTextToSpeech();

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0); // seconds
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Playback states
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const playbackAudioRef = useRef(null);

  // Timer states (seconds remaining)
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const timerRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const fetchContent = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const startRes = await startB1ExamSubmission(paperId);
      setSubmission(startRes.data);

      const contentRes = await getB1ExamSectionContent(paperId, "speaking");
      const list = Array.isArray(contentRes.data) ? contentRes.data : [];
      setQuestions(list);

      if (list.length > 0 && list[0].duration_minutes) {
        const timerKey = `b1_exam_timer_${user?.user_id || "guest"}_${paperId}_speaking`;
        const storedExpire = localStorage.getItem(timerKey);
        if (storedExpire) {
          const expireTime = parseInt(storedExpire, 10);
          const remaining = Math.max(
            0,
            Math.floor((expireTime - Date.now()) / 1000),
          );
          setTimeLeft(remaining);
        } else {
          const durationSeconds = list[0].duration_minutes * 60;
          const expireTime = Date.now() + durationSeconds * 1000;
          localStorage.setItem(timerKey, expireTime.toString());
          setTimeLeft(durationSeconds);
        }
      }
    } catch (err) {
      console.error("Error fetching Speaking content:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchContent();
  }, [user?.user_id, paperId]);

  // Section Timer
  useEffect(() => {
    if (loading || fetchError || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, fetchError, questions]);

  // Reset audio recorders whenever question index changes
  useEffect(() => {
    cleanupRecordingAndPlayback();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordDuration(0);
  }, [currentBlockIndex]);

  const cleanupRecordingAndPlayback = () => {
    if (isRecording) stopRecording();
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }
    playbackAudioRef.current = null;
    setIsPlayingBack(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);

    cancelSpeech();
  };

  const handleAutoSubmit = async () => {
    console.warn("[Exam] Time is up — auto-submitting speaking section.");
    cleanupRecordingAndPlayback();
    await finalizeSpeakingTest();
  };

  const startRecording = async () => {
    cleanupRecordingAndPlayback();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordDuration(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 60) {
            // max speaking limit 1 min
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(
        "Please allow microphone access to record speaking responses.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }
    setIsRecording(false);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handlePlaybackPlayPause = () => {
    if (!audioUrl) return;

    if (!playbackAudioRef.current) {
      const audio = new Audio(audioUrl);
      playbackAudioRef.current = audio;

      audio.addEventListener("loadedmetadata", () => {
        setPlaybackDuration(audio.duration);
      });
      audio.addEventListener("timeupdate", () => {
        setPlaybackTime(audio.currentTime);
      });
      audio.addEventListener("ended", () => {
        setIsPlayingBack(false);
        setPlaybackTime(0);
      });
    }

    if (isPlayingBack) {
      playbackAudioRef.current.pause();
      setIsPlayingBack(false);
    } else {
      // F-H4: Guard against browser autoplay rejection
      playbackAudioRef.current
        .play()
        .then(() => setIsPlayingBack(true))
        .catch((err) => {
          console.error("Playback error:", err);
          setIsPlayingBack(false);
        });
    }
  };

  const handleTtsPlay = (text) => {
    if (isTtsPlaying) {
      cancelSpeech();
    } else if (text) {
      speakText(text, "de-DE");
    }
  };

  const handleNext = async () => {
    const currentBlock = questions[currentBlockIndex];

    // Evaluate and save current audio answer
    if (audioBlob) {
      setIsEvaluating(true);
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("questionId", currentBlock.id);
      formData.append("recordDuration", recordDuration);

      try {
        await submitB1ExamSpeakingAudio(submission.id, formData);
      } catch (err) {
        console.error("Error saving speaking answer:", err);
        toast.error("Failed to evaluate and save speech. Please try again.");
      } finally {
        setIsEvaluating(false);
      }
    }

    if (currentBlockIndex < questions.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1);
    } else {
      await finalizeSpeakingTest();
    }
  };

  const finalizeSpeakingTest = async () => {
    if (!submission) return;
    setIsEvaluating(true);
    try {
      // Empty payload triggers finalization
      await submitB1ExamSpeakingAudio(submission.id, new FormData());
      localStorage.removeItem(
        `b1_exam_timer_${user?.user_id || "guest"}_${paperId}_speaking`,
      );
      navigate(`/b1/exams/papers/${paperId}/speaking/results`, {
        state: { submissionId: submission.id },
      });
    } catch (err) {
      console.error("Error finalizing speaking section:", err);
      toast.error("Failed to finalize speaking exam. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePrev = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1);
    }
  };

  const handleReRecord = () => {
    cleanupRecordingAndPlayback();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordDuration(0);
  };

  const formatSeconds = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      cleanupRecordingAndPlayback();
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (fetchError || questions.length === 0) {
    return (
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <p className="text-slate-500 text-xs font-semibold text-center">
          Failed to load Speaking tasks.
        </p>
        <button
          onClick={() => navigate(`/b1/exams/papers/${paperId}/dashboard`)}
          className="px-4 py-2 bg-sky-950 text-white rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentBlock = questions[currentBlockIndex];
  const qObj = currentBlock.questions?.[0] || {};
  const promptType =
    qObj.prompt_type ||
    (currentBlock.passage_text
      ? "paragraph"
      : currentBlock.speaking_prompt_image
        ? "image"
        : "text");

  const isLastBlock = currentBlockIndex === questions.length - 1;

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative pb-36">
      {/* Navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate(`/b1/exams/papers/${paperId}/dashboard`)}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Speaking
          </span>
        </div>
      </div>

      {/* Progress & Time Limit Indicators */}
      <div className="self-stretch px-4 pt-4 flex flex-col justify-start items-start gap-4 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <span className="text-sky-950 text-base font-semibold leading-5">
            Question {(currentBlockIndex + 1).toString().padStart(2, "0")} of{" "}
            {questions.length.toString().padStart(2, "0")}
          </span>
          <div className="px-2 py-1 bg-black/5 rounded-[40px] border border-black/5 flex justify-center items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-sky-950" />
            <span className="text-center text-sky-950 text-xs font-medium leading-5">
              {formatSeconds(timeLeft)}
            </span>
          </div>
        </div>

        {/* Horizontal progress bar */}
        <div className="self-stretch flex justify-start items-center gap-1.5 pb-4">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2.5 rounded-[200px] transition-all ${
                idx <= currentBlockIndex ? "bg-amber-300" : "bg-zinc-100"
              }`}
            ></div>
          ))}
        </div>
      </div>

      {/* Speaking Workspace Area */}
      <div className="flex-1 w-full overflow-y-auto px-4 pt-3 pb-8 flex flex-col justify-start items-center gap-6">
        {/* Unified Prompt Render block */}
        <div className="w-full flex flex-col gap-4 text-left">
          {/* Prompt Image if present */}
          {currentBlock.speaking_prompt_image && (
            <img
              src={currentBlock.speaking_prompt_image}
              alt="Speaking Prompt Illustration"
              className="w-full h-52 object-cover rounded-lg"
            />
          )}

          {/* Block Title */}
          <h3 className="text-sky-950 text-base font-semibold leading-6">
            {currentBlock.block_title}
          </h3>

          {/* Passage Text (Cues/Opinions context) */}
          {currentBlock.passage_text && (
            <div className="w-full p-3 border border-zinc-200 rounded-xl flex justify-between items-start gap-4 bg-slate-50">
              <p className="text-slate-750 text-xs font-normal leading-relaxed flex-1 whitespace-pre-line">
                {currentBlock.passage_text}
              </p>
              <button
                type="button"
                onClick={() => handleTtsPlay(currentBlock.passage_text)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-all hover:bg-zinc-200 text-slate-700 ${
                  isTtsPlaying
                    ? "bg-zinc-400 animate-pulse text-white"
                    : "bg-zinc-100"
                }`}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Task Question Text */}
          {qObj.question_text && (
            <div className="w-full p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl text-left">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                Aufgabe (Task)
              </span>
              <p className="text-slate-800 text-xs font-medium leading-relaxed">
                {qObj.question_text}
              </p>
            </div>
          )}
        </div>

        {/* Microphone recording widget */}
        <div className="w-full flex flex-col items-center justify-center gap-5 pt-4 select-none">
          {/* Circular Mic Trigger button */}
          <button
            onClick={() => {
              hapticMedium();
              handleToggleRecord();
            }}
            disabled={isEvaluating}
            className={`w-32 h-32 rounded-full flex items-center justify-center outline-none border-0 cursor-pointer shadow-md transition-all shrink-0 relative ${
              isRecording
                ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse"
                : "bg-blue-600/10 hover:bg-blue-600/20 text-sky-950"
            }`}
          >
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center ${
                isRecording ? "bg-red-500/20" : "bg-blue-600/20"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white ${
                  isRecording ? "bg-red-600" : "bg-[#0a1f44]"
                }`}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 fill-white stroke-white" />
                ) : (
                  <Mic className="w-6 h-6 stroke-white" />
                )}
              </div>
            </div>
          </button>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sky-950 text-sm font-bold">
              {isRecording
                ? "Recording... Tap to stop"
                : "Tap to start recording"}
            </span>
            <span className="text-sky-950 text-xs font-semibold">
              {formatSeconds(recordDuration)} / 01:00
            </span>
          </div>

          {/* Waveform visualizer */}
          {isRecording && (
            <div className="h-6 flex items-center justify-center gap-0.5 mt-2">
              <div className="w-1 h-3 bg-red-500 rounded-full animate-[pulse_0.4s_infinite]" />
              <div className="w-1 h-5 bg-red-500 rounded-full animate-[pulse_0.5s_infinite_0.1s]" />
              <div className="w-1 h-4 bg-red-500 rounded-full animate-[pulse_0.4s_infinite_0.2s]" />
              <div className="w-1 h-6 bg-red-500 rounded-full animate-[pulse_0.6s_infinite_0.1s]" />
              <div className="w-1 h-3 bg-red-500 rounded-full animate-[pulse_0.3s_infinite_0.3s]" />
            </div>
          )}
        </div>

        {/* Custom playbar for recorded audio */}
        {audioUrl && !isRecording && (
          <div className="self-stretch w-full px-0">
            <AudioPlayer
              isPlaying={isPlayingBack}
              onPlayPause={handlePlaybackPlayPause}
              playbackTime={playbackTime}
              playbackDuration={playbackDuration || recordDuration}
              formatSeconds={formatSeconds}
              variant="workspace"
            />
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 inset-x-0  p-4 flex flex-col gap-2  shrink-0">
        <button
          onClick={handleNext}
          disabled={isEvaluating || isRecording}
          className="w-full py-3 bg-[#0a1f44] hover:bg-[#06142c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
        >
          {isEvaluating ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : isLastBlock ? (
            "Finish Speaking Test"
          ) : (
            "Next Question"
          )}
        </button>

        {currentBlockIndex > 0 && (
          <button
            onClick={handlePrev}
            disabled={isRecording}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-zinc-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
          >
            Previous Question
          </button>
        )}

        {audioUrl && !isRecording && (
          <button
            onClick={handleReRecord}
            className="w-full py-3 text-[#0a1f44] hover:text-[#06142c] text-sm font-semibold active:scale-95 transition-all outline-none cursor-pointer flex justify-center items-center bg-transparent border-0"
          >
            Re-record
          </button>
        )}
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
