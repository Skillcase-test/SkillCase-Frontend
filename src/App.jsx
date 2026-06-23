import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import SignupPage from "./pages/auth/SignupPage";
import LoginPage from "./pages/auth/LoginPage";
import LandingPage from "./pages/landing/LandingPage";
import NewNavbar from "./components/NewNavbar";
import NewFooter from "./components/NewFooter";
import Footer from "./components/Footer";
import OtaUpdateModal from "./components/OtaUpdateModal";
import MaintenanceModal from "./components/MaintenanceModal";
import PullToRefreshIndicator from "./components/PullToRefreshIndicator";
import { useDispatch, useSelector } from "react-redux";
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
const NursingGermanyLanding = lazy(() => import("./pages/NursingGermanyLanding"));
const AllEventsPage = lazy(() => import("./pages/event/AllEventsPage"));
const EventDetailPage = lazy(() => import("./pages/event/EventDetailPage"));
const FeaturedEventPage = lazy(() => import("./pages/event/FeaturedEventPage"));
const A2FlashcardSelect = lazy(() => import("./pages/a2/flashcard/A2FlashcardSelect"));
const A2Flashcard = lazy(() => import("./pages/a2/flashcard/A2Flashcard"));
const A2GrammarSelect = lazy(() => import("./pages/a2/grammar/A2GrammarSelect"));
const A2GrammarPractice = lazy(() => import("./pages/a2/grammar/A2GrammarPractice"));
const A2ListeningSelect = lazy(() => import("./pages/a2/listening/A2ListeningSelect"));
const A1ListeningContent = lazy(() =>
  import("./pages/a1/listening/A1ListeningContent"),
);
const A2ListeningContent = lazy(() =>
  import("./pages/a2/listening/A2ListeningContent"),
);
const A2SpeakingSelect = lazy(() => import("./pages/a2/speaking/A2SpeakingSelect"));
const A2Speaking = lazy(() => import("./pages/a2/speaking/A2Speaking"));
const A2ReadingSelect = lazy(() => import("./pages/a2/reading/A2ReadingSelect"));
const A2Reading = lazy(() => import("./pages/a2/reading/A2Reading"));
const A2TestSelect = lazy(() => import("./pages/a2/test/A2TestSelect"));
const A2TestLevel = lazy(() => import("./pages/a2/test/A2TestLevel"));
const A2TestQuestions = lazy(() => import("./pages/a2/test/A2TestQuestions"));
const A1FlashcardSelect = lazy(() => import("./pages/a1/flashcard/A1FlashcardSelect"));
const A1Flashcard = lazy(() => import("./pages/a1/flashcard/A1Flashcard"));
const A1GrammarSelect = lazy(() => import("./pages/a1/grammar/A1GrammarSelect"));
const A1GrammarPractice = lazy(() => import("./pages/a1/grammar/A1GrammarPractice"));
const A1ListeningSelect = lazy(() => import("./pages/a1/listening/A1ListeningSelect"));
const A1ReadingSelect = lazy(() => import("./pages/a1/reading/A1ReadingSelect"));
const A1Reading = lazy(() => import("./pages/a1/reading/A1Reading"));
const A1SpeakingSelect = lazy(() => import("./pages/a1/speaking/A1SpeakingSelect"));
const A1Speaking = lazy(() => import("./pages/a1/speaking/A1Speaking"));
const A1TestSelect = lazy(() => import("./pages/a1/test/A1TestSelect"));
const A1TestLevel = lazy(() => import("./pages/a1/test/A1TestLevel"));
const A1TestQuestions = lazy(() => import("./pages/a1/test/A1TestQuestions"));
const ExamLobby = lazy(() => import("./pages/exam/ExamLobby"));
const ExamPage = lazy(() => import("./pages/exam/ExamPage"));
const ExamResult = lazy(() => import("./pages/exam/ExamResult"));
const NewsHome = lazy(() => import("./pages/news/NewsHome"));
const NewsPage = lazy(() => import("./pages/news/NewsPage"));
const PublicInterviewPage = lazy(() => import("./pages/interviewTools/PublicInterviewPage"));
const FallbackPage = lazy(() => import("./pages/FallbackPage"));
const ContinuePractice = lazy(() => import("./pages/ContinuePractice"));
const TermsSignPage = lazy(() => import("./pages/terms/TermsSignPage"));
const Dashboard = lazy(() => import("./dashboard-src/pages/Dashboard"));

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

  const [otaState, setOtaState] = useState(null); // null | 'play_store' | 'ota_downloading' | 'ota_ready'
  const [otaProgress, setOtaProgress] = useState(0);
  const [maintenanceOpen, setMaintenanceOpen] = useState(getMaintenanceStatus());

  // Public routes that don't require auth
  const publicRoutes = [
    "/login",
    "/signup",
    "/register",
    "/open-app",
    "/thank-you",
    "/events",
    "/terms/sign",
  ];
  const isPublicRoute =
    publicRoutes.some((route) => location.pathname.startsWith(route)) ||
    /^\/interview\/[^/]+$/.test(location.pathname);
  const disablePullToRefresh = useMemo(
    () =>
      /^\/exam\/[^/]+\/take$/.test(location.pathname) ||
      /^\/interview\/[^/]+$/.test(location.pathname) ||
      location.pathname.startsWith("/news"),
    [location.pathname],
  );

  const refreshWholeApp = useCallback(async () => {
    window.location.reload();
  }, []);

  const { pullProgress, isRefreshing, containerProps } = usePullToRefresh(
    refreshWholeApp,
    Capacitor.isNativePlatform() && !disablePullToRefresh && !maintenanceOpen,
    { activationY: 96 },
  );

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

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
          extra: { maxRetryAttempts: MAX_RETRY_ATTEMPTS, appVersion: APP_VERSION },
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

  const lazyScreen = (element, title) => (
    <Suspense fallback={<RouteScreenSkeleton title={title} />}>
      {element}
    </Suspense>
  );

  return (
    <div {...containerProps}>
      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />
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
            <GoogleAnalyticsTracker />
            <Toaster position="top-right" />
            <ConditionalNav />

            <Routes>
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/test/:prof_level"
                element={lazyScreen(<TestSelect />, "Loading Tests...")}
              />
              {/* <Route path ='/interview/:prof_level' element = {<InterviewSelect/>}/> */}
              <Route
                path="/practice/:prof_level"
                element={lazyScreen(<ChapterSelect />, "Loading Chapters...")}
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
                  <Suspense fallback={<RouteScreenSkeleton title="Loading Flashcards..." />}>
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
                element={lazyScreen(<Pronounce />, "Loading Pronunciation...")}
              />
              {/* <Route path="/Login" element={<LoginSignupPage />} /> */}
              <Route
                path="/stories"
                element={lazyScreen(<ShortStoryHome />, "Loading Stories...")}
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
                element={lazyScreen(<NursingGermanyLanding />, "Loading...")}
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
                element={lazyScreen(<FeaturedEventPage />, "Loading Event...")}
              />
              <Route
                path="/events/:slug"
                element={lazyScreen(<EventDetailPage />, "Loading Event...")}
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
                element={lazyScreen(<A1Flashcard />, "Loading A1 Flashcards...")}
              />

              {/* A1 Grammar */}
              <Route
                path="/a1/grammar"
                element={lazyScreen(<A1GrammarSelect />, "Loading A1 Grammar...")}
              />
              <Route
                path="/a1/grammar/:topicId"
                element={lazyScreen(<A1GrammarPractice />, "Loading A1 Grammar...")}
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
                  <Suspense fallback={<RouteScreenSkeleton title="Loading A1 Listening..." />}>
                    <A1ListeningContent />
                  </Suspense>
                }
              />

              {/* A1 Speaking */}
              <Route
                path="/a1/speaking"
                element={lazyScreen(<A1SpeakingSelect />, "Loading A1 Speaking...")}
              />
              <Route
                path="/a1/speaking/:chapterId"
                element={lazyScreen(<A1Speaking />, "Loading A1 Speaking...")}
              />

              {/* A1 Reading */}
              <Route
                path="/a1/reading"
                element={lazyScreen(<A1ReadingSelect />, "Loading A1 Reading...")}
              />
              <Route
                path="/a1/reading/:chapterId"
                element={lazyScreen(<A1Reading />, "Loading A1 Reading...")}
              />

              {/* A1 Test */}
              <Route
                path="/a1/test"
                element={lazyScreen(<A1TestSelect />, "Loading A1 Tests...")}
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
                  <Suspense fallback={<RouteScreenSkeleton title="Loading A2 Flashcards..." />}>
                    <A2Flashcard />
                  </Suspense>
                }
              />

              {/* A2 Grammar */}
              <Route
                path="/a2/grammar"
                element={lazyScreen(<A2GrammarSelect />, "Loading A2 Grammar...")}
              />
              <Route
                path="/a2/grammar/:topicId"
                element={lazyScreen(<A2GrammarPractice />, "Loading A2 Grammar...")}
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
                  <Suspense fallback={<RouteScreenSkeleton title="Loading A2 Listening..." />}>
                    <A2ListeningContent />
                  </Suspense>
                }
              />

              {/* A2 Speaking */}
              <Route
                path="/a2/speaking"
                element={lazyScreen(<A2SpeakingSelect />, "Loading A2 Speaking...")}
              />
              <Route
                path="/a2/speaking/:chapterId"
                element={lazyScreen(<A2Speaking />, "Loading A2 Speaking...")}
              />

              {/* A2 Reading */}
              <Route
                path="/a2/reading"
                element={lazyScreen(<A2ReadingSelect />, "Loading A2 Reading...")}
              />
              <Route
                path="/a2/reading/:chapterId"
                element={lazyScreen(<A2Reading />, "Loading A2 Reading...")}
              />

              {/* A2 Test */}
              <Route
                path="/a2/test"
                element={lazyScreen(<A2TestSelect />, "Loading A2 Tests...")}
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
                  <Suspense fallback={<RouteScreenSkeleton title="Loading Exam..." />}>
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

              {/* Wise */}
              <Route
                path="/internal/wise"
                element={<Navigate to="/admin/wise" replace />}
              />
            </Routes>

            <ConditionalFooter />
          </A2ProductTour>
        </A1ProductTour>
      </ProductTour>
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

function ConditionalFooter() {
  const location = useLocation();
  // Hide footer only on register and internal lead form pages
  const hideFooter =
    location.pathname === "/register" ||
    location.pathname === "/thank-you" ||
    location.pathname === "/internal/lead-form" ||
    location.pathname.startsWith("/terms/sign") ||
    location.pathname.startsWith("/news");

  if (hideFooter) return null;
  return <Footer />;
}

function ConditionalNav() {
  const location = useLocation();
  // Hide navbar completely on register and internal lead form
  const hideNav =
    location.pathname === "/register" ||
    location.pathname === "/thank-you" ||
    location.pathname === "/internal/lead-form" ||
    location.pathname.startsWith("/terms/sign");

  const disableNav = /^\/exam\/[^/]+\/take$/.test(location.pathname);

  // Show minimal navbar (logo only, no links/burger) on auth pages
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  if (hideNav) return null;
  return <NewNavbar minimal={isAuthPage} disableNavigation={disableNav} />;
}
