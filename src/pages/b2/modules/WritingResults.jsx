import B2ResponseReviewCard from "../../../components/b2/B2ResponseReviewCard";
import { normalizeB2Score } from "../../../utils/b2Scores";
import { B2Page, B2State } from "../../../components/b2/B2UI";
import B2ResultSummary from "../../../components/b2/B2ResultSummary";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { getB2Exercise } from "../../../api/b2Api";
import useTextToSpeech from "../../../hooks/useTextToSpeech";
import WritingFeedback from "../components/WritingFeedback";

export default function WritingResults() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();

  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sectionData, setSectionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewBlockIndex, setReviewBlockIndex] = useState(null);

  const { cancelSpeech } = useTextToSpeech();

  const renderHighlights = (originalText, highlights) => {
    if (!originalText) return null;
    if (!highlights || highlights.length === 0)
      return <span>{originalText}</span>;
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
            </span>,
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
          </span>,
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
          </span>,
        );
      }
    }
    if (currentIndex < originalText.length) {
      result.push(
        <span key="skip-end" className="text-black">
          {originalText.substring(currentIndex)}
        </span>,
      );
    }
    return result;
  };

  const fetchResults = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB2Exercise(exerciseId);
      const exercise = res.data || {};
      setSectionData(exercise);

      const blocks = (exercise.content?.blocks || []).map((block, idx) => ({
        id: idx,
        difficulty_tag: exercise.difficulty_tag,
        ...block,
      }));
      setQuestions(blocks);
    } catch (err) {
      console.error("Error fetching Writing results:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !exerciseId) return;
    fetchResults();
  }, [user?.user_id, exerciseId]);

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [reviewBlockIndex]);

  const handleBackToDashboard = () => {
    navigate(`/b2/writing`);
  };

  const handleStartNextSection = () => {
    handleBackToDashboard();
  };

  if (loading)
    return (
      <B2Page title="Writing" back="/b2/writing">
        <B2State loading />
      </B2Page>
    );

  if (fetchError || !sectionData)
    return (
      <B2Page title="Writing" back="/b2/writing">
        <B2State
          title="Writing feedback couldn’t load"
          description="Your connection may have dropped. Try again when you’re ready."
          onRetry={fetchResults}
        />
      </B2Page>
    );

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
    const qScore = normalizeB2Score(report.score);
    const skipped = !userAnsText.trim();

    return {
      ...block,
      userAnsText,
      report,
      qScore,
      skipped,
      blockIndex: idx,
    };
  });

  const padZero = (num) => {
    return String(num || 0).padStart(2, "0");
  };

  const currentBlock =
    reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
  const currentBlockData =
    reviewBlockIndex !== null ? flatQuestions[reviewBlockIndex] : null;
  return (
    <div className="b2-ui b2-review w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
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
        <B2ResultSummary
          skill="writing"
          assessment={false}
          data={sectionData}
          exerciseId={exerciseId}
          onReview={() => {
            setReviewMode(true);
            setReviewBlockIndex(null);
          }}
          onContinue={handleStartNextSection}
        />
      ) : reviewBlockIndex === null ? (
        /*  REVIEW ANSWER INDEX LIST VIEW  */
        <div className="flex-1 w-full overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-24">
          <div className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sky-950 text-base font-semibold">
              Writing Review
            </h3>
            <p className="text-slate-500 text-xs">
              Review spelling corrections and detailed scores.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {flatQuestions.map((q, idx) => (
              <B2ResponseReviewCard
                key={idx} index={idx} title={q.block_title || `Writing Task ${idx + 1}`}
                score={q.qScore} skipped={q.skipped}
                onClick={() => setReviewBlockIndex(q.blockIndex)}
              />
            ))}
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

            <div className="self-stretch px-4 flex flex-col gap-4">
              <div className="w-full pt-6 pb-6 bg-white flex flex-col justify-start items-center gap-6 mt-4">
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
                        renderHighlights(
                          currentBlockData.userAnsText,
                          currentBlockData.report?.mistake_highlights,
                        )
                      )}
                    </div>
                  </div>
                </div>

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

              {!currentBlockData.skipped && currentBlockData.report?.metrics && (
                <WritingFeedback
                  score={currentBlockData.qScore}
                  metrics={currentBlockData.report.metrics}
                  nextFocus={currentBlockData.report.tryToImprove}
                />
              )}
            </div>
          </div>
        </div>
      )}
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
                Back to Writing
              </button>
            </>
          ) : (
            <button
              onClick={handleStartNextSection}
              className="w-full py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
            >
              Back to Writing
            </button>
          )}
        </div>
      )}
    </div>
  );
}
