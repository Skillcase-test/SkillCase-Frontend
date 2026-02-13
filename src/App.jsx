import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: true,
});

import { useEffect } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import ChapterSelect from "./pages/flashcard/ChapterSelect";
import TestSelect from "./pages/testSelect";
import FlashcardStudyPage from "./pages/flashcard/FlashCard";
import api from "./api/axios";
import { setUser, logout } from "./redux/auth/authSlice";
import PronounceSelect from "./pages/pronounce/PronounceSelect";
import Pronounce from "./pages/pronounce/Pronounce";
import Dashboard from "./dashboard-src/pages/Dashboard";
import ShortStoryHome from "./pages/ShortStoryHome";
import StoryPage from "./pages/StoryPage";
import ThankYouPage from "./pages/ThankYouPage";
if (typeof global === "undefined") {
  window.global = window;
}

import {
  startHeartbeat,
  stopHeartbeat,
  sendAppVersion,
} from "./utils/heartbeat";

import "./dashboard-src/css/style.css";

// import ResumePage from "./pages/ResumePage";
// import AIResumeBuilder from "./pages/AIResumeBuilder";
// import ManualResumeBuilder from "./pages/ManualResumeBuilder";
// import MyResumes from "./pages/MyResumes";

import ProfilePage from "./pages/ProfilePage";

import ConversationSelect from "./pages/ConversationSelect";
import ConversationPlayer from "./pages/ConversationPlayer";
import NursingGermanyLanding from "./pages/NursingGermanyLanding";

import AllEventsPage from "./pages/event/AllEventsPage";
import EventDetailPage from "./pages/event/EventDetailPage";
import FeaturedEventPage from "./pages/event/FeaturedEventPage";
import ManageEventsPublic from "./pages/event/ManageEventsPublic";

// A2 Imports
import A2FlashcardSelect from "./pages/a2/flashcard/A2FlashcardSelect";
import A2Flashcard from "./pages/a2/flashcard/A2Flashcard";
import A2GrammarSelect from "./pages/a2/grammar/A2GrammarSelect";
import A2GrammarPractice from "./pages/a2/grammar/A2GrammarPractice";
import A2ListeningSelect from "./pages/a2/listening/A2ListeningSelect";
import A2ListeningContent from "./pages/a2/listening/A2ListeningContent";
import A2SpeakingSelect from "./pages/a2/speaking/A2SpeakingSelect";
import A2Speaking from "./pages/a2/speaking/A2Speaking";
import A2ReadingSelect from "./pages/a2/reading/A2ReadingSelect";
import A2Reading from "./pages/a2/reading/A2Reading";
import A2TestSelect from "./pages/a2/test/A2TestSelect";
import A2TestLevel from "./pages/a2/test/A2TestLevel";
import A2TestQuestions from "./pages/a2/test/A2TestQuestions";
import A2ProductTour from "./tour/A2ProductTour";

//fallback page
import FallbackPage from "./pages/FallbackPage";

import ContinuePractice from "./pages/ContinuePractice";

//capacitor app
import { Capacitor } from "@capacitor/core";
import { Fullscreen } from "@boengli/capacitor-fullscreen";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { App as CapApp } from "@capacitor/app";
import { initPushNotifications } from "./notifications/pushNotifications";

import InternalLeadForm from "./pages/InternalLeadForm";
import ProductTour from "./tour/ProductTour";

