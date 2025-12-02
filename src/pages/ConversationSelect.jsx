import { useState, useEffect } from "react";
import {
  MessageCircle,
  Layers,
  BarChart2,
  Check,
  ChevronRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

export default function ConversationSelect() {
  const { prof_level } = useParams();
  const [conversations, setConversations] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/conversation/sets/${prof_level}`);
        setConversations(res.data.data);

        // Calculate progress
        const totalConversations = res.data.data.length;
        const completedConversations = res.data.data.filter(
          (conv) => conv.completed
        ).length;
        const prog =
          totalConversations > 0
            ? (completedConversations / totalConversations) * 100
            : 0;
        setProgress(prog);
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [prof_level]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <section className="w-screen min-h-screen bg-gray-100 flex flex-col md:flex-row p-5">
      {/* Left column */}
      <div className="w-full md:w-1/3 md:mb-20 bg-slate-900 text-white flex flex-col justify-center rounded-3xl md:m-2 p-10 space-y-6">
        <div className="text-5xl md:text-3xl font-bold">
          {prof_level.toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span>{conversations.length} Conversation(s)</span>
        </div>
        <div>
          <div className="flex gap-2 mb-2 items-center">
            <BarChart2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>Progress</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className="bg-amber-500 h-3 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="w-full md:w-2/3 mt-5 max-h-screen overflow-y-auto">
        {loading && (
          <div className="min-h-[400px] flex justify-center items-center">
            <RefreshCw className="w-7 h-7 animate-spin text-gray-600" />
          </div>
        )}

        {!loading && (
          <>
            {/* Desktop View */}
            <div className="hidden md:block space-y-4">
              {conversations.map((conv) => (
                <div
                  key={conv.conversation_id}
                  onClick={() =>
                    navigate(
                      `/conversation/${prof_level}/${conv.conversation_id}`
                    )
                  }
                  className="flex items-center justify-between p-4 rounded-lg cursor-pointer bg-gradient-to-r from-slate-800 to-slate-900 hover:opacity-90 transition-all border border-gray-700/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      {conv.completed ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {conv.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <span>{conv.total_sentences} sentences</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(conv.audio_duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/60" />
                </div>
              ))}
            </div>

            {/* Mobile View */}
            <div className="md:hidden grid grid-cols-2 gap-3">
              {conversations.map((conv) => (
                <div
                  key={conv.conversation_id}
                  onClick={() =>
                    navigate(
                      `/conversation/${prof_level}/${conv.conversation_id}`
                    )
                  }
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 cursor-pointer shadow-md hover:opacity-90 transition-all border border-gray-700/50"
                >
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                    {conv.completed ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">
                    {conv.title}
                  </h3>
                  <div className="text-xs text-white/60">
                    <span>{conv.total_sentences} sentences</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
