import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Check,
  X,
  Award,
  RefreshCw,
} from "lucide-react";

const TestView = ({
  showTestPrompt,
  showTest,
  testQuestions,
  userAnswers,
  testSubmitted,
  testResults,
  isFinalTest,
  currentCard,
  totalCards,
  profLevel,
  onNavigateBack,
  onPrevious,
  onStartTest,
  onSkipTest,
  onAnswer,
  onSubmit,
  onRetry,
  onContinue,
  onBackToPrompt,
}) => {
  const isAtFinalTest = currentCard === totalCards - 1;

  // Test Prompt Screen
  if (showTestPrompt) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-[#7b7b7b]">
              Test Time
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg border border-[#e0e0e0]">
            {/* Icon with animation */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#edb843] to-[#f5cc6a] rounded-2xl flex items-center justify-center shadow-md">
              {isAtFinalTest ? (
                <Award className="w-10 h-10 text-white" />
              ) : (
                <Target className="w-10 h-10 text-white" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-[#002856] mb-2">
              {isAtFinalTest ? "Final Assessment!" : "Test Checkpoint!"}
            </h2>

            <p className="text-sm text-[#7b7b7b] mb-2">
              {isAtFinalTest
                ? "Complete the final test to mark this chapter done."
                : `You've completed ${
                    currentCard + 1
                  } cards. Let's test your knowledge!`}
            </p>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="px-3 py-1 bg-[#f0f0f0] rounded-full">
                <span className="text-xs font-medium text-[#002856]">
                  {isFinalTest ? "30 questions" : "10 questions"}
                </span>
              </div>
              <div className="px-3 py-1 bg-[#f0f0f0] rounded-full">
                <span className="text-xs font-medium text-[#002856]">
                  60% to pass
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onPrevious}
                className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50 transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-[#414651]" />
              </button>
              <button
                onClick={onStartTest}
                className="px-8 py-3 bg-[#edb843] text-white rounded-xl font-semibold hover:bg-[#d9a53a] transition-all active:scale-95 shadow-md"
              >
                {isAtFinalTest ? "Start Final Test" : "Start Test"}
              </button>
              {!isAtFinalTest && (
                <button
                  onClick={onSkipTest}
                  className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 text-[#414651]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test Questions Screen
  if (showTest) {
    const answeredCount = Object.keys(userAnswers).length;
    const progress = (answeredCount / testQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#efefef] bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onBackToPrompt}
              className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-[#002856]">
              {isFinalTest ? "Final Test" : "Quick Test"}
            </span>
            <span className="text-xs font-medium text-[#7b7b7b] bg-[#f0f0f0] px-2 py-1 rounded-full">
              {answeredCount}/{testQuestions.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#edb843] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Questions or Results */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          {!testSubmitted ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              {testQuestions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className={`bg-white border rounded-2xl p-5 transition-all ${
                    userAnswers[qIndex] !== undefined
                      ? "border-[#edb843] shadow-sm"
                      : "border-[#e0e0e0]"
                  }`}
                >
                  <p className="text-base font-semibold text-[#002856] mb-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002856] text-white text-xs rounded-full mr-2">
                      {qIndex + 1}
                    </span>
                    {q.type === "truefalse"
                      ? `"${q.question}" means "${q.displayAnswer}"`
                      : q.question}
                  </p>

                  <div className="space-y-2">
                    {q.type === "mcq" ? (
                      q.options.map((opt, oIndex) => (
                        <div
                          key={oIndex}
                          onClick={() => onAnswer(qIndex, opt)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                            userAnswers[qIndex] === opt
                              ? "border-[#edb843] bg-[#fffbf0]"
                              : "border-[#e0e0e0] hover:border-[#edb843] hover:bg-[#fafafa]"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              userAnswers[qIndex] === opt
                                ? "border-[#edb843] bg-[#edb843]"
                                : "border-[#d0d0d0]"
                            }`}
                          >
                            {userAnswers[qIndex] === opt && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm text-[#181d27]">{opt}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-3">
                        {[true, false].map((val) => (
                          <div
                            key={String(val)}
                            onClick={() => onAnswer(qIndex, val)}
                            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                              userAnswers[qIndex] === val
                                ? val
                                  ? "border-[#019035] bg-[#f0fff4]"
                                  : "border-[#dc2626] bg-[#fef2f2]"
                                : "border-[#e0e0e0] hover:border-[#888]"
                            }`}
                          >
                            <span
                              className={`text-sm font-semibold ${
                                userAnswers[qIndex] === val
                                  ? val
                                    ? "text-[#019035]"
                                    : "text-[#dc2626]"
                                  : "text-[#555]"
                              }`}
                            >
                              {val ? "✓ True" : "✗ False"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Submit Button */}
              <button
                onClick={onSubmit}
                disabled={answeredCount !== testQuestions.length}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                  answeredCount === testQuestions.length
                    ? "bg-[#002856] text-white hover:bg-[#003a70] active:scale-[0.98] shadow-lg"
                    : "bg-[#e0e0e0] text-[#999] cursor-not-allowed"
                }`}
              >
                Submit Test
              </button>
            </div>
          ) : (
            // Results Screen
            <div className="flex flex-col items-center justify-center py-12 max-w-md mx-auto">
              {/* Result Icon */}
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                  testResults.passed
                    ? "bg-gradient-to-br from-[#019035] to-[#34d399]"
                    : "bg-gradient-to-br from-[#dc2626] to-[#f87171]"
                }`}
              >
                {testResults.passed ? (
                  <Check className="w-12 h-12 text-white" />
                ) : (
                  <X className="w-12 h-12 text-white" />
                )}
              </div>

              <h2
                className={`text-3xl font-bold mb-2 ${
                  testResults.passed ? "text-[#019035]" : "text-[#dc2626]"
                }`}
              >
                {testResults.passed ? "Excellent!" : "Keep Trying!"}
              </h2>

              <p className="text-[#7b7b7b] text-center mb-4">
                {testResults.passed
                  ? "You've mastered these flashcards!"
                  : "Review the cards and try again."}
              </p>

              {/* Score Card */}
              <div className="bg-[#f8f8f8] rounded-2xl p-6 w-full mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7b7b7b]">Your Score</span>
                  <span
                    className={`text-2xl font-bold ${
                      testResults.passed ? "text-[#019035]" : "text-[#dc2626]"
                    }`}
                  >
                    {Math.round(
                      (testResults.correct / testResults.total) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="mt-2 h-2 bg-[#e0e0e0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      testResults.passed ? "bg-[#019035]" : "bg-[#dc2626]"
                    }`}
                    style={{
                      width: `${
                        (testResults.correct / testResults.total) * 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#7b7b7b] mt-2 text-center">
                  {testResults.correct} of {testResults.total} correct
                </p>
              </div>

              {/* Action Buttons */}
              {testResults.passed ? (
                <button
                  onClick={onContinue}
                  className="w-full py-4 bg-[#019035] text-white rounded-2xl font-bold text-lg hover:bg-[#017a2c] transition-all active:scale-[0.98] shadow-lg"
                >
                  {isFinalTest ? "Complete Chapter ✓" : "Continue →"}
                </button>
              ) : (
                <div className="flex gap-3 w-full">
                  <button
                    onClick={onRetry}
                    className="flex-1 py-4 bg-[#edb843] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#d9a53a] transition-all active:scale-[0.98]"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Retry
                  </button>
                  {!isFinalTest && (
                    <button
                      onClick={onSkipTest}
                      className="flex-1 py-4 bg-[#f0f0f0] text-[#666] rounded-2xl font-bold hover:bg-[#e0e0e0] transition-all active:scale-[0.98]"
                    >
                      Skip
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default TestView;
