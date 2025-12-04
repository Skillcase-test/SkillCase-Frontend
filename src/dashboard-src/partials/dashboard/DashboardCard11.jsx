import React, { useState, useEffect } from "react";
import api from "../../../api/axios";
import { Clock, CheckCircle } from "lucide-react";
function DashboardCard11() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState("24h");
  useEffect(() => {
    fetchRecentActivity();
  }, [timeframe]);
  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/analytics/recent-activity?timeframe=${timeframe}`
      );
      setActivities(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching recent activity:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const getActivityColor = (type) => {
    switch (type) {
      case "Flashcard Test":
        return "bg-purple-100 text-purple-600";
      case "Pronounce Set":
        return "bg-amber-100 text-amber-600";
      case "Conversation":
        return "bg-green-100 text-green-600";
      case "Story":
        return "bg-blue-100 text-blue-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const completedAt = new Date(timestamp);
    const diffMs = now - completedAt;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };
  if (loading) {
    return (
      <div className="flex flex-col col-span-full bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col col-span-full bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col col-span-full bg-white shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            <div className="text-sm text-gray-500 mt-1">
              {activities.length} completions in selected timeframe
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe("24h")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                timeframe === "24h"
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setTimeframe("7d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                timeframe === "7d"
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe("30d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                timeframe === "30d"
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </header>
      <div className="p-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No activity in the selected timeframe
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">
                      {activity.username}
                    </span>
                    <span className="text-gray-500">completed</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getActivityColor(
                        activity.activity_type
                      )}`}
                    >
                      {activity.activity_type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 truncate">
                    {activity.item_name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                      {activity.proficiency_level}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(activity.completed_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default DashboardCard11;
