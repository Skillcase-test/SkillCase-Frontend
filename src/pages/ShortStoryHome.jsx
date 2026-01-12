import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, RefreshCw } from "lucide-react";
import api from "../api/axios";
import { images } from "../assets/images.js";
const ShortStoryHome = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    async function loadStories() {
      try {
        const res = await api.get("/stories");
        if (res.data.data) {
          setStories(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching stories:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Please login to view stories.");
        } else {
          setError("Failed to load stories. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadStories();
  }, [navigate]);

  const isComplete = (story) => story.completed === true;
  const getBadgeStyle = (completed) => {
    if (completed) {
      return { bg: "bg-[rgba(1,144,53,0.12)]", text: "text-[#019035]" };
    }
    return { bg: "bg-[rgba(255,235,192,0.65)]", text: "text-[#ac8121]" };
  };
  const handleStoryClick = (story) => {
    navigate(`/story/${story.slug}`);
    window.scrollTo(0, 0);
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
          <span className="text-sm font-semibold text-[#7b7b7b]">Stories</span>
        </div>
      </div>
      {/* Header Background Image */}
      <div className="relative h-[140px] w-full overflow-hidden">
        <img
          src={images.grammar}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>
      {/* Level Info Section */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center gap-4 mb-1.5">
          <h1 className="text-[30px] font-semibold text-[#002856] leading-[38px]">
            A1
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            Short Stories
          </span>
        </div>
        <p className="text-xs text-black opacity-70 mb-4">
          Read engaging German stories to improve comprehension
        </p>
        {/* Story Progress Bar */}
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {stories.map((story, index) => {
            const completed = isComplete(story);
            return (
              <div
                key={story.slug}
                onClick={() => handleStoryClick(story)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ minWidth: "50px", width: "50px" }}
              >
                <div className="h-3 w-full rounded-full bg-[#f0f0f0] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      completed ? "bg-[#019035]" : "bg-[#f0f0f0]"
                    }`}
                    style={{ width: completed ? "100%" : "0%" }}
                  />
                </div>
                <span className="text-[10px] font-medium text-[#002856] whitespace-nowrap">
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Story Cards */}
      <div className="flex-1 px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin text-[#002856]" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No stories available yet.
          </div>
        ) : (
          stories.map((story, index) => {
            const completed = isComplete(story);
            const badgeStyle = getBadgeStyle(completed);
            return (
              <div
                id={index === 0 ? "first-story" : undefined}
                key={story.slug}
                onClick={() => handleStoryClick(story)}
                className="bg-white border border-[#dbdbdb] rounded-xl px-4 py-4 cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  {/* Story Number */}
                  <span className="text-lg font-semibold text-[#002856] w-6">
                    {index + 1}.
                  </span>

                  {/* Cover Image */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={story.coverImageUrl}
                      alt={story.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[#181d27] truncate">
                      {story.title}
                    </h3>
                  </div>

                  {/* Badge & Chevron */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`${badgeStyle.bg} px-2 py-0.5 rounded-full flex items-center gap-1`}
                    >
                      {completed && <Check className="w-3 h-3" />}
                      <span
                        className={`text-[13px] font-medium ${badgeStyle.text}`}
                      >
                        {completed ? "Done" : "New"}
                      </span>
                    </div>
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
};
export default ShortStoryHome;
