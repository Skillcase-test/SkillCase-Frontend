import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { getStreakData } from "../api/streakApi";
import { getVocabProgress, setLGMode } from "../api/learnGermanApi";
import { hapticLight } from "../utils/haptics";
import {
  isB1PracticeLevel,
  getB1PracticeProgressRatio,
} from "../utils/b1Progress";
import {
  getA1PracticeProgressRatio,
  getA2PracticeProgressRatio,
  getVideoCourseProgressRatio,
  getJobStepsProgressRatio,
} from "../utils/a1a2Progress";
import homeImg from "../assets/home.webp";
import bagImg from "../assets/bag.webp";
import germanFlagImg from "../assets/recapGermanFlag.webp";
import bookImg from "../assets/book.webp";
import { isScholarshipRoute } from "../utils/shellRoutes";
import { syncModeIntoRedux } from "../utils/lgMode";
import { trackFeatureEvent } from "../telemetry/events";

const COIN_IMG_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg";
const STREAK_IMG_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg";

/**
 * Bottom tab bar — the floating app navigation bar shown on the shell
 * screens ("/", "/learn-german", "/video-courses", "/job-screening").
 * Home / Jobs on the left, a raised progress ring in the center, and coins
 * + streak on the right. The center ring is mode-aware: it shows whatever
 * tracking belongs to the current view — your A1/A2 practice progress on
 * the practice hub, German words learnt on Guided German, course status
 * (videos done / total) on German Classes, job-screening steps progress on
 * Jobs, and the existing B1 aggregate for B1/B2 practice users. Streak tap
 * re-uses the existing "openLeaderboard" event (handled by the landing
 * page).
 */
