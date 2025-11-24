import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StoryCard from "../components/StoryCard";
import api from "../api/axios";
import { ChevronLeft } from "lucide-react";
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
          navigate("/Login");
        } else {
          setError("Failed to load stories. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadStories();
  }, [navigate]);
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600">Loading Stories...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-2 md:px-12 py-4 shrink-0 border-b border-[#9c9c9c]/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-[#153A72]">
              Short Stories
            </h1>
            <div className="flex items-center justify-center gap-1 text-sm text-slate-600">
              <p>German ·</p>
              <span>A1 Level</span>
            </div>
          </div>
          <span className="w-16" /> {/* Spacer for centering */}
        </div>
      </div>
      {/* Stories List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-4xl mx-auto bg-[#ecfbff] w-full">
        {stories.length === 0 ? (
          <div className="text-center text-slate-500 mt-8">
            No stories available yet.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {stories.map((s, idx) => (
              <StoryCard idx={idx} key={s.slug} s={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default ShortStoryHome;
