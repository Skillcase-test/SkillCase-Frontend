import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { images } from "../assets/images.js";
import { getStreakData } from "../api/streakApi";
import { getLGMode, getVocabProgress } from "../api/learnGermanApi";
import {
  getA1MigrationStatus,
  getFlashcardChapters as getA1Flashcards,
  getGrammarTopics as getA1Grammar,
  getListeningChapters as getA1Listening,
  getSpeakingChapters as getA1Speaking,
  getReadingChapters as getA1Reading,
  getTestTopics as getA1Test,
} from "../api/a1Api";
import {
  getFlashcardChapters as getA2Flashcards,
  getGrammarTopics as getA2Grammar,
  getListeningChapters as getA2Listening,
  getSpeakingChapters as getA2Speaking,
  getReadingChapters as getA2Reading,
  getTestTopics as getA2Test,
} from "../api/a2Api";
import {
  getB1PracticeProgressRatio,
  getPracticeHomeForLevel,
  isB1PracticeLevel,
} from "../utils/b1Progress";
import api from "../api/axios";
import { hapticLight, hapticMedium, hapticHeavy } from "../utils/haptics";

const RECENT_MODE_SWITCH_MS = 10_000;

export default function Navbar({
  minimal = false,
  disableNavigation = false,
  isOnboarding = false,
}) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isJobScreeningParam = queryParams.get("source") === "job_screening";
  const cachedMode = localStorage.getItem("lg_preferred_mode");
  const isJobScreening =
    (isAuthenticated &&
      (location.pathname.startsWith("/job-screening") ||
        ((user?.german_preference === "3" ||
          user?.lg_preferred_mode === "job_screening") &&
          cachedMode !== "practice" &&
          cachedMode !== "learn"))) ||
    isJobScreeningParam;

  const [streak, setStreak] = useState(0);
  const [isLearnMode, setIsLearnMode] = useState(() => {
    const cached = localStorage.getItem("lg_preferred_mode");
    return cached ? cached === "learn" : false;
  });
  const activeLearnNavbar =
    isLearnMode || location.pathname.startsWith("/learn-german");
  const [progressRatio, setProgressRatio] = useState(0);
  const [practiceProgressRatio, setPracticeProgressRatio] = useState(0);
  const prevProgressRef = useRef(null);

  // Fetch mode preference from DB on mount and whenever auth changes
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLearnMode(false);
      return;
    }
    getLGMode()
      .then((res) => {
        const recentMode = localStorage.getItem("lg_preferred_mode");
        const recentSwitchAt = Number(localStorage.getItem("lg_mode_switched_at") || 0);
        if (
          (recentMode === "learn" || recentMode === "practice") &&
          Date.now() - recentSwitchAt < RECENT_MODE_SWITCH_MS
        ) {
          setIsLearnMode(
            location.pathname.startsWith("/learn-german") || recentMode === "learn",
          );
          return;
        }
        const mode = res.data?.mode || "practice";
        localStorage.setItem("lg_preferred_mode", mode);
        setIsLearnMode(mode === "learn");
      })
      .catch(() => {
        setIsLearnMode(location.pathname.startsWith("/learn-german"));
      });
  }, [isAuthenticated, location.pathname]);

  // Re-render immediately when BottomModeSwitcher changes the mode
  useEffect(() => {
    const handler = (e) => {
      const newMode = e.detail?.mode;
      if (newMode === "learn" || newMode === "practice") {
        setIsLearnMode(newMode === "learn");
      }
    };
    window.addEventListener("lgModeChange", handler);
    return () => window.removeEventListener("lgModeChange", handler);
  }, []);

  // Fetch progress ring + streak data on route change
  useEffect(() => {
    if (!isAuthenticated) return;

    getStreakData()
      .then((data) => setStreak(data.currentStreak || 0))
      .catch(() => {});

    if (activeLearnNavbar) {
      getVocabProgress()
        .then(({ data }) => {
          if (data) setProgressRatio(data.progressRatio || 0);
        })
        .catch(() => {});
    } else {
      let mounted = true;
      const fetchPracticeProgress = async () => {
        try {
          const normalizedLevel = (user?.user_prof_level || "").toLowerCase();
          const isA1User = normalizedLevel === "a1";
          const isA2User = normalizedLevel === "a2";
          const isB1User = isB1PracticeLevel(normalizedLevel);

          let isRevampA1User = false;
          if (isA1User) {
            const migrationRes = await getA1MigrationStatus();
            const status = migrationRes.data?.status || null;
            isRevampA1User = ["revamp_opted_in", "revamp_forced_after_deadline"].includes(status);
          }

          const isDynamic = isA2User || isRevampA1User;
          if (!isDynamic && !isB1User) {
            if (mounted) setPracticeProgressRatio(0);
            return;
          }

          if (isB1User) {
            const b1Ratio = await getB1PracticeProgressRatio();
            if (mounted) setPracticeProgressRatio(b1Ratio);
            return;
          }

          const apis = isRevampA1User
            ? [
                getA1Flashcards(),
                getA1Grammar(),
                getA1Listening(),
                getA1Speaking(),
                getA1Reading(),
                getA1Test()
              ]
            : [
                getA2Flashcards(),
                getA2Grammar(),
                getA2Listening(),
                getA2Speaking(),
                getA2Reading(),
                getA2Test()
              ];

          const [
            flashcardRes,
            grammarRes,
            listeningRes,
            speakingRes,
            readingRes,
            testRes
          ] = await Promise.all(apis);

          if (!mounted) return;

          let totalChapters = 0;
          let completedChapters = 0;

          if (flashcardRes?.data) {
            const chaptersList = Array.isArray(flashcardRes.data) ? flashcardRes.data : [];
            let flashTotal = Math.max(chaptersList.length, 12);
            let flashCompleted = chaptersList.filter(ch => ch.is_completed || ch.final_quiz_passed).length;
            totalChapters += flashTotal;
            completedChapters += flashCompleted;
          }

          if (grammarRes?.data) {
            const grammarList = Array.isArray(grammarRes.data) ? grammarRes.data : [];
            const grammarMap = {};
            grammarList.forEach((row) => {
              if (row.chapter_id) {
                if (!grammarMap[row.chapter_id]) {
                  grammarMap[row.chapter_id] = { completed: 0, total: 0 };
                }
                if (row.topic_id) {
                  grammarMap[row.chapter_id].total++;
                  if (row.is_completed) {
                    grammarMap[row.chapter_id].completed++;
                  }
                }
              }
            });
            const chapters = Object.values(grammarMap);
            totalChapters += chapters.length;
            completedChapters += chapters.filter(ch => ch.completed === ch.total && ch.total > 0).length;
          }

          if (listeningRes?.data) {
            const listeningList = Array.isArray(listeningRes.data) ? listeningRes.data : [];
            totalChapters += listeningList.length;
            completedChapters += listeningList.filter(ch => 
              ch.completed_count === ch.content_count && ch.content_count > 0
            ).length;
          }

          if (speakingRes?.data) {
            const speakingList = Array.isArray(speakingRes.data) ? speakingRes.data : [];
            totalChapters += speakingList.length;
            completedChapters += speakingList.filter(ch => ch.is_completed).length;
          }

          if (readingRes?.data) {
            const readingList = Array.isArray(readingRes.data) ? readingRes.data : [];
            totalChapters += readingList.length;
            completedChapters += readingList.filter(ch => 
              ch.completed_count === ch.content_count && ch.content_count > 0
            ).length;
          }

          if (testRes?.data) {
            const testList = Array.isArray(testRes.data) ? testRes.data : [];
            const testMap = {};
            testList.forEach((row) => {
              if (row.chapter_id) {
                if (!testMap[row.chapter_id]) {
                  testMap[row.chapter_id] = { completed: 0, total: 0 };
                }
                if (row.topic_id) {
                  testMap[row.chapter_id].total += 5;
                  testMap[row.chapter_id].completed += (row.current_level || 0);
                }
              }
            });
            const chapters = Object.values(testMap);
            totalChapters += chapters.length;
            completedChapters += chapters.filter(ch => ch.completed === ch.total && ch.total > 0).length;
          }

          const ratio = totalChapters > 0 ? completedChapters / totalChapters : 0;
          if (mounted) setPracticeProgressRatio(ratio);
        } catch (err) {
          console.error("Failed to calculate overall practice progress:", err);
        }
      };

      fetchPracticeProgress();
      return () => {
        mounted = false;
      };
    }
  }, [isAuthenticated, activeLearnNavbar, location.pathname, user]);

  // Graduated haptics when progress ring increases
  useEffect(() => {
    if (prevProgressRef.current === null) {
      prevProgressRef.current = progressRatio;
      return;
    }
    const prevPercent = Math.round(prevProgressRef.current * 100);
    const newPercent = Math.round(progressRatio * 100);
    prevProgressRef.current = progressRatio;

    const ticks = newPercent - prevPercent;
    if (ticks <= 0) return;

    const ANIM_MS = 800;
    const intervalMs = Math.max(40, Math.floor(ANIM_MS / ticks));
    let count = 0;
    const timer = setInterval(() => {
      count++;
      const progress = count / ticks;
      if (progress < 0.34) hapticLight();
      else if (progress < 0.67) hapticMedium();
      else hapticHeavy();
      if (count >= ticks) clearInterval(timer);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [progressRatio]);

  const profLevel = user?.user_prof_level || "A1";

  if (isJobScreening) {
    return (
      <JobScreeningNavbar
        minimal={minimal}
        disableNavigation={disableNavigation}
      />
    );
  }

  if (!activeLearnNavbar) {
    return (
      <PracticeNavbar
        minimal={minimal}
        disableNavigation={disableNavigation}
        streak={streak}
        progressRatio={practiceProgressRatio}
      />
    );
  }

  const renderProfileAvatar = () => {
    const SIZE = 44;
    const STROKE = 3;
    const RADIUS = (SIZE - STROKE) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    const dashOffset = CIRCUMFERENCE - progressRatio * CIRCUMFERENCE;

    return (
      <div className="relative flex items-center justify-center">
        {isLearnMode ? (
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg
              width={SIZE}
              height={SIZE}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={STROKE}
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#fca549"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div
              className="absolute rounded-full overflow-hidden bg-gray-200"
              style={{
                inset: STROKE + 1,
              }}
            >
              {user?.profile_pic_url ? (
                <img
                  src={user.profile_pic_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  fill="none"
                >
                  <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
                  <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
                  <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
                </svg>
              )}
            </div>
          </div>
        ) : user?.profile_pic_url ? (
          <img
            src={user.profile_pic_url}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-[#e9eaeb] hover:border-[#002856] transition-colors"
          />
        ) : (
          <svg
            viewBox="0 0 100 100"
            className="w-8 h-8 rounded-full"
            fill="none"
          >
            <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
            <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
            <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <header
      className={`bg-white border-b border-[#efefef] sticky top-0 z-50 ${
        disableNavigation ? "pointer-events-none" : ""
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-disabled={disableNavigation}
    >
      <div className="h-[55px] lg:h-[72px] flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        {/* Logo */}
        <button
          onClick={() => {
            hapticLight();
            if (!isAuthenticated) {
              navigate("/");
              return;
            }
            const currentMode = localStorage.getItem("lg_preferred_mode");
            if (
              (user?.german_preference === "3" ||
                user?.lg_preferred_mode === "job_screening") &&
              currentMode !== "practice" &&
              currentMode !== "learn"
            ) {
              navigate("/job-screening");
              return;
            }
            if (isLearnMode) {
              navigate("/learn-german");
              return;
            }
            navigate(getPracticeHomeForLevel(profLevel));
          }}
          className="flex-shrink-0 cursor-pointer"
        >
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </button>

        {/* Right Side Items */}
        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated ? (
            <>
              {isLearnMode && (
                <div className="flex items-center gap-2 md:gap-3">
                  <div
                    className="flex items-center gap-1.5 md:gap-2 bg-[#fdf5e6] px-2.5 md:px-3 py-1 md:py-1.5 rounded-full shadow-2xs"
                    title="Coins"
                  >
                    <img
                      className="w-5 h-5 md:w-7 md:h-7 object-contain"
                      src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg"
                      alt="Coins"
                    />
                    <div className="text-[#002856] text-xs md:text-base font-semibold pr-0.5">
                      {user?.coins || 0}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 md:gap-2 bg-[#fdf5e6] px-2.5 md:px-3 py-1 md:py-1.5 rounded-full shadow-2xs"
                    title="Streak"
                  >
                    <img
                      className="w-5 h-5 md:w-7 md:h-7 object-contain"
                      src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg"
                      alt="Streak"
                    />
                    <div className="text-[#002856] text-xs md:text-base font-semibold pr-0.5">
                      {String(streak).padStart(1, "0")}
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Admin Button */}
              {["admin", "super_admin"].includes(user?.role) && (
                <Link
                  to="/admin"
                  className="bg-[#002856] text-white px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-[#003d83] transition font-semibold text-xs md:text-sm shadow-2xs"
                >
                  Admin
                </Link>
              )}

              {/* Profile Avatar */}
              <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
                {renderProfileAvatar()}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#edb843] text-[#002856] px-4 py-1.5 md:px-5 md:py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-xs md:text-sm"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function PracticeNavbar({
  minimal = false,
  disableNavigation = false,
  streak = 0,
  progressRatio = 0,
}) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  return (
    <header
      className={`bg-white border-b border-[#efefef] sticky top-0 z-50 ${
        disableNavigation ? "pointer-events-none" : ""
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-disabled={disableNavigation}
    >
      <div className="h-[55px] lg:h-[72px] flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        <Link
          to={
            isAuthenticated &&
            (user?.german_preference === "3" ||
              user?.lg_preferred_mode === "job_screening")
              ? "/job-screening"
              : "/"
          }
          className="flex-shrink-0"
          onClick={hapticMedium}
        >
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated ? (
            <>
              <div
                className="flex items-center gap-2 bg-[#fdf5e6] px-2.5 md:px-3 py-1 md:py-1.5 rounded-full shadow-2xs"
                title="Streak"
              >
                <img
                  className="w-5 h-5 md:w-7 md:h-7 object-contain"
                  src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg"
                  alt="Streak"
                />
                <div className="text-[#002856] text-xs md:text-base font-semibold pr-0.5">
                  {String(streak).padStart(1, "0")}
                </div>
              </div>

              {["admin", "super_admin"].includes(user?.role) && (
                <Link
                  to="/admin"
                  className="bg-[#002856] text-white px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-[#003d83] transition font-semibold text-xs md:text-sm shadow-2xs"
                >
                  Admin
                </Link>
              )}

              <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
                <PracticeAvatar user={user} progressRatio={progressRatio} />
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#edb843] text-[#002856] px-4 py-1.5 md:px-5 md:py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-xs md:text-sm"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function PracticeAvatar({ user, progressRatio = 0 }) {
  const SIZE = 44;
  const STROKE = 3;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - progressRatio * CIRCUMFERENCE;

  return (
    <div className="relative flex items-center justify-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#fca549"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div
          className="absolute rounded-full overflow-hidden bg-gray-200"
          style={{
            inset: STROKE + 1,
          }}
        >
          {user?.profile_pic_url ? (
            <img
              src={user.profile_pic_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
              <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
              <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
              <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function JobScreeningNavbar({ minimal = false, disableNavigation = false }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const renderSimpleAvatar = () => {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border border-[#e9eaeb] flex items-center justify-center">
        {user?.profile_pic_url ? (
          <img
            src={user.profile_pic_url}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
            <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
            <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <header
      className={`bg-white border-b border-[#efefef] sticky top-0 z-50 ${
        disableNavigation ? "pointer-events-none" : ""
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-disabled={disableNavigation}
    >
      <div className="h-[55px] lg:h-[72px] flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        <Link to="/job-screening" className="flex-shrink-0" onClick={hapticMedium}>
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated ? (
            <>
              {["admin", "super_admin"].includes(user?.role) && (
                <Link
                  to="/admin/job-screening"
                  className="bg-[#002856] text-white px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-[#003d83] transition font-semibold text-xs md:text-sm shadow-2xs"
                >
                  Admin
                </Link>
              )}
              <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
                {renderSimpleAvatar()}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#edb843] text-[#002856] px-4 py-1.5 md:px-5 md:py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-xs md:text-sm"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
