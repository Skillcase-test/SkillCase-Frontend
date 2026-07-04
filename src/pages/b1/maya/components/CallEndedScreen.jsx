import React from "react";
import { useNavigate } from "react-router-dom";
import { Award, PhoneCall } from "lucide-react";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CallEndedScreen({
  callDuration,
  chatHistory,
  sessionReport,
}) {
  const navigate = useNavigate();

  const gradedTurns = chatHistory.filter((m) => m.role === "user" && m.grading);
  const averageScore =
    gradedTurns.length > 0
      ? Math.round(
          gradedTurns.reduce((s, m) => s + m.grading.accuracyScore, 0) /
            gradedTurns.length,
        )
      : 0;

  const score = sessionReport?.averagePronunciation || averageScore;
  const radius = 50;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden w-full">
      <div className="absolute top-[-10%] left-[-15%] w-[60%] aspect-square rounded-full bg-[#002856]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] aspect-square rounded-full bg-[#edb843]/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center shadow-lg border border-slate-100 text-[#002856]">
          <Award size={32} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-[#002856] tracking-tight mb-1">
            German Practice Done!
          </h2>
          <p className="text-slate-400 text-sm font-semibold">
            Thanks for practicing with Maya.
          </p>
        </div>

        {score > 0 && (
          <div className="relative flex items-center justify-center w-32 h-32 my-2 bg-white rounded-full shadow-md border border-slate-100">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                className="text-slate-100"
                strokeWidth={stroke}
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx={50}
                cy={50}
              />
              <circle
                className={`transition-all duration-1000 ease-out ${
                  score >= 85
                    ? "text-emerald-500"
                    : score >= 60
                    ? "text-amber-500"
                    : "text-rose-500"
                }`}
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx={50}
                cy={50}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-[#002856]">
                {score}%
              </span>
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">
                Accuracy
              </span>
            </div>
          </div>
        )}

        <div className="w-full bg-white border border-slate-200/50 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">Duration</span>
            <span className="font-mono font-bold text-[#002856]">
              {formatDuration(callDuration)}
            </span>
          </div>

          <div className="border-t border-[#efefef] my-2"></div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">Total Turns</span>
            <span className="font-bold text-[#002856]">
              {gradedTurns.length} spoken
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 w-full mt-4">
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-lg text-white text-[15px] font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer  bg-[#002856]"
          >
            Go to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-lg text-[#002856] text-[14px] font-semibold bg-white border border-slate-300 hover:bg-[#f0f4f8] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <PhoneCall size={14} fill="#002856" color="#002856" /> Call Again
          </button>
        </div>
      </div>
    </div>
  );
}
