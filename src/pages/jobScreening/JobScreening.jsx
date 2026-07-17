import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../api/axios";
import {
  getProgress,
  startAgreement,
  checkAgreement,
  createPaywallOrder,
  verifyPaywallPayment,
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
import {
  Check,
  Lock,
  RefreshCw,
  ArrowLeft,
  Phone,
  CreditCard,
} from "lucide-react";
import { toast } from "react-hot-toast";
import mayaSmiling from "../../assets/onboarding/mayaSmiling.webp";
import { setUser } from "../../redux/auth/authSlice";
import { trackFeatureEvent } from "../../telemetry/events";
import { captureTelemetryError } from "../../telemetry";
import { trackFlowAction } from "../../telemetry/flow";

const STEP_DESCRIPTIONS = {
  welcome: {
    subtitle: "Read the overview of the program",
    desc: "Welcome to the skillcase job process.",
  },
  profile_completion: {
    subtitle: "fill your education and personal details",
    desc: "Upload your CV and language certification documents.",
  },
  interview_attempt: {
    subtitle: "complete your interview assessment",
    desc: "Complete the assigned Skillcase speaking and video interview.",
  },
  registration_form: {
    subtitle: "sign the terms of agreement",
    desc: "Please review the agreement. It explains how we'll work together during your placement.",
  },
  paywall: {
    subtitle: "submit refundable security deposit",
    desc: "Submit your refundable security deposit to proceed with placement.",
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

const getEligibleHomeRoute = (user = {}) => {
  const mode = user.lg_preferred_mode;
  const preference = String(user.german_preference || "");

  if (mode === "learn" || preference === "1") {
    return "/learn-german";
  }

  return "/";
};

const syncPreferredModeCache = (user = {}) => {
  const mode =
    user.lg_preferred_mode ||
    (String(user.german_preference) === "3" ? "job_screening" : "practice");

  if (!["learn", "practice", "job_screening"].includes(mode)) return;

  localStorage.setItem("lg_preferred_mode", mode);
  window.dispatchEvent(new CustomEvent("lgModeChange", { detail: { mode } }));
};

const JobScreening = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [isExecutingStep, setIsExecutingStep] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementError, setAgreementError] = useState("");

  const [welcomeAnimationState, setWelcomeAnimationState] = useState("idle");
  const [finalProgressData, setFinalProgressData] = useState(null);
  const [executingStepId, setExecutingStepId] = useState(null);
  const [reviewCheckStepId, setReviewCheckStepId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const activeStepRef = useRef(null);
  const activeStepContainerRef = useRef(null);

  useEffect(() => {
    const stepId = progress?.current_step_id;
    if (!stepId) return undefined;
    const startedAt = performance.now();
    trackFeatureEvent("job_screening", "step_presented", { entityType: "funnel_step", entityId: stepId, attributes: { stage: stepId } });
    return () => trackFeatureEvent("job_screening", "step_left", {
      entityType: "funnel_step", entityId: stepId,
      activeMs: Math.round(performance.now() - startedAt), attributes: { stage: stepId },
    });
  }, [progress?.current_step_id]);

  useEffect(() => {
    if (isExecutingStep && activeStepContainerRef.current) {
      activeStepContainerRef.current.scrollTo(0, 0);
    }
  }, [isExecutingStep, executingStepId]);

  useEffect(() => {
    if (progress && activeStepRef.current) {
      setTimeout(() => {
        activeStepRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [progress, isExecutingStep]);

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
      captureTelemetryError(err, { feature: "job_screening.progress", handled: true });
      if (
        err.response?.status === 403 &&
        String(err.response?.data?.message || "")
          .toLowerCase()
          .includes("not eligible")
      ) {
        setRedirecting(true);
        setError("");
        let refreshedUser = user;
        try {
          api.clearGetCache?.();
          const res = await api.post("/user/me");
          if (res.data?.user) {
            refreshedUser = res.data.user;
            dispatch(setUser(refreshedUser));
            syncPreferredModeCache(refreshedUser);
          }
        } catch (refreshErr) {
          console.error("Error refreshing user after eligibility change:", refreshErr);
        }

        const redirectTo = getEligibleHomeRoute(refreshedUser);
        navigate(redirectTo, { replace: true });
        return;
      }
      setError(
        err.response?.data?.message || "Failed to load progress settings",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  useEffect(() => {
    if (welcomeAnimationState === "welcome_active") {
      const t1 = setTimeout(() => {
        setWelcomeAnimationState("welcome_complete");
      }, 1200);

      const t2 = setTimeout(() => {
        setWelcomeAnimationState("idle");
        setProgress(finalProgressData);
      }, 4000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [welcomeAnimationState, finalProgressData]);

  if (loading || redirecting) {
    return (
      <div className="w-full min-h-screen bg-[#f6f8fc] flex items-center justify-center flex-col gap-3 font-sans">
        <div className="w-10 h-10 border-[3.5px] border-[#002856] border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-550 text-xs font-semibold">
          {redirecting ? "Taking you to your dashboard..." : "Loading dashboard..."}
        </span>
      </div>
    );
  }

  if (error && !progress) {
    return (
      <div className="w-full min-h-screen bg-[#f6f8fc] flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800 mb-4">{error}</p>
          <button
            onClick={fetchProgress}
            className="px-5 py-2.5 bg-[#002856] text-white rounded-lg text-sm font-bold active:scale-[0.99] transition-all cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const steps = progress?.steps_config || [];
  const currentStepId = progress?.current_step_id || "welcome";

  const handleStepComplete = (updatedData, shouldExitStep = true) => {
    trackFeatureEvent("job_screening", "step_completed", {
      entityType: "funnel_step", entityId: executingStepId || progress?.current_step_id,
      lifecycle: "succeeded", attributes: { stage: executingStepId || progress?.current_step_id },
    });
    setProgress(updatedData);
    if (shouldExitStep) {
      setIsExecutingStep(false);
      setExecutingStepId(null);
    }
  };

  const handleWelcomeComplete = (updatedData) => {
    setFinalProgressData(updatedData);
    setWelcomeAnimationState("welcome_active");
  };

  const handleStartStep = async (stepId) => {
    // If the welcome animation is still playing, commit the final state immediately
    // so that currentStepId is correct before renderActiveStepComponent runs.
    if (welcomeAnimationState !== "idle" && finalProgressData) {
      setProgress(finalProgressData);
      setWelcomeAnimationState("idle");
    }

    const targetStepId = stepId || displayCurrentStepId;
    trackFeatureEvent("job_screening", "step_started", {
      entityType: "funnel_step", entityId: targetStepId,
      lifecycle: "started", attributes: { stage: targetStepId },
    });
    const clickedStep = steps.find((s) => s.id === targetStepId);

    if (clickedStep && clickedStep.status === "review") {
      try {
        setReviewCheckStepId(targetStepId);
        const { data } = await getProgress();
        if (data?.success) {
          setProgress(data.data);
          setExecutingStepId(targetStepId);
          setIsExecutingStep(true);
        }
      } catch (err) {
        console.error("Error checking review status:", err);
        setExecutingStepId(targetStepId);
        setIsExecutingStep(true);
      } finally {
        setReviewCheckStepId(null);
      }
      return;
    }

    if (
      targetStepId === "interview_attempt" &&
      progress?.assigned_interview_slug &&
      progress?.candidate_email
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
      setExecutingStepId(targetStepId);
      setIsExecutingStep(true);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaywallPayment = async () => {
    trackFlowAction("job_screening", "paywall", "checkout", "started");
    try {
      setPaymentLoading(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        trackFlowAction("job_screening", "paywall", "sdk_load", "failed");
        toast.error("Razorpay SDK failed to load. Are you online?");
        setPaymentLoading(false);
        return;
      }

      const { data } = await createPaywallOrder();
      if (!data || !data.success) {
        trackFlowAction("job_screening", "paywall", "order_create", "failed");
        toast.error(data?.message || "Failed to initiate payment");
        setPaymentLoading(false);
        return;
      }
      trackFlowAction("job_screening", "paywall", "order_create", "success");

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Skillcase",
        description: "Screening Refundable Security Deposit",
        image: "https://learner.skillcase.in/white_mainlogo.webp",
        order_id: data.order_id,
        handler: async function (response) {
          try {
            setPaymentLoading(true);
            const verifyRes = await verifyPaywallPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data?.success) {
              trackFlowAction("job_screening", "paywall", "payment_verify", "success");
              toast.success("Payment successful!");
              const { data: progressRes } = await getProgress();
              if (progressRes?.success) {
                setProgress(progressRes.data);
              }
            } else {
              trackFlowAction("job_screening", "paywall", "payment_verify", "failed");
              toast.error("Payment verification failed");
            }
          } catch (err) {
            trackFlowAction("job_screening", "paywall", "payment_verify", "failed");
            console.error("Verification error:", err);
            toast.error("Failed to verify payment");
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: progress?.candidate_name || "",
          email: progress?.candidate_email || "",
          contact: progress?.candidate_phone || "",
        },
        theme: {
          color: "#002856",
        },
        modal: {
          ondismiss: function () {
            trackFlowAction("job_screening", "paywall", "checkout", "cancelled");
            setPaymentLoading(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      trackFlowAction("job_screening", "paywall", "checkout", "presented");
      paymentObject.open();
    } catch (err) {
      trackFlowAction("job_screening", "paywall", "checkout", "failed");
      console.error("Payment initiation error:", err);
      toast.error(
        err.response?.data?.message || "An error occurred during checkout",
      );
      setPaymentLoading(false);
    }
  };

  const renderActiveStepComponent = () => {
    // Use executingStepId — the step the user explicitly tapped — not the potentially
    // stale currentStepId which lags behind during the welcome animation.
    const stepToRender = executingStepId || currentStepId;
    switch (stepToRender) {
      case "welcome":
        return <WelcomeStep onComplete={handleWelcomeComplete} />;
      case "profile_completion":
        return (
          <ProfileCompletionStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => {
              setIsExecutingStep(false);
              setExecutingStepId(null);
            }}
          />
        );
      case "interview_attempt":
        return (
          <InterviewStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => {
              setIsExecutingStep(false);
              setExecutingStepId(null);
            }}
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
            onBack={() => {
              setIsExecutingStep(false);
              setExecutingStepId(null);
            }}
          />
        );
      case "additional_documents":
        return (
          <AdditionalDocumentsStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => {
              setIsExecutingStep(false);
              setExecutingStepId(null);
            }}
          />
        );
      case "interview_training":
        return (
          <MeetingStep
            type="training"
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => {
              setIsExecutingStep(false);
              setExecutingStepId(null);
            }}
          />
        );
      case "recruiter_status":
        return (
          <RecruiterStatusStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={() => {
              setIsExecutingStep(false);
              setExecutingStepId(null);
            }}
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

  // 0. Paywall Blocked Screen
  if (currentStepId === "paywall") {
    return (
      <div className="w-full min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] py-12 px-4 flex flex-col items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 flex flex-col items-center text-center gap-6"
        >
          {/* Mascot and Speech Bubble */}
          <div className="flex flex-col items-center gap-4 w-full">
            <img
              src={mayaSmiling}
              alt="Maya mascot smiling"
              className="w-24 h-24 object-contain"
            />
            <div className="relative bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-700 text-xs font-semibold leading-relaxed shadow-sm">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-50 border-t border-l border-slate-100 rotate-45" />
              Please give us a try with this refundable security deposit. It
              ensures your commitment to the placement journey.
            </div>
          </div>

          {/* Program Details */}
          <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Refundable Placement Deposit
            </span>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold">
                Security Deposit Amount
              </span>
              <span className="text-lg font-bold text-slate-800">
                10,000 INR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              This amount is fully refundable upon completing your onboarding
              training or securing a placement with our recruiters.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handlePaywallPayment}
              disabled={paymentLoading}
              className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {paymentLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>Proceed to Pay</span>
                </>
              )}
            </button>

            <a
              href="tel:+919731462667"
              className="w-full h-12 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-slate-600 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Call Skillcase support at +919731462667</span>
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // 1. Full-screen Welcome flow
  // Guard: finalProgressData is set the moment animation starts and never cleared,
  // so if it's non-null we know the welcome was just completed and must NOT re-show this screen.
  if (
    currentStepId === "welcome" &&
    welcomeAnimationState === "idle" &&
    finalProgressData === null
  ) {
    return (
      <div className="min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-linear-to-b from-[#002856] to-[#134074] w-full flex flex-col justify-center items-center">
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
      <div
        ref={activeStepContainerRef}
        className="min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-white w-full flex flex-col items-center overflow-y-auto"
      >
        <div className="w-full max-w-md py-4 px-4">
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

  // Derive transition animation steps configurations
  let displaySteps = steps;
  let displayCurrentStepId = currentStepId;

  if (welcomeAnimationState === "welcome_active") {
    // Use the real resolved data as the base (keeps already-completed steps intact)
    const baseSteps = finalProgressData?.steps_config || steps;
    displayCurrentStepId = "welcome";
    displaySteps = baseSteps.map((s) => {
      if (s.id === "welcome") return { ...s, status: "pending" };
      return s;
    });
  } else if (welcomeAnimationState === "welcome_complete") {
    // Use the real resolved data as the base (keeps already-completed steps intact)
    const baseSteps = finalProgressData?.steps_config || steps;
    const nextId = finalProgressData?.current_step_id || "profile_completion";
    displayCurrentStepId = nextId;
    displaySteps = baseSteps.map((s) => {
      if (s.id === "welcome") return { ...s, status: "completed" };
      if (s.id === nextId && s.status !== "completed")
        return { ...s, status: "pending" };
      return s;
    });
  }

  const visibleSteps = displaySteps.filter(
    (s) => s.status !== "skipped" && s.id !== "paywall",
  );
  const completedStepsCount = visibleSteps.filter(
    (s) => s.status === "completed",
  ).length;
  const totalStepsCount = visibleSteps.length;
  const progressPercent =
    totalStepsCount > 0 ? (completedStepsCount / totalStepsCount) * 100 : 0;
  const activeStepIndex = visibleSteps.findIndex(
    (s) => s.id === displayCurrentStepId,
  );
  const activeStep = displaySteps.find((s) => s.id === displayCurrentStepId);

  // 3. Central Job Progress Timeline screen (Progress Lobby)
  return (
    <div className="w-full min-h-[calc(100vh-55px)] lg:min-h-[calc(100vh-72px)] bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] py-6 px-4 flex flex-col items-center overflow-y-auto font-sans">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Header Block with Circular Progress Ring */}
        <div className="pb-3 pt-2 flex items-center justify-between">
          <div className="flex-1 text-left min-w-0 pr-4">
            <h2 className="text-[#002856] text-3xl font-semibold tracking-tight">
              Your job progress
            </h2>
            <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
              Next step -{" "}
              {STEP_DESCRIPTIONS[displayCurrentStepId]?.subtitle ||
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
            const isActive = step.id === displayCurrentStepId;
            const isReview = step.status === "review";
            const isLocked = step.status === "locked";
            const isLast = idx === visibleSteps.length - 1;
            // Welcome step was just active — its button should start already open, not animate in
            const isWelcomeStartPhase =
              welcomeAnimationState === "welcome_active" &&
              step.id === "welcome";

            const stepDesc = STEP_DESCRIPTIONS[step.id]?.desc || "";
            const circleBg = isCompleted
              ? "#15803d"
              : isActive || isReview
                ? "#002856"
                : "rgba(0,40,86,0.1)";
            const circleColor =
              isCompleted || isActive || isReview
                ? "#ffffff"
                : "rgba(0,40,86,0.4)";

            return (
              <div
                key={step.id}
                ref={isActive ? activeStepRef : null}
                className="self-stretch inline-flex justify-start items-stretch gap-3.5 w-full"
              >
                {/* Left Connector Node */}
                <div className="w-6 flex flex-col items-center shrink-0">
                  <div className="py-1.5 flex flex-col items-center">
                    <motion.div
                      animate={{
                        backgroundColor: circleBg,
                        color: circleColor,
                        scale: isActive ? [1, 1.15, 1] : 1,
                      }}
                      transition={{ duration: 0.7, ease: "easeInOut" }}
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0"
                    >
                      {isCompleted ? (
                        <motion.svg
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 22,
                          }}
                          className="w-3.5 h-3.5 stroke-3 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </motion.svg>
                      ) : isActive || isReview ? (
                        idx + 1
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                    </motion.div>
                  </div>
                  {!isLast && (
                    <div className="flex-1 w-[1.5px] bg-[#002856]/20 my-0.5" />
                  )}
                </div>

                {/* Right Step Card */}
                <motion.div
                  animate={{ opacity: isLocked ? 0.6 : 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1 pb-6 w-full"
                >
                  <motion.div
                    animate={{
                      borderColor:
                        isActive || isReview
                          ? "rgba(0,40,86,0.6)"
                          : "rgba(0,40,86,0.1)",
                      boxShadow:
                        isActive || isReview
                          ? "0 4px 12px rgba(0,40,86,0.06)"
                          : "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    onClick={() => {
                      if (!isLocked && !isCompleted) {
                        handleStartStep(step.id);
                      }
                    }}
                    className={`p-4 bg-white rounded-2xl border flex flex-col gap-4 w-full ${!isLocked && !isCompleted ? "cursor-pointer hover:border-[#002856]/40 hover:shadow-md transition-all" : ""}`}
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
                    <AnimatePresence>
                      {(isActive || isReview) && (
                        <motion.div
                          initial={
                            isWelcomeStartPhase
                              ? false
                              : { opacity: 0, height: 0 }
                          }
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.45, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <button
                            onClick={() => handleStartStep(step.id)}
                            disabled={reviewCheckStepId !== null}
                            className="w-full py-3 bg-[#002856] text-white rounded-lg font-bold text-sm transition-all active:scale-[0.99] cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-75"
                          >
                            {reviewCheckStepId === step.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                <span>Checking status...</span>
                              </>
                            ) : step.button_title ? (
                              step.button_title
                            ) : isReview || step.id === "review_pending" ? (
                              "Check status"
                            ) : (
                              "Start this step"
                            )}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
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
              className="w-full h-12 bg-linear-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 text-[#002856] rounded-lg font-bold text-sm sm:text-base transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-md cursor-pointer border border-amber-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {agreementLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing document...</span>
                </>
              ) : (
                <span>Continue with Next Step</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobScreening;
