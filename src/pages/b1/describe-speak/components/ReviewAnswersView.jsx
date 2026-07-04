import React from "react";
import { Volume2 } from "lucide-react";
import ScoreRing from "./ScoreRing";
import MetricBar from "./MetricBar";
import AudioPlayer from "./AudioPlayer";

export default function ReviewAnswersView({
  data,
  isPlayingBack,
  playbackTime,
  playbackDuration,
  onPlayPause,
  formatSeconds,
}) {
  const writingScore = Number(data?.writingFeedback?.score || 0);
  const speakingScore = Number(data?.speakingFeedback?.overallScore || 0);

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
    <div className="w-full flex flex-col">
      {/* Topic Title & Image Prompts */}
      <div className="self-stretch px-4 pt-4 flex flex-col justify-start items-start gap-4">
        <div className="w-full inline-flex justify-between items-start gap-4">
          <div className="w-56 text-left text-sky-950 text-base font-semibold leading-5 break-words">
            {data?.topic?.title}
          </div>
          <div className="flex justify-start items-start gap-1.5 shrink-0">
            <div className="px-2 bg-black/5 rounded-[40px] border border-zinc-200/50 flex justify-center items-center gap-1.5 h-6">
              <span className="text-center text-neutral-500 text-xs font-medium">
                B1-B2
              </span>
            </div>
            <div className="px-2 bg-green-700/10 rounded-[40px] border border-green-700/20 flex justify-center items-center gap-1.5 h-6">
              <span className="text-center text-green-700 text-xs font-medium capitalize">
                {data?.topic?.difficulty_tag || "Easy"}
              </span>
            </div>
          </div>
        </div>

        <img
          className="self-stretch h-52 rounded-sm object-cover w-full shadow-sm"
          src={data?.topic?.prompt_image_url}
          alt="Describe Prompt"
        />

        {data?.topic?.helpful_words?.length > 0 && (
          <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
            <div className="inline-flex justify-center items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-950" />
              <span className="text-sky-950 text-base font-semibold leading-5">
                Helpful words:
              </span>
            </div>
            <p className="self-stretch opacity-70 text-black text-xs font-normal leading-4 text-left">
              Use these words in your sentences to describe the image that you
              see above.
            </p>
            <div className="w-full flex flex-wrap gap-1.5 pt-1">
              {data.topic.helpful_words.map((word, idx) => (
                <div
                  key={idx}
                  className="h-7 px-2.5 py-1.5 bg-blue-950/10 rounded-lg inline-flex items-center text-blue-950 text-xs font-medium"
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Original & Corrected Writings */}
      <div className="w-full px-4 pt-6 pb-6 bg-white flex flex-col justify-start items-center gap-6 mt-4">
        {/* Your Writing */}
        <div className="self-stretch flex flex-col justify-start items-start gap-3">
          <div className="w-full inline-flex justify-start items-start gap-4">
            <div className="flex-1 text-left text-sky-950 text-base font-semibold leading-5">
              Your Writing
            </div>
          </div>
          <div className="self-stretch p-3 bg-red-100/25 rounded-xl border border-red-500 flex flex-col justify-start items-start text-left min-h-[80px]">
            <div className="self-stretch text-black text-xs font-normal leading-5 break-words">
              {renderHighlights(data?.writingText, data?.writingFeedback?.mistake_highlights)}
            </div>
          </div>
        </div>

        {/* Corrected Version */}
        <div className="self-stretch flex flex-col justify-start items-start gap-3">
          <div className="w-full inline-flex justify-start items-start gap-4">
            <div className="flex-1 text-left text-sky-950 text-base font-semibold leading-5">
              Corrected Version
            </div>
          </div>
          <div className="self-stretch p-3 bg-emerald-100/10 rounded-xl border border-green-700 flex flex-col justify-start items-start text-left min-h-[80px]">
            <div className="self-stretch text-black text-xs font-normal leading-5 break-words">
              {data?.writingFeedback?.corrected_text}
            </div>
          </div>
        </div>
      </div>

      {/* Writing Feedback metrics */}
      <div className="self-stretch px-4 pb-6 mt-4">
        <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
          <div className="flex flex-col justify-start items-center gap-3">
            <div className="text-center text-sky-950 text-base font-semibold leading-5">
              Writing Feedback
            </div>
            <div className="text-center text-sky-950 text-3xl font-semibold leading-9">
              Good job 🚀
            </div>
          </div>

          <ScoreRing score={writingScore} label="overall writing accuracy" />

          <div className="w-full flex flex-col justify-start items-start gap-3">
            <MetricBar
              label="Grammar"
              score={data?.writingFeedback?.metrics?.grammar}
              variant="compact"
            />
            <MetricBar
              label="Vocabulary"
              score={data?.writingFeedback?.metrics?.vocabulary}
              variant="compact"
            />
            <MetricBar
              label="Sentence Structure"
              score={data?.writingFeedback?.metrics?.sentence_structure}
              variant="compact"
            />
            <MetricBar
              label="Spellings"
              score={data?.writingFeedback?.metrics?.spellings}
              variant="compact"
            />
          </div>
        </div>
      </div>

      {/* Recorded Speech audio player */}
      {data?.audioUrl && (
        <div className="w-full px-4 pt-4 pb-6 bg-white flex flex-col justify-start items-start gap-3 mt-4">
          <div className="w-full text-left text-sky-950 text-base font-semibold leading-5">
            Your Speech Recording
          </div>
          <AudioPlayer
            isPlaying={isPlayingBack}
            onPlayPause={onPlayPause}
            playbackTime={playbackTime}
            playbackDuration={playbackDuration}
            formatSeconds={formatSeconds}
            variant="review"
          />
        </div>
      )}

      {/* Speaking Feedback metrics card */}
      <div className="self-stretch px-4 pb-10 mt-4">
        <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
          <div className="flex flex-col justify-start items-center gap-3">
            <div className="text-center text-sky-950 text-base font-semibold leading-5">
              Speaking Feedback
            </div>
            <div className="text-center text-sky-950 text-3xl font-semibold leading-9">
              Good job 🚀
            </div>
          </div>

          <ScoreRing score={speakingScore} label="overall speaking accuracy" />

          <div className="w-full flex flex-col justify-start items-start gap-3">
            <MetricBar
              label="Pronunciation"
              score={data?.speakingFeedback?.overallScore}
              variant="compact"
            />
            <MetricBar
              label="Fluency"
              score={data?.speakingFeedback?.fluencyScore}
              variant="compact"
            />
            <MetricBar
              label="Accuracy"
              score={data?.speakingFeedback?.accuracyScore}
              variant="compact"
            />
            <MetricBar
              label="Completeness"
              score={data?.speakingFeedback?.completenessScore}
              variant="compact"
            />
          </div>

          {/* Qualitative pointers */}
          <div className="self-stretch flex flex-col justify-start items-start gap-3 w-full">
            {data?.speakingFeedback?.whatWentWell && (
              <div className="w-full p-3 bg-white rounded-xl border border-zinc-400 inline-flex justify-start items-start gap-2 text-left">
                <div className="w-4 h-4 shrink-0 relative overflow-hidden mt-0.5 text-green-700 font-bold flex items-center justify-center border border-green-700 rounded-full text-[10px]">
                  ✓
                </div>
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                  <span className="text-black text-xs font-semibold">
                    What went well
                  </span>
                  <p className="text-slate-600 text-xs leading-5 font-normal break-words">
                    {data.speakingFeedback.whatWentWell}
                  </p>
                </div>
              </div>
            )}

            {data?.speakingFeedback?.tryToImprove && (
              <div className="w-full p-3 bg-white rounded-xl border border-zinc-400 inline-flex justify-start items-start gap-2 text-left">
                <div className="w-4 h-4 shrink-0 relative overflow-hidden mt-0.5 text-red-500 font-bold flex items-center justify-center border border-red-500 rounded-full text-[10px]">
                  !
                </div>
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                  <span className="text-black text-xs font-semibold">
                    Try to improve
                  </span>
                  <p className="text-slate-600 text-xs leading-5 font-normal break-words">
                    {data.speakingFeedback.tryToImprove}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
