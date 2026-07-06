import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2, Camera, RotateCcw } from "lucide-react";
import {
  getB1DescribeSpeakContent,
  uploadB1DescribeSpeakOcr,
  submitB1DescribeSpeakWriting,
  submitB1DescribeSpeakSpeaking,
  skipB1DescribeSpeakSpeaking,
  getB1DescribeSpeakChapters,
} from "../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

import WorkspaceHeader from "./components/WorkspaceHeader";
import WritingStage from "./components/WritingStage";
import WritingFeedbackStage from "./components/WritingFeedbackStage";
import SpeakingStage from "./components/SpeakingStage";
import SpeakingFeedbackStage from "./components/SpeakingFeedbackStage";
import OcrModal from "./components/OcrModal";
import { formatSeconds, parseTimeToSeconds } from "./utils/timeUtils";

export default function DescribeSpeakWorkspace() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Core states
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("writing"); // 'writing' | 'feedback' | 'speaking' | 'speaking_feedback'

  // Stage 1: Writing states
  const [writingText, setWritingText] = useState("");
  const [isOcrLoading, setIsOcrLoading] = useState(false);       // OCR image upload in-flight
  const [isSubmittingWriting, setIsSubmittingWriting] = useState(false); // Writing AI submit in-flight
  const [isSkipping, setIsSkipping] = useState(false);
  const [isOcrParsing, setIsOcrParsing] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState(null);

  // Stage 2: Writing Feedback states
  const [writingFeedback, setWritingFeedback] = useState(null);

  // Stage 3: Speaking states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [submittingSpeech, setSubmittingSpeech] = useState(false);
  const [speakingFeedback, setSpeakingFeedback] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");

  // Audio Playback states for recorded clip
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordDurationRef = useRef(0);
  const audioRef = useRef(null); // Custom playback audio element
  const streamRef = useRef(null); // Active MediaStream — stopped on unmount
  const isRecordingRef = useRef(false); // Ref mirror of isRecording to avoid stale closures

  useEffect(() => {
    if (!user?.user_id || !topicId) return;
    fetchTopicDetails();
  }, [user?.user_id, topicId]);

  // Keep the ref in sync with the state so timer callbacks always see current value
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Cleanup: stop MediaStream when component unmounts (mic indicator off)
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle duration countdown/up timers
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          const maxSec = parseTimeToSeconds(topic?.time_limit || "01:00");
          const nextVal = prev >= maxSec ? maxSec : prev + 1;
          recordDurationRef.current = nextVal;
          // Use ref — NOT the stale isRecording closure — to check state
          if (prev >= maxSec && isRecordingRef.current) {
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state !== "inactive"
            ) {
              mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
          }
          return nextVal;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, topic?.time_limit]);

  // Audio playback timeupdate tracker
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;

      // Immediately show the known recording duration — MediaRecorder blobs
      // rarely embed duration metadata so loadedmetadata often fires with
      // Infinity/NaN. Using the ref value means the display is correct from
      // the very first render after recording stops.
      if (recordDurationRef.current) {
        setPlaybackDuration(recordDurationRef.current);
      }

      const onLoadedMetadata = () => {
        const d = audio.duration;
        // Only override if the browser actually resolved a finite duration
        if (d && isFinite(d) && d !== Infinity) {
          setPlaybackDuration(d);
        }
        // Otherwise keep the ref-based value already set above
      };
      const onTimeUpdate = () => {
        setPlaybackTime(audio.currentTime || 0);
      };
      const onEnded = () => {
        setIsPlayingBack(false);
        setPlaybackTime(0);
      };

      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);

      return () => {
        audio.pause();
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
        URL.revokeObjectURL(url);
      };
    } else {
      audioRef.current = null;
      setIsPlayingBack(false);
      setPlaybackTime(0);
      setPlaybackDuration(0);
    }
  }, [audioBlob]);

  const fetchTopicDetails = async () => {
    setLoading(true);
    try {
      const res = await getB1DescribeSpeakContent(topicId);
      const data = res.data;
      setTopic(data);

      // Restore states if user has progress
      if (data.progress) {
        setWritingText(data.progress.writing_text || "");
        if (data.progress.writing_feedback) {
          setWritingFeedback(data.progress.writing_feedback);
        }
        if (data.progress.is_completed) {
          // Redirect to overall success screen if already completed
          navigate("/b1/describe-speak/success", {
            state: {
              topicId: parseInt(topicId),
              writingText: data.progress.writing_text,
              writingFeedback: data.progress.writing_feedback,
              speakingFeedback: data.progress.speaking_feedback,
              audioUrl: data.progress.audio_url,
              topic: {
                id: data.id,
                title: data.title,
                prompt_image_url: data.prompt_image_url,
                helpful_words: data.helpful_words,
              },
            },
            replace: true,
          });
          return;
        } else if (data.progress.writing_text) {
          // If writing is done but not speaking, start at writing feedback screen
          setStage("feedback");
        }
      }
    } catch (err) {
      console.error("Error loading topic:", err);
      toast.error("Failed to load topic workspace.");
    } finally {
      setLoading(false);
    }
  };

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleHelpfulWordClick = (wordObj) => {
    setSelectedVocab(wordObj);
  };

  const handleAppendWord = (wordText) => {
    setWritingText((prev) => {
      const clean = prev.trim();
      return clean ? `${clean} ${wordText}` : wordText;
    });
    setSelectedVocab(null);
  };

  // OCR Extraction Handler
  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // MIME type check with Capacitor WebView fallback:
    // Old Android WebViews can return file.type = "" for valid images.
    // If MIME is empty, fall back to file extension check instead.
    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    const ALLOWED_EXTS = ["png", "jpg", "jpeg", "webp", "pdf"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.");
      return;
    }
    if (!file.type && !ALLOWED_EXTS.includes(ext)) {
      toast.error("Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB.");
      return;
    }

    setShowOcrModal(false);
    setIsOcrParsing(true);
    setIsOcrLoading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await uploadB1DescribeSpeakOcr(formData);
      if (res.data?.text) {
        setWritingText((prev) => {
          const clean = prev.trim();
          return clean ? `${clean}\n${res.data.text}` : res.data.text;
        });
        toast.success("Text extracted successfully!");
      } else {
        toast.error("No text found in the image.");
      }
    } catch (err) {
      console.error("OCR upload error:", err);
      toast.error(
        err.response?.data?.error || "Failed to parse text from image.",
      );
    } finally {
      setIsOcrLoading(false);
      setIsOcrParsing(false);
    }
  };

  // Stage 1 submit
  const handleWritingSubmit = async () => {
    const cleanText = writingText.trim();
    if (!cleanText) {
      toast.error("Please write a description first.");
      return;
    }

    const currentWords = countWords(cleanText);
    const wordLimit = topic?.word_limit || 50;

    if (currentWords < 10) {
      toast.error("Please write at least 10 words.");
      return;
    }

    if (currentWords > wordLimit + 2) {
      toast.error("Word limit reached please write under word limit");
      return;
    }

    setIsOcrParsing(false);
    setIsSubmittingWriting(true);
    try {
      const res = await submitB1DescribeSpeakWriting({
        topicId: parseInt(topicId),
        writingText: cleanText,
      });

      if (res.data?.success && res.data?.feedback) {
        setWritingFeedback(res.data.feedback);
        setStage("feedback");
        toast.success("Writing submitted successfully!");
      } else {
        toast.error("Failed to analyze writing.");
      }
    } catch (err) {
      console.error("Submit writing error:", err);
      toast.error("Failed to analyze writing. Please try again.");
    } finally {
      setIsSubmittingWriting(false);
    }
  };

  // Recording actions
  const startRecording = async () => {
    // Stop any existing stream before opening a new one (re-record guard)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    audioChunksRef.current = [];
    setAudioBlob(null);
    setRecordDuration(0);
    recordDurationRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; // Store so unmount can stop it

      const options = { mimeType: "audio/webm" };
      let recorder;

      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        // Stop tracks after onstop fires (blob is fully assembled)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recorder:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        toast.error(
          "Microphone permission denied. Please allow access in your browser settings.",
        );
      } else {
        toast.error("Could not start recording. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlaybackPlayPause = () => {
    if (!audioRef.current) return;
    if (isPlayingBack) {
      audioRef.current.pause();
      setIsPlayingBack(false);
    } else {
      // Wait for play() to resolve before marking as playing
      // — avoids showing "Pause" while browser blocks autoplay
      audioRef.current
        .play()
        .then(() => setIsPlayingBack(true))
        .catch((err) => {
          console.error("Playback error:", err);
          toast.error("Could not play audio. Please tap again.");
        });
    }
  };

  // Stage 3 submit
  const handleSpeakingSubmit = async () => {
    if (!audioBlob) {
      toast.error("Please record your voice first.");
      return;
    }

    setSubmittingSpeech(true);
    const formData = new FormData();
    formData.append("topicId", String(parseInt(topicId, 10)));
    formData.append("recordDuration", String(recordDurationRef.current || 0));
    // Derive extension from actual mimeType so iOS mp4 is sent correctly
    const mimeType = mediaRecorderRef.current?.mimeType || "";
    const ext = mimeType.includes("webm")
      ? "webm"
      : mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("ogg")
      ? "ogg"
      : "wav";
    formData.append("audio", audioBlob, `recording.${ext}`);

    try {
      const res = await submitB1DescribeSpeakSpeaking(formData);
      if (res.data?.success && res.data?.feedback) {
        toast.success("Speaking submitted successfully!");

        // Log Streak Points
        try {
          const { logStreakPoints } = await import("../../../api/streakApi");
          await logStreakPoints({ points: 5 });
        } catch (_) {}

        setSpeakingFeedback(res.data.feedback);
        setAudioUrl(res.data.audioUrl);
        setStage("speaking_feedback");
      } else {
        toast.error("Failed to analyze pronunciation.");
      }
    } catch (err) {
      console.error("Submit speaking error:", err);
      toast.error("Speech analysis failed. Please try again.");
    } finally {
      setSubmittingSpeech(false);
    }
  };

  const handleBackPress = () => {
    if (stage === "feedback") {
      navigate("/b1/describe-speak");
    } else if (stage === "speaking") {
      setStage("feedback");
    } else if (stage === "speaking_feedback") {
      setStage("speaking");
    } else {
      navigate("/b1/describe-speak");
    }
  };

  const handleSkipAndMoveToNext = async () => {
    setIsSkipping(true);
    try {
      await skipB1DescribeSpeakSpeaking(topicId);
      const res = await getB1DescribeSpeakChapters();
      const list = Array.isArray(res.data) ? res.data : [];
      const currentId = parseInt(topicId, 10);
      const nextTopic = list.find((t) => !t.is_completed && t.id !== currentId);

      if (nextTopic) {
        toast.success("Skipped speaking and marked complete!");
        navigate(`/b1/describe-speak/workspace/${nextTopic.id}`);
      } else {
        const currentIdx = list.findIndex((t) => t.id === currentId);
        if (currentIdx !== -1 && currentIdx < list.length - 1) {
          toast.success("Skipped speaking and marked complete!");
          navigate(`/b1/describe-speak/workspace/${list[currentIdx + 1].id}`);
        } else {
          toast.success("All Describe & Speak chapters completed!");
          navigate("/b1/describe-speak");
        }
      }
    } catch (err) {
      console.error("Error skipping speaking:", err);
      toast.error("Failed to complete topic. Please try again.");
    } finally {
      setIsSkipping(false);
    }
  };

  const handleSeeResults = () => {
    if (!topic) return; // guard: topic must be loaded before navigating
    navigate("/b1/describe-speak/success", {
      state: {
        topicId: parseInt(topicId),
        writingText,
        writingFeedback,
        speakingFeedback,
        audioUrl,
        recordDuration: recordDurationRef.current,
        topic: {
          id: topic.id,
          title: topic.title,
          prompt_image_url: topic.prompt_image_url,
          helpful_words: topic.helpful_words,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  const wordLimit = topic?.word_limit || 50;
  const currentWordCount = countWords(writingText);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#F5F5F5] flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      <Toaster position="top-center" />

      {/* Header bar */}
      <WorkspaceHeader onBack={handleBackPress} />

      {/* Main Workspace Scroll Area */}
      <div
        className={`flex-1 w-full overflow-y-auto pb-32 ${
          stage === "feedback" || stage === "speaking_feedback"
            ? "bg-white"
            : "bg-white"
        }`}
      >
        {stage === "writing" && (
          <WritingStage
            topic={topic}
            writingText={writingText}
            setWritingText={setWritingText}
            currentWordCount={currentWordCount}
            wordLimit={wordLimit}
            onHelpfulWordClick={handleHelpfulWordClick}
          />
        )}

        {stage === "feedback" && writingFeedback && (
          <WritingFeedbackStage
            writingFeedback={writingFeedback}
            writingText={writingText}
            onPracticeSpeaking={() => setStage("speaking")}
            onSkipAndMoveToNext={handleSkipAndMoveToNext}
          />
        )}

        {stage === "speaking" && (
          <SpeakingStage
            writingFeedback={writingFeedback}
            isRecording={isRecording}
            recordDuration={recordDuration}
            topic={topic}
            audioBlob={audioBlob}
            isPlayingBack={isPlayingBack}
            playbackTime={playbackTime}
            playbackDuration={playbackDuration}
            onToggleRecord={isRecording ? stopRecording : startRecording}
            onPlayPause={handlePlaybackPlayPause}
            formatSeconds={formatSeconds}
          />
        )}

        {stage === "speaking_feedback" && speakingFeedback && (
          <SpeakingFeedbackStage
            speakingFeedback={speakingFeedback}
            onSeeResults={handleSeeResults}
          />
        )}
      </div>

      {/* Floating Bottom Button Bar */}
      {stage !== "feedback" && stage !== "speaking_feedback" && (
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center gap-2.5 z-40 shrink-0 bg-[#F5F5F5]">
          {stage === "writing" && (
            <div className="w-full max-w-[380px] flex flex-col gap-2">
              <button
                id="b1-describe-speak-upload-writing-btn"
                type="button"
                onClick={() => setShowOcrModal(true)}
                className="w-full py-3 rounded-lg border border-zinc-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer active:scale-95 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload writing image</span>
              </button>

              <button
                id="b1-describe-speak-submit-writing-btn"
                onClick={handleWritingSubmit}
                disabled={isSubmittingWriting}
                className="w-full bg-blue-950 hover:bg-blue-900 disabled:bg-blue-950/70 disabled:cursor-not-allowed active:scale-95 text-white font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-center text-sm flex items-center justify-center gap-2 border-0 outline-none"
              >
                {isSubmittingWriting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Writing...</span>
                  </>
                ) : (
                  <span>Submit Writing</span>
                )}
              </button>
            </div>
          )}

          {stage === "speaking" && (
            <div className="w-full max-w-[380px] flex flex-col gap-2">
              <button
                onClick={handleSpeakingSubmit}
                disabled={!audioBlob || submittingSpeech || isRecording}
                className={`w-full py-3 rounded-lg shadow-md transition-all font-semibold text-sm border-0 outline-none flex items-center justify-center gap-2 ${
                  !audioBlob || submittingSpeech || isRecording
                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-blue-950 hover:bg-blue-900 text-white cursor-pointer active:scale-95"
                }`}
              >
                {submittingSpeech ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Speech...</span>
                  </>
                ) : (
                  <span>Submit Recording</span>
                )}
              </button>

              <button
                onClick={startRecording}
                disabled={isRecording || submittingSpeech}
                className={`w-full py-3 rounded-lg font-semibold text-sm border transition-all flex items-center justify-center gap-1.5 outline-none ${
                  isRecording || submittingSpeech
                    ? "border-zinc-200 text-neutral-300 cursor-not-allowed"
                    : "border-zinc-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer active:scale-95"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* OCR Select Options Modal popup */}
      {showOcrModal && (
        <OcrModal
          onClose={() => setShowOcrModal(false)}
          onUpload={handleOcrUpload}
        />
      )}

      {/* Full screen loader — shown during OCR image parse, writing AI submit, or skipping */}
      {(isOcrLoading || isSubmittingWriting || isSkipping) && (
        <div className="fixed inset-0 z-[2000] bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center gap-3 select-none">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <span className="text-white text-sm font-semibold">
            {isOcrLoading
              ? "Analyzing image and extracting text..."
              : isSubmittingWriting
              ? "Analyzing writing..."
              : "Moving to next topic..."}
          </span>
        </div>
      )}
      {/* Vocabulary Modal Popup */}
      {selectedVocab && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedVocab(null)}
          />
          <div className="relative w-full max-w-[280px] bg-white rounded-3xl p-6 shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-blue-950 mb-1 capitalize">
              {selectedVocab.word}
            </h3>
            {selectedVocab.article && (
              <span className="inline-block px-2 py-0.5 bg-blue-50 text-[#002856] rounded-md text-[10px] font-bold mb-3">
                {selectedVocab.article}
              </span>
            )}
            <div className="h-px bg-slate-100 w-full my-3"></div>
            <p className="text-slate-600 font-bold text-sm leading-relaxed mb-6">
              Meaning:{" "}
              <span className="text-blue-950">{selectedVocab.meaning}</span>
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleAppendWord(selectedVocab.word)}
                className="w-full py-2.5 rounded-xl font-bold bg-[#002856] text-white text-xs shadow-md hover:bg-[#003c82] active:scale-95 transition-all cursor-pointer"
              >
                Add to Writing
              </button>
              <button
                onClick={() => setSelectedVocab(null)}
                className="w-full py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700 text-xs shadow-sm hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
