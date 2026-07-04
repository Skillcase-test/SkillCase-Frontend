import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, PhoneCall } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { logout, setUser } from "../redux/auth/authSlice";
import { images } from "../assets/images.js";
import { resetArticleEducation } from "../utils/articleUtils";
import { getStreakData } from "../api/streakApi";
import { getLGMode, getLessonsList, getVocabProgress } from "../api/learnGermanApi";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isJobScreeningParam = queryParams.get("source") === "job_screening";
  const isJobScreening =
    (isAuthenticated && (
      user?.german_preference === "3" ||
      user?.lg_preferred_mode === "job_screening" ||
      location.pathname.startsWith("/job-screening")
    )) ||
    isJobScreeningParam;

  if (isJobScreening) {
    return (
      <JobScreeningNavbar
        minimal={minimal}
        disableNavigation={disableNavigation}
      />
    );
  }

  const [streak, setStreak] = useState(0);
  const [isLearnMode, setIsLearnMode] = useState(() => {
    const cached = localStorage.getItem("lg_preferred_mode");
    return cached ? cached === "learn" : false;
  });
  const activeLearnNavbar =
    isLearnMode || location.pathname.startsWith("/learn-german");
  const [progressRatio, setProgressRatio] = useState(0);
  const [practiceProgressRatio, setPracticeProgressRatio] = useState(0);
  // Tracks previous ratio to detect real increases (vs initial page load)
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

  // Fetch progress ring + streak data on every route change
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

          // 1. Flashcards (Aggregated)
          if (flashcardRes?.data) {
            const chaptersList = Array.isArray(flashcardRes.data) ? flashcardRes.data : [];
            let flashTotal = Math.max(chaptersList.length, 12);
            let flashCompleted = chaptersList.filter(ch => ch.is_completed || ch.final_quiz_passed).length;
            totalChapters += flashTotal;
            completedChapters += flashCompleted;
          }

          // 2. Grammar (Grouped by chapter)
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

          // 3. Listening (Aggregated)
          if (listeningRes?.data) {
            const listeningList = Array.isArray(listeningRes.data) ? listeningRes.data : [];
            totalChapters += listeningList.length;
            completedChapters += listeningList.filter(ch => 
              ch.completed_count === ch.content_count && ch.content_count > 0
            ).length;
          }

          // 4. Speaking (Aggregated)
          if (speakingRes?.data) {
            const speakingList = Array.isArray(speakingRes.data) ? speakingRes.data : [];
            totalChapters += speakingList.length;
            completedChapters += speakingList.filter(ch => ch.is_completed).length;
          }

          // 5. Reading (Aggregated)
          if (readingRes?.data) {
            const readingList = Array.isArray(readingRes.data) ? readingRes.data : [];
            totalChapters += readingList.length;
            completedChapters += readingList.filter(ch => 
              ch.completed_count === ch.content_count && ch.content_count > 0
            ).length;
          }

          // 6. Test (Grouped by chapter and fully finished)
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

  // Immediately refresh ring + coins when a lesson is marked complete
  useEffect(() => {
    const handler = () => {
      if (!isAuthenticated) return;
      api.clearGetCache?.();
      getVocabProgress()
        .then(({ data }) => {
          if (data) setProgressRatio(data.progressRatio || 0);
        })
        .catch(() => {});

      api
        .post("/user/me")
        .then(({ data }) => {
          if (data?.user) dispatch(setUser(data.user));
        })
        .catch(() => {});
    };
    window.addEventListener("lgLessonComplete", handler);
    return () => window.removeEventListener("lgLessonComplete", handler);
  }, [isAuthenticated, dispatch]);

  // Graduated haptics when the progress ring actually increases
  useEffect(() => {
    // Skip the very first value (page-load fetch from 0 to whatever)
    if (prevProgressRef.current === null) {
      prevProgressRef.current = progressRatio;
      return;
    }
    const prevPercent = Math.round(prevProgressRef.current * 100);
    const newPercent = Math.round(progressRatio * 100);
    prevProgressRef.current = progressRatio;

    const ticks = newPercent - prevPercent;
    if (ticks <= 0) return;

    // Spread haptic ticks over the ring CSS transition (0.8s), min 40ms apart
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (disableNavigation) setIsMenuOpen(false);
  }, [disableNavigation]);

  const handleLogout = () => {
    resetArticleEducation(user?.user_id);
    dispatch(logout());
    navigate("/");
  };

  // Get user's proficiency level for dynamic links
  const profLevel = user?.user_prof_level || "A1";
  const normalizedProfLevel = String(profLevel).toLowerCase();
  const isA2PracticeLevel = normalizedProfLevel === "a2";
  const isB1Level = isB1PracticeLevel(profLevel);
  const showNavLinks = !minimal || isAuthenticated;

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

  // Dynamic SVG progress ring — same arc math as LearnGermanHome
  // Dynamic SVG progress ring
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
            {/* SVG progress ring — no CSS transform, use SVG-native transform */}
            <svg
              width={SIZE}
              height={SIZE}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              {/* track */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={STROKE}
              />
              {/* filled arc — rotated at SVG level, solid color to avoid url() issues */}
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
            {/* avatar inside ring */}
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
      className={`bg-white border-b border-[#efefef] sticky top-0 ${isMenuOpen ? "z-[150]" : "z-50"} ${
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
            if (!isAuthenticated) { navigate("/"); return; }
            if (user?.german_preference === "3" || user?.lg_preferred_mode === "job_screening") { navigate("/job-screening"); return; }
            if (isLearnMode) { navigate("/learn-german"); return; }
            navigate(getPracticeHomeForLevel(profLevel));
          }}
          className="flex-shrink-0"
        >
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </button>

        {/* Desktop Menu - Hidden on mobile or during onboarding */}
        {!isOnboarding && showNavLinks && (
          <nav className="hidden lg:flex items-center gap-6">
            {isB1Level ? (
              <>
                <Link
                  to="/b1/flashcard"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Flashcards
                </Link>
                <Link
                  to="/b1/read-listen"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Read & Listen
                </Link>
                <Link
                  to="/b1/describe-speak"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Describe
                </Link>
                <Link
                  to="/b1/exams"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Exams
                </Link>
                <Link
                  to="/b1/maya"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Maya
                </Link>
              </>
            ) : isA2PracticeLevel ? (
              <>
                <Link
                  to="/a2/flashcard"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Flashcards
                </Link>
                <Link
                  to="/a2/grammar"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Grammar
                </Link>
                <Link
                  to="/a2/listening"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Listening
                </Link>
                <Link
                  to="/a2/reading"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Reading
                </Link>
                <Link
                  to="/a2/speaking"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Speaking
                </Link>
                <Link
                  to="/a2/test"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Test
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={profLevel === "A1" ? "/a1/flashcard" : `/practice/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Flashcards
                </Link>
                <Link
                  to={profLevel === "A1" ? "/a1/speaking" : `/pronounce/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Pronounce
                </Link>
                <Link
                  to={profLevel === "A1" ? "/a1/test" : `/test/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Test
                </Link>
                <Link
                  to="/stories"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Stories
                </Link>
                <Link
                  to={`/conversation/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Listener
                </Link>

              </>
            )}

            {/* Auth Buttons - Desktop */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4 ml-4">
                {isLearnMode && (
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-2 bg-[#fdf5e6] px-3 py-1.5 rounded-full shadow-sm"
                      title="Coins"
                    >
                      <img
                        className="w-[28px] h-[28px] object-contain"
                        src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg"
                        alt="Coins"
                      />
                      <div className="text-[#002856] text-[17px] font-semibold pr-1">
                        {user?.coins || 0}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 bg-[#fdf5e6] px-3 py-1.5 rounded-full shadow-sm"
                      title="Streak"
                    >
                      <img
                        className="w-[28px] h-[28px] object-contain"
                        src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg"
                        alt="Streak"
                      />
                      <div className="text-[#002856] text-[17px] font-semibold pr-1">
                        {String(streak).padStart(1, "0")}
                      </div>
                    </div>
                  </div>
                )}
                {["admin", "super_admin"].includes(user?.role) && !isLearnMode && (
                  <Link
                    to="/admin"
                    className="bg-[#002856] text-white px-4 py-2 rounded-lg hover:bg-[#003d83] transition font-semibold text-sm"
                  >
                    Admin
                  </Link>
                )}
                <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
                  {renderProfileAvatar()}
                </Link>
                {!isLearnMode && (
                  <button
                    onClick={handleLogout}
                    className="bg-[#edb843] text-[#002856] px-4 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm"
                  >
                    Logout
                  </button>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
              >
                Get Started
              </Link>
            )}
          </nav>
        )}

        {/* Mobile Right Side */}
        {!isOnboarding && showNavLinks && (
          <div className="lg:hidden flex items-center gap-3">
            {/* Mobile Stats (Learn Mode) */}
            {isAuthenticated && isLearnMode && (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 bg-[#FBF1D9] px-2 py-1 rounded-full"
                  title="Coins"
                >
                  <img
                    className="w-[24px] h-[24px] object-contain"
                    src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500742/Coin_1_kjblsa.svg"
                    alt="Coins"
                  />
                  <div className="text-[#002856] text-sm font-semibold pr-0.5">
                    {user?.coins || 0}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 bg-[#FBF1D9] px-2 py-1 rounded-full"
                  title="Streak"
                >
                  <img
                    className="w-[18px] h-[23px] object-contain"
                    src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg"
                    alt="Streak"
                  />
                  <div className="text-[#002856] text-sm font-semibold pr-0.5">
                    {String(streak).padStart(1, "0")}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Profile Avatar */}
            {isAuthenticated && (
              <Link to="/profile" id="profile-nav-link-mobile" className="flex-shrink-0">
                {renderProfileAvatar()}
              </Link>
            )}
            {/* Mobile Burger Menu Button */}
            {!isLearnMode && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-[#414651]" />
                ) : (
                  <Menu className="w-6 h-6 text-[#414651]" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-[55px] left-0 right-0 bg-white border-b border-[#efefef] shadow-lg z-40">
          <nav className="px-4 py-4 space-y-1">
            <Link
              to={isAuthenticated && (user?.german_preference === "3" || user?.lg_preferred_mode === "job_screening") ? "/job-screening" : "/"}
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            {isB1Level ? (
              <>
                <Link
                  to="/b1/flashcard"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Flashcards
                </Link>
                <Link
                  to="/b1/read-listen"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Read & Listen
                </Link>
                <Link
                  to="/b1/describe-speak"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Describe
                </Link>
                <Link
                  to="/b1/exams"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Exams
                </Link>
                <Link
                  to="/b1/maya"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Maya
                </Link>
              </>
            ) : isA2PracticeLevel ? (
              <>
                <Link
                  to="/a2/flashcard"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Flashcards
                </Link>
                <Link
                  to="/a2/grammar"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Grammar
                </Link>
                <Link
                  to="/a2/listening"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Listening
                </Link>
                <Link
                  to="/a2/reading"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Reading
                </Link>
                <Link
                  to="/a2/speaking"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Speaking
                </Link>
                <Link
                  to="/a2/test"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Test
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={profLevel === "A1" ? "/a1/flashcard" : `/practice/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Flashcards
                </Link>
                <Link
                  to={profLevel === "A1" ? "/a1/speaking" : `/pronounce/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pronounce
                </Link>
                <Link
                  to={profLevel === "A1" ? "/a1/test" : `/test/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Test
                </Link>
                <Link
                  to="/stories"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Stories
                </Link>
                <Link
                  to={`/conversation/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Listener
                </Link>
              </>
            )}

            {/* Global Features */}
            <div className="border-t border-[#efefef] my-2"></div>

            <button
              onClick={() => {
                setIsMenuOpen(false);
                if (location.pathname !== "/") {
                  navigate("/", { state: { openLeaderboard: true } });
                } else {
                  document.dispatchEvent(new CustomEvent("openLeaderboard"));
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-50/50 hover:bg-yellow-100/50 text-[#715403] font-bold text-sm transition-colors border border-yellow-200/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-orange-500"
              >
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              Daily Streak Top 5
            </button>

            {/* Divider */}

            {/* Auth Section - Mobile */}
            {isAuthenticated ? (
              <>
                {["admin", "super_admin"].includes(user?.role) && (
                  <Link
                    to="/admin"
                    className="block px-4 py-3 rounded-lg bg-[#002856] text-white font-semibold text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Tools
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-[#edb843] text-[#002856] font-semibold text-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block px-4 py-3 rounded-lg bg-[#edb843] text-[#002856] font-semibold text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function PracticeNavbar({ minimal = false, disableNavigation = false, streak = 0, progressRatio = 0 }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (disableNavigation) setIsMenuOpen(false);
  }, [disableNavigation]);

  const handleLogout = () => {
    resetArticleEducation(user?.user_id);
    dispatch(logout());
    navigate("/");
  };

  const profLevel = user?.user_prof_level || "A1";
  const normalizedProfLevel = String(profLevel).toLowerCase();
  const isA2PracticeLevel = normalizedProfLevel === "a2";
  const isB1Level = isB1PracticeLevel(profLevel);
  const showNavLinks = !minimal || isAuthenticated;

  return (
    <header
      className={`bg-white border-b border-[#efefef] sticky top-0 shadow-sm ${isMenuOpen ? "z-[150]" : "z-50"} ${
        disableNavigation ? "pointer-events-none" : ""
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-disabled={disableNavigation}
    >
      <div className="h-[55px] lg:h-[72px] flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        <Link
          to={isAuthenticated && (user?.german_preference === "3" || user?.lg_preferred_mode === "job_screening") ? "/job-screening" : "/"}
          className="flex-shrink-0"
          onClick={hapticMedium}
        >
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </Link>

        {showNavLinks && (
          <nav className="hidden lg:flex items-center gap-6">
            {isB1Level ? (
              <>
                <PracticeNavLink to="/b1/flashcard">Flashcards</PracticeNavLink>
                <PracticeNavLink to="/b1/read-listen">Read & Listen</PracticeNavLink>
                <PracticeNavLink to="/b1/describe-speak">Describe</PracticeNavLink>
                <PracticeNavLink to="/b1/exams">Exams</PracticeNavLink>
                <PracticeNavLink to="/b1/maya">Maya</PracticeNavLink>
              </>
            ) : isA2PracticeLevel ? (
              <>
                <PracticeNavLink to="/a2/flashcard">Flashcards</PracticeNavLink>
                <PracticeNavLink to="/a2/grammar">Grammar</PracticeNavLink>
                <PracticeNavLink to="/a2/listening">Listening</PracticeNavLink>
                <PracticeNavLink to="/a2/reading">Reading</PracticeNavLink>
                <PracticeNavLink to="/a2/speaking">Speaking</PracticeNavLink>
                <PracticeNavLink to="/a2/test">Test</PracticeNavLink>
              </>
            ) : profLevel === "A1" ? (
              <>
                <PracticeNavLink to="/a1/flashcard">Flashcards</PracticeNavLink>
                <PracticeNavLink to="/a1/grammar">Grammar</PracticeNavLink>
                <PracticeNavLink to="/a1/listening">Listening</PracticeNavLink>
                <PracticeNavLink to="/a1/reading">Reading</PracticeNavLink>
                <PracticeNavLink to="/a1/speaking">Speaking</PracticeNavLink>
                <PracticeNavLink to="/a1/test">Test</PracticeNavLink>
              </>
            ) : (
              <>
                <PracticeNavLink to={`/practice/${profLevel}`}>
                  Flashcards
                </PracticeNavLink>
                <PracticeNavLink to={`/pronounce/${profLevel}`}>
                  Pronounce
                </PracticeNavLink>
                <PracticeNavLink to={`/test/${profLevel}`}>Test</PracticeNavLink>
                <PracticeNavLink to="/stories">Stories</PracticeNavLink>
                <PracticeNavLink to={`/conversation/${profLevel}`}>
                  Listener
                </PracticeNavLink>
              </>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-4 ml-4">
                <div
                  className="flex items-center gap-2 bg-[#fdf5e6] px-3 py-1.5 rounded-full shadow-sm"
                  title="Streak"
                >
                  <img
                    className="w-[28px] h-[28px] object-contain"
                    src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg"
                    alt="Streak"
                  />
                  <div className="text-[#002856] text-[17px] font-semibold pr-1">
                    {String(streak).padStart(1, "0")}
                  </div>
                </div>

                {["admin", "super_admin"].includes(user?.role) && (
                  <Link
                    to="/admin"
                    className="bg-[#002856] text-white px-4 py-2 rounded-lg hover:bg-[#003d83] transition font-semibold text-sm"
                  >
                    Admin
                  </Link>
                )}

                <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
                  <PracticeAvatar user={user} progressRatio={progressRatio} />
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-[#edb843] text-[#002856] px-4 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
              >
                Get Started
              </Link>
            )}
          </nav>
        )}

        {showNavLinks && (
          <div className="lg:hidden flex items-center gap-3">
            {isAuthenticated && (
              <>
                <div
                  className="flex items-center gap-1.5 bg-[#FBF1D9] px-2 py-1 rounded-full"
                  title="Streak"
                >
                  <img
                    className="w-[18px] h-[23px] object-contain"
                    src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778500990/Gemini_Generated_Image_m7b0m6m7b0m6m7b0_2_x8mtum.svg"
                    alt="Streak"
                  />
                  <div className="text-[#002856] text-sm font-semibold pr-0.5">
                    {String(streak).padStart(1, "0")}
                  </div>
                </div>

                <Link to="/profile" id="profile-nav-link-mobile" className="flex-shrink-0">
                  <PracticeAvatar user={user} progressRatio={progressRatio} />
                </Link>
              </>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-[#414651]" />
              ) : (
                <Menu className="w-6 h-6 text-[#414651]" />
              )}
            </button>
          </div>
        )}

        {!showNavLinks && (
          <a
            href="tel:9731462667"
            className="flex items-center gap-2 px-4 py-2 border border-[#bab9b9]/40 rounded-full text-[#414651] hover:bg-gray-50 transition font-bold text-sm"
          >
            <PhoneCall className="w-4 h-4" />
            Call Us
          </a>
        )}
      </div>

      {isMenuOpen && (
        <div
          className="lg:hidden absolute left-0 right-0 bg-white border-b border-[#efefef] shadow-lg z-40"
          style={{ top: "calc(55px + env(safe-area-inset-top))" }}
        >
          <nav className="px-4 py-4 space-y-1">
            <MobilePracticeLink
              to={isAuthenticated && (user?.german_preference === "3" || user?.lg_preferred_mode === "job_screening") ? "/job-screening" : "/"}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </MobilePracticeLink>
            {isB1Level ? (
              <>
                <MobilePracticeLink to="/b1/flashcard" onClick={() => setIsMenuOpen(false)}>
                  Flashcards
                </MobilePracticeLink>
                <MobilePracticeLink to="/b1/read-listen" onClick={() => setIsMenuOpen(false)}>
                  Read & Listen
                </MobilePracticeLink>
                <MobilePracticeLink to="/b1/describe-speak" onClick={() => setIsMenuOpen(false)}>
                  Describe
                </MobilePracticeLink>
                <MobilePracticeLink to="/b1/exams" onClick={() => setIsMenuOpen(false)}>
                  Exams
                </MobilePracticeLink>
                <MobilePracticeLink to="/b1/maya" onClick={() => setIsMenuOpen(false)}>
                  Maya
                </MobilePracticeLink>
              </>
            ) : isA2PracticeLevel ? (
              <>
                <MobilePracticeLink to="/a2/flashcard" onClick={() => setIsMenuOpen(false)}>
                  Flashcards
                </MobilePracticeLink>
                <MobilePracticeLink to="/a2/grammar" onClick={() => setIsMenuOpen(false)}>
                  Grammar
                </MobilePracticeLink>
                <MobilePracticeLink to="/a2/listening" onClick={() => setIsMenuOpen(false)}>
                  Listening
                </MobilePracticeLink>
                <MobilePracticeLink to="/a2/reading" onClick={() => setIsMenuOpen(false)}>
                  Reading
                </MobilePracticeLink>
                <MobilePracticeLink to="/a2/speaking" onClick={() => setIsMenuOpen(false)}>
                  Speaking
                </MobilePracticeLink>
                <MobilePracticeLink to="/a2/test" onClick={() => setIsMenuOpen(false)}>
                  Test
                </MobilePracticeLink>
              </>
            ) : profLevel === "A1" ? (
              <>
                <MobilePracticeLink to="/a1/flashcard" onClick={() => setIsMenuOpen(false)}>
                  Flashcards
                </MobilePracticeLink>
                <MobilePracticeLink to="/a1/grammar" onClick={() => setIsMenuOpen(false)}>
                  Grammar
                </MobilePracticeLink>
                <MobilePracticeLink to="/a1/listening" onClick={() => setIsMenuOpen(false)}>
                  Listening
                </MobilePracticeLink>
                <MobilePracticeLink to="/a1/reading" onClick={() => setIsMenuOpen(false)}>
                  Reading
                </MobilePracticeLink>
                <MobilePracticeLink to="/a1/speaking" onClick={() => setIsMenuOpen(false)}>
                  Speaking
                </MobilePracticeLink>
                <MobilePracticeLink to="/a1/test" onClick={() => setIsMenuOpen(false)}>
                  Test
                </MobilePracticeLink>
              </>
            ) : (
              <>
                <MobilePracticeLink to={`/practice/${profLevel}`} onClick={() => setIsMenuOpen(false)}>
                  Flashcards
                </MobilePracticeLink>
                <MobilePracticeLink to={`/pronounce/${profLevel}`} onClick={() => setIsMenuOpen(false)}>
                  Pronounce
                </MobilePracticeLink>
                <MobilePracticeLink to={`/test/${profLevel}`} onClick={() => setIsMenuOpen(false)}>
                  Test
                </MobilePracticeLink>
                <MobilePracticeLink to="/stories" onClick={() => setIsMenuOpen(false)}>
                  Stories
                </MobilePracticeLink>
                <MobilePracticeLink to={`/conversation/${profLevel}`} onClick={() => setIsMenuOpen(false)}>
                  Listener
                </MobilePracticeLink>
              </>
            )}

            <div className="border-t border-[#efefef] my-2"></div>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                if (location.pathname !== "/") {
                  navigate("/", { state: { openLeaderboard: true } });
                } else {
                  document.dispatchEvent(new CustomEvent("openLeaderboard"));
                }
              }}
              className="group relative w-full flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-[#fff8e8] via-[#fff2cf] to-[#ffe8c2] border border-[#f2cc7a] shadow-[0_8px_24px_rgba(240,155,35,0.16)] hover:shadow-[0_12px_28px_rgba(240,155,35,0.24)] transition-all duration-200 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-orange-200/40 to-transparent pointer-events-none" />

              <span className="flex items-center gap-3 text-left relative z-10">
                <span className="w-9 h-9 rounded-xl bg-white/80 border border-[#f4d187] flex items-center justify-center shadow-sm shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-orange-600"
                  >
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                </span>
                <span>
                  <span className="block text-[10px] font-semibold tracking-wide uppercase text-[#9a6a06]">
                    Daily Streak
                  </span>
                  <span className="block text-sm font-extrabold text-[#5f4306] leading-tight">
                    Check Your Rank
                  </span>
                </span>
              </span>

              <span className="relative z-10 flex items-center gap-2 text-xs font-extrabold text-[#7a5100] bg-white/85 border border-[#f4d187] rounded-full px-3 py-1.5 shrink-0 group-hover:bg-white transition-colors">
                Top 5
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>

            {isAuthenticated ? (
              <>
                {["admin", "super_admin"].includes(user?.role) && (
                  <Link
                    to="/admin"
                    className="block px-4 py-3 rounded-lg bg-[#002856] text-white font-semibold text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Tools
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-[#edb843] text-[#002856] font-semibold text-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function PracticeNavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
    >
      {children}
    </Link>
  );
}

function MobilePracticeLink({ to, onClick, children }) {
  return (
    <Link
      to={to}
      className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
      onClick={onClick}
    >
      {children}
    </Link>
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
          {/* track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={STROKE}
          />
          {/* filled arc — rotated at SVG level */}
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
        {/* avatar inside ring */}
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
    </div>
  );
}

function JobScreeningNavbar({ minimal = false, disableNavigation = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (disableNavigation) setIsMenuOpen(false);
  }, [disableNavigation]);

  const handleLogout = () => {
    resetArticleEducation(user?.user_id);
    dispatch(logout());
    navigate("/");
  };

  const showNavLinks = !minimal || isAuthenticated;

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
      className={`bg-white border-b border-[#efefef] sticky top-0 shadow-sm ${isMenuOpen ? "z-[150]" : "z-50"} ${
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

        {showNavLinks && (
          <nav className="hidden lg:flex items-center gap-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-4 ml-4">
                <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
                  {renderSimpleAvatar()}
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-[#edb843] text-[#002856] px-4 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
              >
                Get Started
              </Link>
            )}
          </nav>
        )}

        {showNavLinks && (
          <div className="lg:hidden flex items-center gap-3">
            {isAuthenticated && (
              <Link to="/profile" id="profile-nav-link-mobile" className="flex-shrink-0">
                {renderSimpleAvatar()}
              </Link>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-[#414651]" />
              ) : (
                <Menu className="w-6 h-6 text-[#414651]" />
              )}
            </button>
          </div>
        )}
      </div>

      {isMenuOpen && (
        <div
          className="lg:hidden absolute left-0 right-0 bg-white border-b border-[#efefef] shadow-lg z-40"
          style={{ top: "calc(55px + env(safe-area-inset-top))" }}
        >
          <nav className="px-4 py-4 space-y-1">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-3 rounded-lg bg-[#edb843] text-[#002856] font-semibold text-center cursor-pointer"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="block px-4 py-3 rounded-lg bg-[#edb843] text-[#002856] font-semibold text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
