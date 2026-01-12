import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";
import { images } from "../assets/images.js";
export default function ConversationSelect() {
  const { prof_level } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/conversation/sets/${prof_level}`);
        setConversations(res.data.data);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError("Could not fetch conversations");
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [prof_level, user, navigate]);
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  // Check if conversation is complete
  const isComplete = (conv) => conv.completed === true;
  // Get badge style based on completion
  const getBadgeStyle = (completed) => {
    if (completed) {
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
  const handleConversationClick = (conv) => {
    navigate(`/conversation/${prof_level}/${conv.conversation_id}`);
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
            Conversations
          </span>
        </div>
      </div>
      {/* Header Background Image */}
      <div className="relative h-[140px] w-full overflow-hidden">
        <img
          src={images.speakToAI}
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
            German Conversations
          </span>
        </div>
        {/* Subtitle */}
        <p className="text-xs text-black opacity-70 mb-4">
          Practice real-world German conversations
        </p>
        {/* Conversation Progress Bars */}
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {conversations.map((conv, index) => {
            const completed = isComplete(conv);
            return (
              <div
                key={conv.conversation_id}
                onClick={() => handleConversationClick(conv)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ minWidth: "50px", width: "50px" }}
              >
                {/* Progress bar */}
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
      {/* Conversation Cards */}
      <div className="flex-1 px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin text-[#002856]" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : (
          conversations.map((conv, index) => {
            const completed = isComplete(conv);
            const badgeStyle = getBadgeStyle(completed);
            return (
              <div
                id={index === 0 ? "first-conversation" : undefined}
                key={conv.conversation_id}
                onClick={() => handleConversationClick(conv)}
                className="bg-white border border-[#dbdbdb] rounded-xl px-4 py-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  {/* Left - Title & Info */}
                  <div className="flex-1 min-w-0 pr-4">
                    {/* Title */}
                    <h3 className="text-base font-semibold text-[#181d27] mb-1 truncate">
                      {conv.title}
                    </h3>
                    {/* Meta Info - Duration & Sentences */}
                    <div className="flex items-center gap-4 text-sm text-[#7b7b7b]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(conv.audio_duration)}
                      </span>
                      <span>{conv.total_sentences} sentences</span>
                    </div>
                  </div>
                  {/* Right - Badge & Chevron */}
                  <div className="flex items-center gap-3">
                    {/* Completion Badge */}
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
                    {/* Chevron */}
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
