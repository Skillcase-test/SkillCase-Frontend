import React from "react";

export default function FlashcardDeckSkeleton({ title = "Flashcards" }) {
  return (
    <div className="min-h-screen bg-white flex flex-col relative" aria-label="Loading flashcards">
      {/* Top Navbar */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between animate-pulse">
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Subheader */}
      <div className="bg-gradient-to-b from-[#edfaff] to-white px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2 animate-pulse">
          <div className="h-8 w-36 bg-slate-200 rounded" />
          <div className="h-5 w-12 bg-slate-200 rounded" />
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full animate-pulse" />
      </div>

      {/* 3D Card Skeleton */}
      <div className="flex items-center justify-center px-2 pt-10 pb-4">
        <div className="w-[320px] max-w-[90vw] h-[460px] bg-white rounded-[24px] shadow-xl border border-slate-100 p-6 flex flex-col items-center justify-between animate-pulse">
          <div className="w-full flex justify-between items-center">
            <div className="h-5 w-16 bg-slate-200 rounded-full" />
            <div className="h-5 w-8 bg-slate-100 rounded" />
          </div>

          <div className="flex flex-col items-center gap-3 w-full my-auto">
            <div className="h-8 w-44 bg-slate-200 rounded-lg" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="w-12 h-12 rounded-full bg-slate-200 mt-2" />
          </div>

          <div className="w-full flex justify-center">
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Bottom Actions Skeleton */}
      <div className="flex items-center justify-center gap-2 pb-8 z-10 w-full px-4 animate-pulse">
        <div className="w-12 h-10 bg-slate-100 rounded-lg" />
        <div className="w-24 h-10 bg-slate-100 rounded-lg" />
        <div className="w-20 h-10 bg-slate-100 rounded-lg" />
        <div className="w-12 h-10 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
