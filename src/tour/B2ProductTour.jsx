import { useEffect, useRef, useState, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tourStyles.css";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { setB2OnboardingComplete } from "../redux/auth/authSlice";
import api from "../api/axios";
import { B2TourContext } from "./B2TourContext";
import { trackFlowAction, useTourJourney } from "../telemetry/flow";
import { isB2PracticeLevel } from "../utils/b1Progress";
import {
  getB2LandingSteps,
  getB2ModuleSelectSteps,
  getB2ExamsSelectSteps,
} from "./b2TourSteps";

const B2_TOUR_STATE_KEY = "b2_tour_state";

const getB2TourStateKey = (userId) =>
  userId ? `${B2_TOUR_STATE_KEY}_${userId}` : B2_TOUR_STATE_KEY;

const B2_MODULES = ["reading", "listening", "speaking", "writing"];

const ALL_PHASES = [
  "landing",
  "reading_select",
  "listening_select",
  "speaking_select",
  "writing_select",
  "exams_select",
];

function getInitialState(key = B2_TOUR_STATE_KEY) {
  const saved = localStorage.getItem(key);
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
  "reading:select": "reading_select",
  "listening:select": "listening_select",
  "speaking:select": "speaking_select",
  "writing:select": "writing_select",
  "exams:select": "exams_select",
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
    <div class="a2-tap-overlay-ring"><span class="a2-tap-emoji">👆</span></div>
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

export default function B2ProductTour({ children }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();

  const driverRef = useRef(null);
  const phaseLabelRef = useRef(null);

  const tourKey = getB2TourStateKey(user?.user_id);
  const [tourState, setTourState] = useState(() => getInitialState(tourKey));
  const [activeFeature, setActiveFeature] = useState(null);
  const [activePhase, setActivePhase] = useState(null);

  const isB2 = isB2PracticeLevel(user?.user_prof_level);
  const isDone = user?.b2_onboarding_completed === true;

  const checkTopSwitcherDone = () =>
    Boolean(user?.top_switcher_tour_completed) ||
    (user?.user_id &&
      localStorage.getItem(`top_switcher_tour_completed_${user.user_id}`) === "true");

  const [topSwitcherDone, setTopSwitcherDone] = useState(checkTopSwitcherDone);

  useEffect(() => {
    setTopSwitcherDone(checkTopSwitcherDone());
  }, [user?.user_id, user?.top_switcher_tour_completed]);

  useEffect(() => {
    if (!user?.user_id) return;
    const key = getB2TourStateKey(user.user_id);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTourState(
          Object.fromEntries(ALL_PHASES.map((phase) => [phase, Boolean(parsed?.[phase])])),
        );
      } catch {}
    }
  }, [user?.user_id]);

  useEffect(() => {
    const handleTopSwitcherComplete = () => setTopSwitcherDone(true);
    window.addEventListener("topSwitcherTourComplete", handleTopSwitcherComplete);
    return () => window.removeEventListener("topSwitcherTourComplete", handleTopSwitcherComplete);
  }, []);

  useTourJourney({ enabled: Boolean(isB2 && topSwitcherDone && !isDone && activeFeature), tourId: "b2_product_tour", phase: activePhase || activeFeature, tourVersion: "1" });

  useEffect(() => {
    localStorage.setItem(tourKey, JSON.stringify(tourState));
  }, [tourKey, tourState]);

  const markDone = useCallback(
    (phase) => {
      setTourState((prev) => {
        if (prev[phase]) return prev;
        const next = { ...prev, [phase]: true };
        localStorage.setItem(tourKey, JSON.stringify(next));
        if (isAllComplete(next)) {
          api.post("/user/complete-b2-onboarding")
            .catch(() => {
              api.post("/user/complete-onboarding").catch(() => {});
            });
          dispatch(setB2OnboardingComplete());
        }
        return next;
      });
    },
    [dispatch, tourKey],
  );

  const destroyDriver = useCallback(() => {
    cleanupTapOverlays();
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  const skipEntireTour = useCallback(() => {
    trackFlowAction("tour", "b2_product_tour", "tour_skipped", { phase: activePhase || activeFeature, tourVersion: "1" });
    destroyDriver();
    const allDone = Object.fromEntries(ALL_PHASES.map((p) => [p, true]));
    localStorage.setItem(tourKey, JSON.stringify(allDone));
    setTourState(allDone);
    api.post("/user/complete-b2-onboarding")
      .catch(() => {
        api.post("/user/complete-onboarding").catch(() => {});
      });
    dispatch(setB2OnboardingComplete());
    phaseLabelRef.current = null;
    setActiveFeature(null);
    setActivePhase(null);
  }, [destroyDriver, dispatch, activePhase, activeFeature, tourKey]);

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

          // driver.js assigns the popover arrow's align class with a
          // viewport heuristic that misplaces it on wide popovers (it lands
          // on the popover edge instead of the element). Re-center the
          // arrow on the real target once positioning settles.
          if (currentStep?.element) {
            requestAnimationFrame(() => {
              const target = resolveTapTarget(
                state?.activeElement || currentStep.element,
              );
              const arrowEl = popover.arrow;
              if (!target || !arrowEl) return;
              const cls = arrowEl.className || "";
              const elRect = target.getBoundingClientRect();
              const popRect = popover.wrapper.getBoundingClientRect();
              if (
                cls.includes("arrow-side-top") ||
                cls.includes("arrow-side-bottom")
              ) {
                const x = Math.min(
                  Math.max(elRect.left + elRect.width / 2 - popRect.left, 14),
                  popRect.width - 14,
                );
                arrowEl.style.left = `${x - 5}px`;
                arrowEl.style.right = "auto";
                arrowEl.style.marginLeft = "0";
              } else if (
                cls.includes("arrow-side-left") ||
                cls.includes("arrow-side-right")
              ) {
                const y = Math.min(
                  Math.max(elRect.top + elRect.height / 2 - popRect.top, 14),
                  popRect.height - 14,
                );
                arrowEl.style.top = `${y - 5}px`;
                arrowEl.style.bottom = "auto";
                arrowEl.style.marginTop = "0";
              }
            });
          }

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

  // Route & phase detection — landing + module select pages only
  useEffect(() => {
    if (!isB2 || !topSwitcherDone || isDone) {
      const prevLabel = phaseLabelRef.current;
      if (prevLabel) {
        destroyDriver();
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
    } else if (path === "/b2/exams" && !tourState.exams_select) {
      feature = "exams";
      phase = "select";
    } else {
      const moduleMatch = path.match(/^\/b2\/(reading|listening|speaking|writing)$/);
      if (moduleMatch && !tourState[`${moduleMatch[1]}_select`]) {
        feature = moduleMatch[1];
        phase = "select";
      }
    }

    const newLabel =
      feature && phase ? PHASE_LABEL_MAP[`${feature}:${phase}`] || null : null;

    const prevLabel = phaseLabelRef.current;
    if (prevLabel && prevLabel !== newLabel) {
      // Navigating onward mid-tour fulfills the phase intent — but only when
      // the tour was actually on screen. phaseLabelRef is set before the
      // driver finishes its target wait, so without this guard a quick tap
      // during loading would consume the phase without ever showing it.
      if (driverRef.current) {
        const intoWorkspace = path.match(
          /^\/b2\/(reading|listening|speaking|writing)\/.+/,
        );
        const intoExamFlow = path.startsWith("/b2/exams/");
        const intoModule = path.match(
          /^\/b2\/(reading|listening|speaking|writing|exams)(\/|$)/,
        );
        if (
          (prevLabel === "landing" && intoModule) ||
          (intoWorkspace && prevLabel === `${intoWorkspace[1]}_select`) ||
          (intoExamFlow && prevLabel === "exams_select")
        ) {
          markDone(prevLabel);
        }
      }
      destroyDriver();
    }
    phaseLabelRef.current = newLabel;

    setActiveFeature(feature);
    setActivePhase(phase);
  }, [
    location.pathname,
    isB2,
    isDone,
    tourState,
    destroyDriver,
    markDone,
    topSwitcherDone,
  ]);

  // Execute tour based on detected feature/phase
  useEffect(() => {
    if (!activeFeature || !activePhase || !isB2 || isDone) return;

    let steps = [];
    let opts = {};

    const finishPhase = (phase) => () => {
      markDone(phase);
      destroyDriver();
      phaseLabelRef.current = null;
      setActiveFeature(null);
      setActivePhase(null);
    };

    if (activeFeature === "landing") {
      steps = getB2LandingSteps(skipEntireTour);
      opts = {
        showSkipBtn: true,
        onComplete: finishPhase("landing"),
        onClose: skipEntireTour,
      };
    } else if (activeFeature === "exams") {
      steps = getB2ExamsSelectSteps();
      opts = {
        onComplete: finishPhase("exams_select"),
        onClose: finishPhase("exams_select"),
      };
    } else if (B2_MODULES.includes(activeFeature)) {
      const label = `${activeFeature}_select`;
      steps = getB2ModuleSelectSteps(activeFeature);
      opts = {
        onComplete: finishPhase(label),
        onClose: finishPhase(label),
      };
    } else {
      return;
    }

    if (steps.length === 0) return;

    // Select pages wait briefly for async exercise lists; an empty module
    // still gets its pills step rather than stalling on the card selector.
    const maxAttempts = activePhase === "select" ? 8 : 20;
    const cleanup = waitForTourTargets(
      steps,
      (availableSteps) => startDriver(availableSteps, opts),
      maxAttempts,
    );
    return cleanup;
  }, [
    activeFeature,
    activePhase,
    isB2,
    isDone,
    markDone,
    skipEntireTour,
    startDriver,
    waitForTourTargets,
  ]);

  const tourContextValue = {
    isTourActive: !!activeFeature && isB2 && !isDone,
    currentFeature: activeFeature,
    currentPhase: activePhase,
  };

  if (!isB2 || isDone) {
    return (
      <B2TourContext.Provider
        value={{
          isTourActive: false,
          currentFeature: null,
          currentPhase: null,
        }}
      >
        {children}
      </B2TourContext.Provider>
    );
  }

  return (
    <B2TourContext.Provider value={tourContextValue}>
      {children}
    </B2TourContext.Provider>
  );
}
