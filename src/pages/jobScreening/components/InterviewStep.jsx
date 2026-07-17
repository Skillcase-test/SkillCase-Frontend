import React, { useState, useEffect } from "react";
import { RefreshCw, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getProgress } from "../../../api/jobScreeningApi";
import FillDetailsStep from "./FillDetailsStep";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";
import { trackFlowAction } from "../../../telemetry/flow";

const InterviewStep = ({ progress, onComplete, onBack }) => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const interviewStep = progress?.steps_config?.find(
    (s) => s.id === "interview_attempt"
  );
  const isInterviewCompleted = interviewStep?.status === "completed";

  useEffect(() => {
    if (
      !isInterviewCompleted &&
      progress?.assigned_interview_slug &&
      progress?.candidate_email &&
      !window.location.pathname.includes(progress.assigned_interview_slug)
    ) {
      navigate(`/job-screening/interview/${progress.assigned_interview_slug}`, {
        replace: true,
        state: {
          name: progress.candidate_name,
          email: progress.candidate_email,
          phone: progress.candidate_phone,
        },
      });
      trackFlowAction("job_screening", "interview_attempt", "redirected", "success", {
        state: "assigned",
      });
    }
  }, [progress, navigate, isInterviewCompleted]);

  if (isInterviewCompleted) {
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
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white border border-green-700 shadow-sm shrink-0">
            <Check className="w-6 h-6 stroke-[3.5]" />
          </div>

          {/* Heading */}
          <div className="text-center w-full">
            <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
              Interview completed!
            </h2>
            <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[285px] mx-auto leading-relaxed">
              Your interview assessment has been successfully submitted and is under evaluation.
            </p>
          </div>

          {/* Timeline checklist */}
          <div className="w-full flex flex-col pl-4 mt-2">
            {/* Step 1: Interview Submitted (done) */}
            <div className="flex gap-3.5 w-full items-stretch">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div className="w-[1.5px] bg-[#002856]/20 flex-1 my-1" />
              </div>
              <div className="pb-5 text-left flex-1 min-w-0 pr-2">
                <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                  Interview Submitted
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                  Your video and voice answers have been uploaded to our servers.
                </p>
              </div>
            </div>

            {/* Step 2: Evaluation Pending (pending) */}
            <div className="flex gap-3.5 w-full items-stretch">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-6 h-6 bg-blue-950 rounded-full flex items-center justify-center text-white shadow-sm">
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              </div>
              <div className="pb-5 text-left flex-1 min-w-0 pr-2">
                <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                  Evaluation in progress
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                  Our recruiting team will evaluate your assessment result shortly.
                </p>
              </div>
            </div>
          </div>

          {/* Please note card - RED color with mascot */}
          <div className="w-full bg-white rounded-2xl border border-rose-200 flex items-center gap-3.5 shadow-sm text-left">
            <img
              src={mayaShocked}
              alt="Mascot Alert"
              className="w-20 h-20 object-contain shrink-0 select-none"
              draggable="false"
            />
            <div className="min-w-0 flex-1 pr-4 py-2">
              <h5 className="text-rose-700 text-xs sm:text-sm font-bold">
                Attention Required
              </h5>
              <p className="text-rose-600 text-[10px] sm:text-xs mt-0.5 leading-normal font-semibold">
                The next candidate agreement step is very important. Please fill out the candidate agreement to know the review of your interview.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onBack}
            className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer border-none"
          >
            <span>Move to next step</span>
          </button>
        </div>
      </div>
    );
  }

  if (!progress?.candidate_email) {
    return (
      <FillDetailsStep
        progress={progress}
        onComplete={(updatedData) => onComplete(updatedData, false)}
        onBack={onBack}
      />
    );
  }

  const handleRefreshStatus = async () => {
    trackFlowAction("job_screening", "interview_attempt", "refresh", "started");
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success) {
        trackFlowAction("job_screening", "interview_attempt", "refresh", "success", {
          state: data?.data?.assigned_interview_slug ? "assigned" : "pending",
        });
        onComplete(data.data);
      } else {
        trackFlowAction("job_screening", "interview_attempt", "refresh", "failed");
        setError("Failed to refresh status");
      }
    } catch (err) {
      trackFlowAction("job_screening", "interview_attempt", "refresh", "failed");
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to sync status",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const hasInterview = !!progress?.assigned_interview_slug;

  if (hasInterview) {
    return (
      <div className="w-full bg-white flex flex-col items-center justify-center py-12 min-h-[300px] font-sans">
        <div className="w-8 h-8 border-2 border-[#002856] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#002856] text-xs font-semibold mt-3">
          Redirecting to interview...
        </span>
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

      {/* Main Title section */}
      <div className="text-left w-full mb-6">
        <h2 className="text-[#002856] text-2xl font-bold tracking-tight mb-2">
          Skillcase video interview
        </h2>
        <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
          Please complete the video interview assigned specifically to you to
          assess your communication skills.
        </p>
      </div>

      {/* Document/Interview Card */}
      <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-3.5 text-left">
        <div className="flex justify-between items-center w-full">
          <h3 className="text-[#002856] text-base font-semibold leading-tight">
            Preparing assessment
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-amber-50 text-[#d97706] border-amber-100">
            pending
          </span>
        </div>

        <p className="text-slate-500 text-[11px] sm:text-xs font-normal leading-relaxed">
          Our recruiting team is setting up your tailored Skillcase interview.
          This will consist of video/audio questions matching your background.
          We will notify you here once it is assigned.
        </p>

        {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefreshStatus}
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

export default InterviewStep;
