import React from "react";
import { Play, Pause } from "lucide-react";

/**
 * Reusable audio playback bar.
 *
 * Props:
 *   isPlaying        - boolean
 *   onPlayPause      - handler
 *   playbackTime     - current position in seconds
 *   playbackDuration - total duration in seconds
 *   formatSeconds    - formatting function from timeUtils
 *   variant          - "workspace" (default) amber bar, w-10 button, timestamp after bar
 *                      "review"              blue bar,  w-9  button, timestamp inline with label
 */
export default function AudioPlayer({
  isPlaying,
  onPlayPause,
  playbackTime,
  playbackDuration,
  formatSeconds,
  variant = "workspace",
}) {
  const progress = (playbackTime / (playbackDuration || 1)) * 100;

  if (variant === "review") {
    return (
      <div className="self-stretch p-3 rounded-lg border border-black/20 inline-flex justify-start items-center gap-3">
        <button
          type="button"
          onClick={onPlayPause}
          className="w-12 h-12 bg-slate-200 hover:bg-slate-500 rounded-md flex items-center justify-center shrink-0 border-0 cursor-pointer active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-blue-950" />
          ) : (
            <Play className="w-4 h-4 fill-blue-950" />
          )}
        </button>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex justify-between items-center text-left text-black text-sm font-normal">
            <span>Recorded audio</span>
            <span className="text-black/30 text-sm font-normal">
              {formatSeconds(Math.round(playbackTime))} /{" "}
              {formatSeconds(Math.round(playbackDuration))}
            </span>
          </div>
          <div className="w-full flex items-center gap-2">
            <div className="flex-1 h-3 relative bg-zinc-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-3 bg-white border border-zinc-200 rounded-xl flex items-center gap-3.5">
      <button
        type="button"
        onClick={onPlayPause}
        className="w-12 h-12 bg-slate-200 hover:bg-slate-500 rounded-md flex items-center justify-center shrink-0 border-0 cursor-pointer active:scale-95 transition-all"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-blue-950" />
        ) : (
          <Play className="w-4 h-4 fill-blue-950" />
        )}
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-left text-slate-800 text-sm font-bold">
            Recorded Audio
          </span>
          <span className="text-right text-[13px] font-medium text-slate-400 select-none">
            {formatSeconds(Math.round(playbackTime))} /{" "}
            {formatSeconds(Math.round(playbackDuration))}
          </span>
        </div>
        <div className="w-full flex items-center gap-2">
          <div className="flex-1 h-3 relative bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
