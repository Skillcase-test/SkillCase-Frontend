import React, { useState, useEffect } from "react";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getProgress } from "../../../api/jobScreeningApi";
import FillDetailsStep from "./FillDetailsStep";

const InterviewStep = ({ progress, onComplete, onBack }) => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
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
    }
  }, [progress, navigate]);

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
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success) {
        onComplete(data.data);
      } else {
        setError("Failed to refresh status");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to sync screening status");
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
      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
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
          Please complete the video interview assigned specifically to you to assess your communication skills.
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
          Our recruiting team is setting up your tailored Skillcase interview. This will consist of video/audio questions matching your background. We will notify you here once it is assigned.
        </p>

        {error && (
          <p className="text-red-500 text-xs font-semibold">{error}</p>
        )}

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
