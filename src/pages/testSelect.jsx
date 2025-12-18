import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Lock, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";
import { images } from "../assets/images.js";
export default function TestSelect() {
  const { prof_level } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [finalTest, setFinalTest] = useState(null);
  const [chapterTests, setChapterTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Overlay state for test difficulty selection
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const getTests = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/test/get/${prof_level}`);
        setFinalTest(res.data.results.final[0]);
        setChapterTests(res.data.results.chapter);
      } catch (err) {
        console.error(err);
        setError("Could not fetch tests");
      } finally {
        setLoading(false);
      }
    };
    getTests();
  }, [prof_level, user, navigate]);
  // Disable background scroll when overlay open
  useEffect(() => {
    document.body.style.overflow = isOverlayOpen ? "hidden" : "auto";
  }, [isOverlayOpen]);
  const openOverlay = (test) => {
    setSelectedTest(test);
    setIsOverlayOpen(true);
  };
  const closeOverlay = () => {
    setSelectedTest(null);
    setIsOverlayOpen(false);
  };
  // Check if all chapter tests are complete (placeholder logic)
  const allChaptersComplete =
    chapterTests.length > 0 && chapterTests.every((t) => t.completed);
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Back Navigation */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            Mock Test
          </span>
        </div>
      </div>
      {/* Header Background Image */}
      <div className="relative h-[140px] w-full overflow-hidden">
        <img
          src={images.mockTest}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>
      {/* Level Info Section */}
      <div className="px-4 pt-4 pb-4">
        {/* Level Title */}
        <div className="flex items-center gap-4 mb-1.5">
          <h1 className="text-[30px] font-semibold text-[#002856] leading-[38px]">
            {prof_level?.toUpperCase() || "A1"}
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            German Language Level Tests
          </span>
        </div>
        {/* Subtitle */}
        <p className="text-xs text-black opacity-70 mb-4">
          B1 level is minimum to work as a nurse in Germany
        </p>
        {/* Chapter Progress Bars */}
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {chapterTests.map((test) => {
            const isComplete = test.completed === true;
            // Get chapter title, truncate if too long
            const title = test.test_name || "Chapter";
            const displayTitle =
              title.length > 10 ? title.slice(0, 8) + "..." : title;

            return (
              <div
                key={test.test_id}
                onClick={() => openOverlay(test)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ minWidth: "60px", maxWidth: "80px" }}
              >
                <div className="h-3 w-full rounded-full bg-[#f0f0f0] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? "bg-[#edb843]" : "bg-[#f0f0f0]"
                    }`}
                    style={{ width: isComplete ? "100%" : "0%" }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium text-[#002856] text-center truncate w-full"
                  title={title}
                >
                  {displayTitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Chapter Test Cards */}
      <div className="flex-1 px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin text-[#002856]" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : (
          <>
            {/* Chapter Cards */}
            {chapterTests.map((test, index) => (
              <div
                key={test.test_id}
                onClick={() => openOverlay(test)}
                className="bg-white border border-[#dbdbdb] rounded-xl px-3 py-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  {/* Chapter Name */}
                  <h3 className="text-base font-semibold text-[#181d27]">
                    {test.test_name?.charAt(0).toUpperCase() +
                      test.test_name?.slice(1) || `Chapter ${index + 1}`}
                  </h3>
                  {/* Right Side - Badge & Chevron */}
                  <div className="flex items-center gap-4">
                    {/* Levels Badge */}
                    <div className="bg-[#f0f0f0] px-2 py-0.5 rounded-full">
                      <span className="text-[13px] font-medium text-[#898989]">
                        3 levels
                      </span>
                    </div>
                    {/* Chevron Icon */}
                    <ChevronRight className="w-6 h-6 text-[#414651]" />
                  </div>
                </div>
              </div>
            ))}
            {/* Final Test Card */}
            {finalTest && (
              <div
                onClick={() =>
                  allChaptersComplete &&
                  window.open(finalTest.test_link, "_blank")
                }
                className={`rounded-2xl p-6 ${
                  allChaptersComplete
                    ? "bg-[#e1f6e8] cursor-pointer hover:shadow-md"
                    : "bg-[#e1f6e8] cursor-not-allowed"
                } transition-shadow`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base font-semibold text-[#181d27]">
                    Final Test
                  </h3>
                  <div className="bg-white border border-[#d5d7da] px-2 py-0.5 rounded-md shadow-sm">
                    <span className="text-sm font-medium text-[#414651]">
                      {prof_level?.toUpperCase() || "A1"} Level
                    </span>
                  </div>
                </div>
                {/* Description */}
                <p className="text-base text-[#535862] mb-5 leading-relaxed">
                  Test your overall knowledge of{" "}
                  {prof_level?.toUpperCase() || "A1"} level
                  <br />
                  Complete all chapter tests to unlock the final assessment
                </p>
                {/* Button */}
                <button
                  disabled={!allChaptersComplete}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    allChaptersComplete
                      ? "bg-[#019035] text-white hover:bg-[#017a2c]"
                      : "bg-[#c6c6c6] text-[rgba(0,0,0,0.6)] cursor-not-allowed"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span>
                    {allChaptersComplete
                      ? "Start Final Test"
                      : "Complete all Chapters to Unlock"}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {/* Test Difficulty Overlay */}
      {isOverlayOpen && selectedTest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-sm relative">
            <button
              onClick={closeOverlay}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-[#181d27] mb-2">
              {selectedTest.test_name}
            </h2>
            <p className="text-[#535862] text-sm mb-6">
              Select difficulty level to start the test
            </p>
            <div className="space-y-3">
              <button
                onClick={() =>
                  window.open(selectedTest.easy_test_link, "_blank")
                }
                className="w-full bg-green-500 text-white px-4 py-3 rounded-xl hover:bg-green-600 font-semibold transition-colors"
              >
                Easy
              </button>
              <button
                onClick={() =>
                  window.open(selectedTest.medium_test_link, "_blank")
                }
                className="w-full bg-amber-500 text-white px-4 py-3 rounded-xl hover:bg-amber-600 font-semibold transition-colors"
              >
                Medium
              </button>
              <button
                onClick={() =>
                  window.open(selectedTest.hard_test_link, "_blank")
                }
                className="w-full bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600 font-semibold transition-colors"
              >
                Hard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