export default function BottomTabBar() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [streak, setStreak] = useState(0);
  const [progressRatio, setProgressRatio] = useState(0);

  // B1/B2 users see their aggregate B1 practice progress in the center arch
  // (flashcards + reading/news/articles/videos + describe-speak + exams);
  // other levels keep the "German words learnt" ring.
  const isB1 = isB1PracticeLevel(user?.user_prof_level);
  const level = String(user?.user_prof_level || "").toUpperCase();
  const isJobsActive =
    location.pathname.startsWith("/job-screening") ||
    location.pathname === "/jobs";

  // The center ring mirrors the active top-switcher tab: practice hub on "/",
  // guided learning on /learn-german, German classes on /video-courses and
  // the job-screening pipeline on /job-screening.
  const mode = location.pathname.startsWith("/job-screening")
    ? "jobs"
    : location.pathname.startsWith("/learn-german")
      ? "learn"
      : location.pathname === "/video-courses"
        ? "courses"
        : "practice";
  // A1/A2 users land on the locked /jobs teaser page (non-actionable, hardcoded
  // job cards); B1/B2 users go into the real job-screening pipeline.
  const jobsHref = isB1 ? "/job-screening" : "/jobs";

  useEffect(() => {
    let cancelled = false;
    getStreakData()
      .then((data) => {
        if (!cancelled) setStreak(data.currentStreak || 0);
      })
      .catch(() => {});

    const applyRatio = (ratio) => {
      if (!cancelled) setProgressRatio(Math.min(Math.max(ratio, 0), 1));
    };

    if (isB1) {
      if (mode === "jobs") {
        getJobStepsProgressRatio()
          .then(applyRatio)
          .catch(() => {});
      } else {
        getB1PracticeProgressRatio()
          .then(applyRatio)
          .catch(() => {});
      }
    } else if (mode === "learn") {
      getVocabProgress()
        .then((res) => {
          if (!cancelled && res?.data) {
            applyRatio(res.data.progressRatio ?? 0);
          }
        })
        .catch(() => {});
    } else if (mode === "courses") {
      getVideoCourseProgressRatio()
        .then(applyRatio)
        .catch(() => {});
    } else if (level === "A2") {
      getA2PracticeProgressRatio()
        .then(applyRatio)
        .catch(() => {});
    } else {
      getA1PracticeProgressRatio()
        .then(applyRatio)
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [location.pathname, isB1, mode, level]);

  // Production live arrival tracking: detects if coins or streak increased while away
  const currentCoins = Number(user?.coins) || 0;
  const currentStreak = Number(streak) || 0;

  const [coinsToRender, setCoinsToRender] = useState(() => {
    try {
      const stored = sessionStorage.getItem("last_rendered_coins");
      if (stored !== null) {
        return Number(stored);
      }
      sessionStorage.setItem("last_rendered_coins", String(currentCoins));
      return currentCoins;
    } catch {
      return currentCoins;
    }
  });

  const [streakToRender, setStreakToRender] = useState(() => {
    try {
      const stored = sessionStorage.getItem("last_rendered_streak");
      if (stored !== null) {
        return Number(stored);
      }
      sessionStorage.setItem("last_rendered_streak", String(currentStreak));
      return currentStreak;
    } catch {
      return currentStreak;
    }
  });

  useEffect(() => {
    if (currentCoins !== coinsToRender) {
      setCoinsToRender(currentCoins);
      try {
        sessionStorage.setItem("last_rendered_coins", String(currentCoins));
      } catch {}
    }
  }, [currentCoins, coinsToRender]);

  useEffect(() => {
    if (currentStreak !== streakToRender) {
      setStreakToRender(currentStreak);
      try {
        sessionStorage.setItem("last_rendered_streak", String(currentStreak));
      } catch {}
    }
  }, [currentStreak, streakToRender]);

  // Adaptive Word Vault completion animation
  const [vaultAnimationState, setVaultAnimationState] = useState({
    active: false,
    words: [],
    count: 0,
    isFullAnimation: false,
  });

  useEffect(() => {
    if (mode !== "learn") return;
    try {
      const raw = sessionStorage.getItem("lg_recent_completed_lesson");
      if (raw) {
        sessionStorage.removeItem("lg_recent_completed_lesson");
        const parsed = JSON.parse(raw);
        const hasSeenFull = localStorage.getItem("lg_vault_flyin_seen") === "true";
        const count = parsed.count || parsed.words?.length || 4;
        const words =
          parsed.words && parsed.words.length > 0
            ? parsed.words
            : [
                { word: "Hallo", trans: "Hello" },
                { word: "Danke", trans: "Thanks" },
                { word: "Katze", trans: "Cat" },
                { word: "Wasser", trans: "Water" },
              ];

        setVaultAnimationState({
          active: true,
          words,
          count,
          isFullAnimation: !hasSeenFull,
        });

        if (!hasSeenFull) {
          localStorage.setItem("lg_vault_flyin_seen", "true");
        }

        const timer = setTimeout(() => {
          setVaultAnimationState((prev) => ({ ...prev, active: false }));
        }, !hasSeenFull ? 2600 : 1800);

        return () => clearTimeout(timer);
      }
    } catch {}
  }, [mode, location.pathname]);

  // Scholarship hub: same five-slot layout as the normal bar (Home | Jobs |
  // center ring | Coins | Streak), but only Home (the exam hub) is live —
  // everything else is greyed out and not clickable until the candidate moves
  // into learning/practicing mode. Rendered after every hook so the hook order
  // stays unconditional — /scholarship is a shell route, so this same instance
  // re-renders when the candidate navigates to another shell screen.
  if (isScholarshipRoute(location.pathname)) {
    return <ScholarshipBottomBar user={user} streak={streak} />;
  }

  const isHome = location.pathname === "/";

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] bg-white shadow-[0px_-1px_58px_0px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative h-20 w-full max-w-7xl mx-auto px-4 pt-2 pb-4 flex items-center justify-between z-20">
        {/* Home */}
        <Link
          to="/"
          onClick={() => {
            hapticLight();
            trackFeatureEvent("navigation", "bottom_tab_clicked", { entityId: "home" });
          }}
          className={`w-14 flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg transition-colors ${
            isHome ? "bg-[#f4f4f6]" : "hover:bg-stone-500/5"
          }`}
        >
          <img
            src={homeImg}
            alt="Home"
            className="w-6 h-6 object-cover"
            loading="lazy"
          />
          <span
            className={`text-[10px] font-semibold leading-3 ${
              isHome ? "text-black" : "text-stone-500"
            }`}
          >
            Home
          </span>
        </Link>

        {/* Jobs — for B1/B2 users this is the job_screening mode entry, so the
            tap also persists the mode server-side (admin visibility stays
            sticky via the screening record either way). A1/A2 users get the
            locked /jobs teaser instead. */}
        <Link
          to={jobsHref}
          onClick={() => {
            hapticLight();
            trackFeatureEvent("navigation", "bottom_tab_clicked", { entityId: "jobs" });
            if (isB1) {
              localStorage.setItem("lg_preferred_mode", "job_screening");
              localStorage.setItem("lg_mode_switched_at", String(Date.now()));
              // The pipeline lobby gates on the redux mode, so patch it before
              // the link navigates — otherwise it bounces straight back home.
              syncModeIntoRedux("job_screening");
              window.dispatchEvent(
                new CustomEvent("lgModeChange", {
                  detail: { mode: "job_screening" },
                }),
              );
              setLGMode("job_screening").catch(() => {});
            }
          }}
          className={`w-14 flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg transition-colors ${
            isJobsActive ? "bg-[#f4f4f6]" : "hover:bg-stone-500/5"
          }`}
        >
          <img
            src={bagImg}
            alt="Jobs"
            className="w-6 h-6 object-cover"
            loading="lazy"
          />
          <span
            className={`text-[10px] font-medium leading-3 ${
              isJobsActive ? "text-black font-semibold" : "text-stone-500"
            }`}
          >
            Jobs
          </span>
        </Link>

        {/* Center — mode-aware progress arch with adaptive Word Vault absorb animation */}
        <button
          type="button"
          disabled={mode !== "learn"}
          onClick={() => {
            if (mode === "learn") {
              hapticLight();
              trackFeatureEvent("navigation", "bottom_tab_clicked", { entityId: "recap" });
              navigate("/learn-german/recap");
            }
          }}
          className={`relative flex flex-col items-center justify-center w-36 h-full overflow-visible border-none bg-transparent ${
            mode === "learn"
              ? "cursor-pointer active:scale-95 transition-transform"
              : "cursor-default"
          }`}
          title={
            isB1
              ? mode === "jobs"
                ? "Your job progress"
                : "Your B1 progress"
              : mode === "learn"
                ? "German words learnt"
                : mode === "courses"
                  ? "Course status"
                  : level === "A2"
                    ? "Your A2 progress"
                    : "Your A1 progress"
          }
        >
          {/* Flying Word Chips Stream / Compact Badge */}
          {mode === "learn" && (
            <WordVaultFlyInAnimation
              active={vaultAnimationState.active}
              words={vaultAnimationState.words}
              count={vaultAnimationState.count}
              isFullAnimation={vaultAnimationState.isFullAnimation}
            />
          )}

          {/* Sleek Arch SVG (Solid White Interior + 4px Track + 4px Royal Blue Arc) */}
          <motion.div
            animate={
              vaultAnimationState.active
                ? { scale: [1, 1.15, 0.95, 1.05, 1], y: [0, -4, 1, 0] }
                : { scale: 1, y: 0 }
            }
            transition={{
              duration: 0.7,
              delay: vaultAnimationState.isFullAnimation ? 0.8 : 0.1,
              ease: "easeOut",
            }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 w-36 h-12 overflow-visible pointer-events-none flex items-center justify-center drop-shadow-[0px_-3px_6px_rgba(0,0,0,0.03)]"
          >
            <svg
              className="w-36 h-14 overflow-visible"
              viewBox="0 0 140 48"
              shapeRendering="geometricPrecision"
            >
              {/* Solid White Dome Fill */}
              <path d="M 30 46 A 40 40 0 0 1 110 46 Z" fill="#ffffff" />
              {/* Solid White Outer Backing Rim (12px) - Creates a distinct 4px white gap framing the arc */}
              <path
                d="M 30 46 A 40 40 0 0 1 110 46"
                fill="none"
                stroke="#ffffff"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Sleek Light Gray Track Arch (4px) */}
              <path
                d="M 30 46 A 40 40 0 0 1 110 46"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Active Dynamic Royal Blue Progress Arc (4px) */}
              <path
                d="M 30 46 A 40 40 0 0 1 110 46"
                fill="none"
                stroke="#0055d4"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="125.6"
                strokeDashoffset={
                  125.6 *
                  (1 -
                    Math.min(
                      1,
                      progressRatio + (vaultAnimationState.active ? 0.18 : 0),
                    ))
                }
                className="transition-all duration-700 ease-out"
              />
            </svg>
          </motion.div>
          <motion.img
            src={germanFlagImg}
            alt="German Flag"
            animate={
              vaultAnimationState.active
                ? { scale: [1, 1.25, 0.9, 1.1, 1], rotate: [0, -8, 8, -4, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={{
              duration: 0.7,
              delay: vaultAnimationState.isFullAnimation ? 0.8 : 0.1,
              ease: "easeOut",
            }}
            className="w-8 h-5 object-contain rounded drop-shadow-xs -mt-3 mb-0.5 z-10"
            loading="lazy"
          />
          <div className="flex flex-col items-center text-center text-[10px] font-medium leading-[12px] text-stone-500 z-10">
            {isB1 ? (
              mode === "jobs" ? (
                <>
                  <span>Your job</span>
                  <span>progress</span>
                </>
              ) : (
                <>
                  <span>Your B1</span>
                  <span>progress</span>
                </>
              )
            ) : mode === "learn" ? (
              <>
                <span className={vaultAnimationState.active ? "text-blue-600 font-bold" : ""}>
                  German
                </span>
                <span className={vaultAnimationState.active ? "text-blue-600 font-bold" : ""}>
                  words learnt
                </span>
              </>
            ) : mode === "courses" ? (
              <>
                <span>Course</span>
                <span>status</span>
              </>
            ) : level === "A2" ? (
              <>
                <span>Your A2</span>
                <span>progress</span>
              </>
            ) : (
              <>
                <span>Your A1</span>
                <span>progress</span>
              </>
            )}
          </div>
        </button>

        {/* Coins — animated speedometer count-up & pop */}
        <SpeedometerCounter
          value={coinsToRender}
          iconUrl={COIN_IMG_URL}
          iconAlt="Coins"
          iconClass="w-6 h-6 object-contain drop-shadow-[0px_1px_4px_rgba(0,0,0,0.4)]"
          highlightColor="text-sky-950"
          defaultColor="text-stone-500"
        />

        {/* Streak — animated speedometer count-up & pop, tap opens leaderboard */}
        <SpeedometerCounter
          id="streak-widget"
          value={streakToRender}
          suffix=" days"
          iconUrl={STREAK_IMG_URL}
          iconAlt="Streak"
          iconClass="w-6 h-6 object-contain"
          highlightColor="text-sky-950"
          defaultColor="text-stone-500"
          isButton={true}
          title="Streak leaderboard"
          onClick={() => {
            hapticLight();
            trackFeatureEvent("navigation", "bottom_tab_clicked", { entityId: "streak" });
            window.dispatchEvent(new CustomEvent("openLeaderboard"));
            document.dispatchEvent(new CustomEvent("openLeaderboard"));
          }}
        />
      </div>
    </div>
  );
}

/**
 * Speedometer / Rolling Number Counter with Hold-Scale & Settle Animation
 */
function SpeedometerCounter({
  id,
  value = 0,
  suffix = "",
  highlightColor = "text-sky-950",
  defaultColor = "text-stone-500",
  iconUrl,
  iconAlt,
  iconClass = "w-6 h-6 object-contain",
  onClick,
  isButton = false,
  title,
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isCounting, setIsCounting] = useState(false);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    if (startValue === endValue) return;

    if (endValue > startValue) {
      setIsCounting(true);

      const startTime = performance.now();
      const duration = 1600;

      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 2.2);
        const currentInt = Math.round(startValue + (endValue - startValue) * easeOut);

        setDisplayValue(currentInt);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          setDisplayValue(endValue);
          prevValueRef.current = endValue;
          setIsCounting(false);
        }
      };

      animFrameRef.current = requestAnimationFrame(step);

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    } else {
      setDisplayValue(endValue);
      prevValueRef.current = endValue;
      setIsCounting(false);
    }
  }, [value]);

  const content = (
    <motion.div
      animate={
        isCounting
          ? { scale: 1.2, y: -3 }
          : { scale: 1, y: 0 }
      }
      transition={{
        type: "spring",
        stiffness: 380,
        damping: isCounting ? 16 : 24,
      }}
      className="flex flex-col items-center justify-center gap-0.5"
    >
      <motion.img
        src={iconUrl}
        alt={iconAlt}
        className={iconClass}
        loading="lazy"
        animate={isCounting ? { rotate: [0, -8, 8, -4, 0] } : { rotate: 0 }}
        transition={
          isCounting
            ? { repeat: Infinity, duration: 0.6, ease: "easeInOut" }
            : { duration: 0.3 }
        }
      />
      <span
        className={`w-14 text-center text-[10px] leading-3 transition-colors duration-200 ${
          isCounting ? `${highlightColor} font-bold` : defaultColor
        }`}
      >
        {displayValue}
        {suffix}
      </span>
    </motion.div>
  );

  if (isButton) {
    return (
      <button
        type="button"
        id={id}
        onClick={onClick}
        className="w-14 flex flex-col items-center justify-center p-1.5 cursor-pointer hover:bg-stone-500/5 rounded-2xl transition-colors select-none"
        title={title}
      >
        {content}
      </button>
    );
  }

  return (
    <div id={id} className="w-14 flex flex-col items-center justify-center p-1.5 select-none">
      {content}
    </div>
  );
}

