import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileSearch,
  Check,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  getProgress,
  markInterviewRejectionViewed,
} from "../../../api/jobScreeningApi";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";
import { motion } from "framer-motion";
import { trackFlowAction } from "../../../telemetry/flow";
import RejectionNote from "../../../components/RejectionNote";

const ReviewPendingStep = ({ progress, onComplete, onBack }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const isCompleted = progress?.current_step_id !== "review_pending";

  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        onComplete(progress, true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, progress, onComplete]);

  useEffect(() => {
    let active = true;
    getProgress()
      .then(({ data }) => {
        if (!active) return;
        if (data?.success) {
          const hasStepChanged =
            data.data?.current_step_id !== "review_pending";
          trackFlowAction(
            "job_screening",
            "review_pending",
            "poll",
            "success",
            {
              poll_type: "automatic",
              state: hasStepChanged ? "changed" : "pending",
            },
          );
          if (hasStepChanged) {
            onComplete(data.data, false);
          }
        }
      })
      .catch((err) => {
        trackFlowAction("job_screening", "review_pending", "poll", "failed", {
          poll_type: "automatic",
        });
        console.error("Silent sync failed:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    trackFlowAction("job_screening", "review_pending", "refresh", "started", {
      poll_type: "manual",
    });
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success && onComplete) {
        trackFlowAction(
          "job_screening",
          "review_pending",
          "refresh",
          "success",
          {
            poll_type: "manual",
            state:
              data.data?.current_step_id === "review_pending"
                ? "pending"
                : "changed",
          },
        );
        onComplete(data.data, false);
      } else {
        trackFlowAction(
          "job_screening",
          "review_pending",
          "refresh",
          "failed",
          { poll_type: "manual" },
        );
        setError("Failed to sync progress.");
      }
    } catch (err) {
      trackFlowAction("job_screening", "review_pending", "refresh", "failed", {
        poll_type: "manual",
      });
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

  const handleMarkInterviewRejectionViewed = () => {
    markInterviewRejectionViewed().catch((err) =>
      console.error("Failed to mark interview rejection viewed:", err),
    );
  };

  if (isRejected) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative font-sans">
        {/* Sub-Header bar */}
        <div className="w-full flex items-center justify-between mb-4">
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
        <div className="w-full px-5 pt-10 pb-5 bg-gradient-to-b from-red-50 to-red-100/50 rounded-2xl border border-red-200/30 flex flex-col items-center gap-4">
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

          {progress?.interview_rejection_message && (
            <RejectionNote
              message={progress.interview_rejection_message}
              viewedAt={progress.interview_candidate_viewed_at}
              onView={handleMarkInterviewRejectionViewed}
            />
          )}

          {/* Call Support Action */}
          <a
            href="tel:+919731462667"
            className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer border-none"
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
      <div className="w-full flex items-center justify-between mb-4">
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
      <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-[#e0f2fe] to-[#f0f9ff] rounded-2xl border border-white/20 flex flex-col items-center gap-6">
        {/* Review Icon */}
        <div className="w-12 h-12 bg-[#002856] rounded-xl flex items-center justify-center text-white shrink-0">
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white border border-green-700 shadow-sm"
            >
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-6 h-6 stroke-[3.5] text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                />
              </motion.svg>
            </motion.div>
          ) : (
            <FileSearch className="w-6 h-6" />
          )}
        </div>

        {/* Heading */}
        <div className="text-center w-full">
          <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
            {isCompleted ? "Interview verified!" : "Interview under review"}
          </h2>
          <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[280px] mx-auto leading-relaxed">
            {isCompleted
              ? "Congratulations! Your video interview has been successfully verified."
              : "Great job! You have submitted your Skillcase video interview. Our screening panel is currently reviewing your audio, video, and language fluency responses."}
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
              <div className="w-[1.5px] bg-[#15803d] flex-1 my-1" />
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
              {isCompleted ? (
                <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 bg-[#002856] rounded-full flex items-center justify-center text-white shadow-sm">
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              )}
              <div
                className={`w-[1.5px] ${isCompleted ? "bg-[#15803d]" : "bg-slate-200"} flex-1 my-1`}
              />
            </div>
            <div className="pb-5 text-left flex-1 min-w-0 pr-2">
              <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                Review in progress
              </h4>
              <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                {isCompleted
                  ? "Our screening panel has completed the evaluation of your responses."
                  : "Our screening panel is currently reviewing your assessment responses."}
              </p>
            </div>
          </div>

          {/* Step 3: Interview verified (pending) */}
          <div className="flex gap-3.5 w-full items-stretch">
            <div className="flex flex-col items-center shrink-0">
              {isCompleted ? (
                <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 border-2 border-slate-300 rounded-full flex items-center justify-center bg-white" />
              )}
            </div>
            <div className="pb-5 text-left flex-1 min-w-0 pr-2">
              <h4
                className={`text-sm font-semibold leading-tight ${isCompleted ? "text-[#002856]" : "text-slate-400"}`}
              >
                Interview verified
              </h4>
              <p
                className={`text-[11px] sm:text-xs mt-1 leading-normal ${isCompleted ? "text-slate-500" : "text-slate-400"}`}
              >
                {isCompleted
                  ? "Your fluency score is finalized and visible to recruiter partners."
                  : "Your fluency score will be finalized and sent to recruiters."}
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
              {isCompleted ? "Verification complete" : "Please note"}
            </h5>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
              {isCompleted
                ? "Your interview verification is completed. Redirecting you shortly..."
                : "Typically takes around 24-48 hrs. You will be notified."}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

        {/* Refresh / Action Button */}
        {isCompleted ? (
          <button
            onClick={() => onComplete(progress, true)}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer border-none"
          >
            <span>Proceeding...</span>
          </button>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default ReviewPendingStep;
