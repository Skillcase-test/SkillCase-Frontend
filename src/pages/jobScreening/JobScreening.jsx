import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProgress } from "../../api/jobScreeningApi";
import StepProgressTracker from "./components/StepProgressTracker";
import WelcomeStep from "./components/WelcomeStep";
import ProfileCompletionStep from "./components/ProfileCompletionStep";
import InterviewStep from "./components/InterviewStep";
import RegistrationStep from "./components/RegistrationStep";
import ReviewPendingStep from "./components/ReviewPendingStep";
import MeetingStep from "./components/MeetingStep";
import OfferLetterStep from "./components/OfferLetterStep";
import AdditionalDocumentsStep from "./components/AdditionalDocumentsStep";
import RecruiterStatusStep from "./components/RecruiterStatusStep";

const JobScreening = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success) {
        setProgress(data.data);
      } else {
        setError("Failed to load progress settings");
      }
    } catch (err) {
      console.error("Error loading progress:", err);
      setError(err.response?.data?.message || "Failed to load screening progress");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#002856] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[#002856] text-xs font-semibold">Loading your job screening pipeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#002856] mb-2">Error Loading Pipeline</h2>
          <p className="text-zinc-500 text-xs leading-relaxed mb-6">{error}</p>
          <button
            onClick={fetchProgress}
            className="w-full py-2.5 bg-[#002856] text-white hover:bg-[#003d83] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.99]"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const steps = progress?.steps_config || [];
  const visibleSteps = steps.filter((s) => s.status !== "skipped");
  const currentStepId = progress?.current_step_id || "welcome";
  const activeStep = steps.find((s) => s.id === currentStepId);

  const handleStepComplete = (updatedData) => {
    setProgress(updatedData);
  };

  const renderActiveStepComponent = () => {
    switch (currentStepId) {
      case "welcome":
        return <WelcomeStep onComplete={handleStepComplete} />;
      case "profile_completion":
        return (
          <ProfileCompletionStep
            progress={progress}
            onComplete={handleStepComplete}
          />
        );
      case "interview_attempt":
        return (
          <InterviewStep
            progress={progress}
            onComplete={handleStepComplete}
          />
        );
      case "registration_form":
        return (
          <RegistrationStep
            progress={progress}
            onComplete={handleStepComplete}
          />
        );
      case "review_pending":
        return <ReviewPendingStep progress={progress} onComplete={handleStepComplete} />;
      case "additional_documents":
        return <AdditionalDocumentsStep progress={progress} onComplete={handleStepComplete} />;
      case "interview_training":
        return <MeetingStep type="training" progress={progress} onComplete={handleStepComplete} />;
      case "recruiter_status":
        return <RecruiterStatusStep progress={progress} onComplete={handleStepComplete} />;
      case "recruiter_interview":
        return <MeetingStep type="recruiter" progress={progress} onComplete={handleStepComplete} />;
      case "offer_letter":
        return <OfferLetterStep progress={progress} onComplete={handleStepComplete} />;
      default:
        return (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-gray-500">
            Unknown step in screening pipeline
          </div>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-white py-2.5 sm:py-4 flex flex-col">
      <main className="max-w-lg mx-auto lg:max-w-3xl lg:px-8 px-4 flex flex-col gap-3.5 w-full">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-[#002856]">
            Job Screening Pipeline
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Complete the steps below to qualify for career opportunities in Germany.
          </p>
        </div>

        <StepProgressTracker steps={visibleSteps} currentStepId={currentStepId} />

        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {renderActiveStepComponent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default JobScreening;
