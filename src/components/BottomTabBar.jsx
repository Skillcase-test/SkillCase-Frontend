import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getStreakData } from "../api/streakApi";
import { getVocabProgress, setLGMode } from "../api/learnGermanApi";
import { hapticLight } from "../utils/haptics";
import {
  isB1PracticeLevel,
  getB1PracticeProgressRatio,
} from "../utils/b1Progress";
import homeImg from "../assets/home.webp";
import bagImg from "../assets/bag.webp";
import germanFlagImg from "../assets/recapGermanFlag.webp";

const COIN_IMG_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg";
const STREAK_IMG_URL =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg";

/**
 * Bottom tab bar — the floating app navigation bar shown on the three
 * primary shell screens ("/", "/learn-german", "/video-courses").
 * Home / Jobs on the left, a raised words-learnt progress ring in the
 * center, and coins + streak on the right. Streak tap re-uses the existing
 * "openLeaderboard" event (handled by the landing page).
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
  const isJobsActive = location.pathname.startsWith("/job-screening");

  useEffect(() => {
    let cancelled = false;
    getStreakData()
      .then((data) => {
        if (!cancelled) setStreak(data.currentStreak || 0);
      })
      .catch(() => {});

    if (isB1) {
      getB1PracticeProgressRatio()
        .then((ratio) => {
          if (!cancelled) setProgressRatio(Math.min(Math.max(ratio, 0), 1));
        })
        .catch(() => {});
    } else {
      getVocabProgress()
        .then((res) => {
          if (!cancelled && res?.data) {
            const ratio = res.data.progressRatio ?? 0;
            setProgressRatio(Math.min(Math.max(ratio, 0), 1));
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [location.pathname, isB1]);

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

        {/* Jobs — for B1/B2 users this is the job_screening mode entry, so the
            tap also persists the mode server-side (admin visibility stays
            sticky via the screening record either way) */}
        <Link
          to="/job-screening"
          onClick={() => {
            hapticLight();
            if (isB1) {
              localStorage.setItem("lg_preferred_mode", "job_screening");
              localStorage.setItem("lg_mode_switched_at", String(Date.now()));
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

        {/* Center — B1 progress arch for B1/B2 users, German words learnt
            otherwise (Sleek 4px SVG Arch Dome) */}
        <Link
          to={isB1 ? "/" : "/learn-german"}
          onClick={hapticLight}
          className="relative flex flex-col items-center justify-center w-36 h-full transition-opacity hover:opacity-90 overflow-visible"
          title={isB1 ? "Your B1 progress" : "German words learnt"}
        >
          {/* Sleek Arch SVG (Solid White Interior + 4px Track + 4px Royal Blue Arc) */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-36 h-12 overflow-visible pointer-events-none flex items-center justify-center drop-shadow-[0px_-3px_6px_rgba(0,0,0,0.03)]">
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
                strokeDashoffset={125.6 * (1 - progressRatio)}
                className="transition-all duration-500 ease-out"
              />
            </svg>
          </div>
          <img
            src={germanFlagImg}
            alt="German Flag"
            className="w-8 h-5 object-contain rounded drop-shadow-xs -mt-3 mb-0.5 z-10"
            loading="lazy"
          />
          <div className="flex flex-col items-center text-center text-[10px] font-medium leading-[12px] text-stone-500 z-10">
            {isB1 ? (
              <>
                <span>Your B1</span>
                <span>progress</span>
              </>
            ) : (
              <>
                <span>German</span>
                <span>words learnt</span>
              </>
            )}
          </div>
        </Link>

        {/* Coins */}
        <div className="w-14 flex flex-col items-center justify-center gap-0.5 p-1.5">
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

        {/* Streak — tap opens the leaderboard (Stacked 2 Lines) */}
        <button
          type="button"
          onClick={() => {
            hapticLight();
            if (location.pathname === "/") {
              window.dispatchEvent(new CustomEvent("openLeaderboard"));
            } else {
              navigate("/", { state: { openLeaderboard: true } });
            }
          }}
          className="w-14 flex flex-col items-center justify-center gap-0.5 p-1.5 cursor-pointer hover:bg-stone-500/5 rounded-2xl transition-colors"
          title="Streak leaderboard"
        >
          <img
            src={STREAK_IMG_URL}
            alt="Streak"
            className="w-6 h-6 object-contain"
            loading="lazy"
          />
          <div className="flex flex-col items-center text-center text-[10px] font-medium leading-[12px] text-stone-500">
            <span>{streak} days</span>
          </div>
        </button>
      </div>
    </div>
  );
}
