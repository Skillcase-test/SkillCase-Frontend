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

import ConversationSelect from "./pages/ConversationSelect";
import ConversationPlayer from "./pages/ConversationPlayer";
import NursingGermanyLanding from "./pages/NursingGermanyLanding";

import AllEventsPage from "./pages/event/AllEventsPage";
import EventDetailPage from "./pages/event/EventDetailPage";
import FeaturedEventPage from "./pages/event/FeaturedEventPage";
import ManageEventsPublic from "./pages/event/ManageEventsPublic";

//fallback page
import FallbackPage from "./pages/FallbackPage";

import ContinuePractice from "./pages/ContinuePractice";

//capacitor app
import { Capacitor } from "@capacitor/core";
import { Fullscreen } from "@boengli/capacitor-fullscreen";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { initPushNotifications } from "./notifications/pushNotifications";
import InternalLeadForm from "./pages/InternalLeadForm";
import ProductTour from "./tour/ProductTour";

export const APP_VERSION = "1.0.2";

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
    "/events"
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    location.pathname.startsWith(route)
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
      startHeartbeat();
      sendAppVersion();
    } else {
      stopHeartbeat();
    }

    return () => stopHeartbeat();
  }, [user]);

  const initLiveUpdate = async () => {
    try {
      await LiveUpdate.ready();
      // Use authenticated API call instead of fetch
      const response = await api.get(
        `/api/updates/check?version=${APP_VERSION}`
      );

      const data = response.data;

      if (data.url) {
        // Log download attempt
        api
          .post("/api/updates/log", {
            event: "download_started",
            targetVersion: data.version,
          })
          .catch(() => {});
        await LiveUpdate.downloadBundle({
          url: data.url,
          bundleId: data.version,
        });
        await LiveUpdate.setNextBundle({ bundleId: data.version });
        // Log success
        api
          .post("/api/updates/log", {
            event: "download_complete",
            targetVersion: data.version,
          })
          .catch(() => {});
      }
    } catch (err) {
      // Log failure
      api
        .post("/api/updates/log", {
          event: "download_failed",
          targetVersion: APP_VERSION,
          error: err.message,
        })
        .catch(() => {});

      console.error("Live update failed:", err);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          const res = await api.get("/user/me");
          dispatch(setUser(res.data));
        } catch (err) {
          console.error("Token expired or invalid");
          dispatch(logout());
        }
      }
    };
    fetchUser();
  }, [token, user, dispatch]);

  // Redirect to signup if not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <ProductTour>
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
      </Routes>

      <ConditionalFooter />
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
