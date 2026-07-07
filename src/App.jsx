import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Lock,
  Phone,
  LogOut,
  Loader2,
  CreditCard,
  Unlock,
  Check,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import mayaSmiling from "./assets/onboarding/mayaSmiling.webp";
import mayaThumbsup from "./assets/onboarding/mayaThumbsup.webp";
import { Toaster } from "react-hot-toast";
import LandingPage from "./pages/landing/LandingPage";
import NewNavbar from "./components/NewNavbar";
import PaywallBlocker from "./components/PaywallBlocker";
import GuideSpotlight from "./components/GuideSpotlight";
import BottomModeSwitcher from "./components/BottomModeSwitcher";
import NewFooter from "./components/NewFooter";
import Footer from "./components/Footer";
import OtaUpdateModal from "./components/OtaUpdateModal";
import MaintenanceModal from "./components/MaintenanceModal";
import PullToRefreshIndicator from "./components/PullToRefreshIndicator";
import { useDispatch, useSelector } from "react-redux";
import SupportWidget from "./components/SupportWidget";
import api from "./api/axios";
import { setUser, logout } from "./redux/auth/authSlice";

if (typeof global === "undefined") {
  window.global = window;
}

import {
  startHeartbeat,
  stopHeartbeat,
  sendAppVersion,
} from "./utils/heartbeat";
import {
  endAppAnalyticsSession,
  startAppAnalyticsSession,
} from "./utils/appAnalytics";

import "./dashboard-src/css/style.css";

// import ResumePage from "./pages/ResumePage";
// import AIResumeBuilder from "./pages/AIResumeBuilder";
// import ManualResumeBuilder from "./pages/ManualResumeBuilder";
// import MyResumes from "./pages/MyResumes";

// A2 Imports
import A2ProductTour from "./tour/A2ProductTour";

// A1 Revamp
import A1EntryResolver from "./components/a1/A1EntryResolver";
import A1ProductTour from "./tour/A1ProductTour";
import B1ProductTour from "./tour/B1ProductTour";
import { Capacitor } from "@capacitor/core";
import { Fullscreen } from "@boengli/capacitor-fullscreen";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { App as CapApp } from "@capacitor/app";
import { initPushNotifications } from "./notifications/pushNotifications";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";
import ProductTour from "./tour/ProductTour";
import { usePullToRefresh } from "./hooks/usePullToRefresh";
import {
  getMaintenanceStatus,
  setMaintenanceStatus,
  subscribeMaintenanceStatus,
} from "./utils/maintenanceSignal";
import { APP_VERSION } from "./config/appVersion";
import {
  addSentryBreadcrumb,
  captureFeatureError,
  setSentryUserFromAuth,
} from "./observability/sentry";
import { identifyUserInClarity } from "./observability/clarity";

