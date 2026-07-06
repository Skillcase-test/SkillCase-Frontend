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
  MessageSquare,
} from "lucide-react";
import {
  getB1ExamSubmissionStatus,
  getB1ExamSectionContent,
} from "../../../api/b1Api";

const padZero = (num) => String(num || 0).padStart(2, "0");

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
  const [reviewBlockIndex, setReviewBlockIndex] = useState(null);
  const [isOverallCompleted, setIsOverallCompleted] = useState(false);
  const containerRef = useRef(null);

  // Custom audio player states
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

    if (
      type === "mcq_single" ||
      type === "true_false" ||
      type === "matching_headers" ||
      type === "matching_ads" ||
      type === "cloze_mcq" ||
      type === "cloze_box"
    ) {
      return (
        String(userAns).trim().toLowerCase() ===
        String(q.correct_option).trim().toLowerCase()
      );
    }

    if (type === "mcq_multi") {
      const userArr = (Array.isArray(userAns) ? userAns : [userAns])
        .map((v) => String(v).trim().toLowerCase())
        .filter(Boolean);

      let correctArr = [];
      if (Array.isArray(q.correct_option)) {
        correctArr = q.correct_option.map((v) => String(v).trim().toLowerCase());
      } else if (typeof q.correct_option === "string") {
        correctArr = q.correct_option
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean);
      }
      if (userArr.length === 0) return false;
      return (
        userArr.length === correctArr.length &&
        userArr.every((v) => correctArr.includes(v))
      );
    }

    if (type === "fill_blanks") {
      const userStr = String(userAns).trim().toLowerCase();
      if (Array.isArray(q.correct_option)) {
        return q.correct_option.some(
          (opt) => String(opt).trim().toLowerCase() === userStr,
        );
      } else {
        return String(q.correct_option).trim().toLowerCase() === userStr;
      }
    }

    return false;
  };

  const flatQuestions = [];
  questions.forEach((block, blockIdx) => {
    const blockQ = block.questions || [];
    blockQ.forEach((q, idx) => {
      const ansKey = `${block.id}_${idx}`;
      const userSelection = answersMap[ansKey];
      const isCorrect = isExamQuestionCorrect(userSelection, q);

      flatQuestions.push({
        ...q,
        blockId: block.id,
        blockIndex: blockIdx,
        qIdx: idx,
        userSelection,
        isCorrect,
        audio_url: block.audio_url,
        block_title: block.block_title,
      });
    });
  });

  const currentBlock =
    reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
  const blockQuestions = currentBlock ? currentBlock.questions || [] : [];
  const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

  let questionRangeText = "";
  if (reviewBlockIndex !== null) {
    let globalStartIdx = 1;
    for (let i = 0; i < reviewBlockIndex; i++) {
      globalStartIdx += questions[i].questions?.length || 0;
    }
    const globalEndIdx = globalStartIdx + blockQuestions.length - 1;
    questionRangeText =
      blockQuestions.length > 1
        ? `Question ${padZero(globalStartIdx)}-${padZero(
            globalEndIdx,
          )} of ${padZero(flatQuestions.length)}`
        : `Question ${padZero(globalStartIdx)} of ${padZero(
            flatQuestions.length,
          )}`;
  }

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

  // Audio track initializer
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);

    const audioUrl = currentBlock?.audio_url;
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

      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
    }
  }, [reviewBlockIndex, currentBlock?.audio_url]);

  // Scroll to top when review page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [reviewBlockIndex]);

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


  const getGreeting = () => {
    if (score >= 70) return "Good job";
    if (score >= 50) return "Well done!";
    return "Keep practicing!";
  };

  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Waveform bars variables
  const totalWaveformBars = 44;
  const currentPlayedRatio = audioDuration > 0 ? audioProgress / audioDuration : 0;
  const playedBarsCount = Math.floor(currentPlayedRatio * totalWaveformBars);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      {/* Navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => {
              if (reviewMode) {
                if (reviewBlockIndex !== null) {
                  setReviewBlockIndex(null);
                } else {
                  setReviewMode(false);
                }
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
            {reviewBlockIndex !== null ? "Listening" : "Listening Feedback"}
          </span>
        </div>
      </div>

      {!reviewMode ? (
        /* ================= RESULTS DASHBOARD VIEW ================= */
        <div className="flex-1 w-full overflow-y-auto px-4 py-6 flex flex-col justify-start items-center">
          <div className="w-full max-w-[360px] px-5 pt-8 pb-6 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-6 border border-zinc-200/50">
            <h2 className="text-center text-sky-950 text-2xl font-semibold leading-9">
              {getGreeting()}
            </h2>

            <div className="relative flex items-center justify-center w-32 h-32">
              <svg width={size} height={size} className="transform -rotate-90">
                <circle
                  stroke="#e2e8f0"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  r={radius}
                  cx={size / 2}
                  cy={size / 2}
                />
                <circle
                  stroke="#0BAA45"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  r={radius}
                  cx={size / 2}
                  cy={size / 2}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-sky-950 leading-none">
                  {score}%
                </span>
                <span className="text-sky-950 text-[8px] font-semibold mt-1 text-center whitespace-nowrap">
                  {sectionData.correct_count} of {flatQuestions.length} correct
                </span>
              </div>
            </div>

            <div className="self-stretch inline-flex justify-start items-center gap-2">
              <div className="flex-1 p-2 bg-green-700/10 rounded-md border border-green-700/20 flex justify-center items-center">
                <div className="w-11 inline-flex flex-col justify-center items-center">
                  <span className="w-16 text-center text-green-700 text-[10px] font-medium leading-5">
                    Correct
                  </span>
                  <span className="text-center text-green-700 text-xl font-semibold mt-0.5">
                    {padZero(sectionData.correct_count)}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-2 bg-red-100 rounded-md border border-red-200/30 flex justify-center items-center">
                <div className="w-11 inline-flex flex-col justify-center items-center">
                  <span className="w-16 text-center text-red-500 text-[10px] font-medium leading-5">
                    Incorrect
                  </span>
                  <span className="text-center text-red-500 text-xl font-semibold mt-0.5">
                    {padZero(sectionData.incorrect_count)}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-2 bg-neutral-400/20 rounded-md border border-neutral-300/30 flex justify-center items-center">
                <div className="w-11 inline-flex flex-col justify-center items-center">
                  <span className="w-16 text-center text-neutral-500 text-[10px] font-medium leading-5">
                    Skipped
                  </span>
                  <span className="text-center text-neutral-500 text-xl font-semibold mt-0.5">
                    {padZero(sectionData.skipped_count)}
                  </span>
                </div>
              </div>
            </div>

            <div className="self-stretch flex flex-col justify-start items-start gap-2">
              <button
                onClick={() => {
                  setReviewMode(true);
                  setReviewBlockIndex(null);
                }}
                className="self-stretch px-4 py-3 active:scale-95 text-xs font-semibold leading-5 rounded-lg cursor-pointer outline-none transition-all flex justify-center items-center border-0 bg-[#002856] hover:bg-blue-900 text-white"
              >
                Review Answers
              </button>

              <button
                onClick={handleStartNextSection}
                className="self-stretch px-4 py-3 active:scale-95 text-xs font-semibold leading-5 rounded-lg cursor-pointer outline-none transition-all flex justify-center items-center text-blue-950 hover:bg-slate-50 border border-zinc-300"
              >
                Start Next Section
              </button>
            </div>
          </div>
        </div>
      ) : reviewBlockIndex === null ? (
        /* ================= REVIEW ANSWER INDEX LIST VIEW ================= */
        <div className="flex-1 w-full overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-36">
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
                  onClick={() => setReviewBlockIndex(q.blockIndex)}
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
                      {padZero(q.qIdx + 1)}
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

          <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2.5 z-40 shrink-0">
            <button
              onClick={handleStartNextSection}
              className="w-full max-w-[380px] mx-auto py-3 bg-[#002856] hover:bg-blue-900 active:scale-[0.99] text-white text-base font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
            >
              Start Next Section
            </button>
          </div>
        </div>
      ) : (
        /* ================= DETAILED BLOCK REVIEW VIEW ================= */
        <div className="flex-1 w-full flex flex-col justify-start items-center overflow-hidden">
          <div className="self-stretch px-4 pt-1 flex flex-col justify-start items-start gap-2 shrink-0 bg-white">
            <div className="self-stretch text-center text-sky-950 text-base font-semibold leading-5">
              {questionRangeText}
            </div>
            <div className="self-stretch flex justify-start items-center gap-1.5 pb-4">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-2.5 rounded-[200px] transition-all ${
                    idx <= reviewBlockIndex ? "bg-amber-300" : "bg-zinc-100"
                  }`}
                ></div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full overflow-y-auto">
            {/* Waveform Player Section */}
            {currentBlock?.audio_url && (
              <div className="self-stretch px-4 pt-3 pb-6 flex flex-col gap-2.5 bg-white shrink-0 border-b border-zinc-100">
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
            )}

            <div className="self-stretch w-full px-4 py-4 bg-black/5 inline-flex justify-center items-center gap-3.5">
              <div className="w-9 h-9 relative bg-blue-950 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                <span className="text-white text-base font-bold">?</span>
              </div>
              <h2 className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left">
                Questions
              </h2>
            </div>

            <div className="self-stretch px-4 pt-4 pb-48 bg-black/5 flex flex-col justify-start items-center gap-6">
              {blockQuestions.map((q, qIdx) => {
                const ansKey = `${currentBlock.id}_${qIdx}`;
                const userSelection = answersMap[ansKey];
                const isCorrect = isExamQuestionCorrect(userSelection, q);
                const qType = q.type || "mcq_single";

                return (
                  <div
                    key={qIdx}
                    className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4 text-left shadow-sm"
                  >
                    <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                      {qIdx + 1}. {q.question_text}
                    </div>

                    {qType === "fill_blanks" ? (
                      <div className="w-full">
                        <input
                          type="text"
                          disabled
                          value={userSelection || ""}
                          className={`w-full px-3.5 py-2.5 border rounded-lg text-xs font-semibold ${
                            isCorrect
                              ? "border-green-700 bg-emerald-50 text-green-700"
                              : "border-red-500 bg-red-50 text-red-500"
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="self-stretch flex flex-col justify-start items-start gap-2 w-full">
                        {(q.options || []).map((option, optIdx) => {
                          const optionLetter = String.fromCharCode(65 + optIdx);

                          let isCorrectOption = false;
                          let isUserSelection = false;

                          if (qType === "mcq_multi") {
                            let correctArr = [];
                            if (Array.isArray(q.correct_option)) {
                              correctArr = q.correct_option.map((v) =>
                                String(v).trim().toUpperCase(),
                              );
                            } else if (typeof q.correct_option === "string") {
                              correctArr = q.correct_option
                                .split(",")
                                .map((v) => v.trim().toUpperCase())
                                .filter(Boolean);
                            }
                            const userArr = (
                              Array.isArray(userSelection)
                                ? userSelection
                                : [userSelection]
                            )
                              .map((v) => String(v).trim().toUpperCase())
                              .filter(Boolean);

                            isCorrectOption = correctArr.includes(optionLetter);
                            isUserSelection = userArr.includes(optionLetter);
                          } else {
                            isCorrectOption = optionLetter === q.correct_option;
                            isUserSelection = optionLetter === userSelection;
                          }

                          let optionStyle =
                            "bg-white border-zinc-200 text-slate-700";
                          let letterTagStyle = "bg-black/5 text-gray-900/30";
                          let showCheck = false;
                          let showCross = false;

                          if (isCorrectOption) {
                            optionStyle =
                              "bg-emerald-50 border-green-700 text-green-700 font-semibold";
                            letterTagStyle = "bg-green-700/10 text-green-700";
                            if (isUserSelection) showCheck = true;
                          } else if (isUserSelection) {
                            optionStyle =
                              "bg-red-50 border-red-500 text-red-500 font-semibold";
                            letterTagStyle = "bg-red-500/10 text-red-500";
                            showCross = true;
                          } else {
                            optionStyle =
                              "bg-white border-zinc-200 opacity-60 text-slate-400";
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`w-full p-2.5 rounded-lg border inline-flex justify-start items-center gap-3 ${optionStyle}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-sm overflow-hidden shrink-0 flex items-center justify-center ${letterTagStyle}`}
                              >
                                <span className="text-sm font-medium leading-6">
                                  {optionLetter}
                                </span>
                              </div>
                              <div className="flex-1 flex justify-between items-center min-w-0">
                                <span className="text-xs font-medium leading-5 break-words text-left">
                                  {option}
                                </span>
                                {showCheck && (
                                  <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0 ml-2" />
                                )}
                                {showCross && (
                                  <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-2" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {qType === "fill_blanks" ? (
                      userSelection ? (
                        isCorrect ? (
                          <div className="text-left mt-2 w-full">
                            <span className="text-green-700 text-xs font-semibold">
                              Correct:
                            </span>
                            <p className="text-green-700 text-[11px] leading-normal mt-0.5">
                              {q.explanation ||
                                `The correct answer is "${
                                  Array.isArray(q.correct_option)
                                    ? q.correct_option.join(" or ")
                                    : q.correct_option
                                }".`}
                            </p>
                          </div>
                        ) : (
                          <div className="text-left mt-2 w-full">
                            <span className="text-red-500 text-xs font-semibold">
                              Incorrect:
                            </span>
                            <p className="text-red-500 text-[11px] leading-normal mt-0.5">
                              {q.explanation ||
                                `The correct answer is "${
                                  Array.isArray(q.correct_option)
                                    ? q.correct_option.join(" or ")
                                    : q.correct_option
                                }".`}
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="text-left mt-2 w-full">
                          <span className="text-zinc-500 text-xs font-semibold">
                            Skipped:
                          </span>
                          <p className="text-zinc-500 text-[11px] leading-normal mt-0.5">
                            You skipped this question. The correct answer is "
                            {Array.isArray(q.correct_option)
                              ? q.correct_option.join(" or ")
                              : q.correct_option}
                            ".
                          </p>
                        </div>
                      )
                    ) : (
                      (() => {
                        const isSkipped =
                          qType === "mcq_multi"
                            ? !userSelection ||
                              (Array.isArray(userSelection) &&
                                userSelection.length === 0)
                            : !userSelection;

                        if (isSkipped) {
                          let correctStr = "";
                          if (Array.isArray(q.correct_option)) {
                            correctStr = q.correct_option.join(", ");
                          } else {
                            correctStr = String(q.correct_option);
                          }
                          return (
                            <div className="text-left w-full mt-2">
                              <span className="text-zinc-500 text-xs font-semibold">
                                Skipped:
                              </span>
                              <p className="text-zinc-500 text-[11px] leading-normal mt-0.5">
                                You skipped this question. The correct option
                                is {correctStr}.
                              </p>
                            </div>
                          );
                        }

                        const displayCorrectOpt = Array.isArray(q.correct_option)
                          ? q.correct_option.join(", ")
                          : q.correct_option;

                        if (isCorrect) {
                          return (
                            <div className="text-left w-full mt-2">
                              <span className="text-green-700 text-xs font-semibold">
                                Correct:
                              </span>
                              <p className="text-green-700 text-[11px] leading-normal mt-0.5">
                                {q.explanation ||
                                  `The correct answer is Option ${displayCorrectOpt}.`}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="text-left w-full mt-2">
                            <span className="text-red-500 text-xs font-semibold">
                              Incorrect:
                            </span>
                            <p className="text-red-500 text-[11px] leading-normal mt-0.5">
                              {q.explanation ||
                                  `The correct answer is Option ${displayCorrectOpt}.`}
                            </p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2.5 z-40 shrink-0 bg-transparent">
            <div className="w-full max-w-[380px] flex flex-col gap-2 mx-auto">
              {reviewBlockIndex < questions.length - 1 ? (
                <button
                  onClick={() => setReviewBlockIndex((prev) => prev + 1)}
                  className="w-full py-3 bg-[#002856] hover:bg-blue-900 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center shadow-md"
                >
                  Review Next Question
                </button>
              ) : null}
              {reviewBlockIndex > 0 && (
                <button
                  onClick={() => setReviewBlockIndex((prev) => prev - 1)}
                  className="w-full py-3 bg-[#002856] hover:bg-blue-900 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center shadow-md"
                >
                  Review Previous Question
                </button>
              )}
              <button
                onClick={handleStartNextSection}
                className="w-full py-3 border border-zinc-300 bg-white text-blue-950 hover:bg-slate-50 active:scale-[0.99] text-xs font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
              >
                Start Next Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
