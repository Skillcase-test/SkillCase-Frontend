import { useState, useEffect } from "react";

import api from "../../../api/axios";

import { Trophy, Flame, TrendingUp, Medal } from "lucide-react";

function DashboardCard13() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("current"); // 'current' or 'longest'
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchStats();
  }, [type]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `/admin/analytics/streak-leaderboard?type=${type}&limit=10`
      );

      setLeaderboard(response.data.leaderboard);

      setError(null);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/analytics/streak-stats");

      setStats(response.data);
    } catch (err) {
      console.error("Error fetching streak stats:", err);
    }
  };

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;

    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;

    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;

    return <span className="text-gray-400 font-semibold">#{index + 1}</span>;
  };

  if (loading && leaderboard.length === 0) {
    return (
      <div className="flex flex-col col-span-full xl:col-span-6 bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col col-span-full xl:col-span-6 bg-white shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Streak Leaderboard
          </h2>
        </div>

        {/* Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setType("current")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              type === "current"
                ? "bg-indigo-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Current Streak
          </button>
          <button
            onClick={() => setType("longest")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              type === "longest"
                ? "bg-indigo-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Longest Streak
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Max {type}</div>
              <div className="text-lg font-bold text-orange-600">
                {type === "current"
                  ? stats.max_current_streak
                  : stats.max_longest_streak}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Average</div>
              <div className="text-lg font-bold text-gray-800">
                {type === "current"
                  ? stats.avg_current_streak
                  : stats.avg_longest_streak}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">7+ Days</div>
              <div className="text-lg font-bold text-green-600">
                {stats.users_with_week_streak}
              </div>
            </div>
          </div>
        )}
      </header>
      <div className="p-3">
        {error && (
          <div className="text-center py-4 text-red-500">Error: {error}</div>
        )}
        {leaderboard.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-500">
            No streak data available
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {leaderboard.map((user, index) => (
              <div
                key={user.user_id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  index < 3
                    ? "bg-gradient-to-r from-gray-50 to-transparent"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index)}
                  </div>

                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {user.username}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600">
                        {user.proficiency_level}
                      </span>
                      {type === "current" && user.last_goal_date && (
                        <span className="text-xs text-gray-500">
                          Last:{" "}
                          {new Date(user.last_goal_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-orange-600">
                    <Flame className="w-4 h-4" />
                    <span className="text-2xl font-bold">
                      {type === "current"
                        ? user.current_streak
                        : user.longest_streak}
                    </span>
                  </div>
                  {type === "current" &&
                    user.longest_streak > user.current_streak && (
                      <div className="text-xs text-gray-400 mt-1">
                        Best: {user.longest_streak}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default DashboardCard13;
