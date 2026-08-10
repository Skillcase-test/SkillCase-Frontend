import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getLGMode, setLGMode } from "../api/learnGermanApi";
import { trackClarityEvent } from "../observability/clarity";
import { hapticLight } from "../utils/haptics";
import bookImg from "../assets/book.webp";
import mayaSmilingImg from "../assets/onboarding/mayaSmiling.webp";
import classImg from "../assets/class.webp";

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

  const tourActive = isTourActive || localTourActive;

  const activeTab = isLearnPath(location.pathname)
    ? "learn"
    : isCoursesPath(location.pathname)
      ? "courses"
      : "practice";

  const syncMode = (mode) => {
    localStorage.setItem("lg_preferred_mode", mode);
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
          <SwitcherTab
            active={activeTab === "practice"}
            onClick={() => handleSwitch("practice")}
            image={bookImg}
            line1="Exam &"
            line2="Practice"
            showLeftNotch={activeTab === "practice"}
            showRightNotch={activeTab === "practice"}
            notchColor="#ffffff"
          />
          <SwitcherTab
            active={activeTab === "learn"}
            onClick={() => handleSwitch("learn")}
            image={mayaSmilingImg}
            line1="Guided"
            line2="German"
            showLeftNotch={activeTab === "learn"}
            showRightNotch={activeTab === "learn"}
            notchColor="#ffffff"
          />
          <SwitcherTab
            active={activeTab === "courses"}
            onClick={() => handleSwitch("courses")}
            image={classImg}
            line1="German"
            line2="Classes"
            showLeftNotch={activeTab === "courses"}
            showRightNotch={activeTab === "courses"}
            notchColor="#ffffff"
          />
        </div>
      </div>
    </div>
  );
}

function SwitcherTab({
  active,
  onClick,
  image,
  line1,
  line2,
  showLeftNotch = false,
  showRightNotch = false,
  notchColor = "#ffffff",
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-selected={active}
      className={`relative flex-1 px-1.5 sm:px-2.5 flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer select-none ${
        active
          ? "bg-white rounded-t-lg h-14 rounded-b-none -mb-[2px] z-10"
          : "bg-white/10 rounded-lg h-12 hover:bg-white/15 mb-2"
      }`}
    >
      {/* Concave bottom-left notch using ultra-smooth 24px Cubic Bezier SVG with dynamic route fill color */}
      {active && showLeftNotch && (
        <span className="absolute -left-[23.5px] -bottom-[2px] w-6 h-[26px] pointer-events-none z-20">
          <svg
            viewBox="0 0 24 26"
            className="w-full h-full"
            shapeRendering="geometricPrecision"
          >
            <path
              d="M 0,26 L 24,26 L 24,0 C 24,14 14,24 0,24 L 0,26 Z"
              fill={notchColor}
            />
          </svg>
        </span>
      )}

      <img
        src={image}
        alt=""
        aria-hidden="true"
        className={`w-7 h-7 sm:w-9 sm:h-6 object-contain shrink-0 ${
          active ? "" : "opacity-80"
        }`}
      />
      <div
        className={`flex flex-col text-left text-[10px] sm:text-xs leading-[11px] font-['Poppins'] ${
          active ? "text-[#002856] font-bold" : "text-white/90 font-medium"
        }`}
      >
        <span>{line1}</span>
        <span>{line2}</span>
      </div>

      {/* Concave bottom-right notch using ultra-smooth 24px Cubic Bezier SVG with dynamic route fill color */}
      {active && showRightNotch && (
        <span className="absolute -right-[23.5px] -bottom-[2px] w-6 h-[26px] pointer-events-none z-20">
          <svg
            viewBox="0 0 24 26"
            className="w-full h-full"
            shapeRendering="geometricPrecision"
          >
            <path
              d="M 24,26 L 0,26 L 0,0 C 0,14 10,24 24,24 L 24,26 Z"
              fill={notchColor}
            />
          </svg>
        </span>
      )}
    </button>
  );
}
