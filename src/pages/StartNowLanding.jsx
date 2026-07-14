import React, { useState, useEffect } from "react";
import { Phone, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fetchTrustPageContent } from "../api/trustPageApi";

// Modular sub-component imports
import HeroSection from "./startNow/HeroSection";
import CandidateGrid from "./startNow/CandidateGrid";
import CandidateMarquee from "./startNow/CandidateMarquee";
import LearningStack from "./startNow/LearningStack";
import VideoShowcase from "./startNow/VideoShowcase";
import LanguageNotes from "./startNow/LanguageNotes";
import GuestLectures from "./startNow/GuestLectures";
import GoogleReviews from "./startNow/GoogleReviews";
import AppScreenshots from "./startNow/AppScreenshots";
import FaqSection from "./startNow/FaqSection";
import DownloadCTA from "./startNow/DownloadCTA";

export default function StartNowLanding() {
  const [data, setData] = useState({
    hero: null,
    candidates: [],
    learning_components: [],
    videos: [],
    language_notes: [],
    reviews: [],
    screenshots: [],
    faqs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchTrustPageContent()
      .then((res) => {
        if (mounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load trust page content:", err);
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="font-sans bg-white min-h-screen relative overflow-x-hidden selection:bg-[#F9C53D] selection:text-[#002856]">
      {/* 1. Custom Isolated Navigation Bar */}
      <nav className="bg-white shadow-xs border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="flex items-center">
              <img
                src="/mainlogo.webp"
                alt="SkillCase"
                className="w-28 sm:w-32 h-auto"
              />
            </a>
            <a
              href="tel:+919972266767"
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all border border-slate-200"
            >
              <Phone className="w-3.5 h-3.5" />
              Call Us
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Layout */}
      {loading ? (
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
          Loading trust page modules...
        </div>
      ) : (
        <main className="pb-24 flex flex-col items-center w-full">
          {/* Section 1: Hero */}
          <HeroSection hero={data.hero} />

          {/* Section 2: Candidate Grid */}
          <CandidateGrid candidates={data.candidates} />

          {/* Section 3: Candidate Infinite Scroll Marquee */}
          <CandidateMarquee candidates={data.candidates} />

          {/* Section 4: Stacked Learning Components */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <LearningStack components={data.learning_components} />
          </motion.div>

          {/* Section 5: Student Apply Videos scroll */}
          <motion.div
            className="w-full overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <VideoShowcase videos={data.videos} />
          </motion.div>

          {/* Section 6: Notes in native languages */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <LanguageNotes notes={data.language_notes} />
          </motion.div>

          {/* Section 7: Guest Lectures */}
          <motion.div
            className="w-full overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <GuestLectures videos={data.videos} />
          </motion.div>

          {/* Section 8: Google Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <GoogleReviews reviews={data.reviews} />
          </motion.div>

          {/* Section 9: Smartphone screenshot mockup scroll */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <AppScreenshots screenshots={data.screenshots} />
          </motion.div>

          {/* Section 9.5: FAQs Accordion */}
          {/* Section 10: App Download CTA footer */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <DownloadCTA />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", damping: 25, stiffness: 80 }}
          >
            <FaqSection faqs={data.faqs} />
          </motion.div>
        </main>
      )}
    </div>
  );
}
