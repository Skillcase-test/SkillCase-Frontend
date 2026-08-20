import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getLGMode, setLGMode } from "../api/learnGermanApi";
import { trackClarityEvent } from "../observability/clarity";
import { hapticLight } from "../utils/haptics";
import { isB1PracticeLevel } from "../utils/b1Progress";
import { syncModeIntoRedux } from "../utils/lgMode";
import {
  isScholarshipRoute,
  getSwitcherBlendColor,
} from "../utils/shellRoutes";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import bookImg from "../assets/book.webp";
import mayaSmilingImg from "../assets/onboarding/mayaSmiling.webp";
import classImg from "../assets/class.webp";
import bagImg from "../assets/bag.webp";

const isLearnPath = (pathname = "") => pathname.startsWith("/learn-german");
const isCoursesPath = (pathname = "") => pathname === "/video-courses";
const RECENT_MODE_SWITCH_MS = 10_000;

/**
 * Top mode switcher — the redesigned replacement for BottomModeSwitcher.
 * Renders inside the navy navbar header on the three primary shell screens:
 * "/" (Exam & Practice), "/learn-german" (Guided Learning) and
 * "/video-courses" (German Classes). The active tab is derived from the
 * current route; Learn/Practice still persist the legacy lg_preferred_mode
 * so LandingPage redirects + navbar behavior stay consistent.
 */
