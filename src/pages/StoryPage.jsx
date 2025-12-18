import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { ChevronLeft } from "lucide-react";
// Component to highlight German words with English translations
const HighlightGerman = ({ text }) => {
  const regex = /(\b[A-Za-zÄÖÜäöüß]+)\s*\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, germanWord, meaning] = match;
    parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span key={match.index} className="font-medium text-blue-700">
        {germanWord}
        <span className="text-blue-500"> ({meaning})</span>
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  parts.push(text.slice(lastIndex));
  return <>{parts}</>;
};
const Paragraph = ({ text }) => {
  return (
    <p className="text-lg leading-8 text-slate-700 mb-6 font-serif">
      <HighlightGerman text={text} />
    </p>
  );
};
const StoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const markAsComplete = async (storyId) => {
    try {
      await api.put(`/stories/complete/${storyId}`);
    } catch (err) {
      console.error("Error marking story as complete:", err);
    }
  };

  useEffect(() => {
    async function loadStory() {
      try {
        const res = await api.get(`/stories/${slug}`);
        if (res.data.data) {
          setStory(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching story:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/Login");
        } else if (err.response?.status === 404) {
          setError("Story not found.");
        } else {
          setError("Failed to load story. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadStory();
  }, [slug, navigate]);
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }
  if (error || !story) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <p className="text-slate-600 mb-4">{error || "Story not found."}</p>
        <Link to="/stories" className="text-blue-500 underline">
          Back to Stories
        </Link>
      </div>
    );
  }
  const paragraphs = story.story
    .split("\n\n")
    .filter((p) => p.trim().length > 0);
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Image Section */}
      <div className="relative w-full h-64 bg-gradient-to-b from-slate-200 to-[#ecfbff]">
        <Link
          to="/stories"
          className="absolute top-4 left-4 bg-white/80 backdrop-blur p-2 rounded-full shadow-sm z-10 hover:bg-white transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        {story.heroImageUrl && (
          <img
            src={story.heroImageUrl}
            alt={story.title}
            className="w-full h-full object-cover opacity-50"
          />
        )}
      </div>
      {/* Story Content */}
      <article className="max-w-xl mx-auto px-6 -mt-32 relative z-10 pb-12">
        {/* Story Header Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 mb-8 border border-slate-50">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded uppercase">
              A1 Level
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {story.title}
          </h1>
          <p className="text-slate-500 text-sm">{story.description}</p>
        </div>
        {/* Story Paragraphs */}
        <div className="prose prose-slate prose-lg max-w-none bg-white rounded-2xl p-6 shadow-md">
          {paragraphs.map((p, i) => (
            <Paragraph key={i} text={p} />
          ))}
        </div>
        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-sm italic">Great job reading!</p>
          <button
            onClick={async () => {
              await markAsComplete(story.story_id);
              navigate("/stories");
            }}
            className="mt-4 inline-block text-blue-600 font-semibold hover:text-blue-700 cursor-pointer"
          >
            Read another story &rarr;
          </button>
        </div>
      </article>
    </div>
  );
};
export default StoryPage;
