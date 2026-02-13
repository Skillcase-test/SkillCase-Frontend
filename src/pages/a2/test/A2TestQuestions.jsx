import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  Eye,
  Check,
  X,
  Award,
  Star,
} from "lucide-react";
import {
  getTestSet,
  submitTest,
  getTestResults,
  getTestProgress,
} from "../../../api/a2Api";
import api from "../../../api/axios";
import QuestionRenderer from "../../../components/a2/QuestionRenderer";

export default function A2TestQuestions() {
  const { topicId, level } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isReviewMode = searchParams.get("mode") === "review";

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [showFailedReview, setShowFailedReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [questionsBySet, setQuestionsBySet] = useState([]);
  const [currentSet, setCurrentSet] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isReviewMode) {
          // Fetch saved results for review
          const res = await getTestResults(topicId, level);
          if (res.data) {
            setReviewData(res.data);
            setQuestions(res.data.questions || []);
            setQuestionsBySet(res.data.questionsBySet || []);
            setAnswers(res.data.userAnswers || []);
            // Store correct answers for display
            setCorrectAnswers(
              res.data.questions?.map((q) => q.correct || q.correct_answer) ||
                [],
            );
            setResult({
              passed: true,
              correct: res.data.correct || 0,
              total: res.data.total || 0,
              score: res.data.score || 100,
            });
          }
        } else {
          // Get current set from progress first
          const progressRes = await getTestProgress(topicId);
          const set = progressRes.data?.progress?.current_set || 1;
          setCurrentSet(set);
          const res = await getTestSet(topicId, level, set);
          setQuestions(res.data.questions);
          setAnswers(new Array(res.data.questions.length).fill(null));
        }
      } catch (err) {
        console.error("Error:", err);
        if (isReviewMode) {
          // Fallback: load questions directly
          try {
            const res = await getTestSet(topicId, level, 1);
            setQuestions(res.data.questions);
            setAnswers(new Array(res.data.questions.length).fill(null));
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [topicId, level, isReviewMode]);

  const handleAnswer = (answer) => {
    if (isReviewMode) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await submitTest({
        topicId: parseInt(topicId),
        level: parseInt(level),
        setNumber: currentSet,
        answers,
        questions, // Send questions so backend scores against same shuffled data
      });
      setResult(res.data);

      try {
        const streakRes = await api.post("/streak/log", { points: 20 });
        // Store streak data for A2TestLevel to show celebration instantly
        if (streakRes.data.streakUpdated) {
          sessionStorage.setItem(
            "streak_test_completed",
            JSON.stringify({
              streakDays: streakRes.data.currentStreak || 1,
            }),
          );
        }
      } catch (streakErr) {
        console.error("Error logging test streak:", streakErr);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  // REVIEW MODE: Show questions grouped by sets
  if (isReviewMode && questions.length > 0) {
    // Helper to render a single question card
    const renderQuestionCard = (q, idx) => {
      const qType = q.type || q.question_type || "";
      let questionDisplay = "";
      let correctAns = "";

      switch (qType) {
        case "sentence_ordering":
        case "sentence_reorder":
          questionDisplay = q.hint_en
            ? `Arrange: "${q.hint_en}"`
            : `Arrange words: ${(q.words || []).join(", ")}`;
          correctAns = Array.isArray(q.correct_order)
            ? q.correct_order.join(" ")
            : "";
          break;
        case "sentence_correction":
          questionDisplay = `Correct: "${q.incorrect_sentence || ""}"`;
          correctAns = q.correct_sentence || "";
          break;
        case "matching":
          questionDisplay = "Match the pairs";
          if (Array.isArray(q.pairs)) {
            correctAns = q.pairs
              .map(
                (p) => `${p.de || p.left || "?"} → ${p.en || p.right || "?"}`,
              )
              .join(", ");
          }
          break;
        case "true_false":
        case "truefalse":
          questionDisplay = q.question || "";
          correctAns =
            q.correct === true
              ? "True"
              : q.correct === false
                ? "False"
                : String(q.correct);
          break;
        case "mcq_multi":
          questionDisplay = q.question || "";
          if (Array.isArray(q.correct)) {
            correctAns = q.correct.join(", ");
          }
          break;
        case "fill_typing":
        case "fill_blank_typing":
          questionDisplay = q.question || "";
          correctAns = q.correct || "";
          break;
        case "fill_options":
        case "fill_blank_options":
        case "mcq_single":
        case "mcq":
        default:
          questionDisplay = q.question || q.text || "";
          correctAns = q.correct || q.correct_answer || "";
          break;
      }

      return (
        <div
          key={idx}
          className="p-4 rounded-xl border border-gray-200 bg-gray-50"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#002856] text-white text-sm font-semibold flex items-center justify-center">
              {idx + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium text-gray-800">
                {questionDisplay || `(${qType} question)`}
              </p>
              {(qType === "sentence_ordering" ||
                qType === "sentence_reorder") &&
                q.words && (
                  <p className="text-sm text-gray-500 mt-1">
                    Words: {q.words.join(", ")}
                  </p>
                )}
            </div>
          </div>
          <div className="ml-10">
            {q.options && q.options.length > 0 && (
              <div className="space-y-2 mb-3">
                {q.options.map((opt, optIdx) => {
                  const isCorrectOpt = Array.isArray(q.correct)
                    ? q.correct.includes(opt)
                    : opt === q.correct || opt === correctAns;
                  return (
                    <div
                      key={optIdx}
                      className={`p-2 rounded-lg text-sm ${
                        isCorrectOpt
                          ? "bg-green-100 border border-green-300 text-green-800 font-medium"
                          : "bg-white border border-gray-200 text-gray-600"
                      }`}
                    >
                      {isCorrectOpt && (
                        <Check className="inline w-4 h-4 mr-2 text-green-600" />
                      )}
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm">
                <span className="text-gray-600">Correct Answer: </span>
                <span className="font-semibold text-green-700">
                  {correctAns || "(no answer data)"}
                </span>
              </p>
            </div>
          </div>
        </div>
      );
    };

    // Determine if we have set-grouped data
    const hasSets = questionsBySet && questionsBySet.length > 0;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <button
            onClick={() => navigate(`/a2/test/${topicId}`)}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            Review Mode - Level {level}
          </span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {result && (
              <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-700">
                  Level {level} Completed!
                </p>
                <p className="text-sm text-green-600">You passed this level</p>
              </div>
            )}

            {hasSets ? (
              // GROUPED BY SETS
              <div className="space-y-8">
                {questionsBySet.map((set) => (
                  <div key={set.setNumber}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#002856] text-white flex items-center justify-center font-bold text-sm">
                        {set.setNumber}
                      </div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        Set {set.setNumber}
                      </h3>
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">
                        {set.questions.length} questions
                      </span>
                    </div>
                    <div className="space-y-4">
                      {set.questions.map((q, idx) =>
                        renderQuestionCard(q, idx),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // FALLBACK: flat list (if backend doesn't return grouped data)
              <>
                <h3 className="font-bold text-gray-800 mb-4">
                  All Questions & Correct Answers:
                </h3>
                <div className="space-y-4">
                  {questions.map((q, idx) => renderQuestionCard(q, idx))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={() => navigate(`/a2/test/${topicId}`)}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Back to Levels
          </button>
        </div>
      </div>
    );
  }

  // FAILED REVIEW VIEW - Shows user's answers without revealing correct answers
  if (showFailedReview && result && !result.passed) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <button
            onClick={() => setShowFailedReview(false)}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Results
          </button>
          <span className="text-sm font-semibold text-gray-600">
            Review Your Answers
          </span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4">
              <p className="text-sm text-amber-700">
                Your answers are shown below.{" "}
                <span className="text-green-600 font-medium">Green</span> =
                Correct, <span className="text-red-600 font-medium">Red</span> =
                Incorrect
              </p>
            </div>

            {questions.map((q, idx) => {
              const userAnswer = answers[idx];
              const qType = q.type || q.question_type || "";

              // Calculate isCorrect based on question type
              let isCorrect = false;
              if (qType === "true_false" || qType === "truefalse") {
                isCorrect = userAnswer === q.correct;
              } else if (qType === "mcq_multi") {
                // Multi-select: userAnswer is array of TEXTS ["Montag", "Samstag"]
                const correctArr = q.correct || [];
                const userArr = Array.isArray(userAnswer) ? userAnswer : [];
                isCorrect =
                  correctArr.length === userArr.length &&
                  correctArr.every((c) => userArr.includes(c));
              } else if (
                qType === "sentence_ordering" ||
                qType === "sentence_reorder"
              ) {
                const correctOrder = q.correct_order || [];
                const userOrder = Array.isArray(userAnswer) ? userAnswer : [];
                isCorrect =
                  correctOrder.length === userOrder.length &&
                  correctOrder.every((w, i) => userOrder[i] === w);
              } else if (qType === "sentence_correction") {
                const stripPunc = (s) =>
                  (s || "")
                    .replace(/[.,!?;:'"()]/g, "")
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();
                isCorrect =
                  stripPunc(userAnswer) ===
                  stripPunc(q.correct_sentence || q.correct);
              } else if (qType === "matching") {
                // Matching: userAnswer is array of pairs [{de, en}, ...]
                if (Array.isArray(userAnswer) && Array.isArray(q.pairs)) {
                  const userPairStr = userAnswer
                    .map((p) => `${p.de}-${p.en}`)
                    .sort()
                    .join("|");
                  const correctPairStr = q.pairs
                    .map((p) => `${p.de}-${p.en}`)
                    .sort()
                    .join("|");
                  isCorrect = userPairStr === correctPairStr;
                }
              } else if (
                qType === "fill_typing" ||
                qType === "fill_blank_typing"
              ) {
                const stripPunc = (s) =>
                  (s || "")
                    .replace(/[.,!?;:'"()]/g, "")
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();
                isCorrect = stripPunc(userAnswer) === stripPunc(q.correct);
              } else if (
                qType === "fill_options" ||
                qType === "fill_blank_options" ||
                qType === "mcq_single" ||
                qType === "mcq"
              ) {
                // userAnswer is TEXT, q.correct is TEXT
                isCorrect = userAnswer === q.correct;
              } else {
                // Fallback for string comparison
                isCorrect =
                  String(userAnswer || "")
                    .toLowerCase()
                    .trim() ===
                  String(q.correct || "")
                    .toLowerCase()
                    .trim();
              }

              // Helper to check if an option is selected
              const isOptionSelected = (opt, optIdx) => {
                if (qType === "mcq_multi") {
                  // userAnswer is array of texts
                  return Array.isArray(userAnswer) && userAnswer.includes(opt);
                } else {
                  // MCQ single: userAnswer is the text
                  return userAnswer === opt;
                }
              };

              // Helper to check if an option is correct
              const isOptionCorrect = (opt) => {
                if (qType === "mcq_multi") {
                  return Array.isArray(q.correct) && q.correct.includes(opt);
                } else {
                  return opt === q.correct;
                }
              };

              // Get display text for user answer
              const getUserAnswerDisplay = () => {
                if (Array.isArray(userAnswer)) {
                  if (
                    qType === "matching" &&
                    userAnswer.length > 0 &&
                    typeof userAnswer[0] === "object"
                  ) {
                    return userAnswer
                      .map((p) => `${p.de} → ${p.en}`)
                      .join(", ");
                  }
                  return userAnswer.join(" ");
                }
                if (typeof userAnswer === "object" && userAnswer !== null) {
                  return JSON.stringify(userAnswer);
                }
                return userAnswer || "(empty)";
              };

              return (
                <div
                  key={idx}
                  className={`bg-white border-2 rounded-2xl p-5 ${
                    isCorrect ? "border-green-300" : "border-red-300"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full text-white text-sm font-semibold flex items-center justify-center ${
                        isCorrect ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <p className="font-medium text-gray-800 pt-0.5">
                      {q.question ||
                        q.text ||
                        q.hint_en ||
                        (qType === "matching" ? "Match the pairs" : "Question")}
                    </p>
                  </div>

                  {/* MCQ Options */}
                  {q.options && Array.isArray(q.options) && (
                    <div className="space-y-2 pl-10">
                      {q.options.map((opt, optIdx) => {
                        const optText =
                          typeof opt === "object"
                            ? opt.de || opt.en || JSON.stringify(opt)
                            : opt;
                        const selected = isOptionSelected(optText, optIdx);
                        const correct = isOptionCorrect(optText);
                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border-2 ${
                              selected
                                ? correct
                                  ? "border-green-500 bg-green-50 text-green-700"
                                  : "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-200 text-gray-500"
                            }`}
                          >
                            {selected && (correct ? "✓ " : "✗ ")}
                            {optText}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True/False */}
                  {typeof q.correct === "boolean" && (
                    <div className="flex gap-3 pl-10">
                      {[true, false].map((val, i) => {
                        const isSelected = userAnswer === val;
                        const isCorrectOption = q.correct === val;
                        return (
                          <div
                            key={i}
                            className={`flex-1 py-3 rounded-xl border-2 text-center font-medium ${
                              isSelected
                                ? isCorrectOption
                                  ? "border-green-500 bg-green-50 text-green-700"
                                  : "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-200 text-gray-500"
                            }`}
                          >
                            {isSelected && (isCorrectOption ? "✓ " : "✗ ")}
                            {val ? "True" : "False"}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching pairs display */}
                  {qType === "matching" && q.pairs && (
                    <div className="pl-10 space-y-2">
                      <p className="text-sm text-gray-500 mb-2">
                        Your matches:
                      </p>
                      {Array.isArray(userAnswer) &&
                        userAnswer.map((pair, pIdx) => {
                          const correctPair = q.pairs.find(
                            (p) => p.de === pair.de,
                          );
                          const pairCorrect =
                            correctPair && correctPair.en === pair.en;
                          return (
                            <div
                              key={pIdx}
                              className={`p-2 rounded-lg border ${pairCorrect ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}
                            >
                              {pairCorrect ? "✓ " : "✗ "}
                              {pair.de} → {pair.en}
                            </div>
                          );
                        })}
                      {(!userAnswer || userAnswer.length === 0) && (
                        <div className="p-2 rounded-lg border border-gray-200 text-gray-500">
                          (no answer)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sentence ordering / correction / fill typing */}
                  {!q.options &&
                    typeof q.correct !== "boolean" &&
                    qType !== "matching" && (
                      <div className="pl-10">
                        <div
                          className={`p-3 rounded-xl border-2 ${
                            isCorrect
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-red-500 bg-red-50 text-red-700"
                          }`}
                        >
                          Your answer: {getUserAnswerDisplay()}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              setShowFailedReview(false);
              navigate(`/a2/test/${topicId}`);
            }}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // RESULT VIEW (after submission)
  if (result) {
    const passed = result.passed;
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        {/* Congratulations Modal Overlay */}
        {result.isFullyCompleted && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-in">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Congratulations!
              </h2>
              <p className="text-gray-600 mb-4">
                You've mastered all 5 levels
                {result.topicName ? ` of "${result.topicName}"` : ""}!
              </p>
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="w-6 h-6 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              {result.prerequisites && result.prerequisites.length > 0 && (
                <div className="text-left bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    Topics covered:
                  </p>
                  <ul className="space-y-1">
                    {result.prerequisites.map((prereq, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-blue-700 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => navigate(`/a2/test/${topicId}`)}
                className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
              >
                Back to Topic
              </button>
            </div>
          </div>
        )}

        {/* Standard result display (visible behind modal if fully completed, or as main view) */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
            passed ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {passed ? (
            <CheckCircle className="w-12 h-12 text-green-500" />
          ) : (
            <XCircle className="w-12 h-12 text-red-500" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {passed ? "Level Passed!" : "Try Again"}
        </h2>
        <p className="text-gray-600 mb-2">
          {result.correct} / {result.total} correct ({Math.round(result.score)}
          %)
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
          {!passed && (
            <button
              onClick={() => setShowFailedReview(true)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
            >
              Review Answers
            </button>
          )}
          <button
            onClick={() => navigate(`/a2/test/${topicId}`)}
            className="px-8 py-3 bg-[#002856] text-white rounded-xl font-semibold"
          >
            {passed ? "Continue" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  // QUESTION VIEW
  const currentQ = questions[currentIndex];
  const allAnswered = !answers.some((a) => a === null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <button
          onClick={() => navigate(`/a2/test/${topicId}`)}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-sm font-semibold text-gray-600 mr-9">
          Level {level}
        </span>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>
      <div className="px-4 py-2">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isSubmitting ? "bg-blue-500 animate-pulse" : "bg-[#002856]"
            }`}
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className="p-6 mb-10">
        {currentQ && (
          <QuestionRenderer
            question={{ question_type: currentQ.type, question_data: currentQ }}
            onAnswer={handleAnswer}
            showResult={false}
            userAnswer={answers[currentIndex]}
          />
        )}
      </div>
      <div className="p-4 flex gap-3">
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="px-6 py-3 border rounded-xl"
          >
            Back
          </button>
        )}
        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            disabled={answers[currentIndex] === null}
            className="flex-1 py-3 bg-[#002856] text-white rounded-xl font-semibold disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="flex-1 py-3 bg-[#019035] text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              "Submit Test"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
