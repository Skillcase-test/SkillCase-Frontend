import { useState } from "react";

import { Send, CheckCircle, AlertCircle, Bell } from "lucide-react";

import api from "../../../api/axios";

export default function SendNotification() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !body) {
      setStatus({ type: "error", message: "Please fill all fields" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await api.post("/notifications/broadcast", { title, body });
      setStatus({
        type: "success",
        message: `Notification successfully sent to ${res.data.sentTo} users!`,
      });

      setTitle("");
      setBody("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to send notification",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-800">
          Broadcast Notification
        </h2>
      </div>

      <p className="text-gray-600 mb-6">
        Send a push notification to all users with registered devices. This will
        be delivered instantly.
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter notification title"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter notification message"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
        </div>

        {status.message && (
          <div
            className={`rounded-lg p-4 flex items-center gap-3 ${
              status.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p
              className={`text-sm ${
                status.type === "success" ? "text-green-800" : "text-red-800"
              }`}
            >
              {status.message}
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-5 h-5" />
          {loading ? "Sending..." : "Send to All Users"}
        </button>
      </form>
    </div>
  );
}
