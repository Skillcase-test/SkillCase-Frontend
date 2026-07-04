import React from "react";
import { getScoreStrokeColor } from "../utils/scoreUtils";

/**
 * Reusable SVG circular progress ring.
 *
 * Props:
 *   score       - numeric score (0–100)
 *   label       - text below the percentage, e.g. "overall writing accuracy"
 *   circleSize  - diameter in px (default 160)
 *   strokeWidth - ring stroke width in px (default 12)
 */
export default function ScoreRing({
  score,
  label,
  circleSize = 160,
  strokeWidth = 12,
}) {
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (Number(score || 0) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg
        width={circleSize}
        height={circleSize}
        className="transform -rotate-90"
      >
        <circle
          stroke="#D4D4D8"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={circleSize / 2}
          cy={circleSize / 2}
        />
        <circle
          stroke={getScoreStrokeColor(score)}
          fill="transparent"
          strokeWidth={strokeWidth}
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
        <span className="text-sky-950 text-3xl font-semibold font-['Inter'] leading-9">
          {score}%
        </span>
        <span className="w-20 text-center text-sky-950 text-[8px] font-semibold font-['Inter'] leading-normal">
          {label}
        </span>
      </div>
    </div>
  );
}
