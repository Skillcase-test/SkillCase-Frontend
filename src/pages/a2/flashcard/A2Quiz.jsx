import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";

import {
  generateMiniQuiz,
  generateFinalQuiz,
  submitFlashcardQuiz,
} from "../../../api/a2Api";
export default function A2Quiz({ setId, quizType, onComplete, onSkip }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res =
          quizType === "mini"
            ? await generateMiniQuiz(setId)
            : await generateFinalQuiz(setId);
        setQuestions(res.data.questions);
      } catch (err) {
        console.error("Error fetching quiz:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [setId, quizType]);
  const handleAnswer = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    const correct = answer === questions[currentIndex].correct;
    setIsCorrect(correct);
    setShowResult(true);
    setAnswers([
      ...answers,
      {
        questionId: questions[currentIndex].id,
        userAnswer: answer,
        correctAnswer: questions[currentIndex].correct,
        isCorrect: correct,
      },
    ]);
  };
  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowResult(false);
    } else {
      // Submit quiz
      try {
        const res = await submitFlashcardQuiz({
          setId,
          answers,
          quizType,
        });
        setFinalResult(res.data);
      } catch (err) {
        console.error("Error submitting quiz:", err);
      }
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }
  if (finalResult) {
    const passed = finalResult.passed;
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
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
          {passed ? "Quiz Passed!" : "Keep Practicing!"}
        </h2>
        <p className="text-gray-600 mb-4">
          You got {finalResult.correct} out of {finalResult.total} correct (
          {Math.round(finalResult.score)}%)
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {passed
            ? "Great job! You can proceed."
            : "You need 60% to pass. Try again!"}
        </p>
        <button
          onClick={() => onComplete(passed)}
          className="px-8 py-3 bg-[#002856] text-white rounded-xl font-semibold"
        >
          {passed ? "Continue" : "Try Again"}
        </button>
      </div>
    );
  }
  const currentQ = questions[currentIndex];
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">
          {quizType === "mini" ? "Mini Quiz" : "Final Quiz"}
        </span>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {questions.length}
        </span>
        {quizType === "mini" && (
          <button onClick={onSkip} className="text-sm text-blue-600">
            Skip
          </button>
        )}
      </div>
      {/* Progress */}
      <div className="px-4 py-2">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#002856] transition-all"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>
      {/* Question */}
      <div className="flex-1 p-6">
        <p className="text-lg font-medium text-gray-800 mb-6">
          {currentQ.question}
        </p>
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedAnswer === option
                  ? showResult
                    ? isCorrect
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                    : "border-[#002856] bg-[#edfaff]"
                  : showResult && option === currentQ.correct
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {/* Next Button */}
      {showResult && (
        <div className="p-4 border-t">
          <button
            onClick={handleNext}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <span>
              {currentIndex < questions.length - 1 ? "Next" : "Finish"}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
