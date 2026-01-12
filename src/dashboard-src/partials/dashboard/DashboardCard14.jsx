import { useState, useEffect } from "react";

import api from "../../../api/axios";

import { Bell, TrendingUp, Clock } from "lucide-react";

function DashboardCard14() {
  const [summary, setSummary] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set default to last 30 days
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(monthAgo.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [summaryRes, statsRes] = await Promise.all([
        api.get("/admin/analytics/notification-summary"),
        api.get(
          `/admin/analytics/notification-stats?startDate=${startDate}&endDate=${endDate}`
        ),
      ]);

      setSummary(summaryRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching notification stats:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTypeLabel = (type) => {
    return type === "morning_reminder" ? "Morning" : "Evening";
  };

  if (loading && summary.length === 0) {
    return (
      <div className="flex flex-col col-span-full bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col col-span-full bg-white shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            Notification Analytics
          </h2>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-gray-500" />
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {summary.map((item) => (
            <div
              key={item.notification_type}
              className="p-3 bg-gray-50 rounded-lg"
            >
              <div className="text-sm text-gray-600 mb-1">
                {getTypeLabel(item.notification_type)}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {item.open_rate}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.total_opened} / {item.total_sent} opened
                  </div>
                </div>
                <TrendingUp
                  className={`w-5 h-5 ${
                    item.open_rate >= 50 ? "text-green-500" : "text-orange-500"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </header>
      <div className="p-5">
        {error && (
          <div className="text-center py-4 text-red-500">Error: {error}</div>
        )}

        {stats.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-500">
            No notification data for selected range
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-center">Sent</th>
                  <th className="px-3 py-2 text-center">Opened</th>
                  <th className="px-3 py-2 text-center">Open Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800">
                      {formatDate(stat.date)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs">
                        {getTypeLabel(stat.notification_type)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {stat.total_sent}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {stat.total_opened}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          stat.open_rate >= 50
                            ? "bg-green-100 text-green-700"
                            : stat.open_rate >= 25
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {stat.open_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default DashboardCard14;
