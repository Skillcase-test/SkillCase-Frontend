import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { Calendar, ChevronRight, Clock } from "lucide-react";
function DashboardCard11() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userHistory, setUserHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(weekAgo.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchRecentActivity();
    }
  }, [startDate, endDate]);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/analytics/recent-activity?startDate=${startDate}&endDate=${endDate}`
      );
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching recent activity:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHistory = async (userId) => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/admin/analytics/user-history/${userId}`);
      setUserHistory(response.data);
    } catch (err) {
      console.error("Error fetching user history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleUser = (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserHistory(null);
    } else {
      setExpandedUserId(userId);
      fetchUserHistory(userId);
    }
  };

  const setPresetRange = (days) => {
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - days);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(past.toISOString().split("T")[0]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "flashcard":
        return "bg-purple-100 text-purple-600";
      case "pronounce":
        return "bg-amber-100 text-amber-600";
      case "conversation":
        return "bg-green-100 text-green-600";
      case "story":
        return "bg-blue-100 text-blue-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col col-span-full bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col col-span-full bg-white shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 mb-3">Recent Activity</h2>

        {/*Date Range*/}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {/*Date Buttons*/}
          <div className="flex gap-2">
            <button
              onClick={() => setPresetRange(7)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setPresetRange(30)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setPresetRange(90)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Last 90 days
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {users.length} users with activity in selected range
        </div>
      </header>
      <div className="p-3">
        {error && (
          <div className="text-center py-4 text-red-500">Error: {error}</div>
        )}
        {users.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-500">
            No activity in the selected date range
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.user_id}
                className="border border-gray-200 rounded-lg"
              >
                {/*User Row*/}
                <div
                  onClick={() => toggleUser(user.user_id)}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <ChevronRight
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedUserId === user.user_id ? "rotate-90" : ""
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {user.username}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600">
                          {user.proficiency_level}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          Last activity: {formatDate(user.last_activity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/*Expandable History*/}
                {expandedUserId === user.user_id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-3">
                    {loadingHistory ? (
                      <div className="text-center py-4 text-gray-500">
                        Loading history...
                      </div>
                    ) : userHistory && userHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs uppercase text-gray-500 bg-white border-b">
                            <tr>
                              <th className="px-3 py-2 text-left">
                                Activity Type
                              </th>
                              <th className="px-3 py-2 text-left">Item Name</th>
                              <th className="px-3 py-2 text-left">Level</th>
                              <th className="px-3 py-2 text-center">Status</th>
                              <th className="px-3 py-2 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {userHistory.map((activity, index) => (
                              <tr key={index} className="hover:bg-white">
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getActivityColor(
                                      activity.activity_type
                                    )}`}
                                  >
                                    {activity.activity_type}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-800">
                                  {activity.item_name}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                                    {activity.proficiency_level}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {activity.completed ? (
                                    <span className="text-green-600">✓</span>
                                  ) : (
                                    <span className="text-gray-400">○</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {formatDate(activity.last_accessed)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No activity history found
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default DashboardCard11;
