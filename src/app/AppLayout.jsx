import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import NewNavbar from "../components/NewNavbar";
import PaywallBlocker from "../components/PaywallBlocker";
import GuideSpotlight from "../components/GuideSpotlight";
import BottomTabBar from "../components/BottomTabBar";
import TopModeSwitcher from "../components/TopModeSwitcher";
import Footer from "../components/Footer";
import OtaUpdateModal from "../components/OtaUpdateModal";
import OtaAvatarIndicator from "../components/OtaAvatarIndicator";
import { setOtaProgress } from "../utils/otaProgress";
import MaintenanceModal from "../components/MaintenanceModal";
import UsageLimitModal from "../components/UsageLimitModal";
import PromoAdsHost from "../components/promoAds/PromoAdsHost";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import AppSplashScreen from "../components/common/AppSplashScreen";
import { SplashScreen } from "@capacitor/splash-screen";
import { useDispatch, useSelector } from "react-redux";
import { store } from "../redux/store";
import SupportWidget from "../components/SupportWidget";
import api from "../api/axios";
import { isPracticeSuiteLevel } from "../utils/b1Progress";
import {
  isShellRoute,
  isPaymentRoute,
  isScholarshipRoute,
} from "../utils/shellRoutes";
import { hasPremiumAccess } from "../utils/premium";
import { setUser, logout } from "../redux/auth/authSlice";

const syncPreferredModeCache = (user) => {
  if (typeof window === "undefined" || !user) return;

  // "courses" is a client-side-only mode — the /user/lg-mode whitelist can
  // neither store nor return it, so a local German Classes selection must
  // survive these DB-driven syncs instead of being flipped back to the old
  // learn/practice preference on every /user/me.
  if (localStorage.getItem("lg_preferred_mode") === "courses") return;

  const serverMode =
    user.lg_preferred_mode ||
    (String(user.german_preference) === "3" ? "job_screening" : "");

  if (
    !["learn", "practice", "job_screening", "scholarship"].includes(serverMode)
  )
    return;

  localStorage.setItem("lg_preferred_mode", serverMode);
  window.dispatchEvent(
    new CustomEvent("lgModeChange", { detail: { mode: serverMode } }),
  );
};

import {
  startHeartbeat,
  stopHeartbeat,
  sendAppVersion,
} from "../utils/heartbeat";
import {
  endAppAnalyticsSession,
  startAppAnalyticsSession,
} from "../utils/appAnalytics";

import A2ProductTour from "../tour/A2ProductTour";

import A1ProductTour from "../tour/A1ProductTour";
import B1ProductTour from "../tour/B1ProductTour";
import B2ProductTour from "../tour/B2ProductTour";
import TopSwitcherTour from "../components/TopSwitcherTour";
import { Capacitor } from "@capacitor/core";
import { Fullscreen } from "@boengli/capacitor-fullscreen";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { App as CapApp } from "@capacitor/app";
import { initPushNotifications } from "../notifications/pushNotifications";
import NavigationProgress from "../router/NavigationProgress";
import { mergeRouteHandles, resolveRouteGuard } from "../router/guards";
import { runBackHandler } from "../router/backButton";
import { canGoBackInApp } from "../hooks/useGoBack";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { triggerFeatureFlagsRefresh } from "../hooks/useFeatureFlags";
import {
  getMaintenanceStatus,
  isMaintenanceResponse,
  setMaintenanceStatus,
  subscribeMaintenanceStatus,
} from "../utils/maintenanceSignal";
import { APP_VERSION } from "../config/appVersion";
import {
  addSentryBreadcrumb,
  captureFeatureError,
  setSentryUserFromAuth,
} from "../observability/sentry";
import { identifyUserInClarity } from "../observability/clarity";
import {
  flushTelemetry,
  recordEvent,
  sanitizePath,
  setTelemetryIdentity,
} from "../telemetry";
import {
  captureInstallReferrer,
  captureReferralParamFromUrl,
} from "../utils/referralAttribution";

// Hidden until something opens them — kept out of the startup bundle
const AppReviewPromptModal = lazy(() => import("../components/AppReviewPromptModal"));
const StreakLeaderboardModal = lazy(() => import("../components/StreakLeaderboardModal"));
const PremiumActivatedModal = lazy(() => import("../components/PremiumActivatedModal"));
const TrialCountdownModal = lazy(() => import("../components/TrialCountdownModal"));
const TrialEndedModal = lazy(() => import("../components/TrialEndedModal"));

