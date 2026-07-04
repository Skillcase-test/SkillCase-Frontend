import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Pause,
  Clock,
  MessageSquare,
} from "lucide-react";
import {
  getB1ExamSubmissionStatus,
  getB1ExamSectionContent,
} from "../../../api/b1Api";
import { images } from "../../../assets/images";

export default function ExamListeningResults() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const submissionId = location.state?.submissionId;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sectionData, setSectionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(null);
  const [isOverallCompleted, setIsOverallCompleted] = useState(false);
  const containerRef = useRef(null);

  // Custom audio waveform player states for the modal overlay
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef(null);

  const score = sectionData
    ? Math.round(parseFloat(sectionData.score || 0))
    : 0;
  const answersMap = sectionData ? sectionData.answers || {} : {};

  const isExamQuestionCorrect = (userAns, q) => {
    const type = q.type || "mcq_single";
    if (userAns === undefined || userAns === null) return false;
    if (typeof userAns === "string" && !userAns.trim()) return false;
    if (Array.isArray(userAns) && userAns.length === 0) return false;

    if (type === "mcq_single" || type === "true_false" || type === "matching_headers" || type === "matching_ads" || type === "cloze_mcq" || type === "cloze_box") {
      return String(userAns).trim().toLowerCase() === String(q.correct_option).trim().toLowerCase();
    }

    if (type === "mcq_multi") {
      const userArr = (Array.isArray(userAns) ? userAns : [userAns])
        .map(v => String(v).trim().toLowerCase())
        .filter(Boolean);

      let correctArr = [];
      if (Array.isArray(q.correct_option)) {
        correctArr = q.correct_option.map(v => String(v).trim().toLowerCase());
      } else if (typeof q.correct_option === "string") {
        correctArr = q.correct_option.split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
      }
      if (userArr.length === 0) return false;
      return userArr.length === correctArr.length && userArr.every(v => correctArr.includes(v));
    }

    if (type === "fill_blanks") {
      const userStr = String(userAns).trim().toLowerCase();
      if (Array.isArray(q.correct_option)) {
        return q.correct_option.some(opt => String(opt).trim().toLowerCase() === userStr);
      } else {
        return String(q.correct_option).trim().toLowerCase() === userStr;
      }
    }

    return false;
  };

  const getB1Image = (name) => {
    return images[name] || images.videoPlaceholder;
  };

  // Convert array of block structures into a single flat list of questions with audio metadata
  const flatQuestions = [];
  questions.forEach((block) => {
    const blockQ = block.questions || [];
    blockQ.forEach((q, idx) => {
      const ansKey = `${block.id}_${idx}`;
      const userSelection = answersMap[ansKey];
      const isCorrect = isExamQuestionCorrect(userSelection, q);

      flatQuestions.push({
        ...q,
        blockId: block.id,
        qIdx: idx,
        userSelection,
        isCorrect,
        audio_url: block.audio_url,
        block_title: block.block_title,
      });
    });
  });

  const currentReviewQuestion =
    selectedReviewIndex !== null ? flatQuestions[selectedReviewIndex] : null;

  const handleBackToDashboard = () => {
    if (isOverallCompleted) {
      navigate(`/b1/exams/papers/${paperId}/congratulations`);
    } else {
      navigate(`/b1/exams/papers/${paperId}/dashboard`);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      if (!submissionId) {
        throw new Error("No submissionId provided in state");
      }

      const statusRes = await getB1ExamSubmissionStatus(submissionId);
      setIsOverallCompleted(statusRes.data.submission?.status === "completed");

      const sectionsList = Array.isArray(statusRes.data.sections)
        ? statusRes.data.sections
        : [];
      const listeningSection = sectionsList.find(
        (s) => s.section_type === "listening",
      );
      setSectionData(listeningSection);

      const contentRes = await getB1ExamSectionContent(paperId, "listening");
      setQuestions(Array.isArray(contentRes.data) ? contentRes.data : []);
    } catch (err) {
      console.error("Error fetching Listening results:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchResults();
  }, [user?.user_id, paperId, submissionId]);

  // Initialize and preload audio whenever selected review question changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);

    const audioUrl = currentReviewQuestion?.audio_url;
    if (audioUrl) {
      const audio = new Audio(audioUrl);
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
  }, [selectedReviewIndex, currentReviewQuestion?.audio_url]);

  // Scroll to top when review question changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [selectedReviewIndex]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
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

  const handleStartNextSection = () => {
    handleBackToDashboard();
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (fetchError || !sectionData) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <p className="text-slate-500 text-xs font-semibold text-center">
          Failed to load Listening results.
        </p>
        <button
          onClick={handleBackToDashboard}
          className="px-4 py-2 bg-sky-950 text-white rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const formatSeconds = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Waveform bars details for the overlay
  const totalWaveformBars = 20;
  const currentPlayedRatio =
    audioDuration > 0 ? audioProgress / audioDuration : 0;
  const playedBarsCount = Math.floor(currentPlayedRatio * totalWaveformBars);

  // SVG circular ring details
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      {/* Top Header Logo & Profile bar */}

      {/* Navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => {
              if (selectedReviewIndex !== null) {
                setSelectedReviewIndex(null);
              } else if (reviewMode) {
                setReviewMode(false);
              } else {
                handleBackToDashboard();
              }
            }}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            {selectedReviewIndex !== null
              ? "Listening Review"
              : reviewMode
              ? "TELC"
              : "Listening Feedback"}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedReviewIndex !== null ? (
        /* ================= DETAILED QUESTION REVIEW PAGE ================= */
        <div
          ref={containerRef}
          className="flex-1 w-full overflow-y-auto pb-48 flex flex-col justify-start items-center"
        >
          {/* Progress segments bar */}
          <div className="self-stretch px-4 pt-1 flex flex-col justify-start items-start gap-1.5 shrink-0 bg-white">
            <div className="self-stretch inline-flex justify-between items-center">
              <span className="text-sky-950 text-base font-semibold leading-5">
                Question {(selectedReviewIndex + 1).toString().padStart(2, "0")}{" "}
                of {flatQuestions.length.toString().padStart(2, "0")}
              </span>
              <div className="px-2 py-1 bg-black/5 rounded-[40px] border border-black/5 flex justify-center items-center gap-1 shrink-0">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    currentReviewQuestion.isCorrect
                      ? "text-green-700"
                      : "text-red-500"
                  }`}
                />
                <span className="text-center text-sky-950 text-xs font-semibold leading-5">
                  {currentReviewQuestion.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
            </div>

            {/* Horizontal progress bar segments */}
            <div className="self-stretch flex justify-start items-center gap-0.5 pb-1">
              {flatQuestions.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-3 rounded-[200px] transition-all ${
                    idx <= selectedReviewIndex ? "bg-amber-300" : "bg-zinc-100"
                  }`}
                ></div>
              ))}
            </div>
          </div>

          {/* Waveform Player Section */}
          {currentReviewQuestion.audio_url && (
            <div className="self-stretch px-4 pt-0.5 pb-1 flex flex-col items-center gap-1.5 bg-white shrink-0">
              <div className="self-stretch flex flex-col items-center gap-2">
                <div className="inline-flex justify-center items-center gap-5">
                  {/* Play/Pause Button */}
                  <button
                    onClick={handlePlayPause}
                    className="size-16 relative bg-[#0a1f44] hover:bg-[#06142c] active:scale-95 text-white rounded-full flex items-center justify-center outline-none border-0 cursor-pointer shadow-md transition-all shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-white stroke-white" />
                    ) : (
                      <Play className="w-6 h-6 fill-white stroke-white ml-1" />
                    )}
                  </button>

                  {/* Waveform bars */}
                  <div className="flex justify-start items-center gap-5">
                    <div className="flex justify-start items-center gap-1">
                      {Array.from({ length: 24 }).map((_, barIdx) => {
                        const isPlayed =
                          barIdx <=
                          Math.floor(
                            (audioDuration > 0
                              ? audioProgress / audioDuration
                              : 0) * 24,
                          );
                        const heights = [
                          10, 12, 16, 8, 12, 5, 5, 12, 8, 12, 5, 5, 16, 12, 5,
                          5, 12, 5, 5, 12, 14, 20, 6, 6,
                        ];
                        const height = heights[barIdx % heights.length];

                        return (
                          <div
                            key={barIdx}
                            style={{ height: `${height}px` }}
                            className={`w-1 rounded-full transition-all ${
                              isPlayed ? "bg-blue-950" : "bg-black/20"
                            }`}
                          ></div>
                        );
                      })}
                    </div>
                    <div className="text-center justify-start text-black/30 text-xs font-semibold leading-5 shrink-0">
                      {/* Fallback 0 (shows 00:00) not 60 (shows a misleading 01:00) */}
                      {formatSeconds(Math.round(audioDuration || 0))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-80 justify-start text-sky-950 text-base font-semibold leading-5 text-center">
                Listen to the audio and answer the questions below
              </div>
            </div>
          )}

          {/* Divider Section */}
          <div className="self-stretch px-4 pt-3 pb-1 bg-black/5 inline-flex justify-center items-center gap-3.5 shrink-0">
            <div className="size-9 relative bg-blue-950 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
              <div className="size-4 relative overflow-hidden flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left">
              Question Feedback
            </div>
          </div>

          {/* Question card details */}
          <div className="self-stretch px-4 pt-4 pb-12 bg-black/5 flex flex-col justify-start items-center gap-6 flex-1 w-full min-h-[350px]">
            <div className="self-stretch p-3 bg-white rounded-xl border border-zinc-300 flex flex-col justify-start items-start gap-2.5 shadow-sm">
              <div className="self-stretch flex flex-col justify-start items-center gap-5">
                <div className="self-stretch justify-start text-sky-950 text-base font-semibold leading-5 text-left">
                  {currentReviewQuestion.question_text}
                </div>

                {/* MCQ option feedback list */}
                {currentReviewQuestion.type === "fill_blanks" ? (
                  <div className="w-full">
                    <input
                      type="text"
                      disabled
                      value={currentReviewQuestion.userSelection || ""}
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-xs font-semibold ${
                        currentReviewQuestion.isCorrect
                          ? "border-green-700 bg-emerald-50 text-green-700"
                          : "border-red-500 bg-red-50 text-red-500"
                      }`}
                    />
                  </div>
                ) : (
                  <div className="self-stretch flex flex-col justify-start items-start gap-2 w-full">
                    {(currentReviewQuestion.options || []).map((option, oIdx) => {
                      const optionLetter = String.fromCharCode(65 + oIdx);
                      
                      let isCorrectOption = false;
                      let isUserSelection = false;

                      if (currentReviewQuestion.type === "mcq_multi") {
                        let correctArr = [];
                        if (Array.isArray(currentReviewQuestion.correct_option)) {
                          correctArr = currentReviewQuestion.correct_option.map(v => String(v).trim().toUpperCase());
                        } else if (typeof currentReviewQuestion.correct_option === "string") {
                          correctArr = currentReviewQuestion.correct_option.split(",").map(v => v.trim().toUpperCase()).filter(Boolean);
                        }
                        const userArr = (Array.isArray(currentReviewQuestion.userSelection) ? currentReviewQuestion.userSelection : [currentReviewQuestion.userSelection])
                          .map(v => String(v).trim().toUpperCase())
                          .filter(Boolean);
                        
                        isCorrectOption = correctArr.includes(optionLetter);
                        isUserSelection = userArr.includes(optionLetter);
                      } else {
                        isCorrectOption = optionLetter === currentReviewQuestion.correct_option;
                        isUserSelection = optionLetter === currentReviewQuestion.userSelection;
                      }

                      let optionStyle = "bg-white border-zinc-300 text-slate-900";
                      let letterTagStyle = "bg-black/5 text-gray-900/30";

                      if (isCorrectOption) {
                        optionStyle =
                          "bg-emerald-100/50 border-green-700 text-green-700 font-semibold";
                        letterTagStyle = "bg-green-700/10 text-green-700";
                      } else if (isUserSelection) {
                        optionStyle =
                          "bg-rose-200/40 border-red-500 text-red-500 font-semibold";
                        letterTagStyle = "bg-red-500/10 text-red-500";
                      } else {
                        optionStyle = "bg-white border-zinc-200 opacity-60 text-slate-400";
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`self-stretch p-2.5 rounded-lg border inline-flex justify-start items-center gap-9 w-full text-left ${optionStyle}`}
                        >
                          <div className="flex-1 flex justify-start items-center gap-2">
                            <div
                              className={`size-8 rounded-sm flex items-center justify-center shrink-0 ${letterTagStyle}`}
                            >
                              <span className="text-base font-medium leading-6">
                                {optionLetter}
                              </span>
                            </div>
                            <span className="text-base font-medium leading-6">
                              {option}
                            </span>

                            {isCorrectOption && (
                              <span className="ml-auto flex items-center justify-center size-5 bg-green-700 rounded-full shrink-0">
                                <span className="w-1.5 h-[3px] border-b-2 border-r-2 border-white rotate-45 mb-0.5" />
                              </span>
                            )}
                            {isUserSelection && !isCorrectOption && (
                              <span className="ml-auto flex items-center justify-center size-5 bg-red-500 rounded-full shrink-0">
                                <span className="text-white text-xs font-bold leading-none">
                                  ×
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation text */}
                {currentReviewQuestion.type === "fill_blanks" ? (
                  currentReviewQuestion.userSelection ? (
                    currentReviewQuestion.isCorrect ? (
                      <div className="self-stretch p-3 bg-emerald-100/10 border border-green-700/20 rounded-lg text-left flex flex-col gap-1 w-full mt-2">
                        <span className="text-green-700 text-xs font-semibold">
                          Correct:
                        </span>
                        <p className="text-green-700 text-xs font-normal leading-relaxed">
                          {currentReviewQuestion.explanation || `The correct answer is "${Array.isArray(currentReviewQuestion.correct_option) ? currentReviewQuestion.correct_option.join(" or ") : currentReviewQuestion.correct_option}".`}
                        </p>
                      </div>
                    ) : (
                      <div className="self-stretch p-3 bg-red-100/10 border border-red-500/20 rounded-lg text-left flex flex-col gap-1 w-full mt-2">
                        <span className="text-red-500 text-xs font-semibold">
                          Incorrect:
                        </span>
                        <p className="text-red-500 text-xs font-normal leading-relaxed">
                          {currentReviewQuestion.explanation || `The correct answer is "${Array.isArray(currentReviewQuestion.correct_option) ? currentReviewQuestion.correct_option.join(" or ") : currentReviewQuestion.correct_option}".`}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="self-stretch p-3 bg-zinc-100 border border-zinc-300 rounded-lg text-left flex flex-col gap-1 w-full mt-2">
                      <span className="text-zinc-500 text-xs font-semibold">
                        Skipped:
                      </span>
                      <p className="text-zinc-500 text-xs font-normal leading-relaxed">
                        You skipped this question. The correct answer is "{Array.isArray(currentReviewQuestion.correct_option) ? currentReviewQuestion.correct_option.join(" or ") : currentReviewQuestion.correct_option}".
                      </p>
                    </div>
                  )
                ) : (
                  (() => {
                    const isSkipped = currentReviewQuestion.type === "mcq_multi"
                      ? (!currentReviewQuestion.userSelection || (Array.isArray(currentReviewQuestion.userSelection) && currentReviewQuestion.userSelection.length === 0))
                      : !currentReviewQuestion.userSelection;

                    if (isSkipped) {
                      let correctStr = "";
                      if (Array.isArray(currentReviewQuestion.correct_option)) {
                        correctStr = currentReviewQuestion.correct_option.join(", ");
                      } else {
                        correctStr = String(currentReviewQuestion.correct_option);
                      }
                      return (
                        <div className="self-stretch p-3 bg-zinc-100 border border-zinc-300 rounded-lg text-left flex flex-col gap-1 w-full mt-2">
                          <span className="text-zinc-500 text-xs font-semibold">
                            Skipped:
                          </span>
                          <p className="text-zinc-500 text-xs font-normal leading-relaxed">
                            You skipped this question. The correct option is {correctStr}.
                          </p>
                        </div>
                      );
                    }

                    const displayCorrectOpt = Array.isArray(currentReviewQuestion.correct_option)
                      ? currentReviewQuestion.correct_option.join(", ")
                      : currentReviewQuestion.correct_option;

                    if (currentReviewQuestion.isCorrect) {
                      return (
                        <div className="self-stretch p-3 bg-emerald-100/10 border border-green-700/20 rounded-lg text-left flex flex-col gap-1 w-full mt-2">
                          <span className="text-green-700 text-xs font-semibold">
                            Correct:
                          </span>
                          <p className="text-green-700 text-xs font-normal leading-relaxed">
                            {currentReviewQuestion.explanation || `The correct answer is Option ${displayCorrectOpt}.`}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="self-stretch p-3 bg-red-100/10 border border-red-500/20 rounded-lg text-left flex flex-col gap-1 w-full mt-2">
                        <span className="text-red-500 text-xs font-semibold">
                          Incorrect:
                        </span>
                        <p className="text-red-500 text-xs font-normal leading-relaxed">
                          {currentReviewQuestion.explanation || `The correct answer is Option ${displayCorrectOpt}.`}
                        </p>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2 shrink-0 ">
            <button
              onClick={() => {
                if (selectedReviewIndex === flatQuestions.length - 1) {
                  setSelectedReviewIndex(null); // return to list index
                } else {
                  setSelectedReviewIndex((prev) => prev + 1);
                }
              }}
              className="w-full py-3 bg-[#0a1f44] hover:bg-[#06142c] active:scale-[0.99] text-white text-base font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
            >
              {selectedReviewIndex === flatQuestions.length - 1
                ? "Review Answers List"
                : "Review Next Question"}
            </button>

            <button
              onClick={handleStartNextSection}
              className="w-full py-3 bg-transparent hover:bg-black/5 border border-zinc-400 active:scale-[0.99] text-[#0a1f44] text-base font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center"
            >
              Start Next Section
            </button>
          </div>
        </div>
      ) : reviewMode ? (
        /* ================= REVIEW ANSWER INDEX LIST VIEW ================= */
        <div
          ref={containerRef}
          className="flex-1 w-full overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-24"
        >
          <div className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sky-950 text-base font-semibold">
              Listening Review
            </h3>
            <p className="text-slate-500 text-xs">
              Click any question below to see details.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {flatQuestions.map((q, idx) => {
              const skipped = !q.userSelection;
              const cardBg = q.isCorrect
                ? "bg-emerald-50 border-green-700/20 hover:border-green-700/40"
                : skipped
                ? "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                : "bg-rose-50 border-red-500/20 hover:border-red-500/40";

              const iconColor = q.isCorrect
                ? "text-green-700"
                : skipped
                ? "text-zinc-400"
                : "text-red-500";

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedReviewIndex(idx)}
                  className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${cardBg}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        q.isCorrect
                          ? "bg-green-700/10 text-green-700"
                          : skipped
                          ? "bg-zinc-100 text-zinc-400"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {(q.qIdx + 1).toString().padStart(2, "0")}
                    </div>
                    <span className="text-slate-900 text-xs font-semibold leading-snug truncate">
                      {q.question_text}
                    </span>
                  </div>
                  <div className="shrink-0 ml-3">
                    {q.isCorrect ? (
                      <CheckCircle2 className={`w-5 h-5 ${iconColor}`} />
                    ) : skipped ? (
                      <HelpCircle className={`w-5 h-5 ${iconColor}`} />
                    ) : (
                      <XCircle className={`w-5 h-5 ${iconColor}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Actions Footer */}
          <div className="absolute bottom-0 inset-x-0  p-4 flex flex-col gap-2 shrink-0">
            <button
              onClick={handleStartNextSection}
              className="w-full py-3 bg-[#0a1f44] hover:bg-[#06142c] active:scale-[0.99] text-white text-base font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
            >
              Start Next Section
            </button>
          </div>
        </div>
      ) : (
        /* ================= RESULTS DASHBOARD VIEW ================= */
        <div className="flex-1 w-full overflow-y-auto px-4 py-6 flex flex-col justify-start items-center gap-6 bg-white pb-36">
          <div className="self-stretch inline-flex justify-start items-center gap-2.5">
            <div className="flex-1 px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
              <div className="flex flex-col justify-start items-center gap-3">
                <div className="text-center justify-start text-sky-950 text-base font-semibold">
                  Listening Result
                </div>
                <div className="text-center justify-start text-sky-950 text-3xl font-semibold leading-9">
                  {score >= 50 ? "Good job" : "Keep practicing"}
                </div>
              </div>

              {/* Dynamic Circular Gauge */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    className="stroke-zinc-300 fill-none"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    className="stroke-green-600 fill-none transition-all duration-1000 ease-out"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center flex flex-col items-center justify-center px-4">
                  <span className="text-slate-900 text-3xl font-extrabold">
                    {score}%
                  </span>
                  <span className="text-neutral-500 text-[10px] font-bold mt-1">
                    {sectionData.correct_count} out of {flatQuestions.length}{" "}
                    correct
                  </span>
                </div>
              </div>

              {/* Stats colored grid */}
              <div className="self-stretch inline-flex justify-start items-center gap-2">
                <div className="flex-1 p-2.5 bg-green-700/20 rounded-md flex justify-center items-center">
                  <div className="inline-flex flex-col justify-center items-center gap-1">
                    <span className="text-green-700 text-xs font-normal leading-none">
                      Correct
                    </span>
                    <span className="text-green-700 text-3xl font-semibold leading-none mt-1">
                      {sectionData.correct_count.toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-2.5 bg-red-100 rounded-md flex justify-center items-center">
                  <div className="inline-flex flex-col justify-center items-center gap-1">
                    <span className="text-red-500 text-xs font-normal leading-none">
                      Incorrect
                    </span>
                    <span className="text-red-500 text-3xl font-semibold leading-none mt-1">
                      {sectionData.incorrect_count.toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-2.5 bg-neutral-400/20 rounded-md flex justify-center items-center">
                  <div className="inline-flex flex-col justify-center items-center gap-1">
                    <span className="text-neutral-500 text-xs font-normal leading-none">
                      Skipped
                    </span>
                    <span className="text-neutral-500 text-3xl font-semibold leading-none mt-1">
                      {sectionData.skipped_count.toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons (swapped order) */}
              <div className="self-stretch flex flex-col justify-start items-start gap-2 w-full mt-4">
                <button
                  onClick={() => setReviewMode(true)}
                  className="self-stretch px-4 py-3 bg-[#0a1f44] hover:bg-[#06142c] text-white text-base font-semibold rounded-lg shadow-md border-0 cursor-pointer flex justify-center items-center"
                >
                  Review Answers
                </button>
                <button
                  onClick={handleStartNextSection}
                  className="self-stretch px-4 py-3 bg-transparent hover:bg-black/5 border border-zinc-400 text-sky-950 text-base font-semibold rounded-lg transition-colors cursor-pointer flex justify-center items-center"
                >
                  Start Next Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
