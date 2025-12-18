import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
const getScoreBadgeStyle = (score) => {
  if (score >= 70)
    return { bg: "bg-[rgba(1,144,53,0.12)]", text: "text-[#019035]" };
  if (score >= 40)
    return { bg: "bg-[rgba(255,235,192,0.65)]", text: "text-[#ac8121]" };
  return { bg: "bg-[#fdd]", text: "text-[#d00]" };
};
const AssessmentResults = ({ result, cardData, onRetry }) => {
  const assessmentStatus = result.result.accuracyScore >= 70 ? "pass" : "fail";
  const scores = [
    { label: "Accuracy", score: result.result.accuracyScore },
    { label: "Fluency", score: result.result.fluencyScore },
    { label: "Completeness", score: result.result.completenessScore },
    { label: "Pronunciation", score: result.result.pronunciationScore },
  ];
  return (
    <div className="flex flex-col flex-1 justify-center items-center">
      {/* Word Display */}
      <div className="text-center mb-4">
        <p className="text-2xl font-medium text-[#002856] leading-[1.2] mb-1">
          {cardData?.back_content}
        </p>
        <p className="text-base font-medium text-[#002856] opacity-50">
          {cardData?.front_content}
        </p>
      </div>
      {/* Results Box */}
      <div className="bg-[#fafafa] rounded-xl p-2.5 flex-1 w-full">
        {/* Status Header */}
        <div className="flex flex-col items-center gap-1.5 mb-4">
          <AlertCircle
            className={`w-6 h-6 ${
              assessmentStatus === "pass" ? "text-[#019035]" : "text-[#002856]"
            }`}
          />
          <p className="text-sm font-bold text-[#002856]">
            {assessmentStatus === "pass" ? "Great Job!" : "Keep Practising"}
          </p>
        </div>
        {/* Divider */}
        <div className="h-px bg-[#e5e5e5] mb-3" />
        {/* Score Rows */}
        <div className="space-y-2">
          {scores.map((item) => {
            const style = getScoreBadgeStyle(item.score);
            return (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-[#002856]">{item.label}</span>
                <div className={`${style.bg} px-2 py-0.5 rounded-full`}>
                  <span className={`text-[13px] font-medium ${style.text}`}>
                    {item.score}/100
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Try Again Button */}
      <button
        onClick={onRetry}
        className="mt-3 w-32 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
      >
        <RotateCcw className="w-4 h-4 text-[#181d27]" />
        <span className="text-sm font-semibold text-[#181d27]">Try Again</span>
      </button>
    </div>
  );
};
export default AssessmentResults;
