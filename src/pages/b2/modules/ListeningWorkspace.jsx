import { trackB2Action } from "../../../utils/b2Telemetry";
import useB2SubmitGuard from "../../../hooks/useB2SubmitGuard";
import { B2Page, B2State } from "../../../components/b2/B2UI";
import useB2Draft from "../../../hooks/useB2Draft";
import B2WorkspaceHeader from "../../../components/b2/B2WorkspaceHeader";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  MessageSquare,
} from "lucide-react";
import { getB2Exercise, submitB2ExerciseAnswers } from "../../../api/b2Api";
import toast from "react-hot-toast";
import { useQuestionPositionTelemetry } from "../../../telemetry/learning";

export default function ListeningWorkspace() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { blockId_questionIdx: "selected_option" }
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitGuard = useB2SubmitGuard({
    questions,
    answers,
    index: currentBlockIndex,
    skill: "listening",
  });
  const draft = useB2Draft({
    draftKey: `b2-draft:v1:${user?.user_id || "guest"}:practice:${exerciseId}:listening`,
    answers,
    setAnswers,
    blockIndex: currentBlockIndex,
    setBlockIndex: setCurrentBlockIndex,
    loading,
    totalBlocks: questions.length,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0); // seconds
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  const currentBlock = questions[currentBlockIndex] || null;
  const blockQuestions = currentBlock ? currentBlock.questions || [] : [];
  useQuestionPositionTelemetry({
    feature: "b2.listening",
    sectionType: "listening",
    level: "B2",
    exerciseId,
    submissionId: exerciseId,
    question: currentBlock,
    currentIndex: currentBlockIndex,
    totalQuestions: questions.length,
    loading,
  });

  const fetchContent = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB2Exercise(exerciseId);
      const exercise = res.data || {};
      // Guard against a cross-module deep link (e.g. /b2/listening/<reading-id>)
      if (exercise.module && exercise.module !== "listening") {
        setFetchError(true);
        return;
      }
      setSubmission({ id: exerciseId });

      const list = (exercise.content?.blocks || []).map((block, idx) => ({
        id: idx,
        difficulty_tag: exercise.difficulty_tag,
        ...block,
      }));
      setQuestions(list);
    } catch (err) {
      console.error("Error fetching Listening exercise:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !exerciseId) return;
    fetchContent();
  }, [user?.user_id, exerciseId]);

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

      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
    }
  }, [currentBlockIndex, currentBlock?.audio_url]);

  const executeSubmission = async (currentAnswers) => {
    if (submitting || !submission) return;
    setSubmitting(true);
    try {
      if (audioRef.current) audioRef.current.pause();
      await submitB2ExerciseAnswers(exerciseId, {
        answers: currentAnswers,
      });
      trackB2Action("practice_completed", {
        skill: "listening",
        mode: "practice",
        entityId: exerciseId,
      });
      draft.clear();
      navigate(`/b2/listening/${exerciseId}/results`);
    } catch (err) {
      console.error("Error submitting listening answers:", err);
      toast.error("Failed to submit answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionSelect = (blockId, qIdx, option, qType = "mcq_single") => {
    const ansKey = `${blockId}_${qIdx}`;
    if (qType === "mcq_multi") {
      const currentSelection = Array.isArray(answers[ansKey])
        ? answers[ansKey]
        : [];
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

  if (loading)
    return (
      <B2Page title="Listening" back="/b2/listening">
        <B2State loading />
      </B2Page>
    );

  if (fetchError || questions.length === 0)
    return (
      <B2Page title="Listening" back="/b2/listening">
        <B2State
          title="Listening tasks couldn’t load"
          description="Your connection may have dropped. Try again when you’re ready."
          onRetry={fetchContent}
        />
      </B2Page>
    );

  const isLastBlock = currentBlockIndex === questions.length - 1;

  // Generate 44 simulated vertical bars for custom CSS waveform
  const totalWaveformBars = 44;
  const currentPlayedRatio =
    audioDuration > 0 ? audioProgress / audioDuration : 0;
  const playedBarsCount = Math.floor(currentPlayedRatio * totalWaveformBars);

  return (
    <div className="b2-ui b2-workspace w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      {submitGuard.confirmation}
      <B2WorkspaceHeader
        skill="listening"
        assessment={false}
        index={currentBlockIndex}
        total={questions.length}
        draftStatus={draft.status}
        onLeave={() => navigate("/b2/listening")}
      />

      <div
        ref={containerRef}
        className="flex-1 w-full overflow-y-auto flex flex-col justify-start items-center bg-[#f5f5f5]"
      >
        <div className="self-stretch px-4 pt-3 pb-6 flex flex-col gap-2.5 bg-white shrink-0">
          <div className="self-stretch flex items-center gap-4">
            <button
              type="button"
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              onClick={handlePlayPause}
              className="size-16 bg-[#0a1f44] hover:bg-[#06142c] active:scale-95 text-white rounded-full flex items-center justify-center outline-none border-0 cursor-pointer shadow-md transition-all shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-white stroke-white" />
              ) : (
                <Play className="w-7 h-7 fill-white stroke-white ml-1" />
              )}
            </button>

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

            <span className="text-xs font-semibold text-black/40 shrink-0">
              {formatSeconds(Math.round(audioDuration || 0))}
            </span>
          </div>

          <p className="self-stretch text-sky-950 text-base font-bold leading-6">
            Listen to the audio and answer the questions below
          </p>
        </div>

        <div className="self-stretch w-full px-4 py-4 bg-[#f5f5f5] inline-flex justify-center items-center gap-3.5 shrink-0">
          <div className="w-9 h-9 relative bg-blue-950 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">?</span>
          </div>
          <h2 className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left">
            Questions
          </h2>
        </div>

        <div className="self-stretch px-4 pt-4 pb-6 bg-[#f5f5f5] flex flex-col justify-start items-center gap-6 flex-1 w-full min-h-[300px]">
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
                      aria-label={q.question_text || "Your answer"}
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
                    const isSelected =
                      qType === "mcq_multi"
                        ? Array.isArray(selectedOpt) &&
                          selectedOpt.includes(optionLetter)
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
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        key={optIdx}
                        onClick={() =>
                          handleOptionSelect(
                            currentBlock.id,
                            qIdx,
                            optionLetter,
                            qType,
                          )
                        }
                        className={`b2-answer w-full p-2.5 rounded-lg border inline-flex justify-start items-center gap-3 cursor-pointer hover:bg-slate-50/50 transition-all ${cardClass}`}
                      >
                        <span
                          className={`w-8 h-8 rounded-sm overflow-hidden shrink-0 flex items-center justify-center ${letterContainerClass}`}
                        >
                          <span
                            className={`text-sm font-medium leading-6 ${letterTextClass}`}
                          >
                            {optionLetter}
                          </span>
                        </span>
                        <span className="flex-1 flex justify-start items-center gap-2.5 min-w-0">
                          <span
                            className={`flex-1 justify-start text-xs font-medium leading-5 text-left break-words ${optionTextClass}`}
                          >
                            {option}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="b2-actionbar">
        <button
          onClick={() => submitGuard.request(handleNext)}
          disabled={submitting}
          className="w-full py-3 bg-[#0a1f44] hover:bg-[#06142c] active:scale-[0.99] disabled:opacity-50 text-white text-base font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : isLastBlock ? (
            "Finish practice"
          ) : (
            "Next task"
          )}
        </button>

        {currentBlockIndex > 0 && (
          <button
            onClick={handlePrev}
            className="w-full py-3 bg-transparent hover:bg-[#f5f5f5] border border-zinc-400 active:scale-[0.99] text-[#0a1f44] text-base font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center"
          >
            Previous task
          </button>
        )}
      </div>
    </div>
  );
}