export default function TopModeSwitcher({ isTourActive = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled } = useFeatureFlags();
  const showGermanClasses = isFeatureEnabled("german_classes");
  // B1/B2 users get a two-tab switcher: Exam & Practice + Jobs. The Jobs tab
  // is the gateway into the job-screening pipeline (and back via practice).
  const isB1 = isB1PracticeLevel(user?.user_prof_level);
  const [localTourActive, setLocalTourActive] = useState(false);

  useEffect(() => {
    const handleTourStart = () => setLocalTourActive(true);
    const handleTourEnd = () => setLocalTourActive(false);

    window.addEventListener("lgTourStart", handleTourStart);
    window.addEventListener("lgTourEnd", handleTourEnd);

    return () => {
      window.removeEventListener("lgTourStart", handleTourStart);
      window.removeEventListener("lgTourEnd", handleTourEnd);
    };
  }, []);

  const [isJobWelcome, setIsJobWelcome] = useState(false);

  useEffect(() => {
    const handleJobWelcome = (e) => {
      setIsJobWelcome(Boolean(e?.detail?.isWelcome));
    };
    window.addEventListener("jobScreeningWelcome", handleJobWelcome);
    return () => {
      window.removeEventListener("jobScreeningWelcome", handleJobWelcome);
    };
  }, []);

  const tourActive = isTourActive || localTourActive;

  // Exact page-top color of the current shell page. The active tab + its
  // concave notch are filled with this color so the tab melts into the page
  // below (white on white pages, sky-blue on learn-german / job-screening,
  // dark navy on the job-screening welcome screen).
  const baseBlendColor = getSwitcherBlendColor(location.pathname);
  const blendColor =
    location.pathname === "/job-screening" && isJobWelcome
      ? "#002856"
      : baseBlendColor;

  // Scholarship hub: static single-tab switcher stating the context. The
  // exam chrome is route-scoped so the switcher renders regardless of the
  // user's saved mode (they may have switched to practice meanwhile).
  const isScholarship = isScholarshipRoute(location.pathname);

  const activeTab = isB1
    ? location.pathname.startsWith("/job-screening")
      ? "jobs"
      : "practice"
    : isLearnPath(location.pathname)
      ? "learn"
      : isCoursesPath(location.pathname)
        ? "courses"
        : "practice";

  // Mirror the mode onto the redux user too: destination screens gate on it and
  // would bounce us back if they read the pre-switch value.
  const syncMode = (mode) => {
    localStorage.setItem("lg_preferred_mode", mode);
    syncModeIntoRedux(mode);
  };

  // Keep localStorage in sync with the route. The active tab itself is always
  // derived from the route, so this only ever *writes* "learn" (mirroring the
  // old switcher). We never auto-persist "practice" here — LandingPage's
  // prefersLearnMode redirect relies on a stored "learn" preference surviving.
  useEffect(() => {
    if (isLearnPath(location.pathname)) {
      syncMode("learn");
    }
  }, [location.pathname]);

  // Mirror external mode changes (e.g. navbar/other flows) into localStorage.
  useEffect(() => {
    const handleModeChange = (event) => {
      const mode = event?.detail?.mode;
      if (mode === "learn" || mode === "practice") {
        syncMode(mode);
      }
    };
    window.addEventListener("lgModeChange", handleModeChange);
    return () => window.removeEventListener("lgModeChange", handleModeChange);
  }, []);

  // Seed localStorage from the DB on mount (never overrides current route).
  useEffect(() => {
    let cancelled = false;
    getLGMode()
      .then((res) => {
        if (cancelled) return;
        const recentMode = localStorage.getItem("lg_preferred_mode");
        const recentSwitchAt = Number(
          localStorage.getItem("lg_mode_switched_at") || 0,
        );
        if (
          (recentMode === "learn" || recentMode === "practice") &&
          Date.now() - recentSwitchAt < RECENT_MODE_SWITCH_MS
        ) {
          return;
        }
        if (isLearnPath(window.location.pathname)) {
          syncMode("learn");
          return;
        }
        if (isCoursesPath(window.location.pathname)) return;
        const mode = res.data?.mode || "practice";
        syncMode(mode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwitch = (tab) => {
    if (tab === activeTab) return;

    hapticLight();

    if (isB1 && tab === "jobs") {
      // Enter the job-screening pipeline. Persisting the mode server-side is
      // what makes them eligible; the permanent user_job_screening record (and
      // hence admin visibility) follows from entering the pipeline at all.
      syncMode("job_screening");
      localStorage.setItem("lg_mode_switched_at", String(Date.now()));
      window.dispatchEvent(
        new CustomEvent("lgModeChange", {
          detail: { mode: "job_screening" },
        }),
      );
      trackClarityEvent("lg_mode_switched", {
        lg_mode: "job_screening",
        lg_mode_source: activeTab,
        lg_switcher_route: location.pathname,
      });
      setLGMode("job_screening").catch((err) => {
        console.error("Failed to set mode:", err);
      });
      navigate("/job-screening");
      return;
    }

    if (tab === "courses") {
      trackClarityEvent("lg_mode_switched", {
        lg_mode: "courses",
        lg_mode_source: activeTab,
        lg_switcher_route: location.pathname,
      });
      navigate("/video-courses");
      return;
    }

    const mode = tab === "learn" ? "learn" : "practice";

    // Write to localStorage FIRST — destination page reads this before any DB call returns
    syncMode(mode);
    localStorage.setItem("lg_mode_switched_at", String(Date.now()));

    // Notify Navbar and any other listeners immediately
    window.dispatchEvent(new CustomEvent("lgModeChange", { detail: { mode } }));
    trackClarityEvent("lg_mode_switched", {
      lg_mode: mode,
      lg_mode_source: activeTab,
      lg_switcher_route: location.pathname,
    });

    // Persist to backend (async, non-blocking)
    setLGMode(mode).catch((err) => {
      console.error("Failed to set mode:", err);
    });

    // Navigate
    if (mode === "learn") {
      sessionStorage.setItem("lg_animate_switcher", "true");
      navigate("/learn-german");
    } else {
      navigate("/");
    }
  };

  const handlePreload = (mode) => {
    if (mode === "learn") {
      import("../pages/learnGerman/LearnGermanHome");
    } else if (mode === "jobs") {
      import("../pages/jobScreening/JobScreening");
    } else if (mode === "courses") {
      import("../pages/videoCourses/CourseSelectPage");
    }
  };

  return (
    <div
      id="bottom-mode-switcher"
      className={`w-full bg-[#002856] pt-1 pb-0 ${tourActive ? "pointer-events-none" : ""}`}
    >
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4">
        <div
          role="tablist"
          aria-label="Learning mode"
          className="flex items-end gap-1.5 sm:gap-2"
        >
          {isScholarship ? (
            <SwitcherTab
              active={true}
              onClick={() => {}}
              image={bookImg}
              line1="Scholarship"
              line2="Exam"
              showLeftNotch={true}
              showRightNotch={true}
              blendColor={blendColor}
            />
          ) : isB1 ? (
            <>
              <SwitcherTab
                active={activeTab === "practice"}
                onClick={() => handleSwitch("practice")}
                image={bookImg}
                line1="Job Preparation"
                line2=""
                showLeftNotch={activeTab === "practice"}
                showRightNotch={activeTab === "practice"}
                blendColor={blendColor}
              />
              <SwitcherTab
                active={activeTab === "jobs"}
                onClick={() => handleSwitch("jobs")}
                onPreload={() => handlePreload("jobs")}
                image={bagImg}
                line1="German Jobs"
                line2=""
                showLeftNotch={activeTab === "jobs"}
                showRightNotch={activeTab === "jobs"}
                blendColor={blendColor}
              />
            </>
          ) : (
            <>
              <SwitcherTab
                active={activeTab === "practice"}
                onClick={() => handleSwitch("practice")}
                image={bookImg}
                line1="Exam &"
                line2="Practice"
                showLeftNotch={activeTab === "practice"}
                showRightNotch={activeTab === "practice"}
                blendColor={blendColor}
              />
              <SwitcherTab
                active={activeTab === "learn"}
                onClick={() => handleSwitch("learn")}
                onPreload={() => handlePreload("learn")}
                image={mayaSmilingImg}
                line1="Guided"
                line2="German"
                showLeftNotch={activeTab === "learn"}
                showRightNotch={activeTab === "learn"}
                blendColor={blendColor}
              />
              {showGermanClasses && (
                <SwitcherTab
                  active={activeTab === "courses"}
                  onClick={() => handleSwitch("courses")}
                  onPreload={() => handlePreload("courses")}
                  image={classImg}
                  line1="German"
                  line2="Classes"
                  showLeftNotch={activeTab === "courses"}
                  showRightNotch={activeTab === "courses"}
                  blendColor={blendColor}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SwitcherTab({
  active,
  onClick,
  onPreload,
  image,
  line1,
  line2,
  showLeftNotch = false,
  showRightNotch = false,
  blendColor = "#ffffff",
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      onPointerEnter={onPreload}
      onTouchStart={onPreload}
      aria-selected={active}
      style={active ? { backgroundColor: blendColor } : undefined}
      className={`relative flex-1 px-1.5 sm:px-2.5 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
        active
          ? "h-[53px] -mb-[1px] z-10 rounded-t-xl"
          : "bg-white/10 rounded-lg h-11 hover:bg-white/15 mb-2 transition-colors duration-150"
      }`}
    >
      {/* Left/Right Shoulders attached to active tab */}
      {active && (
        <>
          {/* Left Notch — pure continuous 16x21 curve with 1px layer overlap */}
          {showLeftNotch && (
            <span className="absolute -left-[15.5px] bottom-0 w-4 h-[21px] pointer-events-none">
              <svg
                viewBox="0 0 16 21"
                className="w-full h-full block"
                shapeRendering="geometricPrecision"
              >
                <path
                  d="M 0,21 C 8,21 16,13 16,0 L 16,21 Z"
                  fill={blendColor}
                />
              </svg>
            </span>
          )}

          {/* Right Notch — pure continuous 16x21 curve with 1px layer overlap */}
          {showRightNotch && (
            <span className="absolute -right-[15.5px] bottom-0 w-4 h-[21px] pointer-events-none">
              <svg
                viewBox="0 0 16 21"
                className="w-full h-full block"
                shapeRendering="geometricPrecision"
              >
                <path d="M 16,21 C 8,21 0,13 0,0 L 0,21 Z" fill={blendColor} />
              </svg>
            </span>
          )}
        </>
      )}

      <img
        src={image}
        alt=""
        aria-hidden="true"
        className={`relative z-10 w-7 h-7 sm:w-9 sm:h-6 object-contain shrink-0 ${
          active ? "" : "opacity-80"
        }`}
      />
      <div
        className={`relative z-10 flex flex-col ${
          line2 ? "text-left" : "text-center"
        } text-[10px] sm:text-xs leading-[11px] ${
          active
            ? blendColor === "#002856"
              ? "text-white font-bold"
              : "text-[#002856] font-bold"
            : "text-white/90 font-medium"
        }`}
      >
        <span>{line1}</span>
        {line2 ? <span>{line2}</span> : null}
      </div>
    </button>
  );
}
