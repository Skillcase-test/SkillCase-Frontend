import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: true,
});

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
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
if (typeof global === "undefined") {
  window.global = window;
}

import { useSSO } from "./hooks/useSSO";

import "./dashboard-src/css/style.css";

// import ResumePage from "./pages/ResumePage";
// import AIResumeBuilder from "./pages/AIResumeBuilder";
// import ManualResumeBuilder from "./pages/ManualResumeBuilder";
// import MyResumes from "./pages/MyResumes";

import ConversationSelect from "./pages/ConversationSelect";
import ConversationPlayer from "./pages/ConversationPlayer";
import NursingGermanyLanding from "./pages/NursingGermanyLanding";

//fallback page
import FallbackPage from "./pages/FallbackPage";

import ContinuePractice from "./pages/ContinuePractice";

//capacitor app
import { Capacitor } from "@capacitor/core";
import { Fullscreen } from "@boengli/capacitor-fullscreen";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { initPushNotifications } from "./notifications/pushNotifications";
import InternalLeadForm from "./pages/InternalLeadForm";

const APP_VERSION = "1.0.2";

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
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { checking } = useSSO();

  useEffect(() => {
    console.log("App Version:", APP_VERSION);
    if (Capacitor.isNativePlatform()) {
      Fullscreen.activateImmersiveMode();
      initLiveUpdate();

      // Only init push notifications if authenticated
      if (token) {
        initPushNotifications();
      }
    }
  }, [token]);

  const initLiveUpdate = async () => {
    try {
      await LiveUpdate.ready();

      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/updates/check?version=${APP_VERSION}`
      );

      const data = await response.json();

      if (data.url) {
        await LiveUpdate.downloadBundle({
          url: data.url,
          bundleId: data.version,
        });

        await LiveUpdate.setNextBundle({ bundleId: data.version });
        // Update applies on next app launch
      }
    } catch (err) {
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

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <GoogleAnalyticsTracker />
      <Toaster position="top-right" />
      <ConditionalNav />

      <Routes>
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
        <Route path="/open-app" element={<FallbackPage />} />
        <Route path="/continue" element={<ContinuePractice />} />
        <Route path="/internal/lead-form" element={<InternalLeadForm />} />
      </Routes>

      <ConditionalFooter />
    </BrowserRouter>
  );
}

function ConditionalFooter() {
  const location = useLocation();
  const hideFooter =
    location.pathname === "/register" ||
    location.pathname === "/internal/lead-form";

  if (hideFooter) return null;
  return <Footer />;
}
function ConditionalNav() {
  const location = useLocation();
  const hideNav =
    location.pathname === "/register" ||
    location.pathname === "/internal/lead-form";

  if (hideNav) return null;
  return <NewNavbar />;
}
