import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import GuideSpotlight from "./GuideSpotlight";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { isB1PracticeLevel } from "../utils/b1Progress";
import { getMayaImage } from "../utils/mayaAvatars";
import { setTopSwitcherTourComplete } from "../redux/auth/authSlice";
import api from "../api/axios";

const SETTLE_DELAYS_MS = [60, 220, 500];

function measure(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function isShellRoute(pathname = "") {
  return (
    pathname === "/" ||
    pathname.startsWith("/learn-german") ||
    pathname.startsWith("/job-screening")
  );
}

export default function TopSwitcherTour() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isFeatureEnabled } = useFeatureFlags();

  const showGermanClasses = isFeatureEnabled("german_classes");
  const isB1 = isB1PracticeLevel(user?.user_prof_level);

  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const [initialRoute, setInitialRoute] = useState(() => location.pathname);
  const [initialTab, setInitialTab] = useState(() => {
    if (location.pathname.startsWith("/learn-german")) return "learn";
    if (location.pathname.startsWith("/job-screening")) return "jobs";
    return "practice";
  });
  const hasInitializedRef = useRef(false);

  // Check whether tour is already complete for this user
  const isCompleted = Boolean(
    user?.top_switcher_tour_completed ||
      (user?.user_id &&
        localStorage.getItem(`top_switcher_tour_completed_${user.user_id}`) === "true"),
  );

  // Check if current route is a valid shell screen to start the tour
  const onShell = isShellRoute(location.pathname);

  // Initialize tour on first arrival at a shell route
  useEffect(() => {
    if (!user?.user_id || isCompleted || hasInitializedRef.current || !onShell) {
      return;
    }

    hasInitializedRef.current = true;
    setInitialRoute(location.pathname);
    let initTab = "practice";
    if (location.pathname.startsWith("/learn-german")) {
      initTab = "learn";
    } else if (location.pathname.startsWith("/job-screening")) {
      initTab = "jobs";
    }
    setInitialTab(initTab);

    window.__topSwitcherTourActive = true;
    try {
      sessionStorage.setItem("top_switcher_tour_active", "true");
    } catch (_err) {}

    setIsActive(true);
    window.dispatchEvent(new CustomEvent("lgTourStart"));
  }, [user?.user_id, isCompleted, onShell, location.pathname]);

  useEffect(() => {
    return () => {
      window.__topSwitcherTourActive = false;
      try {
        sessionStorage.removeItem("top_switcher_tour_active");
      } catch (_err) {}
    };
  }, []);

  // Build the ordered steps based on starting tab and pathway
  const steps = useMemo(() => {
    const initTab = initialTab || "practice";

    if (isB1) {
      const allB1 = {
        jobs: {
          id: "jobs",
          tab: "jobs",
          route: "/job-screening",
          title: "German Jobs",
          body: "Explore job roles, track your employer screening status, and get matched with German healthcare facilities.",
        },
        practice: {
          id: "practice",
          tab: "practice",
          route: "/",
          title: "Job Preparation",
          body: "Practice professional German vocabulary and interview skills tailored for your career in Germany.",
        },
        courses: {
          id: "courses",
          tab: "courses",
          route: "/video-courses",
          title: "German Classes",
          body: "Watch recorded video lessons and live class sessions anytime to strengthen your understanding.",
        },
      };

      const ordered =
        initTab === "jobs"
          ? [allB1.jobs, allB1.practice]
          : [allB1.practice, allB1.jobs];

      if (showGermanClasses) {
        ordered.push(allB1.courses);
      }
      return ordered;
    }

    // A1/A2 / Standard German Learning
    const allA1 = {
      learn: {
        id: "learn",
        tab: "learn",
        route: "/learn-german",
        title: "Guided German",
        body: "Here, I will guide you step by step through chapters and lessons, from the basics all the way to fluency.",
      },
      practice: {
        id: "practice",
        tab: "practice",
        route: "/",
        title: "German Practice",
        body: "Hey! This is where you practice daily with flashcards, speaking, listening, and grammar to build your habits.",
      },
      courses: {
        id: "courses",
        tab: "courses",
        route: "/video-courses",
        title: "German Classes",
        body: "Watch recorded video lessons and live class sessions anytime to strengthen your understanding.",
      },
    };

    const ordered =
      initTab === "learn"
        ? [allA1.learn, allA1.practice]
        : [allA1.practice, allA1.learn];

    if (showGermanClasses) {
      ordered.push(allA1.courses);
    }
    return ordered;
  }, [initialTab, isB1, showGermanClasses]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;

  // Navigate to step route if needed, and measure target tab rect
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Navigate to step route if not already there
    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route, { replace: true });
    }

    const update = () => {
      const el = document.querySelector(`[data-tour-tab="${currentStep.tab}"]`);
      if (el) {
        setRect(measure(el));
      }
    };

    update();
    const timers = SETTLE_DELAYS_MS.map((d) => window.setTimeout(update, d));

    // Safety escape hatch: if tab element cannot be found after settling, bail out
    const escapeHatchTimer = window.setTimeout(() => {
      const el = document.querySelector(`[data-tour-tab="${currentStep.tab}"]`);
      if (!el) {
        handleExit(false);
      }
    }, 1500);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(escapeHatchTimer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isActive, currentStep, location.pathname, navigate]);

  // Complete and persist tour
  const handleExit = (completed) => {
    setIsActive(false);
    setRect(null);

    window.__topSwitcherTourActive = false;
    try {
      sessionStorage.removeItem("top_switcher_tour_active");
    } catch (_err) {}

    // Return to the initial route user entered on
    const returnRoute = initialRoute || "/";
    if (location.pathname !== returnRoute || currentStep?.route !== returnRoute) {
      navigate(returnRoute, { replace: true });
    }

    if (user?.user_id) {
      localStorage.setItem(`top_switcher_tour_completed_${user.user_id}`, "true");
    }

    dispatch(setTopSwitcherTourComplete());
    api.post("/user/complete-top-switcher-tour").catch(() => {});

    window.dispatchEvent(new CustomEvent("lgTourEnd"));
    window.dispatchEvent(
      new CustomEvent("topSwitcherTourComplete", {
        detail: { completed, initialRoute: returnRoute },
      }),
    );
  };

  const handleNext = () => {
    if (isLastStep) {
      handleExit(true);
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    handleExit(false);
  };

  if (!isActive || !currentStep || !rect) {
    return null;
  }

  const mayaAvatar = getMayaImage("smiling", user?.occupation);

  return (
    <GuideSpotlight rect={rect} radius={14} onClick={() => {}}>
      <div className="flex items-start gap-3">
        <img
          src={mayaAvatar}
          alt="Maya"
          className="w-12 h-12 rounded-full object-contain shrink-0 drop-shadow-xs bg-blue-50 border border-blue-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              data-testid="top-switcher-tour-title"
              className="text-sm font-bold text-slate-900 leading-tight"
            >
              {currentStep.title}
            </h4>
            <button
              type="button"
              data-testid="top-switcher-tour-skip"
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
            >
              Skip
            </button>
          </div>
          <p
            data-testid="top-switcher-tour-body"
            className="text-xs text-slate-600 mt-1.5 leading-relaxed"
          >
            {currentStep.body}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.id}
              data-testid={`top-switcher-dot-${i}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === stepIndex ? "w-4 bg-[#002856]" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              data-testid="top-switcher-tour-back"
              onClick={handleBack}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer transition"
            >
              Back
            </button>
          )}
          <button
            type="button"
            data-testid="top-switcher-tour-next"
            onClick={handleNext}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#002856] hover:bg-[#001e40] cursor-pointer transition"
          >
            {isLastStep ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </GuideSpotlight>
  );
}
