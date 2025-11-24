import React, { useEffect } from "react";
import { BookOpen, FileText, Video, ArrowRight, Menu, X } from "lucide-react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AddFlashSet from "./pages/AddFlashSetPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Practice from "./pages/Practice";
import { useDispatch, useSelector } from "react-redux";
import ChapterSelect from "./pages/ChapterSelect";
import TestSelect from "./pages/testSelect";
import FlashcardStudyPage from "./pages/FlashCard";
import LoginSignupPage from "./pages/LoginSignupPage";
import DeleteFlashSet from "./pages/deleteFlashSetPage";
import AddInterviewPage from "./pages/addInterviewPage";
import AddTestPage from "./pages/addTestPage";
import api from "./api/axios";
import InterviewSelect from "./pages/interviewSelect";
import { setUser, logout } from "./redux/auth/authSlice";
import ProSelect from "./pages/pronounceSelect";
// import CardOverlayExample from './components/testOverlay';
import Pronounce from "./pages/pronounce";
import AddPronounceSet from "./pages/AddPronounceSetPage";
import DeletePronounceSet from "./pages/DeletePronounceSetPage";
import Dashboard from "./dashboard-src/pages/Dashboard";
import ShortStoryHome from "./pages/ShortStoryHome";
import StoryPage from "./pages/StoryPage";
if (typeof global === "undefined") {
  window.global = window;
}
import "./dashboard-src/css/style.css";

export default function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
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

  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/test/:prof_level" element={<TestSelect />} />
        {/* <Route path ='/interview/:prof_level' element = {<InterviewSelect/>}/> */}
        <Route path="/practice/:prof_level" element={<ChapterSelect />} />
        <Route path="/pronounce/:prof_level" element={<ProSelect />} />
        <Route
          path="/practice/:prof_level/:set_id"
          element={<FlashcardStudyPage />}
        />
        <Route path="/admin" element={<Dashboard />} />
        <Route
          path="/pronounce/:prof_level/:pronounce_id"
          element={<Pronounce />}
        />
        <Route path="/Login" element={<LoginSignupPage />} />
        <Route path="/stories" element={<ShortStoryHome />} />
        <Route path="/story/:slug" element={<StoryPage />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
