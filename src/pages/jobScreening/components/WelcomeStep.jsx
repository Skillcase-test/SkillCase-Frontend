import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeWelcome, markStepNoteViewed } from "../../../api/jobScreeningApi";
import { Plane, Database, RefreshCw } from "lucide-react";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";
import { trackFlowAction } from "../../../telemetry/flow";
import RejectionNote from "../../../components/RejectionNote";

const WelcomeStep = ({ progress, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleStart = async () => {
    trackFlowAction("job_screening", "job_screening_funnel", "welcome_started", { step: "welcome", lifecycle: "started" });
    try {
      setLoading(true);
      setError("");
      const { data } = await completeWelcome();
      if (data?.success) {
        trackFlowAction("job_screening", "job_screening_funnel", "welcome_completed", { step: "welcome", lifecycle: "succeeded" });
        onComplete(data.data);
      } else {
        setError("Failed to continue to the next step");
      }
    } catch (err) {
      trackFlowAction("job_screening", "job_screening_funnel", "welcome_failed", { step: "welcome", lifecycle: "failed", reasonCode: "api_failed" });
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit welcome check");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    trackFlowAction("job_screening", "job_screening_funnel", "step_navigated", { step: "welcome", direction: "back" });
    navigate(-1);
  };

  return (
    <div className="w-full sm:max-w-md mx-auto rounded-none sm:rounded-3xl bg-transparent text-white pt-2 sm:pt-3 pb-4 px-4 sm:px-6 flex flex-col items-center justify-start text-center relative overflow-hidden">
      {/* Decorative ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl -z-10" />

      {/* Mascot Circle with Rotating Text */}
      <div className="relative mb-3 sm:mb-4 flex items-center justify-center">
        {/* Outer Circle with curved text */}
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#081f3d] flex items-center justify-center relative overflow-visible shadow-inner">
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
          <div className="w-26 h-26 sm:w-32 sm:h-32 bg-gradient-to-b from-[#3b82f6] to-[#93c5fd] rounded-full overflow-hidden flex items-center justify-center shadow-md relative z-10">
            <img
              src={mayaThumbsup}
              alt="Mascot Thumbs Up"
              className="w-24 h-28 sm:w-28 sm:h-32 object-contain translate-y-2 select-none"
              draggable="false"
            />
          </div>
        </div>
      </div>

      {/* Header and Subtext */}
      <div className="text-center max-w-xs mb-3 sm:mb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-2">
          Welcome to Skillcase Jobs
        </h2>
        <p className="text-white/70 text-xs sm:text-sm leading-relaxed">
          You are just few steps away from getting placed in Germany
        </p>
      </div>

      {progress?.step_notes?.welcome?.message && (
        <div className="w-full max-w-xs mb-4 text-left">
          <RejectionNote
            message={progress.step_notes.welcome.message}
            viewedAt={progress.step_notes.welcome.viewed_at}
            onView={() => markStepNoteViewed("welcome")}
          />
        </div>
      )}

      {/* Benefits grid */}
      <div className="w-full flex items-center justify-center gap-4 py-2 mb-4">
        {/* Placement Support */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 flex items-center justify-center text-white">
            <Plane className="w-6 h-6" />
          </div>
          <span className="text-white/70 text-[11px] sm:text-xs font-medium max-w-[120px] leading-tight">
            German Placement Support
          </span>
        </div>

        {/* Divider line */}
        <div className="h-12 w-px bg-white/10" />

        {/* Recruiter Access */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 flex items-center justify-center text-white">
            <Database className="w-6 h-6" />
          </div>
          <span className="text-white/70 text-[11px] sm:text-xs font-medium max-w-[120px] leading-tight">
            Direct Recruiter Access
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-400 text-xs font-semibold mb-3">{error}</p>
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
