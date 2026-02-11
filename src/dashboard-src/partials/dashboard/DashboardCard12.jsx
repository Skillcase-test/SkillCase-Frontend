import { useState, useEffect } from "react";

import api from "../../../api/axios";

import { Users, Activity, Smartphone, Globe, Clock } from "lucide-react";

function DashboardCard12() {
  const [activeUsers, setActiveUsers] = useState({ total: 0, web: 0, app: 0 });
  const [activeUsersList, setActiveUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetchActiveUsers();

    // Auto-refresh every 60 seconds to reduce database load
    const interval = setInterval(() => {
      fetchActiveUsers();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const response = await api.get("/admin/analytics/active-users-now");
      setActiveUsers({
        total: response.data.activeUsersNow,
        web: response.data.webUsers || 0,
        app: response.data.appUsers || 0,
      });
      setActiveUsersList(response.data.activeUsersList || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching active users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="flex flex-col col-span-full xl:col-span-6 bg-white shadow-xs rounded-xl">
      <div className="px-5 py-5">
        <header className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Active Now</h2>
          <Activity className="w-5 h-5 text-green-500 animate-pulse" />
        </header>

        <div className="flex items-center gap-2">
          <Users className="w-8 h-8 text-gray-400" />
          {loading ? (
            <div className="text-3xl font-bold text-gray-400">--</div>
          ) : error ? (
            <div className="text-sm text-red-500">Error</div>
          ) : (
            <div className="text-4xl font-bold text-green-600">
              {activeUsers.total}
            </div>
          )}
        </div>

        {/* Web/App Breakdown */}
        {!loading && !error && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-gray-500">
                Web:{" "}
                <span className="font-semibold text-gray-700">
                  {activeUsers.web}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-gray-500">
                App:{" "}
                <span className="font-semibold text-gray-700">
                  {activeUsers.app}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Active Users List */}
        {!loading && !error && activeUsersList.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Live Users
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
              {activeUsersList.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {user.fullname || user.username}
                      </div>
                      <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        {user.current_profeciency_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {user.signup_source === "app" ? (
                        <Smartphone className="w-3 h-3 text-violet-500" />
                      ) : (
                        <Globe className="w-3 h-3 text-amber-500" />
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(user.last_activity_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 mt-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Updates every 10s</span>
        </div>
      </div>
    </div>
  );
}
export default DashboardCard12;
