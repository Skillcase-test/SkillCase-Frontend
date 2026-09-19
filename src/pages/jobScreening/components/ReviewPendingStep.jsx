import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileSearch,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  getProgress,
  markInterviewRejectionViewed,
  markStepNoteViewed,
} from "../../../api/jobScreeningApi";
import { motion } from "framer-motion";
import { trackFlowAction } from "../../../telemetry/flow";
import RejectionNote from "../../../components/RejectionNote";
import ReferralPromoCard from "./ReferralPromoCard";
import LowScoreCoursePrompt from "./LowScoreCoursePrompt";
import CourseOptedIn from "./CourseOptedIn";

const ReviewPendingStep = ({ progress, onComplete, onBack }) => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const isCompleted = progress?.current_step_id !== "review_pending";
  const courseOptedIn = Boolean(progress?.course_optin_at);
  const referralRewarded = Boolean(progress?.priority_review_at);
  const referralCompletedCount =
    progress?.referral?.stats?.completed || (referralRewarded ? 1 : 0);

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
          // A rejected candidate can be un-reviewed without leaving the step —
          // the status flip alone must refresh what they see.
          const hasStatusChanged =
            data.data?.interview_review_status !==
            progress?.interview_review_status;
          trackFlowAction(
            "job_screening",
            "review_pending",
            "poll",
            "success",
            {
              poll_type: "automatic",
              state:
                hasStepChanged || hasStatusChanged ? "changed" : "pending",
            },
          );
          if (hasStepChanged || hasStatusChanged) {
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
    // Opted-in candidates see the thank-you screen on every revisit.
    if (courseOptedIn) {
      return <CourseOptedIn onDone={onBack} onBack={onBack} />;
    }
    return (
      <div className="w-full">
        {/* Sub-header lives here so admin notes don't push it mid-page */}
        <div className="w-full flex items-center justify-between mb-4">
          <button
            type="button"
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

        {progress?.interview_rejection_message && (
          <div className="w-full mb-4 text-left">
            <RejectionNote
              message={progress.interview_rejection_message}
              viewedAt={progress.interview_candidate_viewed_at}
              onView={handleMarkInterviewRejectionViewed}
            />
          </div>
        )}

        {progress?.step_notes?.review_pending?.message && (
          <div className="w-full mb-4 text-left">
            <RejectionNote
              message={progress.step_notes.review_pending.message}
              viewedAt={progress.step_notes.review_pending.viewed_at}
              onView={() => markStepNoteViewed("review_pending")}
            />
          </div>
        )}

        <LowScoreCoursePrompt
          onBack={onBack}
          onExplore={() => navigate("/job-screening/course")}
          weakness={progress?.interview_overall_weakness}
          hideHeader
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </div>
    );
  }

  if (referralRewarded && !isCompleted) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative">
        {/* Header bar matching Figma */}
        <div className="w-full flex items-center justify-start gap-3 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            aria-label="Back to Job Progress"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-[#002856] text-base font-semibold">
            Referral
          </span>
        </div>

        {progress?.step_notes?.review_pending?.message && (
          <div className="w-full mb-4 text-left">
            <RejectionNote
              message={progress.step_notes.review_pending.message}
              viewedAt={progress.step_notes.review_pending.viewed_at}
              onView={() => markStepNoteViewed("review_pending")}
            />
          </div>
        )}

        {/* Rewarded Amber Container */}
        <div className="w-full px-5 py-7 bg-[#FDF4DE] rounded-3xl border border-[#F3E2B8] flex flex-col items-center gap-4">
          {/* Rocket Hero with Check Overlay */}
          <div className="relative flex items-center justify-center pt-2 pb-1">
            <img
              src="/rocket.webp"
              alt=""
              aria-hidden="true"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain select-none pointer-events-none drop-shadow-xs rotate-20"
              draggable="false"
            />
            <div className="absolute top-0 left-1/2 -translate-x-8 w-7 h-7 bg-[#15803d] rounded-full flex items-center justify-center text-white border-2 border-white shadow-xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center w-full">
            <h2 className="text-slate-900 text-2xl sm:text-3xl font-bold tracking-tight">
              Queue Skipped!
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-normal mt-1.5 max-w-[280px] mx-auto leading-relaxed">
              Amazing! You have now unlocked priority tracking for your profile.
            </p>
          </div>

          {/* Inner Card Box */}
          <div className="w-full bg-[#FFFDF8]/90 backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-amber-200/50 flex flex-col gap-3 text-left mt-1 shadow-2xs">
            <h3 className="text-slate-900 text-sm sm:text-base font-bold">
              Your profile is now in priority review
            </h3>
            <div className="flex flex-col gap-2.5 mt-1">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 bg-[#15803d] rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-xs sm:text-sm font-medium leading-snug">
                  Your video interview jumped to the front of the review queue
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 bg-[#15803d] rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-xs sm:text-sm font-medium leading-snug">
                  Reviewer assigned for priority evaluation
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 bg-[#15803d] rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="text-slate-700 text-xs sm:text-sm font-medium leading-snug">
                  Results and recruiter matching processed 10x faster
                </span>
              </div>
            </div>
          </div>

          {/* Error Message if any */}
          {error && (
            <p className="text-red-500 text-xs font-semibold">{error}</p>
          )}

          {/* Action CTA */}
          <button
            type="button"
            onClick={onBack}
            className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm cursor-pointer border-none flex items-center justify-center mt-2"
          >
            Continue to Job Progress
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative ">
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

      {progress?.step_notes?.review_pending?.message && (
        <div className="w-full mb-4 text-left">
          <RejectionNote
            message={progress.step_notes.review_pending.message}
            viewedAt={progress.step_notes.review_pending.viewed_at}
            onView={() => markStepNoteViewed("review_pending")}
          />
        </div>
      )}

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

        {/* Referral fast-forward card — only while genuinely still waiting */}
        {!isCompleted && (
          <ReferralPromoCard
            rewarded={referralRewarded}
            completedCount={referralCompletedCount}
            onRefer={() => navigate("/job-screening/refer")}
          />
        )}

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