/**
 * Word Vault Fly-In Stream — glowing word chips swooping down into the German words vault arch
 */
function WordVaultFlyInAnimation({
  active,
  words = [],
  count = 4,
  isFullAnimation = false,
}) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-visible flex items-center justify-center">
      {/* Floating Badge above Arch */}
      <motion.div
        initial={{ opacity: 0, y: -45, scale: 0.8 }}
        animate={{
          opacity: [0, 1, 1, 0],
          y: [-45, -55, -55, -60],
          scale: [0.8, 1, 1, 0.9],
        }}
        transition={{
          duration: isFullAnimation ? 2.2 : 1.6,
          times: [0, 0.2, 0.75, 1],
          ease: "easeOut",
        }}
        className="absolute px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#002856] to-[#1E5CA2] text-white font-bold text-[10px] shadow-md border border-sky-300/30 backdrop-blur-xs flex items-center gap-1 whitespace-nowrap"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>+{count} words added</span>
      </motion.div>

      {/* Floating Word Pills (Only on First-Time Full Animation) */}
      {isFullAnimation &&
        words.map((item, index) => {
          const total = words.length || 1;
          const startX = (index - (total - 1) / 2) * 55;
          const startY = -170 - (index % 2) * 35;
          const delay = index * 0.22;

          return (
            <motion.div
              key={`${item.word}-${index}`}
              initial={{
                x: startX,
                y: startY,
                opacity: 0,
                scale: 0.7,
              }}
              animate={{
                x: [startX, startX * 0.45, 0],
                y: [startY, startY * 0.4, -8],
                opacity: [0, 1, 1, 0.9, 0],
                scale: [0.7, 1.08, 0.95, 0.35, 0],
              }}
              transition={{
                duration: 1.35,
                delay,
                ease: "easeInOut",
                times: [0, 0.2, 0.6, 0.85, 1],
              }}
              className="absolute px-2.5 py-1 rounded-full bg-gradient-to-r from-[#002856] to-[#1E5CA2] text-white font-semibold text-[11px] shadow-[0px_6px_18px_rgba(0,40,86,0.35)] border border-sky-300/30 flex items-center gap-1.5 backdrop-blur-sm select-none whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="font-bold">{item.word}</span>
            </motion.div>
          );
        })}
    </div>
  );
}

