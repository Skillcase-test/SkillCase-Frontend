import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeWelcome } from "../../../api/jobScreeningApi";
import { Plane, Database, RefreshCw } from "lucide-react";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";

const WelcomeStep = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="w-full min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] sm:min-h-0 sm:max-w-md mx-auto rounded-none sm:rounded-3xl bg-gradient-to-b from-[#0b2545] to-[#134074] text-white p-6 sm:p-8 flex flex-col items-center justify-center text-center sm:shadow-2xl sm:border sm:border-[#1d4e89]/30 relative overflow-hidden font-sans">
      {/* Decorative ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl -z-10" />

      {/* Mascot Circle with Rotating Text */}
      <div className="relative mb-8 flex items-center justify-center">
        {/* Outer Circle with curved text */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#081f3d] flex items-center justify-center relative overflow-visible shadow-inner">
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ animation: "spin 25s linear infinite" }}
            viewBox="0 0 224 224"
          >
            <path id="topPath" d="M 22,112 A 90,90 0 0,1 202,112" fill="none" />
            <path
              id="bottomPath"
              d="M 202,112 A 90,90 0 0,1 22,112"
              fill="none"
            />

            <text
              className="fill-white font-bold text-[20px] uppercase tracking-wide"
              textAnchor="middle"
            >
              <textPath href="#topPath" startOffset="50%">
                OPEN TO WORK
              </textPath>
            </text>

            <text
              className="fill-white font-bold text-[20px] uppercase tracking-wide"
              textAnchor="middle"
            >
              <textPath href="#bottomPath" startOffset="50%">
                OPEN TO WORK
              </textPath>
            </text>

            <circle cx="22" cy="112" r="2.5" fill="white" />
            <circle cx="202" cy="112" r="2.5" fill="white" />
          </svg>

          {/* Inner Circle with Thumbs-up Mascot */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-b from-[#3b82f6] to-[#93c5fd] rounded-full overflow-hidden flex items-center justify-center shadow-md relative z-10">
            <img
              src={mayaThumbsup}
              alt="Mascot Thumbs Up"
              className="w-28 h-32 sm:w-36 sm:h-40 object-contain translate-y-2 select-none"
              draggable="false"
            />
          </div>
        </div>
      </div>

      {/* Header and Subtext */}
      <div className="text-center max-w-xs mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
          Welcome to Skillcase Jobs
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          You are just few steps away from getting placed in Germany
        </p>
      </div>

      {/* Benefits grid */}
      <div className="w-full flex items-center justify-center gap-4 py-5 mb-8">
        {/* Placement Support */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center text-white">
            <Plane className="w-7 h-7" />
          </div>
          <span className="text-white/70 text-xs font-medium max-w-[120px] leading-tight">
            German Placement Support
          </span>
        </div>

        {/* Divider line */}
        <div className="h-18 w-px bg-white/10" />

        {/* Recruiter Access */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center text-white">
            <Database className="w-7 h-7" />
          </div>
          <span className="text-white/70 text-xs font-medium max-w-[120px] leading-tight">
            Direct Recruiter Access
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-400 text-xs font-semibold mb-4">{error}</p>
      )}

      {/* CTA Buttons */}
      <div className="w-full flex flex-col gap-3 max-w-sm">
        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 text-[#002856] rounded-xl font-bold text-sm sm:text-base transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-md cursor-pointer border border-amber-300/80"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="animate-spin h-4 w-4 text-[#002856]" />
              Preparing your process...
            </span>
          ) : (
            <span>Start Job Process</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;
