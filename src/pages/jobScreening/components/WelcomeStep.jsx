import React, { useState } from "react";
import { completeWelcome } from "../../../api/jobScreeningApi";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import mayaWave from "../../../assets/onboarding/mayaWave.webp";

const WelcomeStep = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await completeWelcome();
      if (data?.success) {
        onComplete(data.data);
      } else {
        setError("Failed to continue to the next step");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit welcome check");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 overflow-hidden font-sans px-6 pb-3 sm:p-8 flex flex-col items-center justify-center text-center w-full">
      {/* Hero Mascot Row */}
      <div className="relative flex flex-col items-center">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-amber-100/30 rounded-full blur-2xl -z-10" />

        <img
          src={mayaWave}
          alt="Welcome"
          className="w-32 h-32 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-md select-none"
          draggable="false"
        />

        {/* Sparkle badge */}
        <div className="absolute bottom-1 -right-7 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-sm uppercase tracking-wider animate-bounce duration-1000">
          <Sparkles className="w-2.5 h-2.5 text-[#002856]" />
          <span>Welcome</span>
        </div>
      </div>

      {/* Main Header & Subtext */}
      <div className="text-center max-w-lg mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002856] tracking-tight leading-tight mb-3">
          Welcome to the Skillcase Job Screen
        </h2>
        <p className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Complete your screening steps to qualify for direct placement
          opportunities in Germany.
        </p>
      </div>

      {/* Trust Badges - (Excluding 100% Free Program) */}
      <div className="w-full flex items-center justify-center gap-6 mb-6 text-xs text-slate-400 font-bold border-t border-b border-slate-100 py-3">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          German Placement Support
        </span>
        <span className="h-4 w-px bg-slate-200" />
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#002856] shrink-0" />
          Direct Recruiter Access
        </span>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-500 text-xs font-semibold mb-4">{error}</p>
      )}

      {/* CTA Button */}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full sm:max-w-xs h-11 sm:h-12 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-amber-200/20 hover:shadow-lg hover:shadow-amber-200/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-[#002856]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Preparing Screening...
          </span>
        ) : (
          <>
            <span>Start Screening Pathway</span>
            <ArrowRight className="w-4 h-4 text-[#002856]" />
          </>
        )}
      </button>
    </div>
  );
};

export default WelcomeStep;
