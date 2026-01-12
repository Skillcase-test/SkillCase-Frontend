import { useEffect, useRef, useState, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tourStyles.css";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { setOnboardingComplete } from "../redux/auth/authSlice";
import api from "../api/axios";
import { TourContext } from "./TourContext";
import {
  TOUR_PAGES,
  getLandingSteps,
  getFlashcardSelectSteps,
  getFlashcardPracticeSteps,
  getPronounceSelectSteps,
  getPronouncePracticeSteps,
  getStoriesSteps,
  getStoryViewSteps,
  getListenerSteps,
  getListenerViewSteps,
  getCompletionStep,
} from "./tourSteps";

const TOUR_STATE_KEY = "skillcase_tour_state";

export default function ProductTour({ children }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const driverRef = useRef(null);
  const isSkippingRef = useRef(false); // Track if user is skipping tour
  const [tourPage, setTourPage] = useState(null);
  const [showContinueBtn, setShowContinueBtn] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [listenerTaps, setListenerTaps] = useState(0);
  const [pronounceStep, setPronounceStep] = useState(0); // 0=listen, 1=record, 2=speaking, 3=stop, 4=done

  // Show success animation then continue button
  const showSuccessThenContinue = () => {
    setShowSuccessPopup(true);
    setTimeout(() => {
      setShowSuccessPopup(false);
      setShowContinueBtn(true);
    }, 2000);
  };

  // Load saved tour state
  useEffect(() => {
    if (user && user.onboarding_completed === false) {
      const saved = localStorage.getItem(TOUR_STATE_KEY);
      if (saved) {
        const { page } = JSON.parse(saved);
        setTourPage(page);
      } else {
        setTourPage(TOUR_PAGES.LANDING);
      }
    }
  }, [user]);

  const saveTourState = useCallback((page) => {
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify({ page }));
  }, []);

  const completeTour = useCallback(async () => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
    localStorage.removeItem(TOUR_STATE_KEY);
    setShowContinueBtn(false);
    try {
      await api.post("/user/complete-onboarding");
      dispatch(setOnboardingComplete());
    } catch (err) {
      console.error("Error completing tour:", err);
      dispatch(setOnboardingComplete());
    }
  }, [dispatch]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Start tour based on current page
  useEffect(() => {
    if (!user || user.onboarding_completed !== false || !tourPage) return;

    const profLevel = user.user_prof_level || "A1";
    const path = location.pathname;
    let steps = [];
    let shouldStart = false;

    // Auto-transition to STORY_VIEW when user enters a story during STORIES phase
    if (path.match(/^\/story\/.+/) && tourPage === TOUR_PAGES.STORIES) {
      setTourPage(TOUR_PAGES.STORY_VIEW);
      saveTourState(TOUR_PAGES.STORY_VIEW);
      return;
    }

    // Auto-transition to COMPLETE when user finishes story (clicks "Read another story")
    if (path === "/stories" && tourPage === TOUR_PAGES.STORY_VIEW) {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
      setTourPage(TOUR_PAGES.COMPLETE);
      saveTourState(TOUR_PAGES.COMPLETE);
      navigate("/");
      return;
    }

    // Auto-transition to LISTENER_VIEW if user enters a conversation
    if (
      path.match(/^\/conversation\/.+\/.+$/) &&
      tourPage === TOUR_PAGES.LISTENER
    ) {
      setTourPage(TOUR_PAGES.LISTENER_VIEW);
      saveTourState(TOUR_PAGES.LISTENER_VIEW);
      return;
    }

    // Auto-transition to STORIES when user returns from conversation view
    if (
      path === `/conversation/${profLevel}` &&
      tourPage === TOUR_PAGES.LISTENER_VIEW
    ) {
      setTourPage(TOUR_PAGES.STORIES);
      saveTourState(TOUR_PAGES.STORIES);
      navigate("/stories");
      return;
    }

    // Auto-transitions for Click-Based Navigation
    if (path === `/practice/${profLevel}` && tourPage === TOUR_PAGES.LANDING) {
      setTourPage(TOUR_PAGES.FLASHCARD_SELECT);
      saveTourState(TOUR_PAGES.FLASHCARD_SELECT);
      return;
    }

    if (
      path.match(/^\/practice\/[^/]+\/[^/]+$/) &&
      tourPage === TOUR_PAGES.FLASHCARD_SELECT
    ) {
      setTourPage(TOUR_PAGES.FLASHCARD_PRACTICE);
      saveTourState(TOUR_PAGES.FLASHCARD_PRACTICE);
      return;
    }

    if (
      path === `/pronounce/${profLevel}` &&
      tourPage === TOUR_PAGES.FLASHCARD_PRACTICE
    ) {
      setTourPage(TOUR_PAGES.PRONOUNCE_SELECT);
      saveTourState(TOUR_PAGES.PRONOUNCE_SELECT);
      return;
    }

    if (
      path.match(/^\/pronounce\/[^/]+\/[^/]+$/) &&
      tourPage === TOUR_PAGES.PRONOUNCE_SELECT
    ) {
      setTourPage(TOUR_PAGES.PRONOUNCE_PRACTICE);
      saveTourState(TOUR_PAGES.PRONOUNCE_PRACTICE);
      return;
    }

    if (path === "/" && tourPage === TOUR_PAGES.LANDING) {
      steps = getLandingSteps(skipTour);
      shouldStart = true;
    } else if (
      path === `/practice/${profLevel}` &&
      tourPage === TOUR_PAGES.FLASHCARD_SELECT
    ) {
      steps = getFlashcardSelectSteps();
      shouldStart = true;
    } else if (
      path.match(/^\/practice\/[^/]+\/[^/]+$/) &&
      tourPage === TOUR_PAGES.FLASHCARD_PRACTICE
    ) {
      steps = getFlashcardPracticeSteps();
      shouldStart = true;
    } else if (
      path === `/pronounce/${profLevel}` &&
      tourPage === TOUR_PAGES.PRONOUNCE_SELECT
    ) {
      steps = getPronounceSelectSteps();
      shouldStart = true;
    } else if (
      path.match(/^\/pronounce\/[^/]+\/[^/]+$/) &&
      tourPage === TOUR_PAGES.PRONOUNCE_PRACTICE
    ) {
      steps = getPronouncePracticeSteps();
      shouldStart = true;
    } else if (
      path === `/conversation/${profLevel}` &&
      tourPage === TOUR_PAGES.LISTENER
    ) {
      steps = getListenerSteps();
      shouldStart = true;
    } else if (
      path.match(/^\/conversation\/.+\/.+$/) &&
      tourPage === TOUR_PAGES.LISTENER_VIEW
    ) {
      steps = getListenerViewSteps();
      shouldStart = true;
    } else if (path === "/stories" && tourPage === TOUR_PAGES.STORIES) {
      steps = getStoriesSteps();
      shouldStart = true;
    } else if (
      path.match(/^\/story\/.+/) &&
      tourPage === TOUR_PAGES.STORY_VIEW
    ) {
      steps = getStoryViewSteps();
      shouldStart = true;
    } else if (tourPage === TOUR_PAGES.COMPLETE && path === "/") {
      steps = getCompletionStep();
      shouldStart = true;
    }

    if (shouldStart && steps.length > 0) {
      const targetElement = steps[0].element; // Get first step's element selector (if string)

      const startDriver = () => {
        if (driverRef.current) {
          driverRef.current.destroy();
        }

        const driverObj = driver({
          showProgress: true,
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Got it",
          progressText: "{{current}} / {{total}}",
          allowClose: true,
          allowClickMaskNextStep: true,
          stagePadding: 8,
          stageRadius: 12,
          steps: steps,
          onPopoverRender: (popover, { state }) => {
            // Show Skip Tour button on first step
            if (state.activeIndex === 0 && tourPage === TOUR_PAGES.LANDING) {
              const skipBtn = document.createElement("button");
              skipBtn.innerText = "Skip Tour";
              skipBtn.className = "skip-tour-btn";
              skipBtn.onclick = () => {
                isSkippingRef.current = true;
                completeTour();
              };
              popover.footerButtons.prepend(skipBtn);
            }
          },
          onCloseClick: () => {
            isSkippingRef.current = true;
            completeTour();
          },
          onDestroyStarted: () => {
            if (!isSkippingRef.current) {
              handleTourComplete();
            }
            isSkippingRef.current = false;
            driverRef.current = null;
            if (tourPage === TOUR_PAGES.LISTENER_VIEW) {
              setListenerTaps(0); // Reset count for free mode
            }
          },
          onNextClick: () => {
            if (driverRef.current && driverRef.current.hasNextStep()) {
              driverRef.current.moveNext();
            } else if (driverRef.current) {
              // Call handleTourComplete before destroy to ensure proper cleanup
              handleTourComplete();
              driverRef.current.destroy();
              driverRef.current = null;
              if (tourPage === TOUR_PAGES.LISTENER_VIEW) {
                setListenerTaps(0);
              }
            }
          },
        });

        driverRef.current = driverObj;
        driverObj.drive();
      };

      // Wait for target element to appear
      const waitForTarget = () => {
        if (typeof targetElement === "string") {
          let attempts = 0;
          const maxAttempts = 20;

          const check = setInterval(() => {
            attempts++;
            if (document.querySelector(targetElement)) {
              clearInterval(check);
              startDriver();
            } else if (attempts >= maxAttempts) {
              clearInterval(check);
              // Try starting anyway if element not found
              startDriver();
            }
          }, 500);
        } else {
          // No specific selector, use standard delay
          setTimeout(startDriver, 600);
        }
      };

      waitForTarget();
    }
  }, [location.pathname, tourPage, user, skipTour, saveTourState]);

  const handleTourComplete = useCallback(() => {
    const profLevel = user?.user_prof_level || "A1";

    if (tourPage === TOUR_PAGES.LANDING) {
      setTourPage(TOUR_PAGES.FLASHCARD_SELECT);
      saveTourState(TOUR_PAGES.FLASHCARD_SELECT);
      navigate(`/practice/${profLevel}`);
    } else if (tourPage === TOUR_PAGES.FLASHCARD_SELECT) {
      setTourPage(TOUR_PAGES.FLASHCARD_PRACTICE);
      saveTourState(TOUR_PAGES.FLASHCARD_PRACTICE);
    } else if (tourPage === TOUR_PAGES.PRONOUNCE_SELECT) {
      setTourPage(TOUR_PAGES.PRONOUNCE_PRACTICE);
      saveTourState(TOUR_PAGES.PRONOUNCE_PRACTICE);
    } else if (tourPage === TOUR_PAGES.LISTENER) {
      // Transition to stories as fallback
      setTourPage(TOUR_PAGES.STORIES);
      saveTourState(TOUR_PAGES.STORIES);
      navigate("/stories");
    } else if (tourPage === TOUR_PAGES.LISTENER_VIEW) {
      // Let user explore until interaction count is met
    } else if (tourPage === TOUR_PAGES.STORIES) {
      completeTour();
    } else if (tourPage === TOUR_PAGES.STORY_VIEW) {
      setTourPage(TOUR_PAGES.COMPLETE);
      saveTourState(TOUR_PAGES.COMPLETE);
      navigate("/");
    } else if (tourPage === TOUR_PAGES.COMPLETE) {
      completeTour();
    }
  }, [tourPage, user, navigate, saveTourState, completeTour]);

  // Track flashcard reveal and auto-advance to pronunciation
  useEffect(() => {
    const handleFlashcardRevealed = () => {
      if (tourPage !== TOUR_PAGES.FLASHCARD_PRACTICE) return;
        // Destroy active tour popover
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      // Show success animation then continue to pronunciation
      showSuccessThenContinue();
    };

    window.addEventListener("tour:flashcardRevealed", handleFlashcardRevealed);
    return () =>
      window.removeEventListener(
        "tour:flashcardRevealed",
        handleFlashcardRevealed
      );
  }, [tourPage]);

  // Track pronounce step changes
  useEffect(() => {
    const handlePronounceStep = (e) => {
      if (tourPage !== TOUR_PAGES.PRONOUNCE_PRACTICE) return;
      const step = e.detail.step;
      setPronounceStep(step);

      // Destroy popover when user starts interacting
      if (step === 1 && driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }

      // Show success when assessment is shown
      if (step === 4) {
        showSuccessThenContinue();
      }
    };

    window.addEventListener("tour:pronounceStep", handlePronounceStep);
    return () =>
      window.removeEventListener("tour:pronounceStep", handlePronounceStep);
  }, [tourPage]);

  // Track listener interactions and show continue after first play
  useEffect(() => {
    const handleListenerInteraction = () => {
      if (tourPage !== TOUR_PAGES.LISTENER_VIEW) return;

      // Destroy active tour
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }

      // Show success and continue after brief delay
      setTimeout(() => {
        showSuccessThenContinue();
      }, 500);
    };

    window.addEventListener(
      "tour:listenerInteraction",
      handleListenerInteraction
    );
    return () =>
      window.removeEventListener(
        "tour:listenerInteraction",
        handleListenerInteraction
      );
  }, [tourPage]);

  const handleContinue = () => {
    const profLevel = user?.user_prof_level || "A1";
    setShowContinueBtn(false);
    setListenerTaps(0);
    setPronounceStep(0);

    if (tourPage === TOUR_PAGES.FLASHCARD_PRACTICE) {
      setTourPage(TOUR_PAGES.PRONOUNCE_SELECT);
      saveTourState(TOUR_PAGES.PRONOUNCE_SELECT);
      navigate(`/pronounce/${profLevel}`);
    } else if (tourPage === TOUR_PAGES.PRONOUNCE_PRACTICE) {
      // After Pronunciation go to Listener
      setTourPage(TOUR_PAGES.LISTENER);
      saveTourState(TOUR_PAGES.LISTENER);
      navigate(`/conversation/${profLevel}`);
    } else if (tourPage === TOUR_PAGES.LISTENER_VIEW) {
      // After Listener go to Stories
      setTourPage(TOUR_PAGES.STORIES);
      saveTourState(TOUR_PAGES.STORIES);
      navigate("/stories");
    }
  };

  // Context value for child components
  const tourContextValue = {
    isTourActive: !!tourPage && user?.onboarding_completed === false,
    tourPage,
    pronounceStep,
  };

  // If not in tour, just render children
  if (!user || user.onboarding_completed !== false) {
    return (
      <TourContext.Provider
        value={{ isTourActive: false, tourPage: null, pronounceStep: 0 }}
      >
        {children}
      </TourContext.Provider>
    );
  }

  return (
    <TourContext.Provider value={tourContextValue}>
      {children}
      {showSuccessPopup && (
        <div className="tour-success-popup">✨ Great Job!</div>
      )}
      {showContinueBtn && (
        <button className="tour-continue-btn" onClick={handleContinue}>
          {tourPage === TOUR_PAGES.LISTENER_VIEW
            ? "Continue to Stories →"
            : tourPage === TOUR_PAGES.PRONOUNCE_PRACTICE
            ? "Continue to Listener →"
            : "Continue to Pronunciation →"}
        </button>
      )}
    </TourContext.Provider>
  );
}