const MAX_RETRY_ATTEMPTS = 5;

const RETRY_DELAY_MS = 2000;
const PLAY_STORE_URL = "market://details?id=com.skillcase.app";
const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.skillcase.app";

const LAUNCH_URL_KEY = "handled_launch_url";

// skillcase://app/<route> → /<route>. Parsed by hand because older Android
// WebViews give non-special schemes an empty URL.host.
function routeFromSchemeUrl(url) {
  const match = /^skillcase:\/\/app(\/[^#?]*)?([?#].*)?$/i.exec(url || "");
  if (!match) return null;
  return `${match[1] || "/"}${match[2] || ""}`;
}

function GoogleAnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    // Send pageview to Google Analytics on route change
    if (typeof window.gtag === "function") {
      window.gtag("config", "G-CB8X1XP8FL", {
        page_path: sanitizePath(location.pathname),
      });
    }
  }, [location.pathname]);
  return null;
}

export default function AppLayout() {
  const dispatch = useDispatch();
  const { token, user, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const [authBootstrapping, setAuthBootstrapping] = useState(
    Boolean(token && !user),
  );

  useEffect(() => {
    // Hide the native Capacitor splash screen smoothly once the web view has mounted
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  }, []);

  // Referral attribution capture — runs once at boot:
  //  • ?ref=CODE in any entry URL (shared web links landing on iOS/desktop)
  //  • Play Install Referrer on freshly installed Android builds
  // Both stash to localStorage; onboarding completion reads and clears it.
  useEffect(() => {
    captureReferralParamFromUrl(location.search);
    captureInstallReferrer();
    // Only the initial URL matters — later ?ref params are captured too, but
    // re-running on every route change would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useNavigate();
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
  const [showPlayStoreSkipForLater, setShowPlayStoreSkipForLater] =
    useState(true);
  const [maintenanceOpen, setMaintenanceOpen] = useState(
    getMaintenanceStatus(),
  );

  // Each route declares its own access / funnel / chrome flags (router/routes)
  const routeHandle = mergeRouteHandles(useMatches());

  // Pull-to-refresh refreshes the current screen, not the whole app: drop
  // cached GETs, re-pull the user + flags, then remount just the screen.
  const [screenRefreshKey, setScreenRefreshKey] = useState(0);
  const refreshCurrentScreen = useCallback(async () => {
    api.clearGetCache?.();
    triggerFeatureFlagsRefresh();
    try {
      const res = await api.post("/user/me", null, {
        meta: { skipPaywallRefresh: true },
      });
      if (res.data?.user) dispatch(setUser(res.data.user));
    } catch {
      // Offline or server down — still remount so the screen shows its own error
    }
    setScreenRefreshKey((key) => key + 1);
  }, [dispatch]);

  const pullToRefreshEnabled =
    Capacitor.isNativePlatform() &&
    routeHandle.pullToRefresh !== false &&
    !maintenanceOpen;
  const { pullProgress, isRefreshing, containerProps, contentRef, resetPull } =
    usePullToRefresh(refreshCurrentScreen, pullToRefreshEnabled);

  // Callback ref, not useRef: the layout's first render can be a redirect, and
  // a ref-keyed effect never re-ran once the container mounted — pull was dead.
  const [containerEl, setContainerEl] = useState(null);

  useEffect(() => {
    // A non-passive touchmove makes every scroll wait on the main thread, so
    // only attach while pull-to-refresh can actually fire
    if (!containerEl || !pullToRefreshEnabled) return undefined;

    containerEl.addEventListener("touchstart", containerProps.onTouchStart, {
      passive: true,
    });
    containerEl.addEventListener("touchmove", containerProps.onTouchMove, {
      passive: false,
    });
    containerEl.addEventListener("touchend", containerProps.onTouchEnd, {
      passive: true,
    });
    // The OS can cancel a touch mid-pull — don't leave the gesture armed
    containerEl.addEventListener("touchcancel", resetPull, { passive: true });

    return () => {
      containerEl.removeEventListener("touchstart", containerProps.onTouchStart);
      containerEl.removeEventListener("touchmove", containerProps.onTouchMove);
      containerEl.removeEventListener("touchend", containerProps.onTouchEnd);
      containerEl.removeEventListener("touchcancel", resetPull);
    };
  }, [containerEl, containerProps, resetPull, pullToRefreshEnabled]);

  useEffect(() => {
    // Signed-out users never reach these screens. One chunk per idle slot so
    // parsing them can't stack into a long freeze while the user taps around.
    if (!token) return undefined;
    const queue = [
      () => import("../pages/learnGerman/LearnGermanHome"),
      () => import("../pages/jobScreening/JobScreening"),
      () => import("../pages/videoCourses/CourseSelectPage"),
      () => import("../pages/a2/flashcard/A2Flashcard"),
      () => import("../pages/a1/listening/A1ListeningContent"),
      () => import("../pages/a2/listening/A2ListeningContent"),
      () => import("../pages/exam/ExamPage"),
    ];
    const idle = (fn) =>
      window.requestIdleCallback
        ? window.requestIdleCallback(fn, { timeout: 4000 })
        : setTimeout(fn, 800);
    let cancelled = false;
    const next = () =>
      idle(() => {
        const load = queue.shift();
        if (cancelled || !load) return;
        if (document.visibilityState === "visible") load().catch(() => {});
        next();
      });
    const timer = setTimeout(next, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);

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
    recordEvent("navigation.route_changed", {
      domain: "navigation",
      feature: location.pathname,
      entity_type: "route",
      entity_id: location.pathname,
      lifecycle: "observed",
      attributes: { route: location.pathname },
    });
    window.dispatchEvent(new CustomEvent("skillcase:route-changed"));
  }, [location.pathname, location.search]);

  useEffect(() => {
    setTelemetryIdentity(user, token);
    setSentryUserFromAuth(user);
    identifyUserInClarity(user);
  }, [user, token]);

  // Keyed on the account, not the user object — profile refreshes (coins etc.)
  // used to end and restart the analytics session on every change.
  const sessionUserId = user?.user_id ?? null;
  useEffect(() => {
    if (sessionUserId) {
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
  }, [sessionUserId]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let listener;
    CapApp.addListener("appStateChange", ({ isActive }) => {
      recordEvent(isActive ? "app.foregrounded" : "app.backgrounded", {
        domain: "app",
        entity_type: "lifecycle",
        lifecycle: "observed",
      });
      if (!isActive) void flushTelemetry({ keepalive: true });
      // Returning from a UPI app after mandate auth: if the checkout result
      // was lost (process killed / call unresolved), the webhook may still
      // have activated the account — refresh once so that state lands.
      if (isActive) {
        const u = store.getState().auth?.user;
        if (
          u?.razorpay_subscription_id &&
          !u?.autopay_enabled &&
          ["created", "pending", "authenticated"].includes(u?.autopay_status)
        ) {
          api
            .post("/user/me", null, { meta: { skipPaywallRefresh: true } })
            .then((res) => {
              if (res.data?.user) store.dispatch(setUser(res.data.user));
            })
            .catch(() => {});
        }
      }
    }).then((handle) => {
      listener = handle;
    });
    return () => listener?.remove?.();
  }, []);

  // Custom-scheme deep links (skillcase://app<route>) — admin-shared app
  // links and the Android /redirect trampoline land here. Without this the
  // OS delivers the URL to the app but the route is dropped on the floor.
  // Covers warm starts (appUrlOpen) and cold starts (getLaunchUrl).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let listener;
    CapApp.addListener("appUrlOpen", ({ url }) => {
      const route = routeFromSchemeUrl(url);
      if (route) navigate(route);
    }).then((handle) => {
      listener = handle;
    });

    // The launch URL outlives WebView reloads (pull-to-refresh, OTA restart),
    // so only act on it once per app session.
    CapApp.getLaunchUrl()
      .then((res) => {
        const route = res?.url ? routeFromSchemeUrl(res.url) : null;
        if (!route || sessionStorage.getItem(LAUNCH_URL_KEY) === res.url) return;
        sessionStorage.setItem(LAUNCH_URL_KEY, res.url);
        navigate(route);
      })
      .catch(() => {});

    return () => listener?.remove?.();
  }, [navigate]);

  // Android hardware back — screens intercept via router/backButton, not their own listener.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let listener;
    CapApp.addListener("backButton", () => {
      if (runBackHandler()) return;

      // Interview leave guards push entries without idx — let their popstate run.
      if (window.history.state?.idx === undefined) {
        window.history.back();
        return;
      }

      const { pathname, search } = window.location;
      // ?step= on a hub is a pipeline step screen, not the hub itself
      const onHub =
        isShellRoute(pathname) && !new URLSearchParams(search).has("step");
      if (onHub) {
        CapApp.minimizeApp().catch(() => {});
      } else if (canGoBackInApp()) {
        navigate(-1);
      } else if (store.getState().auth?.isAuthenticated) {
        // Opened cold from a deep link — back means "home", not "exit"
        navigate("/", { replace: true });
      } else {
        CapApp.minimizeApp().catch(() => {});
      }
    }).then((handle) => {
      listener = handle;
    });

    return () => listener?.remove?.();
  }, [navigate]);

  // Helper function to open Play Store
  const openPlayStore = async () => {
    recordEvent("ota.play_store_opened", {
      domain: "app_update",
      feature: "ota_update",
      entity_type: "app_release",
      entity_id: APP_VERSION,
      lifecycle: "started",
      outcome: "redirected",
      attributes: { state: "play_store", trigger: "update_now" },
    });
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
            if (!isAuthenticated) {
              console.log("Play store update available, but user is not authenticated; deferring prompt");
              return;
            }
            setShowPlayStoreSkipForLater(data.showSkipForLater !== false);
            recordEvent("ota.update_prompt_presented", {
              domain: "app_update",
              feature: "ota_update",
              entity_type: "app_release",
              entity_id: data.currentVersion,
              lifecycle: "observed",
              attributes: {
                state: "play_store",
                status: data.status,
              },
            });
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
            const isSilent = data.silent === true || !isAuthenticated;
            const bundleExists = bundles.bundleIds?.includes(data.version);

            if (bundleExists) {
              addSentryBreadcrumb({
                category: "ota",
                message: "bundle-already-exists",
                data: { version: data.version, silent: isSilent },
              });
              console.log(
                `Bundle ${data.version} already exists, setting as next bundle${isSilent ? " (silent)" : ""}`,
              );
              await LiveUpdate.setNextBundle({ bundleId: data.version });
              return;
            }

            if (isSilent) {
              // Invisible background download — no modal, apply on next cold start
              recordEvent("ota.download_started", {
                domain: "app_update",
                feature: "ota_update",
                entity_type: "app_release",
                entity_id: data.version,
                lifecycle: "started",
                attributes: { state: "ota_downloading", mode: "silent" },
              });
              addSentryBreadcrumb({
                category: "ota",
                message: "download-started-silent",
                data: { version: data.version },
              });
              api
                .post("/updates/log", {
                  event: "download_started",
                  targetVersion: data.version,
                })
                .catch(() => {});
              await LiveUpdate.downloadBundle({
                url: data.url,
                bundleId: data.version,
              });
              await LiveUpdate.setNextBundle({ bundleId: data.version });
              api
                .post("/updates/log", {
                  event: "download_complete",
                  targetVersion: data.version,
                })
                .catch(() => {});
              console.log(`OTA silent download ready: ${data.version} (next start)`);
              recordEvent("ota.download_completed", {
                domain: "app_update",
                feature: "ota_update",
                entity_type: "app_release",
                entity_id: data.version,
                lifecycle: "succeeded",
                outcome: "ready",
                attributes: { state: "ota_ready", mode: "silent" },
              });
              addSentryBreadcrumb({
                category: "ota",
                message: "download-ready-silent",
                data: { version: data.version },
              });
              return;
            }

            setOtaState("ota_downloading");
            setOtaProgress(0);
            recordEvent("ota.download_started", {
              domain: "app_update",
              feature: "ota_update",
              entity_type: "app_release",
              entity_id: data.version,
              lifecycle: "started",
              attributes: { state: "ota_downloading" },
            });
            addSentryBreadcrumb({
              category: "ota",
              message: "download-started",
              data: { version: data.version },
            });

            // Real byte progress from the plugin drives the avatar ring; a
            // slow creep underneath keeps it moving if events never fire.
            let progressHandle;
            try {
              progressHandle = await LiveUpdate.addListener(
                "downloadBundleProgress",
                (event) => {
                  const pct = Math.round((event?.progress || 0) * 100);
                  if (pct > 0) {
                    setOtaProgress((prev) => Math.max(prev, pct));
                  }
                },
              );
            } catch (_e) {
              // Older plugin/APK without the listener — the creep still animates.
            }

            let pseudoProgress = 0;
            const progressTimer = setInterval(() => {
              pseudoProgress = Math.min(pseudoProgress + 1.5, 92);
              setOtaProgress((prev) => Math.max(prev, pseudoProgress));
            }, 400);

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
              progressHandle?.remove?.();
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
            recordEvent("ota.download_completed", {
              domain: "app_update",
              feature: "ota_update",
              entity_type: "app_release",
              entity_id: data.version,
              lifecycle: "succeeded",
              outcome: "ready",
              attributes: { state: "ota_ready" },
            });
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
          const backoffMs = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          console.log(`Retrying in ${backoffMs}ms... (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})`);
          await delay(backoffMs);
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
        recordEvent("ota.download_failed", {
          domain: "app_update",
          feature: "ota_update",
          entity_type: "app_release",
          entity_id: APP_VERSION,
          lifecycle: "failed",
          outcome: "failed",
          reason_code: "retry_limit_reached",
          attributes: { retry_count: retryCount, state: "failed" },
        });
        captureFeatureError(err, {
          featureArea: "ota_update",
          tags: { action: "all_attempts_failed" },
          extra: {
            maxRetryAttempts: MAX_RETRY_ATTEMPTS,
            appVersion: APP_VERSION,
          },
        });
        // Dismiss the avatar update indicator — never leave a stuck UI behind
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

      if (active && !user) setAuthBootstrapping(true);
      try {
        const res = await api.post("/user/me");
        if (!active) return;
        dispatch(setUser(res.data.user));
        syncPreferredModeCache(res.data.user);
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
    if (isAuthenticated && user) {
      syncPreferredModeCache(user);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const unsubscribe = subscribeMaintenanceStatus(setMaintenanceOpen);
    return unsubscribe;
  }, []);

  const healthCheckInFlightRef = useRef(false);

  const checkHealth = useCallback(async (maxRetries = 2) => {
    // Skip polling when the tab is not visible — avoids false triggers
    // caused by OS-level network suspension on background tabs.
    if (
      document.visibilityState !== "visible" ||
      healthCheckInFlightRef.current
    ) {
      return;
    }

    healthCheckInFlightRef.current = true;

    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL;
      const healthUrl = new URL("/health", baseUrl).toString();

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
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
            return;
          }

          const data = await response.json().catch(() => null);
          if (isMaintenanceResponse({ status: response.status, data })) {
            setMaintenanceStatus(true);
            setMaintenanceOpen(true);
            addSentryBreadcrumb({
              category: "maintenance",
              message: "maintenance-mode-confirmed",
            });
            return;
          }

          if (attempt === maxRetries) {
            addSentryBreadcrumb({
              category: "maintenance",
              message: "health-check-unavailable",
              data: { status: response.status },
            });
            return;
          }
        } catch (error) {
          clearTimeout(timeoutId);

          if (attempt === maxRetries) {
            // A timeout or network failure is not proof of maintenance. Keep
            // the app usable and wait for the next scheduled health check.
            addSentryBreadcrumb({
              category: "maintenance",
              message: "health-check-network-failure",
              data: { error: error?.name || "unknown" },
            });
            return;
          }
        }

        // Retry transparently, but keep the retry sequence inside this
        // request so interval/manual checks cannot create racing retries.
        await delay(2000);
      }
    } finally {
      healthCheckInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 60000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  if (token && !user && authBootstrapping) {
    return <AppSplashScreen message="Hi, I am Maya." />;
  }

  const guardRedirect = resolveRouteGuard({
    isAuthenticated,
    user,
    handle: routeHandle,
    pathname: location.pathname,
    search: location.search,
  });
  if (guardRedirect) {
    return <Navigate to={guardRedirect.to} replace state={guardRedirect.state} />;
  }

  // A running 7-day trial counts as premium access, so it lifts the lock the
  // same way an active subscription does (hasPremiumAccess = paid OR trial).
  const isPaywallLocked =
    isAuthenticated &&
    user &&
    user.role === "user" &&
    user.paywall_active === true &&
    !hasPremiumAccess(user);

  return (
    <div
      ref={setContainerEl}
      className="relative overflow-x-clip w-full min-h-screen flex flex-col"
    >
      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />
      <div ref={contentRef} className="flex-1 flex flex-col">
        <Suspense fallback={null}>
          <AppReviewPromptModal
            blocked={maintenanceOpen || otaState === "play_store"}
          />
        </Suspense>
        <OtaAvatarIndicator
          otaState={maintenanceOpen || !isAuthenticated ? null : otaState}
          onUpdateNow={async () => {
            recordEvent("ota.restart_requested", {
              domain: "app_update",
              feature: "ota_update",
              entity_type: "app_release",
              entity_id: APP_VERSION,
              lifecycle: "started",
              attributes: { state: "ota_ready", trigger: "restart_now" },
            });
            try {
              await LiveUpdate.reload();
            } catch (e) {
              console.error("Reload failed", e);
              alert(
                "Could not restart automatically. Please close and reopen the app to apply the update.",
              );
            }
          }}
          onUpdateLater={() => {
            recordEvent("ota.update_deferred", {
              domain: "app_update",
              feature: "ota_update",
              entity_type: "app_release",
              entity_id: APP_VERSION,
              lifecycle: "observed",
              outcome: "deferred",
              reason_code: "restart_later",
              attributes: { state: otaState, trigger: "user_action" },
            });
            setOtaState(null);
          }}
        />
        <OtaUpdateModal
          otaState={
            maintenanceOpen || !isAuthenticated || otaState !== "play_store"
              ? null
              : otaState
          }
          showSkipForLater={showPlayStoreSkipForLater}
          onSkip={() => {
            recordEvent("ota.update_deferred", {
              domain: "app_update",
              feature: "ota_update",
              entity_type: "app_release",
              entity_id: APP_VERSION,
              lifecycle: "observed",
              outcome: "deferred",
              reason_code: "skip_for_later",
              attributes: { state: otaState, trigger: "user_action" },
            });
            setOtaState(null);
          }}
          onOpenPlayStore={openPlayStore}
        />
        <MaintenanceModal open={maintenanceOpen} onRetry={checkHealth} />
        <UsageLimitModal />
        <Suspense fallback={null}>
          <StreakLeaderboardModal />
        </Suspense>

        {/* Free-trial lifecycle modals — countdown while <= 2 days remain,
            trial-ended once it expires (one-time dismissal). Hub screens only:
            these are full-screen nags, so they must never land on top of an
            exam attempt, a lesson, the interview flow or the payment funnel
            they themselves link out to. */}
        {isShellRoute(location.pathname) && (
          <Suspense fallback={null}>
            <TrialCountdownModal />
            <TrialEndedModal />
          </Suspense>
        )}

        {/* Promo ads — hub screens only, never under a blocking overlay */}
        {isShellRoute(location.pathname) && isAuthenticated && (
          <PromoAdsHost
            blocked={maintenanceOpen || otaState === "play_store" || isPaywallLocked}
          />
        )}

        <A1ProductTour>
          <A2ProductTour>
            <B1ProductTour>
              <B2ProductTour>
                <GoogleAnalyticsTracker />
                <ScrollRestoration />
                <NavigationProgress />
                <Toaster
                  position="top-right"
                  containerStyle={{ zIndex: 100000 }}
                />
                <AppHeaderShell />
                <ConditionalTopSwitcher />
                <TopSwitcherTour />
                {isPaywallLocked && !isPaymentRoute(location.pathname) && (
                  <PaywallBlocker
                    user={user}
                    dispatch={dispatch}
                    onSuccess={() => setShowPaymentSuccess(true)}
                  />
                )}

                {/* Premium Activated Modal — revamped success state */}
                <Suspense fallback={null}>
                  <PremiumActivatedModal
                    open={showPaymentSuccess}
                    onClose={() => {
                      setShowPaymentSuccess(false);
                      setShowProfileHighlight(true);
                    }}
                    onGoHome={() => {
                      setShowPaymentSuccess(false);
                      navigate("/");
                    }}
                  />
                </Suspense>

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

                {/* Safety net for screens that lazy-load parts of themselves */}
                <Suspense fallback={<div className="min-h-screen" />}>
                  <Outlet key={screenRefreshKey} />
                </Suspense>

                <ConditionalBottomTabBar />
                <div className="mt-auto">
                  {routeHandle.footer && <Footer />}
                </div>
                <SupportWidget />
                </B2ProductTour>
              </B1ProductTour>
            </A2ProductTour>
          </A1ProductTour>
      </div>
    </div>
  );
}