/**
 * Scholarship-exam bottom bar — the same five-slot layout as the normal bar
 * (Home | Jobs | center ring | Coins | Streak), but only Home (the exam hub)
 * is live. Jobs, Coins and Streak render greyed-out and inert so the candidate
 * can see the full app navigation but can't leave the exam funnel with it.
 */
function ScholarshipBottomBar({ user, streak }) {
  const location = useLocation();
  const isHome = location.pathname === "/scholarship";

  // Locked slots share this class: greyed out, no pointer interaction.
  const lockedSlot =
    "w-14 flex flex-col items-center justify-center gap-0.5 p-1.5 opacity-40 grayscale select-none";

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] bg-white shadow-[0px_-1px_58px_0px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative h-20 w-full max-w-7xl mx-auto px-4 pt-2 pb-4 flex items-center justify-between z-20">
        {/* Home — back to the scholarship hub (the only live tab) */}
        <Link
          to="/scholarship"
          onClick={hapticLight}
          className={`w-14 flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg transition-colors ${
            isHome ? "bg-[#f4f4f6]" : "hover:bg-stone-500/5"
          }`}
        >
          <img
            src={homeImg}
            alt="Home"
            className="w-6 h-6 object-cover"
            loading="lazy"
          />
          <span
            className={`text-[10px] font-semibold leading-3 ${
              isHome ? "text-black" : "text-stone-500"
            }`}
          >
            Home
          </span>
        </Link>

        {/* Jobs — locked for scholarship candidates */}
        <div className={lockedSlot} title="Available after the scholarship exam">
          <img
            src={bagImg}
            alt="Jobs"
            className="w-6 h-6 object-cover"
            loading="lazy"
          />
          <span className="text-[10px] font-medium leading-3 text-stone-500">
            Jobs
          </span>
        </div>

        {/* Center — static exam chip (not a nav button) */}
        <div className="relative flex flex-col items-center justify-center w-36 h-full overflow-visible">
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-36 h-12 overflow-visible pointer-events-none flex items-center justify-center drop-shadow-[0px_-3px_6px_rgba(0,0,0,0.03)]">
            <svg
              className="w-36 h-14 overflow-visible"
              viewBox="0 0 140 48"
              shapeRendering="geometricPrecision"
            >
              <path d="M 30 46 A 40 40 0 0 1 110 46 Z" fill="#ffffff" />
              <path
                d="M 30 46 A 40 40 0 0 1 110 46"
                fill="none"
                stroke="#ffffff"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 30 46 A 40 40 0 0 1 110 46"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <img
            src={bookImg}
            alt="Scholarship Exam"
            className="w-8 h-5 object-contain rounded drop-shadow-xs -mt-3 mb-0.5 z-10"
            loading="lazy"
          />
          <div className="flex flex-col items-center text-center text-[10px] font-medium leading-[12px] text-stone-500 z-10">
            <span>Scholarship</span>
            <span>Exam</span>
          </div>
        </div>

        {/* Coins — locked for scholarship candidates */}
        <div className={lockedSlot} title="Available after the scholarship exam">
          <img
            src={COIN_IMG_URL}
            alt="Coins"
            className="w-6 h-6 object-contain drop-shadow-[0px_1px_4px_rgba(0,0,0,0.4)]"
            loading="lazy"
          />
          <span className="w-12 text-center text-[10px] font-medium leading-3 text-stone-500">
            {user?.coins || 0}
          </span>
        </div>

        {/* Streak — locked for scholarship candidates */}
        <div className={lockedSlot} title="Available after the scholarship exam">
          <img
            src={STREAK_IMG_URL}
            alt="Streak"
            className="w-6 h-6 object-contain"
            loading="lazy"
          />
          <div className="flex flex-col items-center text-center text-[10px] font-medium leading-[12px] text-stone-500">
            <span>{streak} days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