export const APP_VERSION = "1.0.4";
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

  // Public routes that don't require auth
  const publicRoutes = [
    "/login",
    "/signup",
    "/register",
    "/open-app",
    "/thank-you",
    "/internal/lead-form",
    "/manage-event",
    "/events",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    location.pathname.startsWith(route),
  );

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Fullscreen.activateImmersiveMode();
      initLiveUpdate();

      // Only init push notifications if authenticated
      if (token) {
        initPushNotifications();
      }
    }
  }, [token]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      // Start heartbeat for all users, but it only sends when dashboard is active
      startHeartbeat();
      sendAppVersion();
    } else {
      stopHeartbeat();
    }

    return () => stopHeartbeat();
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

  // Replace the initLiveUpdate function (lines 145-188) with:
  const initLiveUpdate = async () => {
    let retryCount = 0;

    const attemptUpdate = async () => {
      try {
        await LiveUpdate.ready();

        // Check for existing bundles to avoid redundant downloads
        const bundles = await LiveUpdate.getBundles();

        // Make the update check API call
        const response = await api.get(
          `/updates/check?version=${APP_VERSION}`,
        );

        const data = response.data;

        // Handle different update statuses
        switch (data.status) {
          case "up_to_date":
          case "newer_version":
            // No action needed
            console.log("App is up to date or on development version");
            return;

          case "play_store":
            // Log the redirect event
            api
              .post("/updates/log", {
                event: "play_store_redirect",
                targetVersion: data.currentVersion,
                appVersion: APP_VERSION,
              })
              .catch(() => {});

            // Show alert and open Play Store
            if (
              window.confirm(
                "A new version is available on the Play Store. Update now for the best experience?",
              )
            ) {
              await openPlayStore();
            }
            return;

          case "ota_available":
            // Check if we already have this bundle
            const bundleExists = bundles.bundleIds?.includes(data.version);

            if (bundleExists) {
              console.log(
                `Bundle ${data.version} already exists, setting as next bundle`,
              );
              await LiveUpdate.setNextBundle({ bundleId: data.version });
              return;
            }

            // Log download attempt
            api
              .post("/updates/log", {
                event: "download_started",
                targetVersion: data.version,
              })
              .catch(() => {});

            // Download the bundle
            await LiveUpdate.downloadBundle({
              url: data.url,
              bundleId: data.version,
            });

            // Set as next bundle to apply on restart
            await LiveUpdate.setNextBundle({ bundleId: data.version });

            // Log success
            api
              .post("/updates/log", {
                event: "download_complete",
                targetVersion: data.version,
              })
              .catch(() => {});

            console.log(`OTA update downloaded: ${data.version}`);
            return;

          default:
            console.warn("Unknown update status:", data.status);
        }
      } catch (err) {
        retryCount++;

        // Log retry attempt
        api
          .post("/updates/log", {
            event: "retry_attempt",
            targetVersion: APP_VERSION,
            error: `Attempt ${retryCount}: ${err.message}`,
          })
          .catch(() => {});

        console.error(`OTA update attempt ${retryCount} failed:`, err.message);

        // Retry if we haven't exceeded max attempts
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
          return attemptUpdate(); // Recursive retry
        }

        // Max retries exceeded - log failure
        api
          .post("/updates/log", {
            event: "download_failed",
            targetVersion: APP_VERSION,
            error: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${err.message}`,
          })
          .catch(() => {});

        console.error("OTA update failed after all retry attempts");
      }
    };

    await attemptUpdate();
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.post("/user/me");
          dispatch(setUser(res.data.user));
        } catch (err) {
          console.error("Token expired or invalid");
          dispatch(logout());
        }
      }
    };
    fetchUser();
  }, [token, dispatch]);

  // Redirect to signup if not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <ProductTour>
      <A2ProductTour>
        <GoogleAnalyticsTracker />
        <Toaster position="top-right" />
        <ConditionalNav />

        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/test/:prof_level" element={<TestSelect />} />
          {/* <Route path ='/interview/:prof_level' element = {<InterviewSelect/>}/> */}
          <Route path="/practice/:prof_level" element={<ChapterSelect />} />
          <Route path="/pronounce/:prof_level" element={<PronounceSelect />} />
          <Route
            path="/practice/:prof_level/:set_id"
            element={<FlashcardStudyPage />}
          />
          <Route path="/admin" element={<Dashboard />} />
          <Route
            path="/pronounce/:prof_level/:pronounce_id"
            element={<Pronounce />}
          />
          {/* <Route path="/Login" element={<LoginSignupPage />} /> */}
          <Route path="/stories" element={<ShortStoryHome />} />
          <Route path="/story/:slug" element={<StoryPage />} />

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
            element={<ConversationSelect />}
          />
          <Route
            path="/conversation/:prof_level/:conversation_id"
            element={<ConversationPlayer />}
          />
          <Route path="/register" element={<NursingGermanyLanding />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/open-app" element={<FallbackPage />} />
          <Route path="/continue" element={<ContinuePractice />} />
          <Route path="/internal/lead-form" element={<InternalLeadForm />} />
          <Route path="/events" element={<AllEventsPage />} />
          <Route path="/events/featured" element={<FeaturedEventPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/manage-event" element={<ManageEventsPublic />} />

          <Route path="/profile" element={<ProfilePage />} />

          {/* A2 ROUTES */}
          {/* A2 Flashcard */}
          <Route path="/a2/flashcard" element={<A2FlashcardSelect />} />
          <Route path="/a2/flashcard/:chapterId" element={<A2Flashcard />} />

          {/* A2 Grammar */}
          <Route path="/a2/grammar" element={<A2GrammarSelect />} />
          <Route path="/a2/grammar/:topicId" element={<A2GrammarPractice />} />

          {/* A2 Listening */}
          <Route path="/a2/listening" element={<A2ListeningSelect />} />
          <Route
            path="/a2/listening/:chapterId"
            element={<A2ListeningContent />}
          />

          {/* A2 Speaking */}
          <Route path="/a2/speaking" element={<A2SpeakingSelect />} />
          <Route path="/a2/speaking/:chapterId" element={<A2Speaking />} />

          {/* A2 Reading */}
          <Route path="/a2/reading" element={<A2ReadingSelect />} />
          <Route path="/a2/reading/:chapterId" element={<A2Reading />} />

          {/* A2 Test */}
          <Route path="/a2/test" element={<A2TestSelect />} />
          <Route path="/a2/test/:topicId" element={<A2TestLevel />} />
          <Route
            path="/a2/test/:topicId/:level"
            element={<A2TestQuestions />}
          />
        </Routes>

        <ConditionalFooter />
      </A2ProductTour>
    </ProductTour>
  );
}

function ConditionalFooter() {
  const location = useLocation();
  // Hide footer only on register and internal lead form pages
  const hideFooter =
    location.pathname === "/register" ||
    location.pathname === "/thank-you" ||
    location.pathname === "/internal/lead-form";

  if (hideFooter) return null;
  return <Footer />;
}

function ConditionalNav() {
  const location = useLocation();
  // Hide navbar completely on register and internal lead form
  const hideNav =
    location.pathname === "/register" ||
    location.pathname === "/thank-you" ||
    location.pathname === "/internal/lead-form";

  // Show minimal navbar (logo only, no links/burger) on auth pages
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  if (hideNav) return null;
  return <NewNavbar minimal={isAuthPage} />;
}
