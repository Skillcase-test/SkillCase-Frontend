import React from "react";

export default function ExerciseLayoutSkeleton({
  variant = "grammar",
  title = "Exercise",
}) {
  return (
    <div
      className="min-h-screen bg-white flex flex-col relative"
      aria-label={`Loading ${variant} exercise`}
    >
      {/* Top Navigation Bar */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between animate-pulse">
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Exercise Subheader */}
      <div className="bg-gradient-to-b from-[#edfaff] to-white px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2 animate-pulse">
          <div className="h-7 w-32 bg-slate-200 rounded" />
          <div className="h-5 w-12 bg-slate-200 rounded" />
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full animate-pulse" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Listening Variant: Waveform / Audio Player Skeleton */}
        {variant === "listening" && (
          <div className="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between animate-pulse">
            <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 ml-4 flex flex-col gap-2">
              <div className="w-full h-3 bg-slate-200 rounded-full" />
              <div className="w-2/3 h-2.5 bg-slate-100 rounded-full" />
            </div>
          </div>
        )}

        {/* Reading Variant: Reading Passage Skeleton */}
        {variant === "reading" && (
          <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col gap-2.5 animate-pulse">
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3.5 w-full bg-slate-100 rounded" />
            <div className="h-3.5 w-full bg-slate-100 rounded" />
            <div className="h-3.5 w-4/5 bg-slate-100 rounded" />
          </div>
        )}

        {/* Question Prompt Card */}
        <div className="w-full bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-6 w-5/6 bg-slate-200 rounded-lg" />
        </div>

        {/* Answer Options List */}
        <div className="flex flex-col gap-3 w-full animate-pulse">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="w-full h-14 bg-slate-50 border border-slate-200/70 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="h-4 w-2/3 bg-slate-200 rounded" />
              <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
            </div>
          ))}
        </div>

        {/* Submit Action Button Skeleton */}
        <div className="mt-auto pt-4 animate-pulse">
          <div className="w-full h-12 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
