import React, { useState } from "react";
import { Hourglass, AlertCircle, RefreshCw } from "lucide-react";
import { getProgress } from "../../../api/jobScreeningApi";

const ReviewPendingStep = ({ progress, onComplete }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success && onComplete) {
        onComplete(data.data);
      } else {
        setError("Failed to sync progress.");
      }
    } catch (err) {
      console.error("Error refreshing progress:", err);
      setError(
        err.response?.data?.message || "An error occurred while syncing progress."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const isRejected = progress?.interview_review_status === "rejected";

  if (isRejected) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-5">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-red-600 tracking-tight mb-2">Interview Review Failed</h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-4">
          Unfortunately, your Skillcase video interview did not pass our review. We are here to support your growth. Reach out to Skillcase support at +919731462667 to receive detailed feedback and guidance on next steps.
        </p>
        <a
          href="tel:+919731462667"
          className="mb-6 w-full sm:max-w-xs h-11 bg-[#002856] text-white hover:bg-[#003975] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
        >
          Call Skillcase Support
        </a>
        {error && (
          <div className="w-full sm:max-w-xs flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 mb-4 text-left">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:max-w-xs h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
      <div className="w-14 h-14 rounded-full bg-blue-50/50 flex items-center justify-center text-[#002856] mx-auto mb-5 animate-pulse">
        <Hourglass className="w-7 h-7" />
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">Interview Under Review</h2>
      <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-4">
        Great job! You have submitted your Skillcase video interview. Our screening panel is currently reviewing
        your audio, video, and language fluency responses.
      </p>
      <p className="text-zinc-400 text-[11px] leading-relaxed mb-6">
        This process typically takes 24 to 48 hours. We will notify you on this page once the review is completed.
      </p>
      {error && (
        <div className="w-full sm:max-w-xs flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 mb-4 text-left">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="w-full sm:max-w-xs h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        Refresh Status
      </button>
    </div>
  );
};

export default ReviewPendingStep;
