import React, { useState } from "react";
import {
  ArrowLeft,
  FileSearch,
  Check,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { getProgress } from "../../../api/jobScreeningApi";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";

const ReviewPendingStep = ({ progress, onComplete, onBack }) => {
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
        err.response?.data?.message ||
          "An error occurred while syncing progress.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const isRejected = progress?.interview_review_status === "rejected";

  if (isRejected) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative font-sans">
        {/* Sub-Header bar */}
        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-slate-400 text-sm font-semibold">
            Job Progress
          </span>
        </div>

        {/* Red Rejected Card block */}
        <div className="w-full px-5 pt-10 pb-5 bg-gradient-to-b from-red-50 to-red-100/50 rounded-2xl border border-red-200/30 flex flex-col items-center gap-6">
          {/* Rejected Icon */}
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>

          {/* Heading */}
          <div className="text-center w-full">
            <h2 className="text-red-700 text-2xl font-bold tracking-tight">
              Interview review failed
            </h2>
            <p className="text-red-700/80 text-xs sm:text-sm font-medium mt-2 max-w-[280px] mx-auto leading-relaxed">
              Unfortunately, your Skillcase video interview did not pass our
              review. We are here to support your growth. Reach out to Skillcase
              support to receive detailed feedback and guidance on next steps.
            </p>
          </div>

          {/* Call Support Action */}
          <a
            href="tel:+919731462667"
            className="w-full h-12 bg-[#002856] text-white hover:bg-[#003975] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
          >
            Call Skillcase Support
          </a>

          {error && (
            <div className="w-full flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 text-left">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Refresh Status Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-[#002856] rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {refreshing ? (
              <>
                <RefreshCw className="animate-spin w-4 h-4 text-[#002856]" />
                <span>Syncing status...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-[#002856]" />
                <span>Refresh status</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative font-sans">
      {/* Sub-Header bar */}
      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-slate-400 text-sm font-semibold">
          Job Progress
        </span>
      </div>

      {/* Blue Review Card block */}
      <div className="w-full px-5 pt-10 pb-5 bg-gradient-to-b from-[#e0f2fe] to-[#f0f9ff] rounded-2xl border border-white/20 flex flex-col items-center gap-6">
        {/* Review Icon */}
        <div className="w-12 h-12 bg-[#002856] rounded-xl flex items-center justify-center text-white shrink-0">
          <FileSearch className="w-6 h-6" />
        </div>

        {/* Heading */}
        <div className="text-center w-full">
          <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
            Interview under review
          </h2>
          <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[280px] mx-auto leading-relaxed">
            Great job! You have submitted your Skillcase video interview. Our
            screening panel is currently reviewing your audio, video, and
            language fluency responses.
          </p>
        </div>

        {/* Timeline checklist */}
        <div className="w-full flex flex-col pl-4 mt-2">
          {/* Step 1: Interview submitted (done) */}
          <div className="flex gap-3.5 w-full items-stretch">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="w-[1.5px] bg-[#002856]/20 flex-1 my-1" />
            </div>
            <div className="pb-5 text-left flex-1 min-w-0 pr-2">
              <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                Interview submitted
              </h4>
              <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                Your Skillcase video interview has been successfully submitted.
              </p>
            </div>
          </div>

          {/* Step 2: Review in progress (active) */}
          <div className="flex gap-3.5 w-full items-stretch">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 bg-[#002856] rounded-full flex items-center justify-center text-white shadow-sm">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <div className="w-[1.5px] bg-slate-200 flex-1 my-1" />
            </div>
            <div className="pb-5 text-left flex-1 min-w-0 pr-2">
              <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                Review in progress
              </h4>
              <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                Our screening panel is currently reviewing your assessment
                responses.
              </p>
            </div>
          </div>

          {/* Step 3: Interview verified (pending) */}
          <div className="flex gap-3.5 w-full items-stretch">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-6 h-6 border-2 border-slate-300 rounded-full flex items-center justify-center bg-white" />
            </div>
            <div className="pb-5 text-left flex-1 min-w-0 pr-2">
              <h4 className="text-slate-400 text-sm font-semibold leading-tight">
                Interview verified
              </h4>
              <p className="text-slate-400 text-[11px] sm:text-xs mt-1 leading-normal">
                Your fluency score will be finalized and sent to recruiters.
              </p>
            </div>
          </div>
        </div>

        {/* Please note card */}
        <div className="w-full bg-gradient-to-r from-[#e0f2fe] to-[#c3e7ff] rounded-2xl border border-blue-200 flex items-center gap-3.5 shadow-sm text-left overflow-hidden">
          <img
            src={mayaShocked}
            alt="Mascot Alert"
            className="w-20 h-20 object-contain shrink-0 select-none"
            draggable="false"
          />
          <div className="min-w-0 flex-1 pr-4 py-3">
            <h5 className="text-[#002856] text-xs sm:text-sm font-bold">
              Please note
            </h5>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
              Typically takes around 24-48 hrs. You will be notified on WhatsApp
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

        {/* Refresh / Action Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-[#002856] rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {refreshing ? (
            <>
              <RefreshCw className="animate-spin w-4 h-4 text-[#002856]" />
              <span>Syncing status...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-[#002856]" />
              <span>Refresh status</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReviewPendingStep;
