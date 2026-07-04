import React from "react";
import ScoreRing from "./ScoreRing";
import MetricBar from "./MetricBar";
import { getScoreGreeting } from "../utils/scoreUtils";

export default function WritingFeedbackStage({
  writingFeedback,
  writingText,
  onPracticeSpeaking,
}) {
  const writingScore = writingFeedback?.score || 0;

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
                : "text-red-500 font-bold bg-red-50/50 px-0.5 rounded"
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
        <span key="end" className="text-black">
          {originalText.substring(currentIndex)}
        </span>
      );
    }
    return result;
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* White card: Your Writing & Corrected Version */}
      <div className="w-full px-4 pt-4 pb-10 bg-white flex flex-col justify-start items-center gap-6">
        {/* Your Writing */}
        <div className="self-stretch flex flex-col justify-start items-start gap-3">
          <div className="w-full inline-flex justify-start items-start gap-4">
            <div className="flex-1 text-sky-950 text-base font-semibold font-['Inter'] leading-5 text-left">
              Your Writing
            </div>
          </div>
          <div className="self-stretch p-3 bg-red-100/25 rounded-xl outline outline-offset-[-1px] outline-red-500 flex flex-col justify-start items-start text-left min-h-[80px]">
            <div className="self-stretch text-black text-xs font-normal leading-5 break-words">
              {renderHighlights(writingText, writingFeedback?.mistake_highlights)}
            </div>
          </div>
        </div>

        {/* Corrected Version */}
        <div className="self-stretch flex flex-col justify-start items-start gap-3">
          <div className="w-full inline-flex justify-start items-start gap-4">
            <div className="flex-1 text-sky-950 text-base font-semibold font-['Inter'] leading-5 text-left">
              Corrected Version
            </div>
          </div>
          <div className="self-stretch p-3 bg-emerald-100/10 rounded-xl outline outline-offset-[-1px] outline-green-700 flex flex-col justify-start items-start text-left min-h-[80px]">
            <div className="self-stretch text-black text-xs font-normal leading-5 break-words">
              {writingFeedback.corrected_text}
            </div>
          </div>
        </div>
      </div>

      {/* Gray Feedback Card */}
      <div className="self-stretch px-4 pb-10">
        <div className="w-full px-5 pt-10 pb-5 bg-[#F5F5F5] rounded-xl flex flex-col justify-start items-center gap-9">
          <div className="flex flex-col justify-start items-center gap-3">
            <div className="text-center text-sky-950 text-base font-semibold font-['Inter'] leading-5">
              Writing Feedback
            </div>
            <div className="text-center text-sky-950 text-3xl font-semibold font-['Inter'] leading-9">
              {getScoreGreeting(writingScore)}
            </div>
          </div>

          <div className="flex flex-col justify-start items-center gap-6">
            <ScoreRing score={writingScore} label="overall writing accuracy" />
          </div>

          {/* Metric progress bars */}
          <div className="w-full flex flex-col justify-start items-start gap-3">
            <MetricBar label="Grammar" score={writingFeedback.metrics?.grammar} />
            <MetricBar label="Vocabulary" score={writingFeedback.metrics?.vocabulary} />
            <MetricBar
              label="Sentence Structure"
              score={writingFeedback.metrics?.sentence_structure}
            />
            <MetricBar label="Spellings" score={writingFeedback.metrics?.spellings} />
          </div>

          {/* Practice Speaking button */}
          <div className="self-stretch flex flex-col justify-start items-start gap-2 w-full">
            <button
              type="button"
              onClick={onPracticeSpeaking}
              className="w-full px-4 py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-base font-semibold font-['Inter'] rounded-lg transition-all border-0 cursor-pointer flex justify-center items-center shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-offset-[-2px] outline-white/10 shrink-0"
            >
              Practice Speaking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
