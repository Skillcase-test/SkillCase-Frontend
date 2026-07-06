import React from "react";
import { Mic, Square } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { hapticMedium } from "../../../../utils/haptics";

export default function SpeakingStage({
  writingFeedback,
  isRecording,
  recordDuration,
  topic,
  audioBlob,
  isPlayingBack,
  playbackTime,
  playbackDuration,
  onToggleRecord,
  onPlayPause,
  formatSeconds,
}) {
  return (
    <div className="w-full space-y-8">
      {/* Reference text card */}
      <div className="self-stretch px-4 flex flex-col justify-start items-start gap-3">
        <h2 className="text-sky-950 text-sm font-semibold leading-5 text-left">
          Read the correct text aloud
        </h2>
        <div className="w-full p-3 bg-emerald-100/10 rounded-xl border border-green-700 text-left min-h-[100px] shadow-sm">
          <p className="text-black text-xs font-normal leading-5 break-words">
            {writingFeedback?.corrected_text}
          </p>
        </div>
      </div>

      {/* Mic interface & timer */}
      <div className="w-full flex flex-col items-center justify-center gap-5 pt-4">
        <button
          id="b1-describe-speak-mic-btn"
          type="button"
          onClick={() => {
            hapticMedium();
            onToggleRecord();
          }}
          disabled={isPlayingBack}
          className={`w-32 h-32 rounded-full flex items-center justify-center shadow-md transition-all border-0 outline-none cursor-pointer select-none ${
            isRecording
              ? "bg-red-500/10 hover:bg-red-500/20 active:scale-95 animate-pulse"
              : isPlayingBack
              ? "bg-zinc-100 opacity-50 cursor-not-allowed"
              : "bg-blue-600/10 hover:bg-blue-600/20 active:scale-95"
          }`}
        >
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center select-none ${
              isRecording ? "bg-red-500/20" : "bg-blue-600/20"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center select-none ${
                isRecording ? "bg-red-600" : "bg-sky-950"
              }`}
            >
              {isRecording ? (
                <Square className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
        </button>

        <div className="flex flex-col items-center gap-1.5 select-none">
          <span className="text-sky-950 text-sm font-bold">
            {isRecording ? "Recording... Tap to stop" : "Tap to start recording"}
          </span>
          <span className="text-sky-950 text-xs font-semibold">
            {formatSeconds(recordDuration)} / {topic?.time_limit || "01:00"}
          </span>
        </div>

        {/* Waveform visualizer */}
        {isRecording && (
          <div className="h-6 flex items-center justify-center gap-0.5 mt-2 select-none">
            <div className="w-1 h-3 bg-red-500 rounded-full animate-[pulse_0.4s_infinite]" />
            <div className="w-1 h-5 bg-red-500 rounded-full animate-[pulse_0.5s_infinite_0.1s]" />
            <div className="w-1 h-4 bg-red-500 rounded-full animate-[pulse_0.4s_infinite_0.2s]" />
            <div className="w-1 h-6 bg-red-500 rounded-full animate-[pulse_0.6s_infinite_0.1s]" />
            <div className="w-1 h-3 bg-red-500 rounded-full animate-[pulse_0.3s_infinite_0.3s]" />
          </div>
        )}
      </div>

      {/* Custom playbar for recorded audio */}
      {audioBlob && !isRecording && (
        <div className="self-stretch px-4">
          <AudioPlayer
            isPlaying={isPlayingBack}
            onPlayPause={onPlayPause}
            playbackTime={playbackTime}
            playbackDuration={playbackDuration}
            formatSeconds={formatSeconds}
            variant="workspace"
          />
        </div>
      )}
    </div>
  );
}
