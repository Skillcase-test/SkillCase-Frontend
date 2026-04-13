import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { AppReview } from "@capawesome/capacitor-app-review";
import LevelProgress from "./components/LevelProgress";
import FeatureCardsGrid from "./components/FeatureCardsGrid";
import DemoClassSection from "./components/DemoClassSection";
import SalaryInfoCard from "./components/SalaryInfoCard";
import TalkToTeamSection from "./components/TalkToTeamSection";
import StreakWidget from "../../components/StreakWidget";
import StreakLeaderboardModal from "../../components/StreakLeaderboardModal";
import PlayStoreRatingModal from "../../components/PlayStoreRatingModal";
import { useLandingSections } from "../../hooks/useLandingSections";
import { AlertTriangle, Sparkles } from "lucide-react";
import api from "../../api/axios";
import { getA1MigrationStatus, saveA1MigrationDecision } from "../../api/a1Api";
import A1MigrationModal from "../../components/a1/A1MigrationModal";

function getTodayISTKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function getLeaderboardSeenKey(userId, dayKey) {
  return `streak_leaderboard_seen:${userId}:${dayKey}`;
}

function getPlayStoreRatingSeenKey(userId) {
  return `playstore_rating_prompt_shown:v1:${userId}`;
}

const PLAY_STORE_DEEPLINK = "market://details?id=com.skillcase.app";
const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.skillcase.app";

