import { useEffect, useRef, useState, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tourStyles.css";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
// We will create setB1OnboardingComplete in authSlice.js
import { setB1OnboardingComplete } from "../redux/auth/authSlice";
import api from "../api/axios";
import { B1TourContext } from "./B1TourContext";
import { trackFlowAction, useTourJourney } from "../telemetry/flow";
import {
  getB1LandingSteps,
  getB1FlashcardSelectSteps,
  getB1FlashcardPracticeSteps,
  getB1DescribeSpeakSelectSteps,
  getB1DescribeSpeakWorkspaceSteps,
  getB1ReadListenSelectSteps,
  getB1ExamsSelectSteps,
  getB1MayaLobbySteps,
} from "./b1TourSteps";

const B1_TOUR_STATE_KEY = "b1_tour_state";

const ALL_PHASES = [
  "landing",
  "flashcard_select",
  "flashcard_practice",
  "describe_speak_select",
  "describe_speak_workspace",
  "read_listen_select",
  "exams_select",
  "maya_lobby",
];

function getInitialState() {
  const saved = localStorage.getItem(B1_TOUR_STATE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return Object.fromEntries(
        ALL_PHASES.map((phase) => [phase, Boolean(parsed?.[phase])]),
      );
    } catch {
      /* ignore */
    }
  }
  return Object.fromEntries(ALL_PHASES.map((p) => [p, false]));
}

function isAllComplete(state) {
  return ALL_PHASES.every((p) => state[p]);
}

const PHASE_LABEL_MAP = {
  "landing:landing": "landing",
  "flashcard:select": "flashcard_select",
  "flashcard:practice": "flashcard_practice",
  "describe_speak:select": "describe_speak_select",
  "describe_speak:workspace": "describe_speak_workspace",
  "read_listen:select": "read_listen_select",
  "exams:select": "exams_select",
  "maya:lobby": "maya_lobby",
};

function injectTapOverlay(target, label = "Tap") {
  cleanupTapOverlays();
  const el =
    target instanceof Element ? target : document.querySelector(String(target));
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const ringRadius = 28;

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

function isElementInViewport(el, padding = 8) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= padding &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight - padding &&
    rect.right <= window.innerWidth
  );
}

function resolveTapTarget(target) {
  if (target instanceof Element) return target;
  return document.querySelector(String(target));
}

function getStepElement(step) {
  const target = step?.element;
  if (!target) return null;
  if (target instanceof Element) return target;
  return document.querySelector(String(target));
}

function getStepSelectors(steps) {
  return steps
    .map((step) => step?.element)
    .filter((element) => typeof element === "string");
}

function filterAvailableSteps(steps) {
  return steps.filter((step) => !step?.element || getStepElement(step));
}

function cleanupTapOverlays() {
  document
    .querySelectorAll(".a2-tap-overlay-injected")
    .forEach((el) => el.remove());
}

