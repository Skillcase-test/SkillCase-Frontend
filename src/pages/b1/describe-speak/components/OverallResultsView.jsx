import React from "react";
import { Loader2 } from "lucide-react";
import { getScoreGreeting, getScoreStrokeColor } from "../utils/scoreUtils";

export default function OverallResultsView({
  writingScore,
  speakingScore,
  combinedScore,
  onReviewAnswers,
  onTryNext,
  onReattempt,
  navigatingNext,
  resettingProgress,
}) {
  const circleSize = 160;
  const strokeWidth = 12;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (combinedScore / 100) * circumference;

  return (
    <div className="w-full flex flex-col">
      <div className="self-stretch px-4 pt-4 pb-10">
        <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
          <div className="text-center text-sky-950 text-3xl font-semibold leading-9">
            {getScoreGreeting(combinedScore)}
          </div>

          {/* Combined score ring */}
          <div className="relative flex items-center justify-center w-40 h-40">
            <svg
              width={circleSize}
              height={circleSize}
              className="transform -rotate-90"
            >
              <circle
                stroke="#D4D4D8"
                fill="transparent"
                strokeWidth={12}
                r={radius}
                cx={circleSize / 2}
                cy={circleSize / 2}
              />
              <circle
                stroke={getScoreStrokeColor(combinedScore)}
                fill="transparent"
                strokeWidth={12}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={radius}
                cx={circleSize / 2}
                cy={circleSize / 2}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-sky-950 text-3xl font-semibold leading-9">
                {combinedScore}%
              </span>
              <span className="w-24 text-center text-sky-950 text-[8px] font-semibold leading-normal">
                overall writing &amp; speaking accuracy
              </span>
            </div>
          </div>

          {/* Two side-by-side score cards */}
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <div className="flex-1 p-2.5 bg-green-700/20 rounded-md flex justify-center items-center gap-2.5">
              <div className="w-full inline-flex flex-col justify-center items-center gap-1">
                <div className="text-center text-black text-xs font-normal leading-6">
                  Writing score
                </div>
                <div className="text-center text-green-700 text-3xl font-semibold leading-9">
                  {writingScore}%
                </div>
              </div>
            </div>
            <div className="flex-1 p-2.5 bg-green-700/20 rounded-md flex justify-center items-center gap-2.5">
              <div className="w-full inline-flex flex-col justify-center items-center gap-1">
                <div className="text-center text-black text-xs font-normal leading-6">
                  Speaking score
                </div>
                <div className="text-center text-green-700 text-3xl font-semibold leading-9">
                  {speakingScore}%
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons — inside the card */}
          <div className="self-stretch flex flex-col gap-2 w-full">
            <button
              onClick={onReviewAnswers}
              disabled={navigatingNext || resettingProgress}
              className="w-full bg-blue-950 hover:bg-blue-900 disabled:bg-blue-950/70 text-white font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-center text-sm flex items-center justify-center gap-2 border-0 outline-none active:scale-95"
            >
              <span>Review Answers</span>
            </button>

            <button
              onClick={onTryNext}
              disabled={navigatingNext || resettingProgress}
              className="w-full py-3 rounded-lg border border-zinc-300 bg-white hover:bg-slate-50 text-blue-950 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer active:scale-95 animate-none"
            >
              {navigatingNext ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finding Next...</span>
                </>
              ) : (
                <span>Try Next Topic</span>
              )}
            </button>

            <button
              type="button"
              onClick={onReattempt}
              disabled={navigatingNext || resettingProgress}
              className="text-sm text-blue-950 font-bold hover:underline transition-all bg-transparent border-0 outline-none cursor-pointer flex items-center justify-center gap-1 mx-auto disabled:opacity-50 py-3"
            >
              {resettingProgress ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reattempt Writing &amp; Speaking</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
