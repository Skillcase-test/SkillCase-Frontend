import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, PhoneCall, Star } from "lucide-react";
import api from "../../../../api/axios";

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

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const sendDiscordWebhook = async (val, text = "") => {
    setSubmitting(true);
    try {
      await api.post("/b1-maya/feedback", {
        rating: val,
        feedbackText: text,
        callDuration,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to send feedback to backend:", err);
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStarClick = (starVal) => {
    if (submitted) return;
    setRating(starVal);
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!rating) return;
    sendDiscordWebhook(rating, feedbackText);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden w-full">
      <div className="absolute top-[-10%] left-[-15%] w-[60%] aspect-square rounded-full bg-[#002856]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] aspect-square rounded-full bg-[#edb843]/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-md text-center animate-in zoom-in-95 duration-200">
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
          <div className="relative flex items-center justify-center w-32 h-32 my-1 bg-white rounded-full shadow-md border border-slate-100">
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

        {/* 5-Star Rating & Discord Feedback Card */}
        <div className="w-full bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-[#002856] uppercase tracking-wider">
            Rate Your Conversation
          </span>

          {/* Clickable 5 Stars (Persisted after submission) */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= (hoverRating || rating);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => !submitted && setHoverRating(star)}
                  onMouseLeave={() => !submitted && setHoverRating(0)}
                  disabled={submitted}
                  className={`p-1 transition-transform focus:outline-none ${
                    submitted
                      ? "cursor-default"
                      : "cursor-pointer hover:scale-110"
                  }`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      active
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 hover:text-amber-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {submitted ? (
            <div className="py-2 px-3 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg w-full mt-1">
              Thank you for your feedback!
            </div>
          ) : (
            /* Show optional feedback text area for any selected rating (1..5) */
            rating > 0 && (
              <form
                onSubmit={handleFeedbackSubmit}
                className="w-full flex flex-col gap-2 text-left animate-in fade-in duration-200 mt-1"
              >
                <label className="text-xs font-semibold text-slate-600">
                  Any additional feedback? (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Speech recognition accuracy or feature suggestions..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none transition-all leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#002856] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </form>
            )
          )}
        </div>

        {/* Action Buttons (Rendered ONLY when no active feedback form is open: rating === 0 or submitted === true) */}
        {(rating === 0 || submitted) && (
          <div className="flex flex-col gap-2.5 w-full mt-2 animate-in fade-in duration-200">
            <button
              onClick={() => navigate("/")}
              className="w-full py-3.5 rounded-lg text-white text-[15px] font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-[#002856]"
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
        )}
      </div>
    </div>
  );
}
