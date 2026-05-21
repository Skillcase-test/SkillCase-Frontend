import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getLGMode, setLGMode } from "../api/learnGermanApi";
import { trackClarityEvent } from "../observability/clarity";

const isLearnPath = (pathname = "") => pathname.startsWith("/learn-german");
const RECENT_MODE_SWITCH_MS = 10_000;

export default function BottomModeSwitcher({ isTourActive = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Seed initial state from localStorage (instant, no network flash)
  const [isLearnMode, setIsLearnMode] = useState(() => {
    if (isLearnPath(window.location.pathname)) return true;
    const cached = localStorage.getItem("lg_preferred_mode");
    return cached ? cached === "learn" : false;
  });

  const syncMode = (mode) => {
    localStorage.setItem("lg_preferred_mode", mode);
    setIsLearnMode(mode === "learn");
  };

  // The current route is authoritative for the selected pill. This avoids a
  // stale cached mode showing Guided Learning after navigating to practice.
  useEffect(() => {
    if (isLearnPath(location.pathname)) {
      syncMode("learn");
      return;
    }
    setIsLearnMode(false);
  }, [location.pathname]);

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

  // Sync from DB on mount (updates localStorage for future reads), but don't
  // override the route the user is already looking at.
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
          setIsLearnMode(
            isLearnPath(window.location.pathname) || recentMode === "learn",
          );
          return;
        }
        if (isLearnPath(window.location.pathname)) {
          syncMode("learn");
          return;
        }
        const mode = res.data?.mode || "practice";
        syncMode(mode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwitch = (mode) => {
    if (
      (mode === "learn" && isLearnMode) ||
      (mode === "practice" && !isLearnMode)
    ) {
      return;
    }

    // Write to localStorage FIRST — destination page reads this before any DB call returns
    syncMode(mode);
    localStorage.setItem("lg_mode_switched_at", String(Date.now()));

    // Notify Navbar and any other listeners immediately
    window.dispatchEvent(new CustomEvent("lgModeChange", { detail: { mode } }));
    trackClarityEvent("lg_mode_switched", {
      lg_mode: mode,
      lg_mode_source: isLearnMode ? "learn" : "practice",
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
    <div className="fixed bottom-0 left-0 w-full z-[100] flex justify-center pointer-events-none">
      <motion.div
        id="bottom-mode-switcher"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`pointer-events-auto bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.08)] rounded-t-[30px] px-5 py-2 flex items-center justify-center w-full max-w-lg ${isTourActive ? "pointer-events-none" : ""}`}
      >
        <div className="flex items-center w-full gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSwitch("learn")}
            className={`relative flex-1 flex items-center justify-center gap-2.5 py-3 px-2 rounded-xl text-[10px] font-semibold transition-colors duration-300 font-['Poppins'] text-nowrap z-10 ${
              isLearnMode
                ? "text-[#002856]"
                : "bg-transparent text-[#8091a7] hover:bg-gray-50/50"
            } ${isTourActive ? "pointer-events-none" : ""}`}
          >
            {isLearnMode && (
              <motion.div
                layoutId="active-mode-pill"
                className="absolute inset-0 bg-[#eef2f6] rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ 
                scale: isLearnMode ? [1, 1.15, 1] : 1,
                rotate: isLearnMode ? [0, -10, 10, 0] : 0 
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
              <circle cx="18" cy="5" r="3" />
            </motion.svg>
            Guided Learning
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSwitch("practice")}
            className={`relative flex-1 flex items-center justify-center gap-2.5 py-3 px-2 rounded-xl text-[10px] font-semibold transition-colors duration-300 font-['Poppins'] text-nowrap z-10 ${
              !isLearnMode
                ? "text-[#002856]"
                : "bg-transparent text-[#8091a7] hover:bg-gray-50/50"
            } ${isTourActive ? "pointer-events-none" : ""}`}
          >
            {!isLearnMode && (
              <motion.div
                layoutId="active-mode-pill"
                className="absolute inset-0 bg-[#eef2f6] rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ 
                scale: !isLearnMode ? [1, 1.15, 1] : 1,
                rotate: !isLearnMode ? [0, -5, 5, 0] : 0 
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </motion.svg>
            Exam & Practice Hub
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