function LandingFeatureCardsSkeleton() {
  return (
    <section className="px-4 py-3" aria-label="Loading feature cards">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
            <div className="mt-4 h-3.5 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="mt-2 h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const currentLevel = user?.user_prof_level || "A1";
  const { sections } = useLandingSections(currentLevel);

  const [showA1MigrationModal, setShowA1MigrationModal] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationStatusLoading, setMigrationStatusLoading] = useState(true);
  const [migrationMeta, setMigrationMeta] = useState({ gracePeriodMonths: 2 });
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [switchingToNew, setSwitchingToNew] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [showPlayStoreRatingModal, setShowPlayStoreRatingModal] =
    useState(false);
  const [leaderboardData, setLeaderboardData] = useState({
    leaderboard: [],
    myRank: null,
  });
  const switchTimeoutRef = useRef(null);

  const location = useLocation();

  const handleOpenLeaderboard = () => {
    if (!user?.user_id) return;
    setLeaderboardLoading(true);
    setLeaderboardError("");
    import("../../api/streakApi").then(({ getTopStreakLeaderboard }) => {
      getTopStreakLeaderboard()
        .then((data) => {
          setLeaderboardData({
            leaderboard: data?.leaderboard || [],
            myRank: data?.myRank || null,
          });
          setShowLeaderboardModal(true);
        })
        .catch((err) => {
          console.error("Failed to fetch streak leaderboard:", err);
          setLeaderboardError("Could not load leaderboard. Please try later.");
        })
        .finally(() => {
          setLeaderboardLoading(false);
        });
    });
  };

  // 1. Passive Auto-Open (Only on Saturday)
  useEffect(() => {
    if (
      !user?.user_id ||
      showA1MigrationModal ||
      showSwitchConfirm ||
      isUpgrading
    )
      return;

    const isSaturday = new Date().getDay() === 6;
    if (!isSaturday) return;

    const dayKey = getTodayISTKey();
    const seenKey = getLeaderboardSeenKey(user.user_id, dayKey);
    if (localStorage.getItem(seenKey) === "1") return;

    handleOpenLeaderboard();
    localStorage.setItem(seenKey, "1");
  }, [user?.user_id, showA1MigrationModal, showSwitchConfirm, isUpgrading]);

  // 2. Global Event Listener from Navbar
  useEffect(() => {
    const listen = () => handleOpenLeaderboard();
    document.addEventListener("openLeaderboard", listen);
    return () => document.removeEventListener("openLeaderboard", listen);
  }, [user?.user_id]);

  // 3. Location State Drop-in from Navbar (if they were on another page)
  useEffect(() => {
    if (location.state?.openLeaderboard && user?.user_id) {
      navigate(location.pathname, { replace: true, state: {} });
      handleOpenLeaderboard();
    }
  }, [location, user, navigate]);

  useEffect(() => {
    if (!user?.user_id) return;

    const isA1User = (user?.user_prof_level || "").toLowerCase() === "a1";
    if (!isA1User) {
      setMigrationStatus(null);
      setMigrationStatusLoading(false);
      return;
    }

    let mounted = true;
    setMigrationStatusLoading(true);
    getA1MigrationStatus()
      .then((res) => {
        if (!mounted) return;
        setMigrationStatus(res.data?.status || null);
        setMigrationMeta({
          gracePeriodMonths: res.data?.gracePeriodMonths || 2,
        });
        if (res.data?.showModal) {
          setShowA1MigrationModal(true);
        } else {
          setShowA1MigrationModal(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch A1 migration status:", err);
      })
      .finally(() => {
        if (mounted) {
          setMigrationStatusLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user?.user_id, user?.user_prof_level]);

  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      !user?.user_id ||
      showA1MigrationModal ||
      showSwitchConfirm ||
      isUpgrading
    ) {
      return;
    }

    const seenKey = getPlayStoreRatingSeenKey(user.user_id);
    if (localStorage.getItem(seenKey) === "1") return;

    let mounted = true;
    api
      .get("/streak")
      .then((res) => {
        if (!mounted) return;
        const currentStreak = Number(res?.data?.currentStreak || 0);
        if (currentStreak >= 7) {
          // Mark as shown as soon as it qualifies so the prompt is lifetime-once.
          localStorage.setItem(seenKey, "1");
          setShowPlayStoreRatingModal(true);
        }
      })
      .catch((err) => {
        console.error(
          "Failed to evaluate rating prompt streak milestone:",
          err,
        );
      });

    return () => {
      mounted = false;
    };
  }, [user?.user_id, showA1MigrationModal, showSwitchConfirm, isUpgrading]);

  const handleOpenPlayStoreRating = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await AppReview.requestReview();
        } catch (reviewError) {
          console.error("In-app review failed, opening store:", reviewError);
          await AppReview.openAppStore();
        }
      } else {
        window.open(PLAY_STORE_WEB_URL, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Failed to open Play Store deep link:", error);
      if (Capacitor.isNativePlatform()) {
        try {
          await CapApp.openUrl({ url: PLAY_STORE_DEEPLINK });
        } catch (fallbackError) {
          console.error(
            "Native store deep link fallback failed:",
            fallbackError,
          );
        }
      }
      window.open(PLAY_STORE_WEB_URL, "_blank", "noopener,noreferrer");
    } finally {
      setShowPlayStoreRatingModal(false);
    }
  };

  const isA1User = (user?.user_prof_level || "").toLowerCase() === "a1";
  const isRevampA1User =
    isA1User &&
    ["revamp_opted_in", "revamp_forced_after_deadline"].includes(
      migrationStatus,
    );
  const isLegacyA1User =
    isA1User && ["legacy_a1", "legacy_acknowledged"].includes(migrationStatus);
  const shouldHoldA1FeatureRender = isA1User && migrationStatusLoading;

  const handleSwitchToNew = async () => {
    setSwitchingToNew(true);
    try {
      await saveA1MigrationDecision("opt_in_now");

      // Trigger cinematic transition
      setIsUpgrading(true);
      setShowSwitchConfirm(false);
      setShowA1MigrationModal(false);

      // Wait 1.5 seconds for animation to play before revealing the revamp
      switchTimeoutRef.current = setTimeout(() => {
        const nextStatus = "revamp_opted_in";
        setMigrationStatus(nextStatus);
        window.dispatchEvent(
          new CustomEvent("a1:migration-status-changed", {
            detail: { status: nextStatus },
          }),
        );
        setIsUpgrading(false);
        switchTimeoutRef.current = null;
      }, 1500);
    } catch (err) {
      console.error("Failed to switch to new A1:", err);
    } finally {
      setSwitchingToNew(false);
    }
  };

  const handleContinueOld = async () => {
    try {
      await saveA1MigrationDecision("remind_later");
      const nextStatus = "legacy_acknowledged";
      setMigrationStatus(nextStatus);
      window.dispatchEvent(
        new CustomEvent("a1:migration-status-changed", {
          detail: { status: nextStatus },
        }),
      );
      setShowA1MigrationModal(false);
    } catch (err) {
      console.error("Failed to keep old A1:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-lg mx-auto lg:max-w-6xl xl:max-w-7xl lg:px-8">
        <LevelProgress currentLevel={currentLevel} />

        {isLegacyA1User && (
          <div className="px-4 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-amber-900 leading-tight">
                    Using old A1
                  </h3>
                  <p className="text-[12px] text-amber-800/80 leading-tight font-medium mt-0.5">
                    Closes in {migrationMeta.gracePeriodMonths} month
                    {migrationMeta.gracePeriodMonths > 1 ? "s" : ""}. Try the
                    new version!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSwitchConfirm(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-full bg-white border border-amber-300 text-amber-900 text-[13px] font-bold shadow-sm hover:bg-amber-100 active:scale-95 transition-all duration-200 shrink-0"
              >
                Switch to New A1
              </button>
            </div>
          </div>
        )}

        {shouldHoldA1FeatureRender ? (
          <LandingFeatureCardsSkeleton />
        ) : (
          <FeatureCardsGrid useRevampA1={isRevampA1User} />
        )}
        <StreakWidget />
        <DemoClassSection data={sections?.demo_class} />
        <SalaryInfoCard data={sections?.salary_info} />
        <TalkToTeamSection data={sections?.talk_to_team} />
        <div className="px-4">
          <hr className="border-gray-200" />
        </div>
      </main>

      <A1MigrationModal
        open={showA1MigrationModal}
        gracePeriodMonths={migrationMeta.gracePeriodMonths}
        onClose={() => setShowA1MigrationModal(false)}
        onOptIn={handleSwitchToNew}
        onLegacyContinue={handleContinueOld}
      />

      <StreakLeaderboardModal
        open={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        loading={leaderboardLoading}
        error={leaderboardError}
        leaderboard={leaderboardData.leaderboard}
        myRank={leaderboardData.myRank}
        currentUserId={user?.user_id}
      />

      <PlayStoreRatingModal
        open={showPlayStoreRatingModal}
        onRateNow={handleOpenPlayStoreRating}
        onClose={() => setShowPlayStoreRatingModal(false)}
      />

      {showSwitchConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => !switchingToNew && setShowSwitchConfirm(false)}
          />

          {/* Main Card */}
          <div className="relative w-full max-w-[360px] bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300">
            {/* Top Left Red Burst */}
            <div className="absolute top-8 left-8 transition-opacity duration-300 opacity-100">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                className="animate-[spin_3s_linear_infinite]"
              >
                {[...Array(8)].map((_, i) => (
                  <rect
                    key={i}
                    x="18"
                    y="0"
                    width="4"
                    height="10"
                    rx="2"
                    fill="#FF6B6B"
                    transform={`rotate(${i * 45} 20 20)`}
                    opacity="0.5"
                  />
                ))}
              </svg>
            </div>

            {/* Floating Shapes */}
            <div className="absolute top-12 right-10 w-3 h-3 bg-yellow-400 rounded-full animate-bounce delay-100 opacity-70" />
            <div className="absolute bottom-32 left-6 w-4 h-4 bg-purple-400 rotate-45 animate-pulse opacity-70" />
            <div className="absolute top-24 right-4 w-3 h-3 bg-red-400 rounded-sm rotate-12 animate-bounce delay-700 opacity-70" />
            <div className="absolute bottom-40 right-8 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-500 opacity-70" />

            {/* Central Badge */}
            <div className="relative mt-4 mb-6">
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 flex justify-center items-end">
                <div className="w-8 h-16 bg-red-500 -rotate-[25deg] translate-x-3 rounded-b-lg" />
                <div className="w-8 h-16 bg-red-600 rotate-[25deg] -translate-x-3 rounded-b-lg" />
              </div>

              <div className="relative z-10 w-28 h-28 bg-red-100 rounded-full flex items-center justify-center shadow-lg animate-[wiggle_1s_ease-in-out_infinite]">
                <div className="absolute inset-0 border-[6px] border-red-300 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />

                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-inner">
                  <div className="relative">
                    <AlertTriangle className="w-10 h-10 text-white drop-shadow-md" />
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-2 leading-tight">
              Are you sure?
            </h2>
            <p className="text-slate-500 text-sm font-medium px-2 mb-8">
              Your old A1 progress will NOT carry over. You will start fresh in
              the new, improved A1.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                disabled={switchingToNew}
                onClick={handleSwitchToNew}
                className="w-full py-3.5 rounded-full font-bold text-white text-base shadow-lg shadow-green-900/40 bg-[#019035] hover:bg-[#017a2c] active:scale-95 transition-all duration-200 disabled:opacity-60"
              >
                Yes, switch me now!
              </button>
              <button
                disabled={switchingToNew}
                onClick={() => setShowSwitchConfirm(false)}
                className="w-full py-3.5 rounded-full font-bold text-slate-600 text-base border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-60"
              >
                Go Back
              </button>
            </div>

            <style>{`
              @keyframes wiggle {
                0%, 100% { transform: rotate(-3deg); }
                50% { transform: rotate(3deg); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Full Screen Upgrade Transition Overlay */}
      {isUpgrading && (
        <div className="fixed inset-0 z-[2500] bg-white/70 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-[#004a8f] rounded-2xl border-t-transparent animate-spin" />
            <Sparkles className="w-6 h-6 text-[#004a8f] animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            Setting up your new A1
          </h2>
          <p className="text-slate-500 text-sm font-medium animate-pulse">
            Almost ready...
          </p>
        </div>
      )}
    </div>
  );
}
