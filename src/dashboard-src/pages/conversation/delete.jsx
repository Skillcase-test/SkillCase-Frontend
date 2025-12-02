import { useState, useEffect } from "react";
import { Trash2, RefreshCw, Clock } from "lucide-react";
import api from "../../../api/axios";
export default function DeleteConversation() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    fetchConversations();
  }, []);
  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/conversation/all");
      setConversations(res.data.data);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setStatus("error:Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (conversationId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      await api.delete(`/admin/conversation/${conversationId}`);
      setStatus("success:Conversation deleted successfully");
      fetchConversations();
    } catch (err) {
      console.error("Error deleting conversation:", err);
      setStatus("error:Failed to delete conversation");
    }
  };
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Manage Conversations
        </h2>
        <button
          onClick={fetchConversations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      {status && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg ${
            status.startsWith("success")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status.split(":")[1]}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sentences
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversations.map((conv) => (
                <tr key={conv.conversation_id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {conv.title}
                    </div>
                    {conv.topic && (
                      <div className="text-sm text-gray-500">{conv.topic}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {conv.proficiency_level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {conv.total_sentences}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(conv.audio_duration)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() =>
                        handleDelete(conv.conversation_id, conv.title)
                      }
                      className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-900 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {conversations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No conversations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
