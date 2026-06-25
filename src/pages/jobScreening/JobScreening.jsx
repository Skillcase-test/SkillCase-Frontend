import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  getProgress,
  startAgreement,
  checkAgreement,
} from "../../api/jobScreeningApi";
import WelcomeStep from "./components/WelcomeStep";
import ProfileCompletionStep from "./components/ProfileCompletionStep";
import InterviewStep from "./components/InterviewStep";
import RegistrationStep from "./components/RegistrationStep";
import ReviewPendingStep from "./components/ReviewPendingStep";
import MeetingStep from "./components/MeetingStep";
import OfferLetterStep from "./components/OfferLetterStep";
import AdditionalDocumentsStep from "./components/AdditionalDocumentsStep";
import RecruiterStatusStep from "./components/RecruiterStatusStep";
import { Check, Lock, RefreshCw, ArrowLeft } from "lucide-react";

const STEP_DESCRIPTIONS = {
  welcome: {
    subtitle: "Read the overview of the program",
    desc: "Welcome to the job screening process.",
  },
  profile_completion: {
    subtitle: "fill your education and personal details",
    desc: "Upload your CV and language certification documents.",
  },
  interview_attempt: {
    subtitle: "complete your speaking assessment",
    desc: "Complete the assigned Skillcase speaking and video interview.",
  },
  registration_form: {
    subtitle: "sign the terms of agreement",
    desc: "Review and sign the terms and conditions agreement form.",
  },
  review_pending: {
    subtitle: "wait for recruiters to review your application",
    desc: "Our recruitment partners will evaluate your profile details.",
  },
  additional_documents: {
    subtitle: "submit supporting credentials",
    desc: "Upload requested additional files (ID, marks sheets, etc.).",
  },
  interview_training: {
    subtitle: "attend the scheduled prep training webinar",
    desc: "Join live tutoring and test prep sessions for placement.",
  },
  recruiter_status: {
    subtitle: "track recruiter placements and offers",
    desc: "Monitor corporate matching, schedule partner interviews, and download offers.",
  },
};

