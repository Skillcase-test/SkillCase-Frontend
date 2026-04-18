import { useEffect, useRef, useState, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tourStyles.css";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { setA1OnboardingComplete } from "../redux/auth/authSlice";
import api from "../api/axios";
import { getA1MigrationStatus } from "../api/a1Api";
import { A1TourContext } from "./A1TourContext";
import {
  getA1LandingSteps,
  getA1FlashcardSelectSteps,
  getA1FlashcardPracticeSteps,
  getA1GrammarSelectSteps,
  getA1GrammarExplanationSteps,
  getA1ListeningSelectSteps,
  getA1ListeningSteps,
  getA1ListeningAfterSubtitleSteps,
  getA1SpeakingSelectSteps,
  getA1SpeakingCardSteps,
  getA1ReadingSelectSteps,
  getA1ReadingSteps,
  getA1NewsListSteps,
  getA1TestSelectSteps,
  getA1TestPrerequisiteSteps,
  getA1TestLevelSteps,
} from "./a1TourSteps";

const A1_TOUR_STATE_KEY = "a1_tour_state";

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
  "news_list",
  "test_select",
  "test_level",
];

function getInitialState() {
  const saved = localStorage.getItem(A1_TOUR_STATE_KEY);
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
  "grammar:select": "grammar_select",
  "grammar:explanation": "grammar",
  "listening:select": "listening_select",
  "listening:content": "listening",
  "speaking:select": "speaking_select",
  "speaking:practice": "speaking",
  "reading:select": "reading_select",
  "reading:content": "reading",
  "news:list": "news_list",
  "test:select": "test_select",
  "test:level": "test_level",
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

function cleanupTapOverlays() {
  document
    .querySelectorAll(".a2-tap-overlay-injected")
    .forEach((el) => el.remove());
}

export default function A1ProductTour({ children }) {
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
  const [a1MigrationStatus, setA1MigrationStatus] = useState(null);
  const [migrationLoading, setMigrationLoading] = useState(false);

  const isA1 = user?.user_prof_level?.toLowerCase() === "a1";
  const isDone = user?.a1_onboarding_completed === true;
  const canRunA1Tour =
    isA1 &&
    ["revamp_opted_in", "revamp_forced_after_deadline"].includes(
      a1MigrationStatus,
    );

  useEffect(() => {
    if (!user?.user_id || !isA1) {
      setA1MigrationStatus(null);
      setMigrationLoading(false);
      return;
    }

    let mounted = true;
    setMigrationLoading(true);
    getA1MigrationStatus()
      .then((res) => {
        if (!mounted) return;
        setA1MigrationStatus(res?.data?.status || "legacy_a1");
      })
      .catch(() => {
        if (!mounted) return;
        setA1MigrationStatus("legacy_a1");
      })
      .finally(() => {
        if (mounted) setMigrationLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.user_id, isA1]);

  useEffect(() => {
    const onMigrationChange = (event) => {
      const nextStatus = event?.detail?.status;
      if (!nextStatus) return;
      setA1MigrationStatus(nextStatus);
      setMigrationLoading(false);
    };

    window.addEventListener("a1:migration-status-changed", onMigrationChange);
    return () =>
      window.removeEventListener(
        "a1:migration-status-changed",
        onMigrationChange,
      );
  }, []);

  useEffect(() => {
    activeFeatureRef.current = activeFeature;
  }, [activeFeature]);

  useEffect(() => {
    // Ensure stale keys (e.g., news_detail) are removed from persisted state.
    localStorage.setItem(A1_TOUR_STATE_KEY, JSON.stringify(tourState));
  }, [tourState]);

  const markDone = useCallback(
    (phase) => {
      setTourState((prev) => {
        if (prev[phase]) return prev;
        const next = { ...prev, [phase]: true };
        localStorage.setItem(A1_TOUR_STATE_KEY, JSON.stringify(next));
        if (isAllComplete(next)) {
          api.post("/user/complete-a1-onboarding").catch(() => {});
          dispatch(setA1OnboardingComplete());
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
    localStorage.setItem(A1_TOUR_STATE_KEY, JSON.stringify(allDone));
    setTourState(allDone);
    api.post("/user/complete-a1-onboarding").catch(() => {});
    dispatch(setA1OnboardingComplete());
    phaseLabelRef.current = null;
    setActiveFeature(null);
    setActivePhase(null);
  }, [destroyDriver, dispatch]);

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
    setSpeakingStep(0);
    setActiveFeature(null);
    setActivePhase(null);
  }, [markDone]);

  const startDriver = useCallback(
    (steps, { onComplete, onClose, showSkipBtn = false } = {}) => {
      destroyDriver();

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

            // Wait for driver + browser to finish any auto-scroll before measuring.
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

  const waitForElement = useCallback((selector, cb, maxAttempts = 20) => {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (document.querySelector(selector)) {
        clearInterval(check);
        cb();
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        cb();
      }
    }, 500);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!canRunA1Tour || isDone || migrationLoading) {
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
    } else if (path === "/a1/flashcard" && !tourState.flashcard_select) {
      feature = "flashcard";
      phase = "select";
    } else if (
      path.match(/^\/a1\/flashcard\/.+/) &&
      !tourState.flashcard_practice
    ) {
      feature = "flashcard";
      phase = "practice";
    } else if (path === "/a1/grammar" && !tourState.grammar_select) {
      feature = "grammar";
      phase = "select";
    } else if (path.match(/^\/a1\/grammar\/.+/) && !tourState.grammar) {
      feature = "grammar";
      phase = "explanation";
    } else if (path === "/a1/listening" && !tourState.listening_select) {
      feature = "listening";
      phase = "select";
    } else if (path.match(/^\/a1\/listening\/.+/) && !tourState.listening) {
      feature = "listening";
      phase = "content";
    } else if (path === "/a1/speaking" && !tourState.speaking_select) {
      feature = "speaking";
      phase = "select";
    } else if (path.match(/^\/a1\/speaking\/.+/) && !tourState.speaking) {
      feature = "speaking";
      phase = "practice";
    } else if (path === "/a1/reading" && !tourState.reading_select) {
      feature = "reading";
      phase = "select";
    } else if (path.match(/^\/a1\/reading\/.+/) && !tourState.reading) {
      feature = "reading";
      phase = "content";
    } else if (path === "/news" && !tourState.news_list) {
      feature = "news";
      phase = "list";
    } else if (path === "/a1/test" && !tourState.test_select) {
      feature = "test";
      phase = "select";
    } else if (path.match(/^\/a1\/test\/[^/]+$/) && !tourState.test_level) {
      feature = "test";
      phase = "level";
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
    canRunA1Tour,
    isDone,
    migrationLoading,
    tourState,
    destroyDriver,
    markDone,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !activeFeature ||
      !activePhase ||
      !canRunA1Tour ||
      isDone ||
      migrationLoading
    )
      return;

    let steps = [];
    let opts = {};

    const finishPhase = (phase) => () => {
      markDone(phase);
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
        steps = getA1LandingSteps(skipEntireTour);
        opts = {
          showSkipBtn: true,
          onComplete: finishPhase("landing"),
          onClose: skipEntireTour,
        };
        break;

      case "flashcard:select":
        steps = getA1FlashcardSelectSteps();
        opts = { onComplete: finishPhase("flashcard_select") };
        break;

      case "flashcard:practice":
        steps = getA1FlashcardPracticeSteps();
        opts = { onComplete: finishPhase("flashcard_practice") };
        break;

      case "grammar:select":
        steps = getA1GrammarSelectSteps();
        opts = { onComplete: finishPhase("grammar_select") };
        break;

      case "grammar:explanation":
        steps = getA1GrammarExplanationSteps();
        opts = { onComplete: finishPhase("grammar") };
        break;

      case "listening:select":
        steps = getA1ListeningSelectSteps();
        opts = { onComplete: finishPhase("listening_select") };
        break;

      case "listening:content":
        steps = getA1ListeningSteps();
        opts = { onComplete: finishPhase("listening") };
        break;

      case "speaking:select":
        steps = getA1SpeakingSelectSteps();
        opts = { onComplete: finishPhase("speaking_select") };
        break;

      case "speaking:practice":
        steps = getA1SpeakingCardSteps();
        opts = {
          onComplete: () => {
            setSpeakingStep(1);
            window.dispatchEvent(
              new CustomEvent("tour:A1SpeakingStep", {
                detail: { step: 1 },
              }),
            );
          },
        };
        break;

      case "reading:select":
        steps = getA1ReadingSelectSteps();
        opts = { onComplete: finishPhase("reading_select") };
        break;

      case "reading:content":
        steps = getA1ReadingSteps();
        opts = { onComplete: finishPhase("reading") };
        break;

      case "news:list":
        steps = getA1NewsListSteps();
        opts = { onComplete: finishPhaseWithSuccess("news_list") };
        break;

      case "test:select":
        steps = getA1TestSelectSteps();
        opts = { onComplete: finishPhase("test_select") };
        break;

      case "test:level":
        steps = getA1TestLevelSteps();
        opts = { onComplete: finishPhaseWithSuccess("test_level") };
        break;

      default:
        return;
    }

    if (steps.length === 0) return;

    const firstEl = steps[0].element;
    if (typeof firstEl === "string") {
      const cleanup = waitForElement(firstEl, () => startDriver(steps, opts));
      return cleanup;
    }

    const t = setTimeout(() => startDriver(steps, opts), 600);
    return () => clearTimeout(t);
  }, [
    activeFeature,
    activePhase,
    canRunA1Tour,
    migrationLoading,
    isDone,
    markDone,
    showSuccess,
    skipEntireTour,
    startDriver,
    waitForElement,
  ]);

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
    window.addEventListener("tour:A1FlashcardRevealed", handler);
    return () =>
      window.removeEventListener("tour:A1FlashcardRevealed", handler);
  }, [destroyDriver, markDone, showSuccess]);

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
    window.addEventListener("tour:A1GrammarStartPractice", handler);
    return () =>
      window.removeEventListener("tour:A1GrammarStartPractice", handler);
  }, [destroyDriver, markDone, showSuccess]);

  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "listening") return;
      destroyDriver();
      setTimeout(() => {
        const steps = getA1ListeningAfterSubtitleSteps();
        const el = steps[0]?.element;
        if (!el || !document.querySelector(el)) {
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
    window.addEventListener("tour:A1ListeningSubtitle", handler);
    return () =>
      window.removeEventListener("tour:A1ListeningSubtitle", handler);
  }, [destroyDriver, startDriver, markDone, showSuccess]);

  useEffect(() => {
    const handler = (e) => {
      if (activeFeatureRef.current !== "speaking") return;
      const step = e.detail.step;
      setSpeakingStep(step);

      if (step === 4) {
        showSuccess();
        markDone("speaking");
        phaseLabelRef.current = null;
        setSpeakingStep(0);
        setActiveFeature(null);
        setActivePhase(null);
      }
    };
    window.addEventListener("tour:A1SpeakingStep", handler);
    return () => window.removeEventListener("tour:A1SpeakingStep", handler);
  }, [markDone, showSuccess]);

  useEffect(() => {
    const handler = () => {
      if (activeFeatureRef.current !== "test") return;
      destroyDriver();
      setTimeout(() => {
        const steps = getA1TestPrerequisiteSteps();
        const el = steps[0]?.element;
        const waitId = setInterval(() => {
          if (el && document.querySelector(el)) {
            clearInterval(waitId);
            startDriver(steps, {
              onComplete: () => {
                setActiveFeature(null);
                setActivePhase(null);
              },
            });
          }
        }, 300);
        setTimeout(() => clearInterval(waitId), 10000);
      }, 300);
    };
    window.addEventListener("tour:A1TestPrerequisite", handler);
    return () => window.removeEventListener("tour:A1TestPrerequisite", handler);
  }, [destroyDriver, startDriver]);

  const ctx = {
    isTourActive: !!activeFeature && isA1 && !isDone,
    currentFeature: activeFeature,
    currentPhase: activePhase,
    speakingStep,
  };

  if (!isA1 || isDone) {
    return (
      <A1TourContext.Provider
        value={{
          isTourActive: false,
          currentFeature: null,
          currentPhase: null,
          speakingStep: 0,
        }}
      >
        {children}
      </A1TourContext.Provider>
    );
  }

  return (
    <A1TourContext.Provider value={ctx}>
      {children}
      {showSuccessPopup && (
        <div className="tour-success-popup">✨ Great Work!</div>
      )}
    </A1TourContext.Provider>
  );
}
