import { useEffect, useRef, useState, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tourStyles.css";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { setA2OnboardingComplete } from "../redux/auth/authSlice";
import api from "../api/axios";
import { A2TourContext } from "./A2TourContext";
import {
  getA2LandingSteps,
  getA2FlashcardSelectSteps,
  getA2FlashcardPracticeSteps,
  getA2GrammarSelectSteps,
  getA2GrammarExplanationSteps,
  getA2ListeningSelectSteps,
  getA2ListeningSteps,
  getA2ListeningAfterSubtitleSteps,
  getA2SpeakingSelectSteps,
  getA2SpeakingCardSteps,
  getA2ReadingSelectSteps,
  getA2ReadingSteps,
  getA2TestSelectSteps,
  getA2TestPrerequisiteSteps,
  getA2TestLevelSteps,
} from "./a2TourSteps";

const A2_TOUR_STATE_KEY = "a2_tour_state";

const ALL_PHASES = [
  "landing",
  "flashcard_select",
  "flashcard_practice",
  "grammar_select",
  "grammar",
  "listening_select",
  "listening",
  "speaking_select",
  "speaking",
  "reading_select",
  "reading",
  "test_select",
  "test_level",
];

function getInitialState() {
  const saved = localStorage.getItem(A2_TOUR_STATE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      /* ignore */
    }
  }
  return Object.fromEntries(ALL_PHASES.map((p) => [p, false]));
}

function isAllComplete(state) {
  return ALL_PHASES.every((p) => state[p]);
}

// Map feature:phase to phase label for tracking active tour
const PHASE_LABEL_MAP = {
  "landing:landing": "landing",
  "flashcard:select": "flashcard_select",
  "flashcard:practice": "flashcard_practice",
  "grammar:select": "grammar_select",
  "grammar:explanation": "grammar",
  "listening:select": "listening_select",
  "listening:content": "listening",
  "speaking:select": "speaking_select",
  "speaking:practice": "speaking",
  "reading:select": "reading_select",
  "reading:content": "reading",
  "test:select": "test_select",
  "test:level": "test_level",
};

// ─── Tap overlay helpers ────────────────────────────────────────

function injectTapOverlay(selector, label = "Tap") {
  cleanupTapOverlays();
  const el = document.querySelector(selector);
  if (!el) return;
  const rect = el.getBoundingClientRect();

  // Calculate center point of the target element
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Position so the ring (56px) is centered, not the entire container
  // Ring height is 56px, so offset by half (28px) to center the ring
  const ringRadius = 28; // Half of 56px ring size

  const overlay = document.createElement("div");
  overlay.className = "a2-tap-overlay-injected";
  overlay.style.cssText = `
    top: ${centerY - ringRadius}px;
    left: ${centerX}px;
    transform: translateX(-50%);
  `;
  overlay.innerHTML = `
    <div class="a2-tap-overlay-ring"><span class="a2-tap-emoji">\uD83D\uDC46</span></div>
    <div class="a2-tap-overlay-label">${label}</div>
  `;
  document.body.appendChild(overlay);
}

function cleanupTapOverlays() {
  document
    .querySelectorAll(".a2-tap-overlay-injected")
    .forEach((el) => el.remove());
}

// ─────────────────────────────────────────────────────────────────