const JobScreening = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExecutingStep, setIsExecutingStep] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementError, setAgreementError] = useState("");

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
      setError(
        err.response?.data?.message || "Failed to load screening progress",
      );
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
          <span className="text-[#002856] text-xs font-semibold">
            Loading your job screening pipeline...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#002856] mb-2">
            Error Loading Pipeline
          </h2>
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

  const handleStepComplete = (updatedData, shouldExitStep = true) => {
    setProgress(updatedData);
    if (shouldExitStep) {
      setIsExecutingStep(false);
    }
  };

  const handleStartStep = async (stepId) => {
    const targetStepId = stepId || currentStepId;
    if (
      targetStepId === "interview_attempt" &&
      progress?.assigned_interview_slug
    ) {
      navigate(`/job-screening/interview/${progress.assigned_interview_slug}`, {
        state: {
          name: progress.candidate_name,
          email: progress.candidate_email,
          phone: progress.candidate_phone,
        },
      });
    } else if (targetStepId === "registration_form") {
      try {
        setAgreementLoading(true);
        setAgreementError("");
        const { data } = await startAgreement();
        if (data?.success) {
          if (data.alreadySigned) {
            const progressRes = await checkAgreement();
            if (progressRes.data?.success) {
              setProgress(progressRes.data.data);
            }
            return;
          }
          navigate(`/job-screening/terms/sign/${data.token}`);
        } else {
          setAgreementError(
            "Failed to initialize signing process. Please try again.",
          );
        }
      } catch (err) {
        console.error(err);
        setAgreementError(
          err.response?.data?.message ||
            "An error occurred while starting the signing process.",
        );
      } finally {
        setAgreementLoading(false);
      }
    } else {
      setIsExecutingStep(true);
    }
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
            onBack={() => setIsExecutingStep(false)}
          />
        );
      case "interview_attempt":
        return (
          <InterviewStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => setIsExecutingStep(false)}
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
        return (
          <ReviewPendingStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => setIsExecutingStep(false)}
          />
        );
      case "additional_documents":
        return (
          <AdditionalDocumentsStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => setIsExecutingStep(false)}
          />
        );
      case "interview_training":
        return (
          <MeetingStep
            type="training"
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => setIsExecutingStep(false)}
          />
        );
      case "recruiter_status":
        return (
          <RecruiterStatusStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => setIsExecutingStep(false)}
          />
        );
      default:
        return (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-gray-500">
            Unknown step in screening pipeline
          </div>
        );
    }
  };

  // 1. Full-screen Welcome flow
  if (currentStepId === "welcome") {
    return (
      <div className="min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-gradient-to-b from-[#002856] to-[#134074] w-full flex flex-col justify-center items-center">
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
    );
  }

  // 2. Active Step Execution screen
  if (isExecutingStep) {
    return (
      <div className="min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-white w-full flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-md py-2 px-4">
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
      </div>
    );
  }

  // Calculate Progress Stats
  const completedStepsCount = visibleSteps.filter(
    (s) => s.status === "completed",
  ).length;
  const totalStepsCount = visibleSteps.length;
  const progressPercent =
    totalStepsCount > 0 ? (completedStepsCount / totalStepsCount) * 100 : 0;
  const activeStepIndex = visibleSteps.findIndex((s) => s.id === currentStepId);

  // 3. Central Job Progress Timeline screen (Progress Lobby)
  return (
    <div className="w-full min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-gradient-to-b from-[#e0f2fe] to-[#dbeafe] py-6 px-4 flex flex-col items-center overflow-y-auto font-sans">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Header Block with Circular Progress Ring */}
        <div className="pb-3 pt-2 flex items-center justify-between">
          <div className="flex-1 text-left min-w-0 pr-4">
            <h2 className="text-[#002856] text-3xl font-semibold tracking-tight">
              Your job progress
            </h2>
            <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
              Next step -{" "}
              {STEP_DESCRIPTIONS[currentStepId]?.subtitle ||
                activeStep?.title ||
                ""}
            </p>
          </div>

          {/* SVG Progress Ring */}
          <div className="relative w-24 h-24 flex items-center justify-center rounded-full shrink-0">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.2"
              />
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#eab308"
                strokeWidth="3.2"
                strokeDasharray="100"
                strokeDashoffset={100 - progressPercent}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[#002856] text-sm sm:text-base font-extrabold leading-none">
                {completedStepsCount}/{totalStepsCount}
              </span>
              <span className="text-[#002856]/50 text-[7px] sm:text-[8px] font-bold uppercase tracking-wider mt-0.5">
                Done
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Checklist */}
        <div className="flex flex-col w-full">
          {visibleSteps.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isActive = step.id === currentStepId;
            const isReview = step.status === "review";
            const isLocked = step.status === "locked";
            const isLast = idx === visibleSteps.length - 1;

            const stepDesc = STEP_DESCRIPTIONS[step.id]?.desc || "";

            return (
              <div
                key={step.id}
                className="self-stretch inline-flex justify-start items-stretch gap-3.5 w-full"
              >
                {/* Left Connector Node */}
                <div className="w-6 flex flex-col items-center shrink-0">
                  <div className="py-1.5 flex flex-col items-center">
                    {isCompleted ? (
                      <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : isActive || isReview ? (
                      <div className="w-6 h-6 bg-[#002856] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                        {idx + 1}
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-black/10 rounded-full flex items-center justify-center text-[#002856]/40 shadow-none shrink-0">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  {!isLast && (
                    <div className="flex-1 w-[1.5px] bg-[#002856]/20 my-0.5" />
                  )}
                </div>

                {/* Right Step Card */}
                <div
                  className={`flex-1 pb-6 w-full ${isLocked ? "opacity-60" : ""}`}
                >
                  <div
                    className={`p-4 bg-white rounded-2xl shadow-md/10 border flex flex-col gap-4 w-full transition-all ${
                      isActive || isReview
                        ? "border-[#002856]/60 ring-2 ring-[#002856]/5"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Title & Badge */}
                    <div className="flex justify-between items-start gap-2 w-full text-left">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-slate-800 text-sm sm:text-base font-semibold leading-tight truncate">
                          {step.title}
                        </h3>
                        <p className="text-slate-500 text-[11px] sm:text-xs font-normal leading-relaxed mt-1">
                          {stepDesc}
                        </p>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                          isCompleted
                            ? "bg-green-50 text-[#15803d] border-green-100"
                            : isActive
                              ? "bg-amber-50 text-[#d97706] border-amber-100"
                              : isReview
                                ? "bg-blue-50 text-[#1d4ed8] border-blue-100"
                                : "bg-slate-50 text-slate-400 border-slate-100"
                        }`}
                      >
                        {isCompleted
                          ? "done"
                          : isReview
                            ? "review"
                            : isActive
                              ? "pending"
                              : "locked"}
                      </span>
                    </div>

                    {/* Action Button inside active pending step card */}
                    {(isActive || isReview) && (
                      <button
                        onClick={() => handleStartStep(step.id)}
                        className="w-full py-3 bg-[#002856] text-white rounded-lg font-bold text-sm transition-all active:scale-[0.99] cursor-pointer text-center"
                      >
                        {step.id === "review_pending"
                          ? "Check review status"
                          : "Start this step"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Floating CTA Button */}
        {activeStep && (
          <div className="flex flex-col gap-2 mt-2">
            {agreementError && currentStepId === "registration_form" && (
              <div className="w-full px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-semibold text-center">
                {agreementError}
              </div>
            )}
            <button
              onClick={() => handleStartStep(currentStepId)}
              disabled={agreementLoading}
              className="w-full h-12 bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 text-[#002856] rounded-lg font-bold text-sm sm:text-base transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-md cursor-pointer border border-amber-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {agreementLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing document...</span>
                </>
              ) : (
                <span>Continue with Step {activeStepIndex + 1}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobScreening;
