import React from "react";
import ScoreRing from "./ScoreRing";
import MetricBar from "./MetricBar";
import { getScoreGreeting } from "../utils/scoreUtils";

export default function SpeakingFeedbackStage({ speakingFeedback, onSeeResults }) {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="self-stretch px-4 pb-10">
        <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
          <div className="flex flex-col justify-start items-center gap-3">
            <div className="text-center text-sky-950 text-base font-semibold font-['Inter'] leading-5">
              Speaking Feedback
            </div>
            <div className="text-center text-sky-950 text-3xl font-semibold font-['Inter'] leading-9">
              {getScoreGreeting(speakingFeedback.overallScore)}
            </div>
          </div>

          <div className="flex flex-col justify-start items-center gap-6">
            <ScoreRing
              score={speakingFeedback.overallScore}
              label="overall speaking accuracy"
            />
          </div>

          {/* Metric progress bars */}
          <div className="w-full flex flex-col justify-start items-start gap-3">
            <MetricBar label="Pronunciation" score={speakingFeedback.overallScore} />
            <MetricBar label="Fluency" score={speakingFeedback.fluencyScore} />
            <MetricBar label="Accuracy" score={speakingFeedback.accuracyScore} />
            <MetricBar label="Completeness" score={speakingFeedback.completenessScore} />
          </div>

          {/* Qualitative Pointers */}
          <div className="self-stretch flex flex-col justify-start items-start gap-3">
            <div className="self-stretch p-3 bg-white rounded-xl border border-zinc-400/50 inline-flex justify-start items-start gap-2 text-left">
              <div className="w-4 h-4 shrink-0 relative overflow-hidden mt-0.5 text-green-700 font-bold flex items-center justify-center border border-green-700 rounded-full text-[10px]">
                ✓
              </div>
              <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                <div className="self-stretch justify-start text-black text-xs font-semibold">
                  What went well
                </div>
                <div className="self-stretch justify-start text-black text-xs font-normal leading-relaxed">
                  {speakingFeedback.whatWentWell}
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
                  {speakingFeedback.tryToImprove}
                </div>
              </div>
            </div>
          </div>

          {/* See Overall Results button */}
          <div className="self-stretch flex flex-col justify-start items-start gap-2 w-full">
            <button
              type="button"
              onClick={onSeeResults}
              className="w-full px-4 py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-base font-semibold font-['Inter'] rounded-lg transition-all border-0 cursor-pointer flex justify-center items-center shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-offset-[-2px] outline-white/10 shrink-0"
            >
              See Overall Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
