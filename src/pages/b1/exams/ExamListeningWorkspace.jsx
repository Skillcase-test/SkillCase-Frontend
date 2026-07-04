import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  MessageSquare,
} from "lucide-react";
import {
  getB1ExamSectionContent,
  submitB1ExamListeningAnswers,
  startB1ExamSubmission,
} from "../../../api/b1Api";
import { images } from "../../../assets/images";

export default function ExamListeningWorkspace() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { blockId_questionIdx: "selected_option" }
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Custom audio waveform player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0); // seconds
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  const currentBlock = questions[currentBlockIndex] || null;
  const blockQuestions = currentBlock ? currentBlock.questions || [] : [];

  // Section Timer state (seconds remaining)
  const [timeLeft, setTimeLeft] = useState(30 * 60); // Default 30 mins
  const timerRef = useRef(null);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const fetchContent = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const startRes = await startB1ExamSubmission(paperId);
      setSubmission(startRes.data);

      const contentRes = await getB1ExamSectionContent(paperId, "listening");
      const list = Array.isArray(contentRes.data) ? contentRes.data : [];
      setQuestions(list);

      if (list.length > 0 && list[0].duration_minutes) {
        const timerKey = `b1_exam_timer_${user?.user_id || "guest"}_${paperId}_listening`;
        const storedExpire = localStorage.getItem(timerKey);
        if (storedExpire) {
          const expireTime = parseInt(storedExpire, 10);
          const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
          setTimeLeft(remaining);
        } else {
          const durationSeconds = list[0].duration_minutes * 60;
          const expireTime = Date.now() + durationSeconds * 1000;
          localStorage.setItem(timerKey, expireTime.toString());
          setTimeLeft(durationSeconds);
        }
      }
    } catch (err) {
      // If the exam is already completed, redirect to results instead of showing a dead error screen
      if (
        err?.response?.status === 403 &&
        err?.response?.data?.alreadyCompleted
      ) {
        navigate(`/b1/exams/papers/${paperId}/congratulations`, {
          replace: true,
        });
        return;
      }
      console.error("Error fetching Listening content:", err);
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
    // Depend on questions.length (primitive) not questions (array ref)
    // to prevent the timer from restarting if setQuestions is called again
  }, [loading, fetchError, questions.length]);

  // Preload audio and extract metadata whenever current block changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);

    if (currentBlock?.audio_url) {
      const audio = new Audio(currentBlock.audio_url);
      audioRef.current = audio;

      const handleLoadedMetadata = () => {
        setAudioDuration(audio.duration);
      };
      const handleTimeUpdate = () => {
        setAudioProgress(audio.currentTime);
      };
      const handleEnded = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };
      const handleError = () => {
        setIsPlaying(false);
        console.error("Failed to load listening audio track.");
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);

      // Preload audio track
      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
    }
  }, [currentBlockIndex, currentBlock?.audio_url]);

  const handleAutoSubmit = async () => {
    await executeSubmission(answersRef.current);
  };

  const executeSubmission = async (currentAnswers) => {
    if (submitting || !submission) return;
    setSubmitting(true);
    try {
      if (audioRef.current) audioRef.current.pause();
      await submitB1ExamListeningAnswers(submission.id, {
        answers: currentAnswers,
      });
      localStorage.removeItem(`b1_exam_timer_${user?.user_id || "guest"}_${paperId}_listening`);
      navigate(`/b1/exams/papers/${paperId}/listening/results`, {
        state: { submissionId: submission.id },
      });
    } catch (err) {
      console.error("Error submitting listening answers:", err);
      window.dispatchEvent(
        new CustomEvent("exam:submitError", {
          detail: "Failed to submit answers. Please try again.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionSelect = (blockId, qIdx, option, qType = "mcq_single") => {
    const ansKey = `${blockId}_${qIdx}`;
    if (qType === "mcq_multi") {
      const currentSelection = Array.isArray(answers[ansKey]) ? answers[ansKey] : [];
      const nextSelection = currentSelection.includes(option)
        ? currentSelection.filter((item) => item !== option)
        : [...currentSelection, option];
      setAnswers((prev) => ({
        ...prev,
        [ansKey]: nextSelection,
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [ansKey]: option,
      }));
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Guard against browser autoplay rejection
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Playback error:", err);
          setIsPlaying(false);
        });
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleNext = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    if (currentBlockIndex < questions.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1);
    } else {
      executeSubmission(answers);
    }
  };

  const handlePrev = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1);
    }
  };

  const formatSeconds = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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
          Failed to load Listening tasks. Check back later.
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

  const isLastBlock = currentBlockIndex === questions.length - 1;

  // Generate 44 simulated vertical bars for custom CSS waveform
  const totalWaveformBars = 44;
  const currentPlayedRatio =
    audioDuration > 0 ? audioProgress / audioDuration : 0;
  const playedBarsCount = Math.floor(currentPlayedRatio * totalWaveformBars);

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      {/* Navigation and Title Bar */}
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
            Listening
          </span>
        </div>
      </div>

      {/* Progress & Time Limit Indicators */}
      <div className="self-stretch px-4 pt-1 flex flex-col justify-start items-start gap-1.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <span className="text-sky-950 text-base font-semibold leading-5">
            Question {(currentBlockIndex + 1).toString().padStart(2, "0")} of{" "}
            {questions.length.toString().padStart(2, "0")}
          </span>
          <div className="px-2 py-1 bg-[#f5f5f5] rounded-[40px] border border-[#f5f5f5] flex justify-center items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-sky-950" />
            <span className="text-center text-sky-950 text-xs font-medium leading-5">
              {formatSeconds(timeLeft)}
            </span>
          </div>
        </div>

        {/* Horizontal progress bar with h-3 and gap-0.5 */}
        <div className="self-stretch flex justify-start items-center gap-0.5 pb-1">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-3 rounded-[200px] transition-all ${
                idx <= currentBlockIndex ? "bg-amber-300" : "bg-zinc-100"
              }`}
            ></div>
          ))}
        </div>
      </div>

      {/* Scrollable Content Workspace */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-y-auto pb-48 flex flex-col justify-start items-center bg-[#f5f5f5]"
      >
        {/* Waveform Player Section */}
        <div className="self-stretch px-4 pt-3 pb-6 flex flex-col gap-2.5 bg-white shrink-0">
          {/* Player row: play button + waveform bars + duration */}
          <div className="self-stretch flex items-center gap-4">
            {/* Play/Pause Button — large navy circle */}
            <button
              onClick={handlePlayPause}
              className="size-16 bg-[#0a1f44] hover:bg-[#06142c] active:scale-95 text-white rounded-full flex items-center justify-center outline-none border-0 cursor-pointer shadow-md transition-all shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-white stroke-white" />
              ) : (
                <Play className="w-7 h-7 fill-white stroke-white ml-1" />
              )}
            </button>

            {/* Waveform bars — centered on middle axis, fills remaining width */}
            <div className="flex-1 flex items-center justify-between h-8 overflow-hidden">
              {Array.from({ length: totalWaveformBars }).map((_, barIdx) => {
                const isPlayed = barIdx <= playedBarsCount;
                const heights = [
                  10, 18, 24, 12, 28, 8, 20, 14, 28, 8, 16, 22, 10, 26, 8, 12,
                  28, 6, 18, 24, 14, 28, 8, 10, 20, 16, 28, 8, 12, 22, 10, 26,
                  8, 18, 14, 28, 6, 20, 12, 28, 10, 16, 8, 24,
                ];
                const height = heights[barIdx % heights.length];
                return (
                  <div
                    key={barIdx}
                    style={{ height: `${height}px` }}
                    className={`w-[3px] rounded-full transition-colors shrink-0 ${
                      isPlayed ? "bg-[#0a1f44]" : "bg-black/20"
                    }`}
                  />
                );
              })}
            </div>

            {/* Duration label */}
            <span className="text-xs font-semibold text-black/40 shrink-0">
              {formatSeconds(Math.round(audioDuration || 0))}
            </span>
          </div>

          {/* Subtitle — left-aligned, bold, larger */}
          <p className="self-stretch text-sky-950 text-base font-bold leading-6">
            Listen to the audio and answer the questions below
          </p>
        </div>

        {/* Divider Section with Question Mark box */}
        <div className="self-stretch w-full px-4 py-4 bg-[#f5f5f5] inline-flex justify-center items-center gap-3.5 shrink-0">
          <div className="w-9 h-9 relative bg-blue-950 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">?</span>
          </div>
          <h2 className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left">
            Questions
          </h2>
        </div>

        {/* Questions list with light gray background */}
        <div className="self-stretch px-4 pt-4 pb-12 bg-[#f5f5f5] flex flex-col justify-start items-center gap-6 flex-1 w-full min-h-[300px]">
          {blockQuestions.map((q, qIdx) => {
            const ansKey = `${currentBlock.id}_${qIdx}`;
            const selectedOpt = answers[ansKey];
            const qType = q.type || "mcq_single";

            if (qType === "fill_blanks") {
              return (
                <div
                  key={qIdx}
                  className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4 shadow-sm"
                >
                  <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                    {qIdx + 1}. {q.question_text}
                  </div>
                  <div className="self-stretch w-full">
                    <input
                      type="text"
                      value={selectedOpt || ""}
                      onChange={(e) => {
                        setAnswers((prev) => ({
                          ...prev,
                          [ansKey]: e.target.value,
                        }));
                      }}
                      placeholder="Type your answer here..."
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={qIdx}
                className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4 shadow-sm"
              >
                <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                  {qIdx + 1}. {q.question_text}
                </div>

                <div className="self-stretch flex flex-col justify-start items-start gap-2 w-full">
                  {(q.options || []).map((option, optIdx) => {
                    const optionLetter = String.fromCharCode(65 + optIdx);
                    const isSelected = qType === "mcq_multi"
                      ? (Array.isArray(selectedOpt) && selectedOpt.includes(optionLetter))
                      : selectedOpt === optionLetter;

                    let cardClass = "bg-white border-zinc-200";
                    let letterContainerClass = "bg-[#f5f5f5] text-gray-900/30";
                    let letterTextClass = "text-gray-900/30";
                    let optionTextClass = "text-slate-900";

                    if (isSelected) {
                      cardClass = "bg-blue-600/5 border-blue-600";
                      letterContainerClass = "bg-blue-600/10 text-blue-600";
                      letterTextClass = "text-blue-600";
                      optionTextClass = "text-blue-600 font-semibold";
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() =>
                          handleOptionSelect(
                            currentBlock.id,
                            qIdx,
                            optionLetter,
                            qType,
                          )
                        }
                        className={`w-full p-2.5 rounded-lg border inline-flex justify-start items-center gap-3 cursor-pointer hover:bg-slate-50/50 transition-all ${cardClass}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-sm overflow-hidden shrink-0 flex items-center justify-center ${letterContainerClass}`}
                        >
                          <span
                            className={`text-sm font-medium leading-6 ${letterTextClass}`}
                          >
                            {optionLetter}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-start items-center gap-2.5 min-w-0">
                          <span
                            className={`flex-1 justify-start text-xs font-medium leading-5 text-left break-words ${optionTextClass}`}
                          >
                            {option}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Actions footer blending with grey background */}
      <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2 shrink-0 ">
        <button
          onClick={handleNext}
          disabled={submitting}
          className="w-full py-3 bg-[#0a1f44] hover:bg-[#06142c] active:scale-[0.99] disabled:opacity-50 text-white text-base font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : isLastBlock ? (
            "Finish Listening Exam"
          ) : (
            "Next Question"
          )}
        </button>

        {currentBlockIndex > 0 && (
          <button
            onClick={handlePrev}
            className="w-full py-3 bg-transparent hover:bg-[#f5f5f5] border border-zinc-400 active:scale-[0.99] text-[#0a1f44] text-base font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center"
          >
            Previous Question
          </button>
        )}
      </div>
    </div>
  );
}
