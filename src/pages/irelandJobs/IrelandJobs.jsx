import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { getIrelandProgress } from "../../api/irelandJobsApi";
import IrelandWelcomeStep from "./components/IrelandWelcomeStep";
import ResumeProfileStep from "./components/ResumeProfileStep";
import IrelandDocumentsStep from "./components/IrelandDocumentsStep";
import RoleSelectStep from "./components/RoleSelectStep";
import MatchingScreen from "./components/MatchingScreen";
import { Lock, RefreshCw } from "lucide-react";
import { captureTelemetryError } from "../../telemetry";
import { trackFeatureEvent } from "../../telemetry/events";
import { clearIrelandModeCache } from "../../utils/lgMode";
import { toast } from "react-hot-toast";

const STEP_DESCRIPTIONS = {
  welcome: {
    subtitle: "Read the overview of the program",
    desc: "Welcome to the Ireland jobs process.",
  },
  resume_profile: {
    subtitle: "upload your CV",
    desc: "Upload your resume and confirm the details we extract.",
  },
  documents: {
    subtitle: "share your certificates",
    desc: "Tell us which certificates you have or are preparing.",
  },
  role_select: {
    subtitle: "choose your opportunity",
    desc: "Pick the role you want to be placed in, Nurse or Caregiver.",
  },
  matching: {
    subtitle: "we are finding your opportunities",
    desc: "Our team is matching your profile to open roles.",
  },
};

// `?step=` is candidate-supplied (bookmark, shared link, hand-typed) — honoured
// only for a step the lobby itself would open. Completed/skipped steps are
// reachable too: the terminal "Change opportunity" flow reopens role_select
// this way. Locked steps stay blocked. Same contract as JobScreening.
const isStepReachable = (stepId, progress) => {
  if (!stepId || !progress) return false;
  if (stepId === progress.currentStepId) return true;
  const step = (progress.steps || []).find((s) => s.id === stepId);
  return ["pending", "review", "completed", "skipped"].includes(step?.status);
};