export default function B1ProductTour({ children }) {
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

  const isB1 = user?.user_prof_level?.toLowerCase() === "b1";
  const isDone = user?.b1_onboarding_completed === true;
  useTourJourney({ enabled: Boolean(isB1 && !isDone && activeFeature), tourId: "b1_product_tour", phase: activePhase || activeFeature, tourVersion: "1" });

  useEffect(() => {
    activeFeatureRef.current = activeFeature;
  }, [activeFeature]);

  useEffect(() => {
    localStorage.setItem(B1_TOUR_STATE_KEY, JSON.stringify(tourState));
  }, [tourState]);

  const markDone = useCallback(
    (phase) => {
      setTourState((prev) => {
        if (prev[phase]) return prev;
        const next = { ...prev, [phase]: true };
        localStorage.setItem(B1_TOUR_STATE_KEY, JSON.stringify(next));
        if (isAllComplete(next)) {
          api.post("/user/complete-b1-onboarding")
            .catch(() => {
              // Try generic onboarding complete fallback
              api.post("/user/complete-onboarding").catch(() => {});
            });
          dispatch(setB1OnboardingComplete());
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
    trackFlowAction("tour", "b1_product_tour", "tour_skipped", { phase: activePhase || activeFeature, tourVersion: "1" });
    destroyDriver();
    const allDone = Object.fromEntries(ALL_PHASES.map((p) => [p, true]));
    localStorage.setItem(B1_TOUR_STATE_KEY, JSON.stringify(allDone));
    setTourState(allDone);
    api.post("/user/complete-b1-onboarding")
      .catch(() => {
        api.post("/user/complete-onboarding").catch(() => {});
      });
    dispatch(setB1OnboardingComplete());
    phaseLabelRef.current = null;
    setActiveFeature(null);
    setActivePhase(null);
  }, [destroyDriver, dispatch, activePhase, activeFeature]);

  const closeCurrentPhase = useCallback(() => {
    cleanupTapOverlays();
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    const currentPhaseLabel = phaseLabelRef.current;
    if (currentPhaseLabel) {
      markDone(currentPhaseLabel);
    }
    phaseLabelRef.current = null;
    setActiveFeature(null);
    setActivePhase(null);
  }, [markDone]);

  const startDriver = useCallback(
    (steps, { onComplete, onClose, showSkipBtn = false } = {}) => {
      destroyDriver();
      if (!steps.length) {
        if (onComplete) onComplete();
        return;
      }

      const d = driver({
        showProgress: false,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it",
        allowClose: true,
        allowClickMaskNextStep: true,
        stagePadding: 8,
        stageRadius: 12,
        steps,
        onPopoverRender: (popover, { state }) => {
          cleanupTapOverlays();

          const currentStep = steps[state.activeIndex];
          if (currentStep?.isTapStep && currentStep?.element) {
            const activeTarget = resolveTapTarget(
              state?.activeElement || currentStep.element,
            );
            if (!activeTarget) return;

            if (!isElementInViewport(activeTarget)) {
              activeTarget.scrollIntoView({
                behavior: "auto",
                block: "center",
                inline: "nearest",
              });
            }

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                injectTapOverlay(activeTarget, "Tap");
              });
            });
          }

          if (showSkipBtn && state.activeIndex === 0) {
            const btn = document.createElement("button");
            btn.innerText = "Skip Tour";
            btn.className = "skip-tour-btn";
            btn.onclick = () => skipEntireTour();
            popover.footerButtons.prepend(btn);
          }
        },
        onCloseClick: () => {
          if (onClose) {
            onClose();
            return;
          }
          closeCurrentPhase();
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
    [closeCurrentPhase, destroyDriver, skipEntireTour],
  );

  const waitForTourTargets = useCallback((steps, cb, maxAttempts = 20) => {
    const selectors = getStepSelectors(steps);
    if (selectors.length === 0) {
      const t = setTimeout(() => cb(filterAvailableSteps(steps)), 600);
      return () => clearTimeout(t);
    }

    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      const allTargetsReady = selectors.every((selector) =>
        document.querySelector(selector),
      );
      if (allTargetsReady) {
        clearInterval(check);
        cb(filterAvailableSteps(steps));
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        cb(filterAvailableSteps(steps));
      }
    }, 500);
    return () => clearInterval(check);
  }, []);

  // Route & Phase detection
  useEffect(() => {
    if (!isB1 || isDone) {
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
    } else if (path === "/b1/flashcard" && !tourState.flashcard_select) {
      feature = "flashcard";
      phase = "select";
    } else if (
      path.match(/^\/b1\/flashcard\/.+/) &&
      !tourState.flashcard_practice
    ) {
      feature = "flashcard";
      phase = "practice";
    } else if (
      path === "/b1/describe-speak" &&
      !tourState.describe_speak_select
    ) {
      feature = "describe_speak";
      phase = "select";
    } else if (
      path.match(/^\/b1\/describe-speak\/workspace\/.+/) &&
      !tourState.describe_speak_workspace
    ) {
      feature = "describe_speak";
      phase = "workspace";
    } else if (
      (path === "/b1/read-listen" || path === "/b1") &&
      !tourState.read_listen_select
    ) {
      feature = "read_listen";
      phase = "select";
    } else if (path === "/b1/exams" && !tourState.exams_select) {
      feature = "exams";
      phase = "select";
    } else if (path === "/b1/maya" && !tourState.maya_lobby) {
      feature = "maya";
      phase = "lobby";
    }

    const newLabel =
      feature && phase ? PHASE_LABEL_MAP[`${feature}:${phase}`] || null : null;

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
    isB1,
    isDone,
    tourState,
    destroyDriver,
    markDone,
    user?.id,
  ]);

  // Execute tour based on detected feature/phase
  useEffect(() => {
    if (!activeFeature || !activePhase || !isB1 || isDone) return;

    let steps = [];
    let opts = {};

    const finishPhase = (phase) => () => {
      markDone(phase);
      destroyDriver();
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };

    switch (`${activeFeature}:${activePhase}`) {
      case "landing:landing":
        steps = getB1LandingSteps(skipEntireTour);
        opts = {
          showSkipBtn: true,
          onComplete: finishPhase("landing"),
          onClose: skipEntireTour,
        };
        break;

      case "flashcard:select":
        steps = getB1FlashcardSelectSteps();
        opts = {
          onComplete: finishPhase("flashcard_select"),
          onClose: finishPhase("flashcard_select"),
        };
        break;

      case "flashcard:practice":
        steps = getB1FlashcardPracticeSteps();
        opts = {
          onComplete: finishPhase("flashcard_practice"),
          onClose: finishPhase("flashcard_practice"),
        };
        break;

      case "describe_speak:select":
        steps = getB1DescribeSpeakSelectSteps();
        opts = {
          onComplete: finishPhase("describe_speak_select"),
          onClose: finishPhase("describe_speak_select"),
        };
        break;

      case "describe_speak:workspace":
        steps = getB1DescribeSpeakWorkspaceSteps();
        opts = {
          onComplete: finishPhase("describe_speak_workspace"),
          onClose: finishPhase("describe_speak_workspace"),
        };
        break;

      case "read_listen:select":
        steps = getB1ReadListenSelectSteps();
        opts = {
          onComplete: finishPhase("read_listen_select"),
          onClose: finishPhase("read_listen_select"),
        };
        break;

      case "exams:select":
        steps = getB1ExamsSelectSteps();
        opts = {
          onComplete: finishPhase("exams_select"),
          onClose: finishPhase("exams_select"),
        };
        break;

      case "maya:lobby":
        steps = getB1MayaLobbySteps();
        opts = {
          onComplete: finishPhase("maya_lobby"),
          onClose: finishPhase("maya_lobby"),
        };
        break;

      default:
        return;
    }

    if (steps.length === 0) return;

    const cleanup = waitForTourTargets(steps, (availableSteps) =>
      startDriver(availableSteps, opts),
    );
    return cleanup;
  }, [
    activeFeature,
    activePhase,
    isB1,
    isDone,
    markDone,
    skipEntireTour,
    startDriver,
    waitForTourTargets,
  ]);

  // Handle flashcard flipped completion event
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
    window.addEventListener("tour:b1FlashcardRevealed", handler);
    return () => window.removeEventListener("tour:b1FlashcardRevealed", handler);
  }, [destroyDriver, markDone, showSuccess]);

  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "maya") return;
      destroyDriver();
      showSuccess();
      markDone("maya_lobby");
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };
    window.addEventListener("tour:b1MayaCallStarted", handler);
    return () => window.removeEventListener("tour:b1MayaCallStarted", handler);
  }, [destroyDriver, markDone, showSuccess]);

  const tourContextValue = {
    isTourActive: !!activeFeature && isB1 && !isDone,
    currentFeature: activeFeature,
    currentPhase: activePhase,
  };

  if (!isB1 || isDone) {
    return (
      <B1TourContext.Provider
        value={{
          isTourActive: false,
          currentFeature: null,
          currentPhase: null,
        }}
      >
        {children}
      </B1TourContext.Provider>
    );
  }

  return (
    <B1TourContext.Provider value={tourContextValue}>
      {children}
      {showSuccessPopup && (
        <div className="tour-success-popup">✨ Great Work!</div>
      )}
    </B1TourContext.Provider>
  );
}
