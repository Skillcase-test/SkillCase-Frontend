import React from "react";
import { Star } from "lucide-react";

export default function PlayStoreRatingModal({ open, onRateNow, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[360px] bg-white rounded-[1.75rem] p-6 shadow-2xl text-center animate-in zoom-in-95 fade-in duration-300">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
        </div>

        <h2 className="text-xl font-black text-slate-800 mb-2">
          Enjoying SkillCase?
        </h2>

        <p className="text-sm text-slate-500 mb-5">
          Your 7 day streak is awesome. Please support us with a 5 star rating
          on Play Store.
        </p>

        <div className="flex items-center justify-center gap-1 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRateNow}
            className="w-full py-3 rounded-full font-bold text-white bg-[#002856] hover:bg-[#003a70] active:scale-95 transition-all"
          >
            Give 5 Stars
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