const IrelandJobs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExecutingStep, setIsExecutingStep] = useState(() =>
    Boolean(new URLSearchParams(location.search).get("step")),
  );
  const [executingStepId, setExecutingStepId] = useState(
    () => new URLSearchParams(location.search).get("step") || null,
  );
  const [reviewCheckStepId, setReviewCheckStepId] = useState(null);
  const activeStepRef = useRef(null);
  const activeStepContainerRef = useRef(null);

  const lastStepParamRef = useRef(
    new URLSearchParams(location.search).get("step"),
  );
  useEffect(() => {
    const stepParam = new URLSearchParams(location.search).get("step");
    const paramChanged = lastStepParamRef.current !== stepParam;
    lastStepParamRef.current = stepParam;
    if (!stepParam) {
      if (paramChanged) {
        setIsExecutingStep(false);
        setExecutingStepId(null);
      }
      return;
    }
    if (!progress) return;
    if (!isStepReachable(stepParam, progress)) {
      navigate("/ireland-jobs", { replace: true });
      return;
    }
    setExecutingStepId(stepParam);
    setIsExecutingStep(true);
  }, [location.search, progress, navigate]);

  // silent=true keeps the current screen mounted — used by step polling so a
  // background refresh doesn't collapse the view into the loading skeleton.
  const fetchProgress = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError("");
        const { data } = await getIrelandProgress();
        if (data?.success) {
          setProgress(data.data);
        } else if (!silent) {
          setError("Failed to load progress");
        }
      } catch (err) {
        console.error("Error loading Ireland progress:", err);
        captureTelemetryError(err, {
          feature: "ireland_jobs.progress",
          handled: true,
        });
        if (err.response?.status === 403) {
          // Not eligible — the funnel lock only applies to ireland-mode users;
          // anyone else who lands here goes home. Drop a stale cached Ireland
          // mode first, or LandingPage sends them straight back.
          clearIrelandModeCache();
          navigate("/", { replace: true });
          return;
        }
        if (!silent) setError(err.response?.data?.message || "Failed to load progress");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Broadcast welcome state to TopModeSwitcher so its tab blends white on the
  // white welcome screen and sky-blue on the lobby — same contract as
  // jobScreeningWelcome in the German pipeline.
  useEffect(() => {
    const isWelcome =
      progress?.currentStepId === "welcome" &&
      !isExecutingStep &&
      !new URLSearchParams(location.search).get("step");
    window.dispatchEvent(
      new CustomEvent("irelandJobsWelcome", { detail: { isWelcome } }),
    );
    return () =>
      window.dispatchEvent(
        new CustomEvent("irelandJobsWelcome", {
          detail: { isWelcome: false },
        }),
      );
  }, [progress, isExecutingStep, location.search]);

  useEffect(() => {
    if (!isExecutingStep) return;
    // The window is the real scroller (the step container uses min-h-* and
    // grows with content), so scrollTo on the container alone is a no-op.
    activeStepContainerRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [isExecutingStep, executingStepId]);

  // Lobby auto-scroll — park the active card ~70% down the viewport on return,
  // same as the German pipeline.
  useEffect(() => {
    if (progress && activeStepRef.current && !isExecutingStep) {
      const timeoutId = setTimeout(() => {
        const el = activeStepRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const delta = rect.top - window.innerHeight * 0.7;
        // Walk up to the ancestor that actually scrolls — the lobby div
        // expands to its content so the window is usually the scroller.
        let scroller = el.parentElement;
        while (
          scroller &&
          scroller !== document.body &&
          scroller.scrollHeight <= scroller.clientHeight + 1
        ) {
          scroller = scroller.parentElement;
        }
        if (
          scroller &&
          scroller !== document.body &&
          typeof scroller.scrollBy === "function"
        ) {
          scroller.scrollBy({ top: delta, behavior: "smooth" });
        } else {
          window.scrollBy({ top: delta, behavior: "smooth" });
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [progress, isExecutingStep]);

  useEffect(() => {
    const stepId = progress?.currentStepId;
    if (!stepId) return undefined;
    const startedAt = performance.now();
    trackFeatureEvent("ireland_jobs", "step_presented", {
      entityType: "funnel_step",
      entityId: stepId,
      attributes: { stage: stepId },
    });
    return () =>
      trackFeatureEvent("ireland_jobs", "step_left", {
        entityType: "funnel_step",
        entityId: stepId,
        activeMs: Math.round(performance.now() - startedAt),
        attributes: { stage: stepId },
      });
  }, [progress?.currentStepId]);

  if (loading) {
    // Deep-linking straight into a step (?step=…) shows a white skeleton so the
    // blue lobby skeleton doesn't flash underneath the step screen.
    if (executingStepId) {
      return (
        <div className="w-full min-h-[calc(100vh-55px)] bg-white px-4 pt-6 flex flex-col items-center">
          <div className="w-full max-w-md flex flex-col gap-4 animate-pulse">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-7 w-56 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-64 bg-slate-100 rounded" />
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 mt-2">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="w-full bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                    <div className="h-3 w-44 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-12 w-full bg-slate-100 rounded-xl" />
          </div>
        </div>
      );
    }
    return (
      <div className="w-full min-h-[calc(100vh-55px)] bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] pt-6 pb-28 px-4 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="w-full bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/60 animate-pulse flex flex-col items-center gap-3">
            <div className="h-6 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-64 bg-slate-100 rounded" />
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="w-1/4 h-full bg-slate-200 rounded-full" />
            </div>
          </div>
          <div className="w-full flex flex-col gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="w-full bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/60 animate-pulse flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200" />
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-48 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !progress) {
    return (
      <div className="w-full min-h-screen bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/60 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800 mb-4">{error}</p>
          <button
            onClick={() => fetchProgress()}
            className="px-5 py-2.5 bg-[#002856] text-white rounded-lg text-sm font-bold active:scale-[0.99] transition-all cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const steps = progress?.steps || [];
  const currentStepId = progress?.currentStepId || "welcome";

  // Deactivated by an admin — the funnel ends here.
  if (progress && progress.isActive === false) {
    return (
      <div className="w-full min-h-[calc(100vh-55px)] bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] pt-16 pb-28 px-4 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-white/60 rounded-3xl shadow-sm p-8 flex flex-col items-center text-center gap-3">
          <h2 className="text-xl font-extrabold text-[#002856]">
            Ireland Jobs
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your Ireland Jobs profile is currently inactive.
            {progress.inactiveReason ? ` ${progress.inactiveReason}` : ""} Please
            contact the Skillcase team if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const handleExitStep = () => {
    setIsExecutingStep(false);
    setExecutingStepId(null);
    navigate("/ireland-jobs", { replace: true });
  };

  // Every mutation endpoint returns fresh progress, so the step hands it back
  // here — one commit, no second GET, no stale screen hanging around (that
  // extra round-trip was the visible jitter vs the German pipeline).
  const handleStepComplete = (updatedData, shouldExitStep = true) => {
    trackFeatureEvent("ireland_jobs", "step_completed", {
      entityType: "funnel_step",
      entityId: executingStepId || progress?.currentStepId,
      lifecycle: "succeeded",
      attributes: { stage: executingStepId || progress?.currentStepId },
    });
    if (updatedData) {
      setProgress(updatedData);
    }
    if (shouldExitStep) {
      setIsExecutingStep(false);
      setExecutingStepId(null);
      navigate("/ireland-jobs", { replace: true });
    }
    if (!updatedData) fetchProgress(true);
  };

  // Mid-step mutations (doc upload, role pick…) — commit the fresh payload
  // without leaving the step screen.
  const handleProgressUpdate = (updatedData) => {
    if (updatedData) setProgress(updatedData);
  };

  // Terminal → back to role_select. Opening via ?step= means the shell chrome
  // (top navbar, mode switcher, bottom tab bar) hides like every other step
  // screen — ConditionalNav/TopSwitcher/BottomTabBar all key off the param.
  const handleReopenRole = () => {
    setReviewCheckStepId(null);
    setExecutingStepId("role_select");
    setIsExecutingStep(true);
    navigate("/ireland-jobs?step=role_select");
  };

  const handleStartStep = async (stepId) => {
    const targetStepId = stepId || currentStepId;
    trackFeatureEvent("ireland_jobs", "step_started", {
      entityType: "funnel_step",
      entityId: targetStepId,
      lifecycle: "started",
      attributes: { stage: targetStepId },
    });
    const clickedStep = steps.find((s) => s.id === targetStepId);
    if (clickedStep && clickedStep.status === "review") {
      try {
        setReviewCheckStepId(targetStepId);
        const { data } = await getIrelandProgress();
        if (data?.success) {
          setProgress(data.data);
          // The review may have resolved while we fetched — if the step is no
          // longer openable, stay in the lobby instead of flashing the step
          // open and getting kicked straight back out by the ?step= gate.
          if (!isStepReachable(targetStepId, data.data)) return;
          // Approved: stay on the lobby, which now shows the next step.
          const refreshed = (data.data.steps || []).find(
            (s) => s.id === targetStepId,
          );
          if (refreshed?.status === "completed") {
            toast.success("Approved! You can move on to the next step.");
            return;
          }
        }
      } catch (err) {
        console.error("Error checking review status:", err);
      } finally {
        setReviewCheckStepId(null);
      }
    }
    setExecutingStepId(targetStepId);
    setIsExecutingStep(true);
    navigate(`/ireland-jobs?step=${targetStepId}`);
  };

  const renderActiveStepComponent = () => {
    const stepToRender = executingStepId || currentStepId;
    switch (stepToRender) {
      case "welcome":
        return (
          <IrelandWelcomeStep
            progress={progress}
            onComplete={(d) => handleStepComplete(d, false)}
          />
        );
      case "resume_profile":
        return (
          <ResumeProfileStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={handleExitStep}
            refreshProgress={() => fetchProgress(true)}
            onProgressUpdate={handleProgressUpdate}
          />
        );
      case "documents":
        return (
          <IrelandDocumentsStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={handleExitStep}
            refreshProgress={() => fetchProgress(true)}
            onProgressUpdate={handleProgressUpdate}
          />
        );
      case "role_select":
        return (
          <RoleSelectStep
            progress={progress}
            onComplete={handleStepComplete}
            onBack={handleExitStep}
            onProgressUpdate={handleProgressUpdate}
          />
        );
      case "matching":
        return (
          <MatchingScreen
            progress={progress}
            onBack={handleExitStep}
            onChangeRole={handleReopenRole}
          />
        );
      default:
        return (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-gray-500">
            Unknown step in Ireland pipeline
          </div>
        );
    }
  };

  // Terminal state: every earlier step is done and `matching` is the current
  // step. Per the UX ask, there is NO full-screen takeover — the lobby keeps
  // showing the completed timeline with a slim status banner below it.
  const isMatchingTerminal =
    currentStepId === "matching" && !isExecutingStep;

  // Full-screen welcome (white, per the Ireland flow design).
  if (currentStepId === "welcome" && !isExecutingStep) {
    return (
      <div className="min-h-[calc(100vh-55px)] bg-white w-full flex flex-col justify-start items-center px-4 overflow-y-auto pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col items-center"
          >
            {renderActiveStepComponent()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (isExecutingStep) {
    // Full-bleed steps (same mechanism as the German pipeline's
    // select_opportunity): the parent drops its padding and the step
    // supplies its own gutters so its chrome spans the column edge-to-edge.
    const activeStepKey = executingStepId || currentStepId;
    const isFullBleed = activeStepKey === "role_select";

    return (
      <div
        ref={activeStepContainerRef}
        className="min-h-screen bg-white w-full flex flex-col items-center overflow-y-auto"
        style={
          isFullBleed
            ? undefined
            : {
                paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
                paddingBottom: "calc(3rem + env(safe-area-inset-bottom, 0px))",
              }
        }
      >
        <div
          className={`w-full max-w-md ${isFullBleed ? "flex-1 flex flex-col min-h-screen" : "px-4"}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStepKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={`w-full ${isFullBleed ? "flex-1 flex flex-col min-h-screen" : ""}`}
            >
              {renderActiveStepComponent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Skipped steps satisfy the sequencing gate server-side — count and render
  // them as done so the ring doesn't stall on an admin-skipped step.
  const completedStepsCount = steps.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  const progressPercent =
    steps.length > 0 ? (completedStepsCount / steps.length) * 100 : 0;
  const activeStep = steps.find((s) => s.id === currentStepId);

  // Progress lobby — same timeline pattern as the German pipeline.
  return (
    <div
      className="w-full min-h-[calc(100vh-55px)] bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] pt-6 px-4 flex flex-col items-center overflow-y-auto"
      style={{
        paddingBottom: "calc(9rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="pb-3 pt-2 flex items-center justify-between">
          <div className="flex-1 text-left min-w-0 pr-4">
            <h2 className="text-[#002856] text-3xl font-semibold tracking-tight">
              Your Ireland progress
            </h2>
            <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
              Next step:{" "}
              {STEP_DESCRIPTIONS[currentStepId]?.subtitle ||
                activeStep?.title ||
                ""}
            </p>
          </div>

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
                stroke="#e2e8f0"
                strokeWidth="3.2"
              />
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#002856"
                strokeWidth="3.2"
                strokeDasharray="100"
                strokeDashoffset={100 - progressPercent}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[#002856] text-sm sm:text-base font-extrabold leading-none">
                {completedStepsCount}/{steps.length}
              </span>
              <span className="text-[#002856]/50 text-[7px] sm:text-[8px] font-bold uppercase tracking-wider mt-0.5">
                Done
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full">
          {steps.map((step, idx) => {
            const isSkipped = step.status === "skipped";
            const isCompleted = step.status === "completed" || isSkipped;
            const isActive = step.id === currentStepId;
            const isReview = step.status === "review";
            const isLocked = step.status === "locked";
            const isTerminalMatching = isMatchingTerminal && step.id === "matching";
            const isLast = idx === steps.length - 1;
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
                    <div className="flex justify-between items-start gap-2 w-full text-left">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-slate-800 text-sm sm:text-base font-semibold leading-tight truncate">
                          {step.title}
                        </h3>
                        <p className="text-slate-500 text-[11px] sm:text-xs font-normal leading-relaxed mt-1">
                          {stepDesc}
                        </p>
                      </div>
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
                        {isSkipped
                          ? "skipped"
                          : isCompleted
                            ? "done"
                            : isReview
                              ? "review"
                              : isTerminalMatching
                                ? "in progress"
                                : isActive
                                  ? "pending"
                                  : "locked"}
                      </span>
                    </div>

                    <AnimatePresence>
                      {(isActive || isReview) && !isTerminalMatching && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.45, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <button
                            onClick={(e) => {
                              // The card also starts the step; avoid a double start.
                              e.stopPropagation();
                              handleStartStep(step.id);
                            }}
                            disabled={reviewCheckStepId !== null}
                            className="w-full py-3 bg-[#002856] text-white rounded-lg font-bold text-sm transition-all active:scale-[0.99] cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-75"
                          >
                            {reviewCheckStepId === step.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                <span>Checking status...</span>
                              </>
                            ) : isReview ? (
                              "Check status"
                            ) : step.button_title ? (
                              step.button_title
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

        {/* Terminal banner — slim status below the completed timeline */}
        {isMatchingTerminal && (
          <MatchingScreen
            progress={progress}
            inline
            onChangeRole={handleReopenRole}
          />
        )}

        {activeStep && !isMatchingTerminal && (
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => handleStartStep(currentStepId)}
              className="w-full h-12 bg-linear-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 text-[#002856] rounded-lg font-bold text-sm sm:text-base transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-md cursor-pointer border border-amber-300"
            >
              <span>Continue with Next Step</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IrelandJobs;
