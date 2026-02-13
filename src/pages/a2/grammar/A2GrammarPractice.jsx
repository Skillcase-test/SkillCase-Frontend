import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ArrowRight,
  Loader2,
  BookOpen,
  CheckCircle,
  Eye,
} from "lucide-react";
import {
  getGrammarTopicDetail,
  getGrammarQuestions,
  checkGrammarAnswer,
  saveGrammarProgress,
} from "../../../api/a2Api";
import QuestionRenderer from "../../../components/a2/QuestionRenderer";
import A2GrammarExplanation from "./A2GrammarExplanation";

import api from "../../../api/axios";
import FloatingStreakCounter from "../../../components/FloatingStreakCounter";
import StreakCelebrationModal from "../../../components/StreakCelebrationModal";

export default function A2GrammarPractice() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isReviewMode = searchParams.get("mode") === "review";

  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [userAnswer, setUserAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [allAnswers, setAllAnswers] = useState([]); // For review mode
  const [isChecking, setIsChecking] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFloatingBtn, setShowFloatingBtn] = useState(true);
  const startPracticeBtnRef = useRef(null);

  // --- Streak tracking ---
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [dailyGoalReached, setDailyGoalReached] = useState(false);
  const [streakInfo, setStreakInfo] = useState({
    todayFlashcards: 0,
    dailyGoal: 20,
    streakDays: 0,
  });

  const [localStreakCount, setLocalStreakCount] = useState(0);
  const streakLoggedRef = useRef(new Set());

  useEffect(() => {
    api
      .get("/streak")
      .then((res) => {
        if (res.data) {
          setStreakInfo((p) => ({
            ...p,
            todayFlashcards: res.data.todayPoints,
            dailyGoal: res.data.dailyGoal,
            streakDays: res.data.currentStreak,
          }));
          setLocalStreakCount(res.data.todayPoints);
          if (res.data.dailyGoalMet) setDailyGoalReached(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleStreakComplete = useCallback(() => {
    setDailyGoalReached(true);
    setShowStreakCelebration(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicRes, questionsRes] = await Promise.all([
          getGrammarTopicDetail(topicId),
          getGrammarQuestions(topicId),
        ]);
        setTopic(topicRes.data);
        setQuestions(questionsRes.data.questions);

        const progress = questionsRes.data.currentIndex || 0;
        const totalQ = questionsRes.data.questions?.length || 0;

        // FIX: Check if already completed
        if (progress >= totalQ && totalQ > 0) {
          setIsCompleted(true);
          setCurrentIndex(0); // Reset to show from beginning in review
        } else {
          setCurrentIndex(Math.min(progress, totalQ - 1));
        }

        // For review mode, initialize answers array
        if (isReviewMode) {
          setAllAnswers(new Array(totalQ).fill(null));
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [topicId, isReviewMode]);

  // IntersectionObserver for floating skip button
  useEffect(() => {
    if (!startPracticeBtnRef.current || !showExplanation) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingBtn(!entry.isIntersecting);
      },
      { threshold: 0.5 },
    );
    observer.observe(startPracticeBtnRef.current);
    return () => observer.disconnect();
  }, [showExplanation]);

  const handleAnswer = (answer) => {
    setUserAnswer(answer);
    if (isReviewMode) {
      const newAnswers = [...allAnswers];
      newAnswers[currentIndex] = answer;
      setAllAnswers(newAnswers);
    }
  };

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkGrammarAnswer({
        questionId: questions[currentIndex].id,
        answer: userAnswer,
      });
      setIsCorrect(res.data.isCorrect);
      setShowResult(true);

      // Streak: +1 per question checked (only first check per question)
      if (!isReviewMode && !streakLoggedRef.current.has(currentIndex)) {
        streakLoggedRef.current.add(currentIndex);
        setLocalStreakCount((prev) => prev + 1);
        api
          .post("/streak/log", { points: 1 })
          .then((streakRes) => {
            if (streakRes.data.streakUpdated) {
              setStreakInfo({
                todayFlashcards: streakRes.data.todayPoints,
                dailyGoal: streakRes.data.dailyGoal,
                streakDays: streakRes.data.currentStreak || 1,
              });
              setDailyGoalReached(true);
              setShowStreakCelebration(true);
            }
          })
          .catch(() => setLocalStreakCount((prev) => Math.max(0, prev - 1)));
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = async () => {
    setIsNavigating(true);
    try {
      if (!isReviewMode) {
        await saveGrammarProgress({
          topicId: parseInt(topicId),
          questionIndex: currentIndex + 1,
          isCompleted: currentIndex >= questions.length - 1,
        });
      }

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setUserAnswer(null);
        setShowResult(false);
        setIsCorrect(null);
      } else {
        navigate("/a2/grammar");
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const handleTryAgain = () => {
    setCurrentIndex(0);
    setUserAnswer(null);
    setShowResult(false);
    setIsCorrect(null);
    setIsCompleted(false);
    setShowExplanation(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  // COMPLETED STATE - Show review option
  if (isCompleted && !isReviewMode && showExplanation) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-3 flex items-center border-b border-[#E5E7EB]">
          <button
            onClick={() => navigate("/a2/grammar")}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Topic Completed!
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            You've finished all questions in "{topic?.name}"
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate(`/a2/grammar/${topicId}?mode=review`)}
              className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" /> Review Answers
            </button>
            <button
              onClick={handleTryAgain}
              className="w-full py-3 border-2 border-[#002856] text-[#002856] rounded-xl font-semibold"
            >
              Practice Again
            </button>
            <button
              onClick={() => navigate("/a2/grammar")}
              className="w-full py-3 text-gray-600 font-medium"
            >
              Back to Topics
            </button>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW MODE - Show all questions and answers
  if (isReviewMode) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-[#E5E7EB]">
          <button
            onClick={() => navigate("/a2/grammar")}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Eye className="w-4 h-4" /> Review Mode
          </span>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {topic?.name} - All Questions
          </h2>
          <div className="space-y-4">
            {questions.map((q, idx) => {
              // FIX: Properly extract correct answer based on question type and data structure
              const qd = q.question_data || {};
              let correctAns = "";
              let questionDisplay =
                qd.question || qd.text || qd.statement || "";

              switch (q.question_type) {
                case "sentence_ordering":
                case "sentence_reorder":
                  // correct_order can be array of INDICES or array of STRINGS
                  if (Array.isArray(qd.correct_order)) {
                    // Check if first element is number (indices) or string (actual words)
                    if (
                      typeof qd.correct_order[0] === "number" &&
                      Array.isArray(qd.words)
                    ) {
                      correctAns = qd.correct_order
                        .map((i) => qd.words[i])
                        .join(" ");
                    } else {
                      // Already strings - join directly
                      correctAns = qd.correct_order.join(" ");
                    }
                  } else if (qd.correct_sentence) {
                    correctAns = qd.correct_sentence;
                  }
                  questionDisplay = qd.hint_en
                    ? `Arrange: "${qd.hint_en}"`
                    : qd.hint
                      ? `Arrange: "${qd.hint}"`
                      : qd.question || "Arrange the words";
                  break;

                case "sentence_correction":
                  correctAns = qd.correct_sentence || "";
                  questionDisplay = qd.sentence || qd.question || "";
                  break;

                case "true_false":
                  // JSON uses correct_answer OR correct (boolean)
                  const tfVal =
                    qd.correct_answer !== undefined
                      ? qd.correct_answer
                      : qd.correct;
                  if (tfVal === true) correctAns = "True";
                  else if (tfVal === false) correctAns = "False";
                  else correctAns = String(tfVal ?? "N/A");
                  questionDisplay = qd.question || qd.statement || "";
                  break;

                case "mcq_multi":
                  // JSON: correct_answers is array of INDICES [0, 2, 4]
                  if (
                    Array.isArray(qd.correct_answers) &&
                    Array.isArray(qd.options)
                  ) {
                    correctAns = qd.correct_answers
                      .map((i) => {
                        const idx = typeof i === "number" ? i : parseInt(i, 10);
                        return qd.options[idx] !== undefined
                          ? qd.options[idx]
                          : `[${i}]`;
                      })
                      .join(", ");
                  } else if (Array.isArray(qd.correct_answers)) {
                    correctAns = qd.correct_answers.join(", ");
                  }
                  break;

                case "matching":
                  if (Array.isArray(qd.pairs)) {
                    correctAns = qd.pairs
                      .map(
                        (p) =>
                          `${p.left || p.de || "?"} → ${
                            p.right || p.en || "?"
                          }`,
                      )
                      .join(", ");
                  }
                  questionDisplay = qd.question || "Match the pairs";
                  break;

                case "fill_blank_options":
                case "fill_options":
                  // JSON: correct_answer can be INDEX or value, or use qd.correct
                  if (
                    typeof qd.correct_answer === "number" &&
                    Array.isArray(qd.options)
                  ) {
                    correctAns = qd.options[qd.correct_answer] || "";
                  } else if (qd.correct_answer !== undefined) {
                    correctAns = String(qd.correct_answer);
                  } else if (qd.correct !== undefined) {
                    correctAns = String(qd.correct);
                  }
                  questionDisplay = qd.question || "";
                  break;

                case "fill_blank_typing":
                case "fill_typing":
                  // JSON: correct_answers is array of strings ["hat"]
                  if (Array.isArray(qd.correct_answers)) {
                    correctAns = qd.correct_answers.join(" / ");
                  } else {
                    correctAns = qd.correct_answer || qd.correct || "";
                  }
                  questionDisplay = qd.question || "";
                  break;

                case "mcq_single":
                case "mcq":
                  // JSON: correct_answer can be INDEX or use qd.correct as string value
                  if (
                    typeof qd.correct_answer === "number" &&
                    Array.isArray(qd.options)
                  ) {
                    correctAns = qd.options[qd.correct_answer] || "";
                  } else if (qd.correct !== undefined) {
                    // correct is the actual string value
                    correctAns = String(qd.correct);
                  } else if (qd.correct_answer !== undefined) {
                    correctAns = String(qd.correct_answer);
                  }
                  break;

                default:
                  correctAns = qd.correct || qd.correct_answer || "";
                  if (
                    typeof correctAns === "number" &&
                    Array.isArray(qd.options)
                  ) {
                    correctAns = qd.options[correctAns] || String(correctAns);
                  }
                  break;
              }

              return (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#002856] text-white text-sm font-semibold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {questionDisplay || "Question"}
                      </p>
                      {(q.question_type === "sentence_ordering" ||
                        q.question_type === "sentence_reorder") &&
                        qd.words && (
                          <p className="text-sm text-gray-500 mt-1">
                            Words: {qd.words.join(", ")}
                          </p>
                        )}
                      {q.question_type === "mcq_multi" && qd.options && (
                        <p className="text-sm text-gray-500 mt-1">
                          Options: {qd.options.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-10 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-green-700">
                        Correct Answer:{" "}
                      </span>
                      {correctAns || "N/A"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-4">
          <button
            onClick={() => {
              setIsCompleted(false);
              setCurrentIndex(0);
              setShowExplanation(false);
              navigate(`/a2/grammar/${topicId}`);
            }}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Practice Again
          </button>
        </div>
      </div>
    );
  }

  // EXPLANATION VIEW
  if (showExplanation && topic?.explanation) {
    return (
      <div className="min-h-screen bg-white flex flex-col relative">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#E5E7EB]">
          <button
            onClick={() => navigate("/a2/grammar")}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            Explanation
          </span>
        </div>
        <div id="a2-grammar-content" className="flex-1 p-6 overflow-auto">
          <A2GrammarExplanation
            explanation={topic.explanation}
            title={topic.name}
          />
        </div>
        <div className="p-4">
          <button
            id="a2-grammar-start-practice"
            ref={startPracticeBtnRef}
            onClick={() => {
              window.dispatchEvent(new Event("tour:a2GrammarStartPractice"));
              setShowExplanation(false);
              window.scrollTo(0, 0);
            }}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Start Practice
          </button>
        </div>

        {/* Floating Skip Button */}
        <button
          onClick={() => {
            setShowExplanation(false);
            window.scrollTo(0, 0);
          }}
          className={`fixed right-4 bottom-20 w-8 h-8 bg-[#002856] text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out ${
            showFloatingBtn
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-75 translate-y-4 pointer-events-none"
          }`}
          title="Start Practice"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // PRACTICE VIEW
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#E5E7EB]">
        <button
          onClick={() => navigate("/a2/grammar")}
          className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-sm text-gray-500 ml-10">
          {currentIndex + 1} / {questions.length}
        </span>
        <button
          onClick={() => setShowExplanation(true)}
          className="flex items-center gap-1 px-3 py-0.5 bg-[#edfaff] border border-[#002856] text-[#002856] text-sm font-semibold rounded-lg hover:bg-[#002856] hover:text-white transition-colors"
          title="View Explanation"
        >
          <BookOpen className="w-4 h-4" />
          <span>Explanation</span>
        </button>
      </div>
      <div className="px-4 py-2">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#019035] transition-all"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className="px-6 py-2">
        {questions[currentIndex] && (
          <QuestionRenderer
            question={questions[currentIndex]}
            onAnswer={handleAnswer}
            showResult={showResult}
            userAnswer={userAnswer}
            isCorrect={isCorrect}
          />
        )}
      </div>
      <div className="p-4">
        {!showResult ? (
          <button
            onClick={handleCheck}
            disabled={userAnswer === null || isChecking}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Checking...
              </>
            ) : (
              "Check Answer"
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isNavigating}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isNavigating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </>
            ) : (
              <>
                <span>
                  {currentIndex < questions.length - 1 ? "Next" : "Finish"}
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>

      <StreakCelebrationModal
        showStreakCelebration={showStreakCelebration}
        setShowStreakCelebration={setShowStreakCelebration}
        streakInfo={streakInfo}
      />
      {!showStreakCelebration &&
        !dailyGoalReached &&
        localStreakCount <= streakInfo.dailyGoal && (
          <FloatingStreakCounter
            current={localStreakCount}
            target={streakInfo.dailyGoal}
            onComplete={handleStreakComplete}
          />
        )}
    </div>
  );
}