function AppHeaderShell() {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const isWhiteHeader =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    (location.pathname.startsWith("/job-screening") &&
      !isPracticeSuiteLevel(user?.user_prof_level));

  return (
    <div
      className={`sticky top-0 z-50 w-full vt-app-header ${
        isWhiteHeader ? "bg-white" : "bg-[#002856]"
      }`}
    >
      <ConditionalNav />
      {/* <ConditionalTopSwitcher /> */}
    </div>
  );
}

function ConditionalNav() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isJobScreening = queryParams.get("source") === "job_screening";
  const path = location.pathname;
  const isExecutingJobStep =
    path === "/job-screening" && queryParams.has("step");

  if (isExecutingJobStep) {
    return null;
  }

  // The app shell (navy navbar + top switcher) only lives on the four hub
  // screens. Every learning / applying screen has its own in-page header and
  // back navigation, so it renders without the navbar. Auth pages, the admin
  // panel and shared job-screening flows (?source=job_screening) keep it.
  const isAuthPage = path === "/login" || path === "/signup";
  const isAdminPage = path.startsWith("/admin");
  const isSharedJobScreening =
    isJobScreening &&
    (path.startsWith("/job-screening") || path.startsWith("/interview"));

  if (
    !isShellRoute(path) &&
    !isAuthPage &&
    !isAdminPage &&
    !isSharedJobScreening
  ) {
    return null;
  }

  const disableNav =
    (path.startsWith("/interview") && isJobScreening) ||
    path.startsWith("/job-screening/interview");

  return <NewNavbar disableNavigation={disableNav} />;
}