export default function A2ProductTour({ children }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();

  const driverRef = useRef(null);
  const activeFeatureRef = useRef(null);
  const phaseLabelRef = useRef(null);
  const [tourState, setTourState] = useState(getInitialState);
  const [activeFeature, setActiveFeature] = useState(null);
  const [activePhase, setActivePhase] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [speakingStep, setSpeakingStep] = useState(0);

  const isA2 = user?.user_prof_level?.toLowerCase() === "a2";
  const isDone = user?.a2_onboarding_completed === true;

  // Keep ref in sync for event handlers
  useEffect(() => {
    activeFeatureRef.current = activeFeature;
  }, [activeFeature]);

  // ─── Helpers ───────────────────────────────────────────────────

  const markDone = useCallback(
    (phase) => {
      setTourState((prev) => {
        if (prev[phase]) return prev; // Already done, skip
        const next = { ...prev, [phase]: true };
        localStorage.setItem(A2_TOUR_STATE_KEY, JSON.stringify(next));
        if (isAllComplete(next)) {
          api.post("/user/complete-a2-onboarding").catch(() => {});
          dispatch(setA2OnboardingComplete());
        }
        return next;
      });
    },
    [dispatch],
  );

  const showSuccess = useCallback(() => {
    setShowSuccessPopup(true);
    setTimeout(() => setShowSuccessPopup(false), 2000);
  }, []);

  const destroyDriver = useCallback(() => {
    cleanupTapOverlays();
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  const skipEntireTour = useCallback(() => {
    destroyDriver();
    const allDone = Object.fromEntries(ALL_PHASES.map((p) => [p, true]));
    localStorage.setItem(A2_TOUR_STATE_KEY, JSON.stringify(allDone));
    setTourState(allDone);
    api.post("/user/complete-a2-onboarding").catch(() => {});
    dispatch(setA2OnboardingComplete());
    phaseLabelRef.current = null;
    setActiveFeature(null);
    setActivePhase(null);
  }, [destroyDriver, dispatch]);

  /** Start a driver.js tour with given steps */
  const startDriver = useCallback(
    (steps, { onComplete, onClose, showSkipBtn = false } = {}) => {
      destroyDriver();

      const d = driver({
        showProgress: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it",
        progressText: "{{current}} / {{total}}",
        allowClose: true,
        allowClickMaskNextStep: true,
        stagePadding: 8,
        stageRadius: 12,
        steps,
        onPopoverRender: (popover, { state }) => {
          // Clean old tap overlays
          cleanupTapOverlays();

          // Inject tap overlay if current step is a tap step
          const currentStep = steps[state.activeIndex];
          if (currentStep?.isTapStep && currentStep?.element) {
            setTimeout(() => {
              injectTapOverlay(currentStep.element, "Tap");
            }, 300);
          }

          // Skip Tour button on first step of landing
          if (showSkipBtn && state.activeIndex === 0) {
            const btn = document.createElement("button");
            btn.innerText = "Skip Tour";
            btn.className = "skip-tour-btn";
            btn.onclick = () => skipEntireTour();
            popover.footerButtons.prepend(btn);
          }
        },
        onCloseClick: () => {
          cleanupTapOverlays();
          if (onClose) onClose();
          else if (onComplete) onComplete();
          driverRef.current = null;
        },
        onNextClick: () => {
          cleanupTapOverlays();
          if (driverRef.current?.hasNextStep()) {
            driverRef.current.moveNext();
          } else {
            if (onComplete) onComplete();
            destroyDriver();
          }
        },
      });

      driverRef.current = d;
      d.drive();
    },
    [destroyDriver, skipEntireTour],
  );

  /** Wait for an element to appear, then call callback */
  const waitForElement = useCallback((selector, cb, maxAttempts = 20) => {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (document.querySelector(selector)) {
        clearInterval(check);
        cb();
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        cb(); // try anyway
      }
    }, 500);
    return () => clearInterval(check);
  }, []);

  // ─── Route detection ──────────────────────────────────────────

  useEffect(() => {
    if (!isA2 || isDone) {
      // Clean up any pending tour
      const prevLabel = phaseLabelRef.current;
      if (prevLabel) {
        destroyDriver();
        markDone(prevLabel);
        phaseLabelRef.current = null;
      }
      setActiveFeature(null);
      setActivePhase(null);
      return;
    }

    const path = location.pathname;
    let feature = null;
    let phase = null;

    if (path === "/" && !tourState.landing) {
      feature = "landing";
      phase = "landing";
    } else if (path === "/a2/flashcard" && !tourState.flashcard_select) {
      feature = "flashcard";
      phase = "select";
    } else if (
      path.match(/^\/a2\/flashcard\/.+/) &&
      !tourState.flashcard_practice
    ) {
      feature = "flashcard";
      phase = "practice";
    } else if (path === "/a2/grammar" && !tourState.grammar_select) {
      feature = "grammar";
      phase = "select";
    } else if (path.match(/^\/a2\/grammar\/.+/) && !tourState.grammar) {
      feature = "grammar";
      phase = "explanation";
    } else if (path === "/a2/listening" && !tourState.listening_select) {
      feature = "listening";
      phase = "select";
    } else if (path.match(/^\/a2\/listening\/.+/) && !tourState.listening) {
      feature = "listening";
      phase = "content";
    } else if (path === "/a2/speaking" && !tourState.speaking_select) {
      feature = "speaking";
      phase = "select";
    } else if (path.match(/^\/a2\/speaking\/.+/) && !tourState.speaking) {
      feature = "speaking";
      phase = "practice";
    } else if (path === "/a2/reading" && !tourState.reading_select) {
      feature = "reading";
      phase = "select";
    } else if (path.match(/^\/a2\/reading\/.+/) && !tourState.reading) {
      feature = "reading";
      phase = "content";
    } else if (path === "/a2/test" && !tourState.test_select) {
      feature = "test";
      phase = "select";
    } else if (path.match(/^\/a2\/test\/[^/]+$/) && !tourState.test_level) {
      feature = "test";
      phase = "level";
    }

    // Determine new phase label
    const newLabel =
      feature && phase ? PHASE_LABEL_MAP[`${feature}:${phase}`] || null : null;

    // Clean up previous tour if switching to a different phase
    const prevLabel = phaseLabelRef.current;
    if (prevLabel && prevLabel !== newLabel) {
      destroyDriver();
      markDone(prevLabel);
    }
    phaseLabelRef.current = newLabel;

    setActiveFeature(feature);
    setActivePhase(phase);
  }, [
    location.pathname,
    isA2,
    isDone,
    tourState,
    destroyDriver,
    markDone,
    user?.id,
  ]);

  // ─── Start tour when feature/phase changes ────────────────────

  useEffect(() => {
    if (!activeFeature || !activePhase || !isA2 || isDone) return;

    let steps = [];
    let opts = {};

    const finishPhase = (phase) => () => {
      markDone(phase);
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };

    const skipPhase = () => {
      // Skip without marking as done
      destroyDriver();
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };

    const finishPhaseWithSuccess = (phase) => () => {
      markDone(phase);
      showSuccess();
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };

    switch (`${activeFeature}:${activePhase}`) {
      case "landing:landing":
        steps = getA2LandingSteps(skipEntireTour);
        opts = {
          showSkipBtn: true,
          onComplete: finishPhase("landing"),
          onClose: skipEntireTour,
        };
        break;

      case "flashcard:select":
        steps = getA2FlashcardSelectSteps();
        opts = {
          onComplete: finishPhase("flashcard_select"),
          onClose: finishPhase("flashcard_select"),
        };
        break;

      case "flashcard:practice":
        steps = getA2FlashcardPracticeSteps();
        // Completion via tour:a2FlashcardRevealed event; close = skip this feature tour
        opts = {
          onComplete: finishPhase("flashcard_practice"),
          onClose: finishPhase("flashcard_practice"),
        };
        break;

      case "grammar:select":
        steps = getA2GrammarSelectSteps();
        opts = {
          onComplete: finishPhase("grammar_select"),
          onClose: finishPhase("grammar_select"),
        };
        break;

      case "grammar:explanation":
        steps = getA2GrammarExplanationSteps();
        // Completion via tour:a2GrammarStartPractice event; close = skip
        opts = {
          onComplete: finishPhase("grammar"),
          onClose: finishPhase("grammar"),
        };
        break;

      case "listening:select":
        steps = getA2ListeningSelectSteps();
        opts = {
          onComplete: finishPhase("listening_select"),
          onClose: finishPhase("listening_select"),
        };
        break;

      case "listening:content":
        steps = getA2ListeningSteps();
        // Multi-step event chain: play → subtitle → area → continue
        // Close = skip this feature tour
        opts = {
          onComplete: finishPhase("listening"),
          onClose: finishPhase("listening"),
        };
        break;

      case "speaking:select":
        steps = getA2SpeakingSelectSteps();
        opts = {
          onComplete: finishPhase("speaking_select"),
          onClose: finishPhase("speaking_select"),
        };
        break;

      case "speaking:practice":
        steps = getA2SpeakingCardSteps();
        // After driver closes, enter speaking tour mode (event-driven steps)
        opts = {
          onComplete: () => {
            // Step 1: show record overlay in SpeakingCard
            setSpeakingStep(1);
            window.dispatchEvent(
              new CustomEvent("tour:a2SpeakingStep", {
                detail: { step: 1 },
              }),
            );
          },
          onClose: finishPhase("speaking"),
        };
        break;

      case "reading:select":
        steps = getA2ReadingSelectSteps();
        opts = {
          onComplete: finishPhase("reading_select"),
          onClose: finishPhase("reading_select"),
        };
        break;

      case "reading:content":
        steps = getA2ReadingSteps();
        // Completion via tour:a2ReadingQuiz event; close = skip
        opts = {
          onComplete: finishPhase("reading"),
          onClose: finishPhase("reading"),
        };
        break;

      case "test:select":
        steps = getA2TestSelectSteps();
        opts = {
          onComplete: finishPhase("test_select"),
          onClose: finishPhase("test_select"),
        };
        break;

      case "test:level":
        steps = getA2TestLevelSteps();
        opts = {
          onComplete: finishPhaseWithSuccess("test_level"),
          onClose: finishPhase("test_level"),
        };
        break;

      default:
        return;
    }

    if (steps.length === 0) return;

    const firstEl = steps[0].element;
    if (typeof firstEl === "string") {
      const cleanup = waitForElement(firstEl, () => startDriver(steps, opts));
      return cleanup;
    } else {
      const t = setTimeout(() => startDriver(steps, opts), 600);
      return () => clearTimeout(t);
    }
  }, [
    activeFeature,
    activePhase,
    isA2,
    isDone,
    markDone,
    showSuccess,
    skipEntireTour,
    startDriver,
    waitForElement,
  ]);

  // ─── Custom event listeners ───────────────────────────────────

  // Flashcard flip → success + done
  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "flashcard") return;
      destroyDriver();
      showSuccess();
      markDone("flashcard_practice");
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };
    window.addEventListener("tour:a2FlashcardRevealed", handler);
    return () =>
      window.removeEventListener("tour:a2FlashcardRevealed", handler);
  }, [destroyDriver, markDone, showSuccess]);

  // Grammar start practice clicked
  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "grammar") return;
      destroyDriver();
      showSuccess();
      markDone("grammar");
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };
    window.addEventListener("tour:a2GrammarStartPractice", handler);
    return () =>
      window.removeEventListener("tour:a2GrammarStartPractice", handler);
  }, [destroyDriver, markDone, showSuccess]);

  // Listening subtitle toggled → show subtitle area + questions steps
  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "listening") return;
      destroyDriver();
      // Wait for subtitle area to appear
      setTimeout(() => {
        const steps = getA2ListeningAfterSubtitleSteps();
        const el = steps[0]?.element;
        if (!el || !document.querySelector(el)) {
          // Subtitle area not found, just mark done
          showSuccess();
          markDone("listening");
          phaseLabelRef.current = null;
          setActiveFeature(null);
          setActivePhase(null);
          return;
        }
        startDriver(steps, {
          onComplete: () => {
            showSuccess();
            markDone("listening");
            phaseLabelRef.current = null;
            setActiveFeature(null);
            setActivePhase(null);
          },
        });
      }, 600);
    };
    window.addEventListener("tour:a2ListeningSubtitle", handler);
    return () =>
      window.removeEventListener("tour:a2ListeningSubtitle", handler);
  }, [destroyDriver, startDriver, markDone, showSuccess]);

  // Speaking step events (event-driven like A1 pronunciation tour)
  useEffect(() => {
    const handler = (e) => {
      if (activeFeatureRef.current !== "speaking") return;
      const step = e.detail.step;
      setSpeakingStep(step);

      // Step 4: assessment done → success + mark done
      if (step === 4) {
        showSuccess();
        markDone("speaking");
        phaseLabelRef.current = null;
        setSpeakingStep(0);
        setActiveFeature(null);
        setActivePhase(null);
      }
    };
    window.addEventListener("tour:a2SpeakingStep", handler);
    return () => window.removeEventListener("tour:a2SpeakingStep", handler);
  }, [markDone, showSuccess]);

  // Reading quiz clicked
  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "reading") return;
      destroyDriver();
      showSuccess();
      markDone("reading");
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };
    window.addEventListener("tour:a2ReadingQuiz", handler);
    return () => window.removeEventListener("tour:a2ReadingQuiz", handler);
  }, [destroyDriver, markDone, showSuccess]);

  // Test prerequisite modal shown
  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "test") return;
      destroyDriver();
      setTimeout(() => {
        const steps = getA2TestPrerequisiteSteps();
        const el = steps[0]?.element;
        const waitId = setInterval(() => {
          if (el && document.querySelector(el)) {
            clearInterval(waitId);
            startDriver(steps, {
              onComplete: () => {
                // Modal tour done; test level tour starts when user navigates
                setActiveFeature(null);
                setActivePhase(null);
              },
            });
          }
        }, 300);
        setTimeout(() => clearInterval(waitId), 10000);
      }, 300);
    };
    window.addEventListener("tour:a2TestPrerequisite", handler);
    return () => window.removeEventListener("tour:a2TestPrerequisite", handler);
  }, [destroyDriver, startDriver]);

  // ─── Context + Render ─────────────────────────────────────────

  const ctx = {
    isTourActive: !!activeFeature && isA2 && !isDone,
    currentFeature: activeFeature,
    currentPhase: activePhase,
    speakingStep,
  };

  if (!isA2 || isDone) {
    return (
      <A2TourContext.Provider
        value={{
          isTourActive: false,
          currentFeature: null,
          currentPhase: null,
          speakingStep: 0,
        }}
      >
        {children}
      </A2TourContext.Provider>
    );
  }

  return (
    <A2TourContext.Provider value={ctx}>
      {children}
      {showSuccessPopup && (
        <div className="tour-success-popup">✨ Great Work!</div>
      )}
    </A2TourContext.Provider>
  );
}