//Hard Core Test
const FlashcardStudyPage = lazy(() => import("./pages/flashcard/FlashCard"));
const ChapterSelect = lazy(() => import("./pages/flashcard/ChapterSelect"));
const TestSelect = lazy(() => import("./pages/testSelect"));
const PronounceSelect = lazy(() => import("./pages/pronounce/PronounceSelect"));
const Pronounce = lazy(() => import("./pages/pronounce/Pronounce"));
const ShortStoryHome = lazy(() => import("./pages/ShortStoryHome"));
const StoryPage = lazy(() => import("./pages/StoryPage"));
const ThankYouPage = lazy(() => import("./pages/ThankYouPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ConversationSelect = lazy(() => import("./pages/ConversationSelect"));
const ConversationPlayer = lazy(() => import("./pages/ConversationPlayer"));
const NursingGermanyLanding = lazy(
  () => import("./pages/NursingGermanyLanding"),
);
const AllEventsPage = lazy(() => import("./pages/event/AllEventsPage"));
const EventDetailPage = lazy(() => import("./pages/event/EventDetailPage"));
const FeaturedEventPage = lazy(() => import("./pages/event/FeaturedEventPage"));
const A2FlashcardSelect = lazy(
  () => import("./pages/a2/flashcard/A2FlashcardSelect"),
);
const A2Flashcard = lazy(() => import("./pages/a2/flashcard/A2Flashcard"));
const A2GrammarSelect = lazy(
  () => import("./pages/a2/grammar/A2GrammarSelect"),
);
const A2GrammarPractice = lazy(
  () => import("./pages/a2/grammar/A2GrammarPractice"),
);
const A2ListeningSelect = lazy(
  () => import("./pages/a2/listening/A2ListeningSelect"),
);
const A1ListeningContent = lazy(
  () => import("./pages/a1/listening/A1ListeningContent"),
);
const A2ListeningContent = lazy(
  () => import("./pages/a2/listening/A2ListeningContent"),
);
const A2SpeakingSelect = lazy(
  () => import("./pages/a2/speaking/A2SpeakingSelect"),
);
const A2Speaking = lazy(() => import("./pages/a2/speaking/A2Speaking"));
const A2ReadingSelect = lazy(
  () => import("./pages/a2/reading/A2ReadingSelect"),
);
const A2Reading = lazy(() => import("./pages/a2/reading/A2Reading"));
const A2TestSelect = lazy(() => import("./pages/a2/test/A2TestSelect"));
const A2TestLevel = lazy(() => import("./pages/a2/test/A2TestLevel"));
const A2TestQuestions = lazy(() => import("./pages/a2/test/A2TestQuestions"));
const A1FlashcardSelect = lazy(
  () => import("./pages/a1/flashcard/A1FlashcardSelect"),
);
const A1Flashcard = lazy(() => import("./pages/a1/flashcard/A1Flashcard"));
const A1GrammarSelect = lazy(
  () => import("./pages/a1/grammar/A1GrammarSelect"),
);
const A1GrammarPractice = lazy(
  () => import("./pages/a1/grammar/A1GrammarPractice"),
);
const A1ListeningSelect = lazy(
  () => import("./pages/a1/listening/A1ListeningSelect"),
);
const A1ReadingSelect = lazy(
  () => import("./pages/a1/reading/A1ReadingSelect"),
);
const A1Reading = lazy(() => import("./pages/a1/reading/A1Reading"));
const A1SpeakingSelect = lazy(
  () => import("./pages/a1/speaking/A1SpeakingSelect"),
);
const A1Speaking = lazy(() => import("./pages/a1/speaking/A1Speaking"));
const A1TestSelect = lazy(() => import("./pages/a1/test/A1TestSelect"));
const A1TestLevel = lazy(() => import("./pages/a1/test/A1TestLevel"));
const A1TestQuestions = lazy(() => import("./pages/a1/test/A1TestQuestions"));
const ExamLobby = lazy(() => import("./pages/exam/ExamLobby"));
const ExamPage = lazy(() => import("./pages/exam/ExamPage"));
const ExamResult = lazy(() => import("./pages/exam/ExamResult"));
const NewsHome = lazy(() => import("./pages/news/NewsHome"));
const NewsPage = lazy(() => import("./pages/news/NewsPage"));
const PublicInterviewPage = lazy(
  () => import("./pages/interviewTools/PublicInterviewPage"),
);
const JobScreeningInterviewPage = lazy(
  () => import("./pages/interviewTools/JobScreeningInterviewPage"),
);
const FallbackPage = lazy(() => import("./pages/FallbackPage"));
const ContinuePractice = lazy(() => import("./pages/ContinuePractice"));
const TermsSignPage = lazy(() => import("./pages/terms/TermsSignPage"));
const JobScreeningTermsSignPage = lazy(
  () => import("./pages/terms/JobScreeningTermsSignPage"),
);
const Dashboard = lazy(() => import("./dashboard-src/pages/Dashboard"));
const OnboardingFlow = lazy(() => import("./pages/onboarding/OnboardingFlow"));
const LearnGermanHome = lazy(
  () => import("./pages/learnGerman/LearnGermanHome"),
);
const JobScreening = lazy(() => import("./pages/jobScreening/JobScreening"));
const JobScreeningAdmin = lazy(() => import("./pages/admin/JobScreeningAdmin"));
const NewLessonFlow = lazy(
  () => import("./pages/learnGerman/lesson/NewLessonFlow"),
);
const RecapScreen = lazy(() => import("./pages/learnGerman/RecapScreen"));

// B1 German Imports
const ReadListenSelect = lazy(
  () => import("./pages/b1/read-listen/ReadListenSelect"),
);
const ReadListenTopicSelect = lazy(
  () => import("./pages/b1/read-listen/ReadListenTopicSelect"),
);
const NewsArticleReader = lazy(
  () => import("./pages/b1/read-listen/NewsArticleReader"),
);
const NewsArticleSuccess = lazy(
  () => import("./pages/b1/read-listen/NewsArticleSuccess"),
);
const DescribeSpeakSelect = lazy(
  () => import("./pages/b1/describe-speak/DescribeSpeakSelect"),
);
const DescribeSpeakWorkspace = lazy(
  () => import("./pages/b1/describe-speak/DescribeSpeakWorkspace"),
);
const DescribeSpeakSuccess = lazy(
  () => import("./pages/b1/describe-speak/DescribeSpeakSuccess"),
);
const ExamSelect = lazy(() => import("./pages/b1/exams/ExamSelect"));
const PaperSelect = lazy(() => import("./pages/b1/exams/PaperSelect"));
const ExamBlockSelector = lazy(
  () => import("./pages/b1/exams/ExamBlockSelector"),
);
const ExamReadingWorkspace = lazy(
  () => import("./pages/b1/exams/ExamReadingWorkspace"),
);
const ExamReadingResults = lazy(
  () => import("./pages/b1/exams/ExamReadingResults"),
);
const ExamWritingWorkspace = lazy(
  () => import("./pages/b1/exams/ExamWritingWorkspace"),
);
const ExamWritingResults = lazy(
  () => import("./pages/b1/exams/ExamWritingResults"),
);
const ExamListeningWorkspace = lazy(
  () => import("./pages/b1/exams/ExamListeningWorkspace"),
);
const ExamListeningResults = lazy(
  () => import("./pages/b1/exams/ExamListeningResults"),
);
const ExamSpeakingWorkspace = lazy(
  () => import("./pages/b1/exams/ExamSpeakingWorkspace"),
);
const ExamSpeakingResults = lazy(
  () => import("./pages/b1/exams/ExamSpeakingResults"),
);
const ExamCongratulations = lazy(
  () => import("./pages/b1/exams/ExamCongratulations"),
);
const B1FlashcardSelect = lazy(
  () => import("./pages/b1/flashcard/B1FlashcardSelect"),
);
const B1Flashcard = lazy(() => import("./pages/b1/flashcard/B1Flashcard"));
const B1MayaPage = lazy(() => import("./pages/b1/maya/B1MayaPage"));
const VideoReader = lazy(() => import("./pages/b1/read-listen/VideoReader"));
const VideoSuccess = lazy(() => import("./pages/b1/read-listen/VideoSuccess"));
const B1AdminPage = lazy(() => import("./pages/b1/B1AdminPage"));

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const PLAY_STORE_URL = "market://details?id=com.skillcase.app";
const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.skillcase.app";

function GoogleAnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    // Send pageview to Google Analytics on route change
    if (typeof window.gtag === "function") {
      window.gtag("config", "G-CB8X1XP8FL", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const dispatch = useDispatch();
  const { token, user, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const [authBootstrapping, setAuthBootstrapping] = useState(Boolean(token));

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showProfileHighlight, setShowProfileHighlight] = useState(false);
  const [profileRect, setProfileRect] = useState(null);

  useEffect(() => {
    if (!showProfileHighlight) {
      setProfileRect(null);
      return;
    }
    const updateRect = () => {
      const isMobile = window.innerWidth < 1024;
      const selector = isMobile
        ? "#profile-nav-link-mobile"
        : "#profile-nav-link";
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setProfileRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    const timer = setTimeout(updateRect, 150);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [showProfileHighlight]);

  const [otaState, setOtaState] = useState(null); // null | 'play_store' | 'ota_downloading' | 'ota_ready'
  const [otaProgress, setOtaProgress] = useState(0);
  const [maintenanceOpen, setMaintenanceOpen] = useState(
    getMaintenanceStatus(),
  );

  // Public routes that don't require auth
  const publicRoutes = [
    "/login",
    "/signup",
    "/register",
    "/open-app",
    "/thank-you",
    "/events",
    "/terms/sign",
    "/onboarding",
  ];
  const isPublicRoute =
    publicRoutes.some((route) => location.pathname.startsWith(route)) ||
    /^\/interview\/[^/]+$/.test(location.pathname);

  const disablePullToRefresh = useMemo(
    () =>
      /^\/exam\/[^/]+\/take$/.test(location.pathname) ||
      /^\/interview\/[^/]+$/.test(location.pathname) ||
      location.pathname.startsWith("/news") ||
      location.pathname.startsWith("/learn-german/lesson") ||
      location.pathname.startsWith("/onboarding"),
    [location.pathname],
  );

  const refreshWholeApp = useCallback(async () => {
    window.location.reload();
  }, []);

  const { pullProgress, pullDistance, isRefreshing, containerProps } =
    usePullToRefresh(
      refreshWholeApp,
      Capacitor.isNativePlatform() && !disablePullToRefresh && !maintenanceOpen,
      { activationY: 96 },
    );

  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", containerProps.onTouchStart, {
      passive: true,
    });
    el.addEventListener("touchmove", containerProps.onTouchMove, {
      passive: false,
    });
    el.addEventListener("touchend", containerProps.onTouchEnd, {
      passive: true,
    });

    return () => {
      el.removeEventListener("touchstart", containerProps.onTouchStart);
      el.removeEventListener("touchmove", containerProps.onTouchMove);
      el.removeEventListener("touchend", containerProps.onTouchEnd);
    };
  }, [containerProps]);

  useEffect(() => {
    const preloadTopHeavyScreens = () => {
      if (document.visibilityState !== "visible") return;
      import("./pages/flashcard/FlashCard");
      import("./pages/a2/flashcard/A2Flashcard");
      import("./pages/a1/listening/A1ListeningContent");
      import("./pages/a2/listening/A2ListeningContent");
      import("./pages/exam/ExamPage");
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preloadTopHeavyScreens, { timeout: 2500 });
    } else {
      setTimeout(preloadTopHeavyScreens, 1500);
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Fullscreen.activateImmersiveMode();
      initLiveUpdate();

      // Only init push notifications if authenticated
      if (token) {
        initPushNotifications().catch((error) => {
          captureFeatureError(error, {
            featureArea: "push_notifications",
            tags: { action: "init" },
          });
        });
      }

      // Log native app_opened event
      FirebaseAnalytics.logEvent({ name: "app_opened" }).catch(console.error);
    }
  }, [token]);

  useEffect(() => {
    addSentryBreadcrumb({
      category: "navigation",
      message: "route-change",
      data: {
        path: location.pathname,
        search: location.search,
      },
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    setSentryUserFromAuth(user);
    identifyUserInClarity(user);
    if (user) {
      // Start heartbeat for all users, but it only sends when dashboard is active
      startHeartbeat();
      sendAppVersion();
      startAppAnalyticsSession();
    } else {
      stopHeartbeat();
      endAppAnalyticsSession();
    }

    return () => {
      stopHeartbeat();
      endAppAnalyticsSession();
    };
  }, [user]);

  // Helper function to open Play Store
  const openPlayStore = async () => {
    try {
      // Try to open Play Store app directly
      await CapApp.openUrl({ url: PLAY_STORE_URL });
    } catch (err) {
      // Fallback to web URL if Play Store app fails
      window.open(PLAY_STORE_WEB_URL, "_blank");
    }
  };

  // Helper function for delayed retry
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const initLiveUpdate = async () => {
    // Always confirm the currently active bundle — must run before any early return.
    try {
      await LiveUpdate.ready();
    } catch (e) {
      console.warn("LiveUpdate.ready() failed:", e);
    }

    // Only run the update check once per app session (sessionStorage clears on kill+reopen)
    if (sessionStorage.getItem("ota_checked")) return;
    sessionStorage.setItem("ota_checked", "1");

    let retryCount = 0;

    const attemptUpdate = async () => {
      try {
        const bundles = await LiveUpdate.getBundles();
        const response = await api.get(`/updates/check?version=${APP_VERSION}`);
        const data = response.data;

        switch (data.status) {
          case "up_to_date":
          case "newer_version":
            console.log("App is up to date or on development version");
            return;

          case "play_store":
            addSentryBreadcrumb({
              category: "ota",
              message: "play-store-update-required",
              data: { currentVersion: data.currentVersion },
            });
            api
              .post("/updates/log", {
                event: "play_store_redirect",
                targetVersion: data.currentVersion,
                appVersion: APP_VERSION,
              })
              .catch(() => {});
            setOtaState("play_store");
            return;

          case "ota_available": {
            const bundleExists = bundles.bundleIds?.includes(data.version);

            if (bundleExists) {
              addSentryBreadcrumb({
                category: "ota",
                message: "bundle-already-exists",
                data: { version: data.version },
              });
              console.log(
                `Bundle ${data.version} already exists, setting as next bundle`,
              );
              await LiveUpdate.setNextBundle({ bundleId: data.version });
              return;
            }

            setOtaState("ota_downloading");
            setOtaProgress(0);
            addSentryBreadcrumb({
              category: "ota",
              message: "download-started",
              data: { version: data.version },
            });

            let pseudoProgress = 0;
            const progressTimer = setInterval(() => {
              pseudoProgress = Math.min(pseudoProgress + 4, 92);
              setOtaProgress(pseudoProgress);
            }, 350);

            api
              .post("/updates/log", {
                event: "download_started",
                targetVersion: data.version,
              })
              .catch(() => {});

            try {
              await LiveUpdate.downloadBundle({
                url: data.url,
                bundleId: data.version,
              });
            } finally {
              clearInterval(progressTimer);
            }

            setOtaProgress(100);

            await LiveUpdate.setNextBundle({ bundleId: data.version });

            api
              .post("/updates/log", {
                event: "download_complete",
                targetVersion: data.version,
              })
              .catch(() => {});

            console.log(`OTA update downloaded: ${data.version}`);
            setOtaState("ota_ready");
            addSentryBreadcrumb({
              category: "ota",
              message: "download-ready",
              data: { version: data.version },
            });
            return;
          }

          default:
            console.warn("Unknown update status:", data.status);
        }
      } catch (err) {
        retryCount++;

        api
          .post("/updates/log", {
            event: "retry_attempt",
            targetVersion: APP_VERSION,
            error: `Attempt ${retryCount}: ${err.message}`,
          })
          .catch(() => {});

        console.error(`OTA update attempt ${retryCount} failed:`, err.message);
        captureFeatureError(err, {
          featureArea: "ota_update",
          tags: { action: "attempt_failed" },
          extra: { retryCount, appVersion: APP_VERSION },
        });

        if (retryCount < MAX_RETRY_ATTEMPTS) {
          console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
          return attemptUpdate();
        }

        api
          .post("/updates/log", {
            event: "download_failed",
            targetVersion: APP_VERSION,
            error: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${err.message}`,
          })
          .catch(() => {});

        console.error("OTA update failed after all retry attempts");
        captureFeatureError(err, {
          featureArea: "ota_update",
          tags: { action: "all_attempts_failed" },
          extra: {
            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
            appVersion: APP_VERSION,
          },
        });
        // Dismiss the spinner modal — do not leave user stuck on a loading screen
        setOtaState(null);
        setOtaProgress(0);
      }
    };

    await attemptUpdate();
  };

  useEffect(() => {
    let active = true;

    const fetchUser = async () => {
      if (!token) {
        if (active) setAuthBootstrapping(false);
        return;
      }

      if (active) setAuthBootstrapping(true);
      try {
        const res = await api.post("/user/me");
        if (!active) return;
        dispatch(setUser(res.data.user));
      } catch (err) {
        if (!active) return;
        console.error("Token expired or invalid");
        dispatch(logout());
      } finally {
        if (active) setAuthBootstrapping(false);
      }
    };
    fetchUser();

    return () => {
      active = false;
    };
  }, [token, dispatch]);

  useEffect(() => {
    const unsubscribe = subscribeMaintenanceStatus(setMaintenanceOpen);
    return unsubscribe;
  }, []);

  const checkHealth = useCallback(async (retriesLeft = 2) => {
    // Skip polling when the tab is not visible — avoids false triggers
    // caused by OS-level network suspension on background tabs.
    if (document.visibilityState !== "visible") return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL;
      const healthUrl = new URL("/health", baseUrl).toString();
      const response = await fetch(healthUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        setMaintenanceStatus(false);
        setMaintenanceOpen(false);
        addSentryBreadcrumb({
          category: "maintenance",
          message: "health-check-ok",
        });
      } else {
        throw new Error("Backend unhealthy");
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (retriesLeft > 0) {
        // Wait 2 seconds and retry transparently in the background
        setTimeout(() => checkHealth(retriesLeft - 1), 2000);
      } else {
        // All retries exhausted, actually show the maintenance modal
        setMaintenanceStatus(true);
        setMaintenanceOpen(true);
        captureFeatureError(error, {
          featureArea: "maintenance",
          tags: { action: "health-check-failed" },
          extra: { retriesExhausted: true },
        });
      }
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 60000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  if (token && authBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading your account...
      </div>
    );
  }

  // Redirect to signup if not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  const isJobScreeningUser =
    isAuthenticated &&
    user &&
    (String(user.german_preference) === "3" ||
      user.lg_preferred_mode === "job_screening" ||
      localStorage.getItem("lg_preferred_mode") === "job_screening");

  const isPaywallLocked =
    isAuthenticated &&
    user &&
    user.role === "user" &&
    user.paywall_active === true &&
    user.autopay_enabled !== true;

  const isJobScreeningAllowedRoute =
    location.pathname.startsWith("/job-screening") ||
    location.pathname === "/profile" ||
    location.pathname.startsWith("/admin");

  if (isJobScreeningUser && !isJobScreeningAllowedRoute) {
    return <Navigate to="/job-screening" replace />;
  }

  const lazyScreen = (element, title) => (
    <Suspense fallback={<RouteScreenSkeleton title={title} />}>
      {element}
    </Suspense>
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-hidden w-full min-h-screen"
    >
      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />
      <div
        style={
          pullDistance > 0
            ? { transform: `translateY(${pullDistance}px)` }
            : {
                transition:
                  "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }
        }
      >
        <OtaUpdateModal
          otaState={maintenanceOpen ? null : otaState}
          otaProgress={otaProgress}
          onSkip={() => setOtaState(null)}
          onRestart={async () => {
            try {
              await LiveUpdate.reload();
            } catch (e) {
              console.error("Reload failed", e);
              // Inform user that automatic restart failed
              alert(
                "Could not restart automatically. Please close and reopen the app to apply the update.",
              );
            }
          }}
          onOpenPlayStore={openPlayStore}
        />
        <MaintenanceModal open={maintenanceOpen} onRetry={checkHealth} />

        <ProductTour>
          <A1ProductTour>
            <A2ProductTour>
              <B1ProductTour>
                <GoogleAnalyticsTracker />
                <ScrollToTop />
                <Toaster
                  position="top-right"
                  containerStyle={{ zIndex: 100000 }}
                />
                <ConditionalNav />
                {isPaywallLocked && (
                  <PaywallBlocker
                    user={user}
                    dispatch={dispatch}
                    onSuccess={() => setShowPaymentSuccess(true)}
                  />
                )}

                {/* Autopay Success Modal */}
                {showPaymentSuccess && (
                  <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none font-sans">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full max-w-[390px] bg-white border border-slate-100 rounded-[32px] shadow-2xl py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center gap-5 sm:gap-6 relative"
                    >
                      {/* Close Button */}
                      <button
                        onClick={() => {
                          setShowPaymentSuccess(false);
                          setShowProfileHighlight(true);
                        }}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Mascot Image positioned inside the card */}
                      <div className="w-20 h-20 rounded-full shadow-sm bg-[#a2c5f2] overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={mayaThumbsup}
                          alt="Maya mascot thumbs up"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Unlocked Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          Learning plan unlocked
                        </span>
                      </div>

                      {/* Title */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <h3 className="text-2xl sm:text-[26px] font-bold text-[#002856] text-center leading-tight tracking-tight">
                          Autopay enabled
                        </h3>
                        <div className="w-6 h-6 bg-[#22c55e] rounded-full flex items-center justify-center shrink-0 shadow-xs">
                          <Check
                            className="w-4 h-4 text-white"
                            strokeWidth={4}
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[#002856] text-center text-xs sm:text-sm leading-relaxed font-semibold px-2">
                        Your learning plan is now unlocked.
                        <br className="hidden sm:inline" /> Continue your German
                        journey.
                      </p>

                      {/* Lets Go Button */}
                      <button
                        onClick={() => {
                          setShowPaymentSuccess(false);
                          setShowProfileHighlight(true);
                        }}
                        className="w-full h-12 sm:h-13 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] text-white rounded-2xl transition-all cursor-pointer font-bold text-xs sm:text-sm flex items-center justify-center mt-2"
                      >
                        Let's go
                      </button>
                    </motion.div>
                  </div>
                )}

                {/* Profile Spotlight Guide */}
                {showProfileHighlight && profileRect && (
                  <GuideSpotlight
                    rect={profileRect}
                    radius={28}
                    onClick={() => setShowProfileHighlight(false)}
                  >
                    <p className="relative text-[15px] font-bold leading-snug text-slate-950">
                      Click here to manage your subscription.
                    </p>
                    <p className="relative mt-1 text-[12px] font-medium leading-snug text-slate-500">
                      You can modify or cancel your autopay anytime from your
                      profile settings.
                    </p>
                  </GuideSpotlight>
                )}

                <Routes>
                  <Route
                    path="/signup"
                    element={<Navigate to="/onboarding" replace />}
                  />
                  <Route
                    path="/login"
                    element={<Navigate to="/onboarding" replace />}
                  />
                  <Route path="/" element={<LandingPage />} />
                  <Route
                    path="/test/:prof_level"
                    element={lazyScreen(<TestSelect />, "Loading Tests...")}
                  />
                  {/* <Route path ='/interview/:prof_level' element = {<InterviewSelect/>}/> */}
                  <Route
                    path="/practice/:prof_level"
                    element={lazyScreen(
                      <ChapterSelect />,
                      "Loading Chapters...",
                    )}
                  />
                  <Route
                    path="/pronounce/:prof_level"
                    element={lazyScreen(
                      <PronounceSelect />,
                      "Loading Pronunciation...",
                    )}
                  />
                  <Route
                    path="/practice/:prof_level/:set_id"
                    element={
                      <Suspense
                        fallback={
                          <RouteScreenSkeleton title="Loading Flashcards..." />
                        }
                      >
                        <FlashcardStudyPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/*"
                    element={lazyScreen(<Dashboard />, "Loading Admin...")}
                  />
                  <Route
                    path="/pronounce/:prof_level/:pronounce_id"
                    element={lazyScreen(
                      <Pronounce />,
                      "Loading Pronunciation...",
                    )}
                  />
                  {/* <Route path="/Login" element={<LoginSignupPage />} /> */}
                  <Route
                    path="/stories"
                    element={lazyScreen(
                      <ShortStoryHome />,
                      "Loading Stories...",
                    )}
                  />
                  <Route
                    path="/story/:slug"
                    element={lazyScreen(<StoryPage />, "Loading Story...")}
                  />

                  {/* <Route path="/resume" element={<ResumePage />} />
        <Route path="/resume/ai-builder" element={<AIResumeBuilder />} />
        <Route
          path="/resume/manual-builder"
          element={<ManualResumeBuilder />}
        />
        <Route path="/resume/my-resumes" element={<MyResumes />} />
        <Route path="/resume/edit/:resumeId" element={<AIResumeBuilder />} /> */}

                  <Route
                    path="/conversation/:prof_level"
                    element={lazyScreen(
                      <ConversationSelect />,
                      "Loading Conversation...",
                    )}
                  />
                  <Route
                    path="/conversation/:prof_level/:conversation_id"
                    element={lazyScreen(
                      <ConversationPlayer />,
                      "Loading Conversation...",
                    )}
                  />
                  <Route
                    path="/register"
                    element={lazyScreen(
                      <NursingGermanyLanding />,
                      "Loading...",
                    )}
                  />
                  <Route
                    path="/thank-you"
                    element={lazyScreen(<ThankYouPage />, "Loading...")}
                  />
                  <Route
                    path="/open-app"
                    element={lazyScreen(<FallbackPage />, "Loading...")}
                  />
                  <Route
                    path="/terms/sign/:token"
                    element={lazyScreen(<TermsSignPage />, "Loading Terms...")}
                  />
                  <Route
                    path="/job-screening/terms/sign/:token"
                    element={lazyScreen(
                      <JobScreeningTermsSignPage />,
                      "Loading Document...",
                    )}
                  />
                  <Route
                    path="/onboarding"
                    element={lazyScreen(
                      <OnboardingFlow />,
                      "Loading Onboarding...",
                    )}
                  />
                  <Route
                    path="/job-screening"
                    element={lazyScreen(
                      <JobScreening />,
                      "Loading Jobs...",
                    )}
                  />
                  <Route
                    path="/continue"
                    element={lazyScreen(<ContinuePractice />, "Loading...")}
                  />
                  <Route
                    path="/internal/lead-form"
                    element={<Navigate to="/admin/internal-leads" replace />}
                  />
                  <Route
                    path="/events"
                    element={lazyScreen(<AllEventsPage />, "Loading Events...")}
                  />
                  <Route
                    path="/events/featured"
                    element={lazyScreen(
                      <FeaturedEventPage />,
                      "Loading Event...",
                    )}
                  />
                  <Route
                    path="/events/:slug"
                    element={lazyScreen(
                      <EventDetailPage />,
                      "Loading Event...",
                    )}
                  />
                  <Route
                    path="/manage-event"
                    element={<Navigate to="/admin/events" replace />}
                  />

                  <Route
                    path="/profile"
                    element={lazyScreen(<ProfilePage />, "Loading Profile...")}
                  />

                  {/* A1 REVAMP ROUTES */}
                  <Route path="/a1" element={<A1EntryResolver />} />

                  {/* A1 Flashcard */}
                  <Route
                    path="/a1/flashcard"
                    element={lazyScreen(
                      <A1FlashcardSelect />,
                      "Loading A1 Flashcards...",
                    )}
                  />
                  <Route
                    path="/a1/flashcard/:chapterId"
                    element={lazyScreen(
                      <A1Flashcard />,
                      "Loading A1 Flashcards...",
                    )}
                  />

                  {/* A1 Grammar */}
                  <Route
                    path="/a1/grammar"
                    element={lazyScreen(
                      <A1GrammarSelect />,
                      "Loading A1 Grammar...",
                    )}
                  />
                  <Route
                    path="/a1/grammar/:topicId"
                    element={lazyScreen(
                      <A1GrammarPractice />,
                      "Loading A1 Grammar...",
                    )}
                  />

                  {/* A1 Listening */}
                  <Route
                    path="/a1/listening"
                    element={lazyScreen(
                      <A1ListeningSelect />,
                      "Loading A1 Listening...",
                    )}
                  />
                  <Route
                    path="/a1/listening/:chapterId"
                    element={
                      <Suspense
                        fallback={
                          <RouteScreenSkeleton title="Loading A1 Listening..." />
                        }
                      >
                        <A1ListeningContent />
                      </Suspense>
                    }
                  />

                  {/* A1 Speaking */}
                  <Route
                    path="/a1/speaking"
                    element={lazyScreen(
                      <A1SpeakingSelect />,
                      "Loading A1 Speaking...",
                    )}
                  />
                  <Route
                    path="/a1/speaking/:chapterId"
                    element={lazyScreen(
                      <A1Speaking />,
                      "Loading A1 Speaking...",
                    )}
                  />

                  {/* A1 Reading */}
                  <Route
                    path="/a1/reading"
                    element={lazyScreen(
                      <A1ReadingSelect />,
                      "Loading A1 Reading...",
                    )}
                  />
                  <Route
                    path="/a1/reading/:chapterId"
                    element={lazyScreen(<A1Reading />, "Loading A1 Reading...")}
                  />

                  {/* A1 Test */}
                  <Route
                    path="/a1/test"
                    element={lazyScreen(
                      <A1TestSelect />,
                      "Loading A1 Tests...",
                    )}
                  />
                  <Route
                    path="/a1/test/:topicId"
                    element={lazyScreen(<A1TestLevel />, "Loading A1 Test...")}
                  />
                  <Route
                    path="/a1/test/:topicId/:level"
                    element={lazyScreen(
                      <A1TestQuestions />,
                      "Loading A1 Questions...",
                    )}
                  />

                  {/* A2 ROUTES */}
                  <Route
                    path="/a2"
                    element={<Navigate to="/a2/flashcard" replace />}
                  />

                  {/* Learn German */}
                  <Route
                    path="/learn-german"
                    element={lazyScreen(
                      <LearnGermanHome />,
                      "Loading Learn German...",
                    )}
                  />
                  <Route
                    path="/learn-german/lesson/:chapterId"
                    element={lazyScreen(<NewLessonFlow />, "Loading Lesson...")}
                  />
                  <Route
                    path="/learn-german/recap"
                    element={lazyScreen(<RecapScreen />, "Loading Recap...")}
                  />
                  <Route
                    path="/learn-german/recap/:chapterId"
                    element={lazyScreen(<RecapScreen />, "Loading Recap...")}
                  />

                  {/* A2 Flashcard */}
                  <Route
                    path="/a2/flashcard"
                    element={lazyScreen(
                      <A2FlashcardSelect />,
                      "Loading A2 Flashcards...",
                    )}
                  />
                  <Route
                    path="/a2/flashcard/:chapterId"
                    element={
                      <Suspense
                        fallback={
                          <RouteScreenSkeleton title="Loading A2 Flashcards..." />
                        }
                      >
                        <A2Flashcard />
                      </Suspense>
                    }
                  />

                  {/* A2 Grammar */}
                  <Route
                    path="/a2/grammar"
                    element={lazyScreen(
                      <A2GrammarSelect />,
                      "Loading A2 Grammar...",
                    )}
                  />
                  <Route
                    path="/a2/grammar/:topicId"
                    element={lazyScreen(
                      <A2GrammarPractice />,
                      "Loading A2 Grammar...",
                    )}
                  />

                  {/* A2 Listening */}
                  <Route
                    path="/a2/listening"
                    element={lazyScreen(
                      <A2ListeningSelect />,
                      "Loading A2 Listening...",
                    )}
                  />
                  <Route
                    path="/a2/listening/:chapterId"
                    element={
                      <Suspense
                        fallback={
                          <RouteScreenSkeleton title="Loading A2 Listening..." />
                        }
                      >
                        <A2ListeningContent />
                      </Suspense>
                    }
                  />

                  {/* A2 Speaking */}
                  <Route
                    path="/a2/speaking"
                    element={lazyScreen(
                      <A2SpeakingSelect />,
                      "Loading A2 Speaking...",
                    )}
                  />
                  <Route
                    path="/a2/speaking/:chapterId"
                    element={lazyScreen(
                      <A2Speaking />,
                      "Loading A2 Speaking...",
                    )}
                  />

                  {/* A2 Reading */}
                  <Route
                    path="/a2/reading"
                    element={lazyScreen(
                      <A2ReadingSelect />,
                      "Loading A2 Reading...",
                    )}
                  />
                  <Route
                    path="/a2/reading/:chapterId"
                    element={lazyScreen(<A2Reading />, "Loading A2 Reading...")}
                  />

                  {/* A2 Test */}
                  <Route
                    path="/a2/test"
                    element={lazyScreen(
                      <A2TestSelect />,
                      "Loading A2 Tests...",
                    )}
                  />
                  <Route
                    path="/a2/test/:topicId"
                    element={lazyScreen(<A2TestLevel />, "Loading A2 Test...")}
                  />
                  <Route
                    path="/a2/test/:topicId/:level"
                    element={lazyScreen(
                      <A2TestQuestions />,
                      "Loading A2 Questions...",
                    )}
                  />

                  {/* Hard Core Test */}
                  <Route
                    path="/exam/:testId"
                    element={lazyScreen(<ExamLobby />, "Loading Exam...")}
                  />
                  <Route
                    path="/exam/:testId/take"
                    element={
                      <Suspense
                        fallback={
                          <RouteScreenSkeleton title="Loading Exam..." />
                        }
                      >
                        <ExamPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/exam/:testId/result"
                    element={lazyScreen(<ExamResult />, "Loading Result...")}
                  />

                  {/* News Module */}
                  <Route
                    path="/news"
                    element={lazyScreen(<NewsHome />, "Loading News...")}
                  />
                  <Route
                    path="/news/:newsId"
                    element={lazyScreen(<NewsPage />, "Loading News...")}
                  />

                  {/* Interview */}
                  <Route
                    path="/interview/:slug"
                    element={lazyScreen(
                      <PublicInterviewPage />,
                      "Loading Interview...",
                    )}
                  />
                  <Route
                    path="/job-screening/interview/:slug"
                    element={lazyScreen(
                      <JobScreeningInterviewPage />,
                      "Loading Interview...",
                    )}
                  />

                  {/* Wise */}
                  <Route
                    path="/internal/wise"
                    element={<Navigate to="/admin/wise" replace />}
                  />

                  {/* B1 Reading & Listening */}
                  <Route
                    path="/b1"
                    element={
                      <LearningRoute>
                        <ReadListenSelect />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/read-listen"
                    element={
                      <LearningRoute>
                        <ReadListenSelect />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/read-listen/list/:module"
                    element={
                      <LearningRoute>
                        <ReadListenTopicSelect />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/read-listen/content/:contentId"
                    element={
                      <LearningRoute>
                        <NewsArticleReader />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/read-listen/success"
                    element={
                      <LearningRoute>
                        <NewsArticleSuccess />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/describe-speak"
                    element={
                      <LearningRoute>
                        <DescribeSpeakSelect />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/describe-speak/workspace/:topicId"
                    element={
                      <LearningRoute>
                        <DescribeSpeakWorkspace />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/describe-speak/success"
                    element={
                      <LearningRoute>
                        <DescribeSpeakSuccess />
                      </LearningRoute>
                    }
                  />
                  {/* B1 Exams (Goethe & TELC) Routes */}
                  <Route
                    path="/b1/exams"
                    element={
                      <LearningRoute>
                        <ExamSelect />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/:examType/papers"
                    element={
                      <LearningRoute>
                        <PaperSelect />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/dashboard"
                    element={
                      <LearningRoute>
                        <ExamBlockSelector />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/reading"
                    element={
                      <LearningRoute>
                        <ExamReadingWorkspace />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/reading/results"
                    element={
                      <LearningRoute>
                        <ExamReadingResults />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/writing"
                    element={
                      <LearningRoute>
                        <ExamWritingWorkspace />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/writing/results"
                    element={
                      <LearningRoute>
                        <ExamWritingResults />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/listening"
                    element={
                      <LearningRoute>
                        <ExamListeningWorkspace />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/listening/results"
                    element={
                      <LearningRoute>
                        <ExamListeningResults />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/speaking"
                    element={
                      <LearningRoute>
                        <ExamSpeakingWorkspace />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/speaking/results"
                    element={
                      <LearningRoute>
                        <ExamSpeakingResults />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/exams/papers/:paperId/congratulations"
                    element={
                      <LearningRoute>
                        <ExamCongratulations />
                      </LearningRoute>
                    }
                  />
                  {/* B1 Flashcards Routes */}
                  <Route
                    path="/b1/flashcard"
                    element={
                      <LearningRoute>
                        <B1FlashcardSelect />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/flashcard/:chapterId"
                    element={
                      <LearningRoute>
                        <B1Flashcard />
                      </LearningRoute>
                    }
                  />
                  {/* B1 Maya Route */}
                  <Route
                    path="/b1/maya"
                    element={
                      <LearningRoute>
                        <B1MayaPage />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/read-listen/video/:videoId"
                    element={
                      <LearningRoute>
                        <VideoReader />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1/read-listen/video-success"
                    element={
                      <LearningRoute>
                        <VideoSuccess />
                      </LearningRoute>
                    }
                  />
                  <Route
                    path="/b1admin"
                    element={lazyScreen(<B1AdminPage />, "Loading B1 Admin...")}
                  />
                </Routes>

                <ConditionalBottomModeSwitcher />
                <ConditionalFooter />
                <SupportWidget />
              </B1ProductTour>
            </A2ProductTour>
          </A1ProductTour>
        </ProductTour>
      </div>
    </div>
  );
}

function RouteScreenSkeleton({ title }) {
  return (
    <div className="min-h-screen bg-[#f6f8fc] px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-slate-500 mb-4">{title}</p>
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-56 bg-slate-200 rounded" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-6 w-40 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function LearningRoute({ children }) {
  return (
    <Suspense fallback={<RouteScreenSkeleton title="Loading B1 Practice..." />}>
      {children}
    </Suspense>
  );
}

function ConditionalFooter() {
  const location = useLocation();
  // Hide footer only on register and internal lead form pages
  const hideFooter =
    location.pathname === "/register" ||
    location.pathname === "/thank-you" ||
    location.pathname === "/internal/lead-form" ||
    location.pathname.startsWith("/terms/sign") ||
    location.pathname.startsWith("/news") ||
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/learn-german") ||
    location.pathname.startsWith("/job-screening") ||
    location.pathname.startsWith("/interview") ||
    location.pathname.startsWith("/admin");

  if (hideFooter) return null;
  return <Footer />;
}

function ConditionalNav() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isJobScreening = queryParams.get("source") === "job_screening";

  // Hide navbar completely on register and internal lead form
  const hideNav =
    location.pathname === "/register" ||
    location.pathname === "/thank-you" ||
    location.pathname === "/internal/lead-form" ||
    (location.pathname.startsWith("/terms/sign") && !isJobScreening) ||
    location.pathname.startsWith("/onboarding") ||
    (location.pathname.startsWith("/interview") && !isJobScreening);

  const disableNav =
    /^\/exam\/[^/]+\/take$/.test(location.pathname) ||
    (location.pathname.startsWith("/interview") && isJobScreening) ||
    location.pathname.startsWith("/job-screening/interview");

  // Show minimal navbar (logo only, no links/burger) on auth pages
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";
  const isOnboarding = location.pathname.startsWith("/onboarding");

  if (hideNav) return null;
  return (
    <NewNavbar
      minimal={isAuthPage}
      disableNavigation={disableNav}
      isOnboarding={isOnboarding}
    />
  );
}

function ConditionalBottomModeSwitcher() {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) return null;

  const showSwitcher =
    location.pathname === "/" || location.pathname === "/learn-german";

  if (!showSwitcher) return null;

  return <BottomModeSwitcher />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
