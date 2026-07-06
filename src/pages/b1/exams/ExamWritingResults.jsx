import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Volume2,
} from "lucide-react";
import {
  getB1ExamSubmissionStatus,
  getB1ExamSectionContent,
} from "../../../api/b1Api";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";
import ScoreRing from "../describe-speak/components/ScoreRing";
import MetricBar from "../describe-speak/components/MetricBar";

export default function ExamWritingResults() {
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

  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();

  const renderHighlights = (originalText, highlights) => {
    if (!originalText) return null;
    if (!highlights || highlights.length === 0) return <span>{originalText}</span>;
    const result = [];
    let currentIndex = 0;
    for (let i = 0; i < highlights.length; i++) {
      const seg = highlights[i];
      const idx = originalText.indexOf(seg.text, currentIndex);
      if (idx !== -1) {
        if (idx > currentIndex) {
          result.push(
            <span key={`skip-${i}`} className="text-black">
              {originalText.substring(currentIndex, idx)}
            </span>
          );
        }
        result.push(
          <span
            key={`seg-${i}`}
            className={
              seg.is_correct
                ? "text-black"
                : "text-[#d0021b] bg-[#fff0f1] font-medium border-b-2 border-dashed border-[#d0021b]"
            }
          >
            {seg.text}
          </span>
        );
        currentIndex = idx + seg.text.length;
      } else {
        result.push(
          <span
            key={`fallback-${i}`}
            className={
              seg.is_correct
                ? "text-black"
                : "text-red-500 font-bold bg-red-50/50 px-0.5 rounded"
            }
          >
            {seg.text}
          </span>
        );
      }
    }
    if (currentIndex < originalText.length) {
      result.push(
        <span key="skip-end" className="text-black">
          {originalText.substring(currentIndex)}
        </span>
      );
    }
    return result;
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
      const writingSection = sectionsList.find(
        (s) => s.section_type === "writing",
      );
      setSectionData(writingSection);

      const contentRes = await getB1ExamSectionContent(paperId, "writing");
      setQuestions(Array.isArray(contentRes.data) ? contentRes.data : []);
    } catch (err) {
      console.error("Error fetching Writing results:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchResults();
  }, [user?.user_id, paperId, submissionId]);

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [reviewBlockIndex]);

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

  const handleListen = (passageText) => {
    if (isSpeaking) {
      cancelSpeech();
    } else if (passageText) {
      speakText(passageText, "de-DE");
    }
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
          Failed to load Writing results.
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
  const feedbackMap = sectionData.feedback || {};

  // Aggregate sub-metrics for overall section if feedback contains them
  const overallMetrics = {
    grammar: 0,
    vocabulary: 0,
    sentence_structure: 0,
    spellings: 0,
  };
  const questionKeys = Object.keys(feedbackMap);
  let evaluatedCount = 0;

  questionKeys.forEach((key) => {
    const report = feedbackMap[key];
    if (report && report.metrics) {
      evaluatedCount++;
      overallMetrics.grammar += report.metrics.grammar || 0;
      overallMetrics.vocabulary += report.metrics.vocabulary || 0;
      overallMetrics.sentence_structure +=
        report.metrics.sentence_structure || 0;
      overallMetrics.spellings += report.metrics.spellings || 0;
    }
  });

  if (evaluatedCount > 0) {
    overallMetrics.grammar = Math.round(
      overallMetrics.grammar / evaluatedCount,
    );
    overallMetrics.vocabulary = Math.round(
      overallMetrics.vocabulary / evaluatedCount,
    );
    overallMetrics.sentence_structure = Math.round(
      overallMetrics.sentence_structure / evaluatedCount,
    );
    overallMetrics.spellings = Math.round(
      overallMetrics.spellings / evaluatedCount,
    );
  } else {
    // Defaults if no feedback details populated
    overallMetrics.grammar = score;
    overallMetrics.vocabulary = score;
    overallMetrics.sentence_structure = score;
    overallMetrics.spellings = score;
  }

  const flatQuestions = questions.map((block, idx) => {
    const userAnsText = answersMap[block.id] || "";
    const report = feedbackMap[block.id] || {};
    const qScore = report.score || 0;
    const isCorrect = qScore >= 50; // Threshold of 50%
    const skipped = !userAnsText.trim();

    return {
      ...block,
      userAnsText,
      report,
      qScore,
      isCorrect,
      skipped,
      blockIndex: idx,
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

  const getDifficultyBadgeStyle = (diff) => {
    const d = String(diff).toLowerCase();
    if (d === "easy") {
      return "bg-green-700/10 border-green-700/20 text-green-700";
    }
    if (d === "medium" || d === "intermediate") {
      return "bg-amber-100/60 border-orange-400/20 text-orange-500";
    }
    return "bg-red-100 border-red-500/20 text-red-500";
  };

  const padZero = (num) => {
    return String(num || 0).padStart(2, "0");
  };

  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getGreeting = () => {
    if (score >= 70) return "Good job";
    if (score >= 50) return "Well done!";
    return "Keep practicing!";
  };

  const currentBlock =
    reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
  const currentBlockData =
    reviewBlockIndex !== null ? flatQuestions[reviewBlockIndex] : null;
  const wordLimit = currentBlock?.questions?.[0]?.word_limit || 80;

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
            {reviewBlockIndex !== null ? "Writing" : "Writing Feedback"}
          </span>
        </div>
      </div>

      {!reviewMode ? (
        /*  RESULTS DASHBOARD VIEW  */
        <div className="flex-1 w-full overflow-y-auto px-4 py-6 flex flex-col justify-start items-center gap-6 pb-6">
          <div className="w-full px-5 pt-10 pb-5 bg-[#f5f5f5] rounded-xl flex flex-col justify-start items-center gap-9">
            <div className="flex flex-col justify-start items-center gap-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Writing Feedback
              </span>
              <h3 className="text-sky-950 text-3xl font-semibold leading-9">
                {getGreeting() === "Good job"
                  ? "Good job 🚀"
                  : getGreeting() === "Well done!"
                  ? "Well done! 👍"
                  : "Keep practicing! 💪"}
              </h3>
            </div>

            <ScoreRing score={score} label="overall writing accuracy" />

            {/* Metric progress bars */}
            <div className="w-full flex flex-col justify-start items-start gap-5">
              <MetricBar
                label="Grammar"
                score={overallMetrics.grammar}
                variant="compact"
              />
              <MetricBar
                label="Vocabulary"
                score={overallMetrics.vocabulary}
                variant="compact"
              />
              <MetricBar
                label="Sentence Structure"
                score={overallMetrics.sentence_structure}
                variant="compact"
              />
              <MetricBar
                label="Spellings"
                score={overallMetrics.spellings}
                variant="compact"
              />
            </div>

            {/* Action buttons inside the card */}
            <div className="self-stretch flex flex-col gap-2 w-full pt-6">
              <button
                onClick={() => setReviewMode(true)}
                className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-sm font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 border-0 outline-none"
              >
                <span>Review Answers</span>
              </button>

              <button
                onClick={handleStartNextSection}
                className="w-full py-3 rounded-lg border border-zinc-300 bg-white hover:bg-slate-50 text-blue-950 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer active:scale-95"
              >
                <span>Start Next Section</span>
              </button>
            </div>
          </div>
        </div>
      ) : reviewBlockIndex === null ? (
        /*  REVIEW ANSWER INDEX LIST VIEW  */
        <div className="flex-1 w-full overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-36">
          <div className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sky-950 text-base font-semibold">
              Writing Review
            </h3>
            <p className="text-slate-500 text-xs">
              Review spelling corrections and detailed scores.
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
                  onClick={() => setReviewBlockIndex(q.blockIndex)}
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
                      {q.block_title || `Writing Task ${idx + 1}`}
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
        /*  FULL-SCREEN WORKSPACE-LIKE REVIEW VIEW  */
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

          <div className="flex-1 w-full overflow-y-auto pb-52">
            {/* Cover image & Headline section (White background) */}
            <div className="self-stretch px-4 pt-4 pb-6 flex flex-col justify-start items-start gap-4 bg-white shrink-0">
              {currentBlock.hero_image_url && (
                <img
                  className="self-stretch h-52 rounded-lg object-cover w-full"
                  src={currentBlock.hero_image_url}
                  alt={currentBlock.block_title || "Schreibaufgabe"}
                />
              )}

              <div className="flex justify-between items-center w-full">
                <h1 className="justify-start text-sky-950 text-base font-bold leading-5 text-left">
                  {currentBlock.block_title ||
                    "Write about this image in German"}
                </h1>
              </div>

              {currentBlock.passage_text && (
                <div className="w-full text-slate-700 text-xs leading-5 text-left bg-slate-50 border border-slate-200 rounded-xl p-4 whitespace-pre-line font-normal mt-3">
                  {currentBlock.passage_text}
                </div>
              )}
            </div>

            {/* Bottom Content Area (Grey background) */}
            <div className="self-stretch px-4 flex flex-col gap-4">
              {/* Original & Corrected Writings */}
              <div className="w-full pt-6 pb-6 bg-white flex flex-col justify-start items-center gap-6 mt-4">
                {/* Your Writing */}
                <div className="self-stretch flex flex-col justify-start items-start gap-3">
                  <div className="w-full inline-flex justify-start items-start gap-4">
                    <div className="flex-1 text-left text-sky-950 text-base font-semibold leading-5">
                      Your Writing
                    </div>
                  </div>
                  <div className="self-stretch p-3 bg-red-100/25 rounded-xl border border-red-500 flex flex-col justify-start items-start text-left min-h-[80px]">
                    <div className="self-stretch text-black text-xs font-normal leading-5 break-words">
                      {currentBlockData.skipped ? (
                        <span className="text-slate-400 italic">
                          No response submitted.
                        </span>
                      ) : (
                        renderHighlights(currentBlockData.userAnsText, currentBlockData.report?.mistake_highlights)
                      )}
                    </div>
                  </div>
                </div>

                {/* Corrected Version */}
                {currentBlockData.report?.corrected_text && (
                  <div className="self-stretch flex flex-col justify-start items-start gap-3">
                    <div className="w-full inline-flex justify-start items-start gap-4">
                      <div className="flex-1 text-left text-sky-950 text-base font-semibold leading-5">
                        Corrected Version
                      </div>
                    </div>
                    <div className="self-stretch p-3 bg-emerald-100/10 rounded-xl border border-green-700 flex flex-col justify-start items-start text-left min-h-[80px]">
                      <div className="self-stretch text-black text-xs font-normal leading-5 break-words">
                        {currentBlockData.report.corrected_text}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Writing Feedback metrics */}
              {!currentBlockData.skipped &&
                currentBlockData.report?.metrics && (
                  <div className="self-stretch pb-6 mt-4">
                    <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
                      <div className="flex flex-col justify-start items-center gap-3">
                        <div className="text-center text-sky-950 text-base font-semibold leading-5">
                          Writing Feedback
                        </div>
                        <div className="text-center text-sky-950 text-3xl font-semibold leading-9">
                          {currentBlockData.qScore >= 70
                            ? "Good job 🚀"
                            : currentBlockData.qScore >= 50
                            ? "Well done! 👍"
                            : "Keep practicing! 💪"}
                        </div>
                      </div>

                      <ScoreRing
                        score={currentBlockData.qScore}
                        label="overall writing accuracy"
                      />

                      <div className="w-full flex flex-col justify-start items-start gap-5">
                        <MetricBar
                          label="Grammar"
                          score={currentBlockData.report.metrics.grammar}
                          variant="compact"
                        />
                        <MetricBar
                          label="Vocabulary"
                          score={currentBlockData.report.metrics.vocabulary}
                          variant="compact"
                        />
                        <MetricBar
                          label="Sentence Structure"
                          score={
                            currentBlockData.report.metrics.sentence_structure
                          }
                          variant="compact"
                        />
                        <MetricBar
                          label="Spellings"
                          score={currentBlockData.report.metrics.spellings}
                          variant="compact"
                        />
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
      {/* Sticky Bottom Actions — Only shown during active block-by-block review */}
      {reviewMode && (
        <div className="absolute bottom-0 inset-x-0  p-4 flex flex-col gap-2 shrink-0 z-10 ">
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
                  : "Next"}
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