function ConditionalTopSwitcher() {
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const isExecutingJobStep =
    location.pathname === "/job-screening" &&
    new URLSearchParams(location.search).has("step");

  if (!isAuthenticated || isExecutingJobStep) return null;

  // The mode switcher lives on the primary shell screens and stays fixed
  // together with the navbar at the top of the viewport. B1/B2 users have the
  // Exam & Practice + Jobs tabs, so their switcher renders on the practice
  // home AND the job-screening pipeline lobby — flipping between the two
  // modes is the whole point of their two-tab switcher. The scholarship hub
  // renders the single-tab "Scholarship Exam" switcher variant. The focused
  // interview / terms flows keep their own chrome.
  const isB1 = isPracticeSuiteLevel(user?.user_prof_level);
  const showSwitcher = isScholarshipRoute(location.pathname)
    ? location.pathname === "/scholarship"
    : isB1
      ? location.pathname === "/" ||
        location.pathname === "/job-screening" ||
        location.pathname === "/video-courses"
      : location.pathname === "/" ||
        location.pathname === "/learn-german" ||
        location.pathname === "/video-courses";

  if (!showSwitcher) return null;

  return <TopModeSwitcher />;
}

function ConditionalBottomTabBar() {
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const isExecutingJobStep =
    location.pathname === "/job-screening" &&
    new URLSearchParams(location.search).has("step");

  if (!isAuthenticated || isExecutingJobStep) return null;

  // The bottom tab bar lives on the four hub screens (shell routes) only —
  // never on learning / applying screens or the focused interview / terms
  // flows, which carry their own chrome. Legacy non-B1 screening candidates
  // keep the white pipeline chrome, so the tab bar stays off /job-screening
  // for them; B1/B2 users get it on the lobby (Jobs tab active) so Home is
  // always one tap away.
  const isB1 = isPracticeSuiteLevel(user?.user_prof_level);
  const showTabBar =
    isShellRoute(location.pathname) &&
    (isB1 || location.pathname !== "/job-screening");

  if (!showTabBar) return null;

  return <BottomTabBar />;
}
