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
  ThumbsUp,
  Lightbulb,
} from "lucide-react";
import {
  getB1ExamSubmissionStatus,
  getB1ExamSectionContent,
} from "../../../api/b1Api";
import ScoreRing from "../describe-speak/components/ScoreRing";
import MetricBar from "../describe-speak/components/MetricBar";
import AudioPlayer from "../describe-speak/components/AudioPlayer";

export default function ExamSpeakingResults() {
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

  // Playback states for review
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const playbackAudioRef = useRef(null);
  const scrollContainerRef = useRef(null);

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
      const speakingSection = sectionsList.find(
        (s) => s.section_type === "speaking",
      );
      setSectionData(speakingSection);

      const contentRes = await getB1ExamSectionContent(paperId, "speaking");
      setQuestions(Array.isArray(contentRes.data) ? contentRes.data : []);
    } catch (err) {
      console.error("Error fetching Speaking results:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchResults();
  }, [user?.user_id, paperId, submissionId]);

  // Clean up audio and scroll to top when review question index changes
  useEffect(() => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setIsPlayingBack(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);

    const q = reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
    const ansKey = q ? `${q.id}_0` : null;
    const userAudio = ansKey && sectionData?.answers?.[ansKey];

    if (userAudio) {
      const audio = new Audio(userAudio);
      playbackAudioRef.current = audio;

      const handleLoadedMetadata = () => {
        setPlaybackDuration(audio.duration);
      };
      const handleTimeUpdate = () => {
        setPlaybackTime(audio.currentTime);
      };
      const handleEnded = () => {
        setIsPlayingBack(false);
        setPlaybackTime(0);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
      };
    }
  }, [reviewBlockIndex, questions, sectionData]);

  const handlePlayPause = () => {
    if (!playbackAudioRef.current) return;
    if (isPlayingBack) {
      playbackAudioRef.current.pause();
      setIsPlayingBack(false);
    } else {
      playbackAudioRef.current.play();
      setIsPlayingBack(true);
    }
  };

  useEffect(() => {
    return () => {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
      }
    };
  }, []);

  const handleBackToDashboard = () => {
    if (isOverallCompleted) {
      navigate(`/b1/exams/papers/${paperId}/congratulations`);
    } else {
      navigate(`/b1/exams/papers/${paperId}/dashboard`);
    }
  };

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
          Failed to load Speaking results.
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

  const score = Math.round(parseFloat(sectionData.score || 0));
  const answersMap = sectionData.answers || {};
  const feedbackData = sectionData.feedback || {};

  const whatWentWell =
    feedbackData.whatWentWell || "Good sentence flow and clear pronunciation.";
  const tryToImprove =
    feedbackData.tryToImprove ||
    "Work on some word stress and vowel sounds to improve.";
  const overallMetrics = feedbackData.metrics || {
    pronunciation: score,
    fluency: score,
    accuracy: score,
    completeness: score,
  };

  const flatQuestions = questions.map((block) => {
    const userAns = answersMap[block.id] || {};
    const report =
      (feedbackData.questions
        ? feedbackData.questions[block.id]
        : feedbackData[block.id]) || {};
    const qScore =
      report.score !== undefined ? Math.round(report.score) : score;
    const isCorrect = qScore >= 50; // Threshold 50%
    const skipped = !userAns.audio_url;

    return {
      ...block,
      userAns,
      report,
      qScore,
      isCorrect,
      skipped,
    };
  });

  const getMetricColor = (val) => {
    if (val >= 75) return "bg-green-600";
    if (val >= 50) return "bg-amber-300";
    return "bg-red-500";
  };

  const getMetricTextColor = (val) => {
    if (val >= 75) return "text-green-700";
    if (val >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const formatSeconds = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getScoreGreeting = (scoreVal) => {
    const val = Number(scoreVal || 0);
    if (val >= 70) return "Good job";
    if (val >= 50) return "Well done!";
    return "Keep practicing!";
  };

  const padZero = (num) => {
    return String(num || 0).padStart(2, "0");
  };

  const currentBlock =
    reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
  const currentBlockData =
    reviewBlockIndex !== null ? flatQuestions[reviewBlockIndex] : null;

  const qObj = currentBlock?.questions?.[0] || {};
  const promptType = currentBlock
    ? qObj.prompt_type ||
      (currentBlock.passage_text
        ? "paragraph"
        : currentBlock.speaking_prompt_image
        ? "image"
        : "text")
    : null;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative pb-24">
      {/* Navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => {
              if (reviewMode) setReviewMode(false);
              else handleBackToDashboard();
            }}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Speaking Feedback
          </span>
        </div>
      </div>

      {!reviewMode ? (
        /* ================= RESULTS DASHBOARD VIEW ================= */
        <div className="flex-1 w-full overflow-y-auto px-4 py-6 flex flex-col justify-start items-center gap-6">
          <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
            <div className="flex flex-col justify-start items-center gap-3">
              <div className="text-center text-sky-950 text-base font-semibold leading-5">
                Speaking Feedback
              </div>
              <div className="text-center text-sky-950 text-3xl font-semibold leading-9">
                {getScoreGreeting(score)}
              </div>
            </div>

            <ScoreRing score={score} label="overall speaking accuracy" />

            {/* Sub-metrics sliders */}
            <div className="w-full flex flex-col justify-start items-start gap-3">
              <MetricBar
                label="Pronunciation"
                score={overallMetrics.pronunciation}
              />
              <MetricBar label="Fluency" score={overallMetrics.fluency} />
              <MetricBar label="Accuracy" score={overallMetrics.accuracy} />
              <MetricBar
                label="Completeness"
                score={overallMetrics.completeness}
              />
            </div>

            {/* Qualitative overall feedback went-well / improve */}
            <div className="w-full flex flex-col justify-start items-start gap-3">
              <div className="self-stretch p-3 bg-white rounded-xl border border-zinc-400/50 inline-flex justify-start items-start gap-2 text-left">
                <div className="w-4 h-4 shrink-0 relative overflow-hidden mt-0.5 text-green-700 font-bold flex items-center justify-center border border-green-700 rounded-full text-[10px]">
                  ✓
                </div>
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                  <div className="self-stretch justify-start text-black text-xs font-semibold">
                    What went well
                  </div>
                  <div className="self-stretch justify-start text-black text-xs font-normal leading-relaxed">
                    {whatWentWell}
                  </div>
                </div>
              </div>

              <div className="self-stretch p-3 bg-white rounded-xl border border-zinc-400/50 inline-flex justify-start items-start gap-2 text-left">
                <div className="w-4 h-4 shrink-0 relative overflow-hidden mt-0.5 text-red-500 font-bold flex items-center justify-center border border-red-500 rounded-full text-[10px]">
                  !
                </div>
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                  <div className="self-stretch justify-start text-black text-xs font-semibold">
                    Try to improve
                  </div>
                  <div className="self-stretch justify-start text-black text-xs font-normal leading-relaxed">
                    {tryToImprove}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons inside the card */}
            <div className="self-stretch flex flex-col gap-2 w-full">
              <button
                onClick={() => setReviewMode(true)}
                className="w-full bg-[#0a1f44] hover:bg-[#06142c] active:scale-95 text-white text-sm font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 border-0 outline-none"
              >
                <span>Review Answers</span>
              </button>

              <button
                onClick={handleStartNextSection}
                className="w-full py-3 rounded-lg border border-zinc-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer active:scale-95"
              >
                <span>Start Next Section</span>
              </button>
            </div>
          </div>
        </div>
      ) : reviewBlockIndex === null ? (
        /* ================= REVIEW ANSWER INDEX LIST VIEW ================= */
        <div className="flex-1 w-full overflow-y-auto px-4 py-6 flex flex-col gap-3 pb-36">
          <div className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sky-950 text-base font-semibold">
              Speaking Review
            </h3>
            <p className="text-slate-500 text-xs">
              Review transcription reports and pronunciation scores.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {flatQuestions.map((q, idx) => {
              const cardBg = q.skipped
                ? "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                : q.isCorrect
                ? "bg-emerald-50 border-green-700/20 hover:border-green-700/40"
                : "bg-rose-50 border-red-500/20 hover:border-red-500/40";

              const iconColor = q.skipped
                ? "text-zinc-400"
                : q.isCorrect
                ? "text-green-700"
                : "text-red-500";

              return (
                <div
                  key={idx}
                  onClick={() => setReviewBlockIndex(idx)}
                  className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${cardBg}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        q.skipped
                          ? "bg-zinc-100 text-zinc-400"
                          : q.isCorrect
                          ? "bg-green-700/10 text-green-700"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {(idx + 1).toString().padStart(2, "0")}
                    </div>
                    <span className="text-slate-900 text-xs font-semibold leading-snug truncate">
                      {q.block_title || `Speaking Task ${idx + 1}`}
                    </span>
                  </div>
                  <div className="shrink-0 ml-3">
                    {q.skipped ? (
                      <HelpCircle className={`w-5 h-5 ${iconColor}`} />
                    ) : q.isCorrect ? (
                      <CheckCircle2 className={`w-5 h-5 ${iconColor}`} />
                    ) : (
                      <XCircle className={`w-5 h-5 ${iconColor}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= FULL-SCREEN WORKSPACE-LIKE REVIEW VIEW ================= */
        <div className="flex-1 w-full flex flex-col justify-start items-center overflow-hidden">
          <div className="self-stretch px-4 pt-1 flex flex-col justify-start items-start gap-2 shrink-0 bg-white">
            <div className="self-stretch text-center text-sky-950 text-base font-semibold leading-5">
              Question {padZero(reviewBlockIndex + 1)} of{" "}
              {padZero(questions.length)}
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

          <div ref={scrollContainerRef} className="flex-1 w-full overflow-y-auto pb-52">
            {/* Dynamic Prompt Render Section (White background) */}
            <div className="self-stretch px-4 pt-4 pb-6 flex flex-col justify-start items-start bg-white shrink-0">
              <div className="w-full flex flex-col gap-4 text-left">
                {/* Prompt Image if present */}
                {currentBlock.speaking_prompt_image && (
                  <img
                    src={currentBlock.speaking_prompt_image}
                    alt="Speaking Prompt Illustration"
                    className="w-full h-52 object-cover rounded-lg shadow-sm"
                  />
                )}

                {/* Block Title */}
                <h3 className="text-sky-950 text-base font-semibold leading-6">
                  {currentBlock.block_title}
                </h3>

                {/* Passage Text (Cues/Opinions context) */}
                {currentBlock.passage_text && (
                  <div className="w-full p-3 border border-zinc-200 rounded-xl bg-slate-50">
                    <p className="text-slate-750 text-xs font-normal leading-relaxed whitespace-pre-line">
                      {currentBlock.passage_text}
                    </p>
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
            </div>

            {/* Bottom Content Area */}
            <div className="self-stretch px-4 flex flex-col gap-4">
              {/* Recorded Speech Audio Player */}
              {currentBlockData.userAns?.audio_url && (
                <div className="w-full pt-4 pb-6 bg-white flex flex-col justify-start items-start gap-3 mt-4">
                  <div className="w-full text-left text-sky-950 text-sm font-bold leading-5">
                    Your Speech Recording
                  </div>
                  <AudioPlayer
                    isPlaying={isPlayingBack}
                    onPlayPause={() =>
                      handlePlaybackPlayPause(
                        currentBlockData.userAns.audio_url,
                      )
                    }
                    playbackTime={playbackTime}
                    playbackDuration={
                      playbackDuration ||
                      currentBlockData.userAns.record_duration ||
                      0
                    }
                    formatSeconds={formatSeconds}
                    variant="review"
                  />
                </div>
              )}

              {/* Transcribed Text transcription */}
              {currentBlockData.report?.transcript && (
                <div className="p-4 bg-white border border-zinc-200 rounded-xl text-left flex flex-col gap-1 shadow-sm mt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Transcribed Text
                  </span>
                  <p className="text-slate-800 text-xs italic">
                    "{currentBlockData.report.transcript}"
                  </p>
                </div>
              )}

              {/* Speaking Feedback metrics card */}
              {!currentBlockData.skipped && (
                <div className="self-stretch pb-6 mt-4">
                  <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
                    <div className="flex flex-col justify-start items-center gap-3">
                      <div className="text-center text-sky-950 text-base font-semibold leading-5">
                        Speaking Feedback
                      </div>
                      <div className="text-center text-sky-950 text-3xl font-semibold leading-9">
                        {getScoreGreeting(currentBlockData.qScore)}
                      </div>
                    </div>

                    <ScoreRing
                      score={currentBlockData.qScore}
                      label="overall speaking accuracy"
                    />

                    {/* Metric progress bars */}
                    <div className="w-full flex flex-col justify-start items-start gap-3">
                      <MetricBar
                        label="Pronunciation"
                        score={
                          currentBlockData.report?.metrics?.pronunciation !==
                          undefined
                            ? currentBlockData.report.metrics.pronunciation
                            : currentBlockData.qScore
                        }
                      />
                      <MetricBar
                        label="Fluency"
                        score={
                          currentBlockData.report?.metrics?.fluency !==
                          undefined
                            ? currentBlockData.report.metrics.fluency
                            : currentBlockData.qScore
                        }
                      />
                      <MetricBar
                        label="Accuracy"
                        score={
                          currentBlockData.report?.metrics?.accuracy !==
                          undefined
                            ? currentBlockData.report.metrics.accuracy
                            : currentBlockData.qScore
                        }
                      />
                      <MetricBar
                        label="Completeness"
                        score={
                          currentBlockData.report?.metrics?.completeness !==
                          undefined
                            ? currentBlockData.report.metrics.completeness
                            : currentBlockData.qScore
                        }
                      />
                    </div>

                    {/* Qualitative overall feedback went-well / improve */}
                    <div className="w-full flex flex-col justify-start items-start gap-3">
                      {whatWentWell && (
                        <div className="w-full p-4 bg-white rounded-xl border border-zinc-200 inline-flex justify-start items-start gap-3 text-left shadow-sm">
                          <ThumbsUp className="w-4.5 h-4.5 text-green-700 mt-0.5 shrink-0" />
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-slate-900 text-xs font-semibold">
                              What went well
                            </span>
                            <p className="text-slate-600 text-xs leading-4">
                              {whatWentWell}
                            </p>
                          </div>
                        </div>
                      )}

                      {tryToImprove && (
                        <div className="w-full p-4 bg-white rounded-xl border border-zinc-200 inline-flex justify-start items-start gap-3 text-left shadow-sm">
                          <Lightbulb className="w-4.5 h-4.5 text-amber-500 mt-0.5 shrink-0" />
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-slate-900 text-xs font-semibold">
                              Try to improve
                            </span>
                            <p className="text-slate-600 text-xs leading-4">
                              {tryToImprove}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions */}
      {reviewMode && (
        <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2 shrink-0 z-10">
          {reviewBlockIndex !== null ? (
            <>
              <button
                onClick={() => {
                  if (reviewBlockIndex < questions.length - 1) {
                    setReviewBlockIndex((prev) => prev + 1);
                  } else {
                    setReviewBlockIndex(null);
                  }
                }}
                className="w-full py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
              >
                {reviewBlockIndex === questions.length - 1
                  ? "Finish Review"
                  : "Review Next Question"}
              </button>

              {reviewBlockIndex > 0 && (
                <button
                  onClick={() => setReviewBlockIndex((prev) => prev - 1)}
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-zinc-300 active:scale-95 text-slate-700 text-sm font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
                >
                  Previous Question
                </button>
              )}

              <button
                onClick={handleStartNextSection}
                className="w-full py-3 bg-white hover:bg-slate-50 border border-zinc-300 active:scale-95 text-blue-950 text-sm font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
              >
                Start Next Section
              </button>
            </>
          ) : (
            <button
              onClick={handleStartNextSection}
              className="w-full py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
            >
              Start Next Section
            </button>
          )}
        </div>
      )}
    </div>
  );
}
