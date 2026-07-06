import React from "react";
import { getScoreColor } from "../utils/scoreUtils";

/**
 * Reusable metric label + progress bar row.
 *
 * Props:
 *   label   - metric name string
 *   score   - numeric score (0–100)
 *   variant - "workspace" (default, h-3 bar, zinc-300 track)
 *             "compact"   (h-1.5 bar, zinc-200 track, used on success/review page)
 */
export default function MetricBar({ label, score, variant = "workspace" }) {
  const colorClasses = getScoreColor(score).split(" ");
  const textClass = colorClasses[0];
  const bgClass = colorClasses[1];
  const progress = Math.min(100, Math.max(0, Number(score || 0)));

  if (variant === "compact") {
    return (
      <div className="w-full flex flex-col justify-start items-start gap-1">
        <div className="w-full inline-flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">{label}</span>
          <span className={`font-semibold ${textClass}`}>{score}/100</span>
        </div>
        <div className="w-full h-1.5 relative bg-zinc-200 rounded-[42px] overflow-hidden">
          <div
            className={`h-full rounded-[31px] transition-all duration-500 ${bgClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="self-stretch flex flex-col justify-start items-start gap-1">
      <div className="self-stretch inline-flex justify-start items-start gap-1">
        <div className="flex-1 text-left text-black text-xs font-normal leading-6">
          {label}
        </div>
        <div className={`text-right text-xs font-normal leading-6 ${textClass}`}>
          {score}/100
        </div>
      </div>
      <div className="w-full h-3 relative bg-zinc-300 rounded-[42px] overflow-hidden">
        <div
          className={`h-full rounded-[31px] transition-all duration-500 ${bgClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
