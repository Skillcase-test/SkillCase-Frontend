import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios.js";
import Navbar from "../../components/Navbar.jsx";
import { images } from "../../assets/images.js";
export default function ChapterSelect() {
  const { prof_level } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/practice/allFlashSet/${prof_level}`);
        const sortedChapters = res.data.sort((a, b) => {
          if (!a.set_name) return 1;
          if (!b.set_name) return -1;
          const numA = parseInt(a.set_name.match(/\d+/)?.[0] || "999");
          const numB = parseInt(b.set_name.match(/\d+/)?.[0] || "999");
          return numA - numB;
        });
        setChapters(sortedChapters);
      } catch (err) {
        console.error(err);
        setError("Error fetching chapters");
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [prof_level]);
  // Calculate progress for each chapter
  const getChapterProgress = (chapter) => {
    const currentIndex = chapter.current_index;
    const completed =
      currentIndex !== null && currentIndex !== undefined
        ? currentIndex + 1
        : 0;
    const total = chapter.number_of_cards || 0;

    return {
      completed: Math.min(completed, total),
      total,
    };
  };

  // Check if chapter is complete
  const isChapterComplete = (chapter) => {
    const { completed, total } = getChapterProgress(chapter);
    return completed >= total && total > 0;
  };

  // Get progress badge variant
  const getBadgeStyle = (completed, total) => {
    if (completed === total && total > 0) {
      return {
        bg: "bg-[rgba(1,144,53,0.12)]",
        text: "text-[#019035]",
      };
    }
    return {
      bg: "bg-[rgba(255,235,192,0.65)]",
      text: "text-[#ac8121]",
    };
  };
  const handleChapterClick = (chapter) => {
    navigate(
      `/practice/${prof_level}/${chapter.set_id}?set_name=${encodeURIComponent(
        chapter.set_name
      )}`
    );
  };
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
            Flashcards
          </span>
        </div>
      </div>
      {/* Header Background Image */}
      <div className="relative h-[140px] w-full overflow-hidden">
        <img
          src={images.headerBackground}
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
            {prof_level.toUpperCase()}
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            German Language Level
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-black opacity-70 mb-4">
          B1 level is minimum to work as a nurse in Germany
        </p>
        {/* Chapter Progress Bar - Horizontal Scrollable */}
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <style>{`
            .progress-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          {chapters.map((chapter, index) => {
            const { completed, total } = getChapterProgress(chapter);
            const isComplete = isChapterComplete(chapter);
            // Calculate fill percentage for individual progress bar
            const fillPercent = total > 0 ? (completed / total) * 100 : 0;

            return (
              <div
                key={chapter.set_id}
                onClick={() => handleChapterClick(chapter)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ minWidth: "50px", width: "50px" }}
              >
                {/* Progress bar with fill based on completion */}
                <div className="h-3 w-full rounded-full bg-[#f0f0f0] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? "bg-[#019035]" : "bg-[#edb843]"
                    }`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-[#002856] whitespace-nowrap">
                  Ch. {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Chapter Cards */}
      <div className="flex-1 px-4 py-10 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin text-[#002856]" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : (
          chapters.map((chapter, index) => {
            const { completed, total } = getChapterProgress(chapter);
            const isComplete = isChapterComplete(chapter);
            const badgeStyle = getBadgeStyle(completed, total);
            return (
              <div
                key={chapter.set_id}
                onClick={() => handleChapterClick(chapter)}
                className="bg-white border border-[#dbdbdb] rounded-xl px-3 py-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  {/* Chapter Name */}
                  <h3 className="text-base font-semibold text-[#181d27]">
                    {chapter.set_name || `Chapter ${index + 1}`}
                  </h3>
                  {/* Right Side - Badge & Chevron */}
                  <div className="flex items-center gap-4">
                    {/* Progress Badge - Shows cards done/total */}
                    <div
                      className={`${badgeStyle.bg} px-2 py-0.5 rounded-full`}
                    >
                      <span
                        className={`text-[13px] font-medium ${badgeStyle.text}`}
                      >
                        {completed}/{total} done
                      </span>
                    </div>
                    {/* Chevron Icon */}
                    <ChevronRight className="w-6 h-6 text-[#414651]" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
