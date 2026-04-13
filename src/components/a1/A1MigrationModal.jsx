import React, { useEffect, useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";

export default function A1MigrationModal({
  open,
  onClose,
  onOptIn,
  onLegacyContinue,
  gracePeriodMonths = 2,
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("choice"); // choice | confirm_switch | confirm_legacy
  const [isVisible, setIsVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setStep("choice");
      setTimeout(() => setAnimate(true), 10);
    } else {
      setAnimate(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [open]);

  if (!isVisible && !open) return null;

  const onConfirmSwitch = async () => {
    setLoading(true);
    try {
      await onOptIn?.();
      onClose?.();
    } catch (err) {
      console.error("Failed to save migration decision:", err);
    } finally {
      setLoading(false);
    }
  };

  const onContinueLegacy = async () => {
    setLoading(true);
    try {
      await onLegacyContinue?.();
      onClose?.();
    } catch (err) {
      console.error("Failed to save migration decision:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Main Card */}
      <div
        className={`relative w-full max-w-[360px] bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center transform transition-all duration-500 ${
          animate
            ? "scale-100 translate-y-0 opacity-100"
            : "scale-90 translate-y-12 opacity-0"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Top Left Red Burst - Only show on warnings */}
        {step !== "choice" && (
          <div className="absolute top-8 left-8 transition-opacity duration-300 opacity-100">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              className="animate-[spin_3s_linear_infinite]"
            >
              {[...Array(8)].map((_, i) => (
                <rect
                  key={i}
                  x="18"
                  y="0"
                  width="4"
                  height="10"
                  rx="2"
                  fill="#FF6B6B"
                  transform={`rotate(${i * 45} 20 20)`}
                  opacity="0.5"
                />
              ))}
            </svg>
          </div>
        )}

        {/* Floating Shapes */}
        <div className="absolute top-12 right-10 w-3 h-3 bg-yellow-400 rounded-full animate-bounce delay-100 opacity-70" />
        <div className="absolute bottom-32 left-6 w-4 h-4 bg-purple-400 rotate-45 animate-pulse opacity-70" />
        <div className="absolute top-24 right-4 w-3 h-3 bg-red-400 rounded-sm rotate-12 animate-bounce delay-700 opacity-70" />
        <div className="absolute bottom-40 right-8 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-500 opacity-70" />

        {/* Central Badge */}
        <div className="relative mt-4 mb-6">
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 flex justify-center items-end">
            <div
              className={`w-8 h-16 ${step === "choice" ? "bg-blue-500" : "bg-red-500"} -rotate-[25deg] translate-x-3 rounded-b-lg transition-colors duration-300`}
            />
            <div
              className={`w-8 h-16 ${step === "choice" ? "bg-blue-600" : "bg-red-600"} rotate-[25deg] -translate-x-3 rounded-b-lg transition-colors duration-300`}
            />
          </div>

          <div
            className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${step === "choice" ? "bg-blue-100" : "bg-red-100"} animate-[wiggle_1s_ease-in-out_infinite]`}
          >
            <div
              className={`absolute inset-0 border-[6px] rounded-full border-dashed animate-[spin_10s_linear_infinite] transition-colors duration-300 ${step === "choice" ? "border-blue-300" : "border-red-300"}`}
            />

            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-inner transition-colors duration-300 ${step === "choice" ? "bg-blue-500" : "bg-red-500"}`}
            >
              <div className="relative">
                {step === "choice" ? (
                  <Sparkles className="w-10 h-10 text-white drop-shadow-md" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-white drop-shadow-md" />
                )}
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-2 leading-tight">
          {step === "choice" && "A1 is now revamped!"}
          {step === "confirm_switch" && "Are you sure?"}
          {step === "confirm_legacy" && "Think carefully!"}
        </h2>

        <p className="text-slate-500 text-sm font-medium px-2 mb-8 h-16">
          {step === "choice" &&
            "We have improved grammar, reading, and tests. Choose how you want to continue below."}
          {step === "confirm_switch" &&
            "Your old A1 progress will NOT carry over. You will start fresh in the new, improved A1."}
          {step === "confirm_legacy" &&
            `Old A1 will be completely removed after ${gracePeriodMonths} month${gracePeriodMonths > 1 ? "s" : ""}. We highly recommend switching now.`}
        </p>

        {step === "choice" ? (
          <div className="w-full flex flex-col gap-3">
            <button
              disabled={loading}
              onClick={() => setStep("confirm_switch")}
              className="w-full py-3.5 rounded-full font-bold text-white text-base shadow-lg shadow-blue-900/40 bg-[#002856] hover:bg-[#003d83] active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              Switch to New A1
            </button>
            <button
              disabled={loading}
              onClick={() => setStep("confirm_legacy")}
              className="w-full py-3.5 rounded-full font-bold text-slate-600 text-base border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              Continue Old A1
            </button>
          </div>
        ) : step === "confirm_switch" ? (
          <div className="w-full flex flex-col gap-3">
            <button
              disabled={loading}
              onClick={onConfirmSwitch}
              className="w-full py-3.5 rounded-full font-bold text-white text-base shadow-lg shadow-green-900/40 bg-[#019035] hover:bg-[#017a2c] active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              Yes, switch me now!
            </button>
            <button
              disabled={loading}
              onClick={() => setStep("choice")}
              className="w-full py-3.5 rounded-full font-bold text-slate-600 text-base border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3">
            <button
              disabled={loading}
              onClick={onContinueLegacy}
              className="w-full py-3.5 rounded-full font-bold text-white text-base shadow-lg shadow-red-900/40 bg-red-600 hover:bg-red-700 active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              Yes, continue Old A1
            </button>
            <button
              disabled={loading}
              onClick={() => setStep("choice")}
              className="w-full py-3.5 rounded-full font-bold text-slate-600 text-base border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              Go Back
            </button>
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
