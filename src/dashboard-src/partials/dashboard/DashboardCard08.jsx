import React, { useState, useEffect } from "react";
import api from "../../../api/axios";
function DashboardCard08() {
  const [storyData, setStoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchStoryAnalytics = async () => {
      try {
        setLoading(true);
        const response = await api.get("/admin/analytics/story-analytics");
        setStoryData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching story analytics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStoryAnalytics();
  }, []);
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
        <h2 className="font-semibold text-gray-800">
          All Short Story Performance
        </h2>
        <div className="text-sm text-gray-500 mt-1">
          {storyData.length} stories
        </div>
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-500 bg-gray-50 border-t border-b border-gray-200">
              <tr>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                  <div className="font-semibold">Rank</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                  <div className="font-semibold">Story Title</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                  <div className="font-semibold">Level</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                  <div className="font-semibold">Total Readers</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                  <div className="font-semibold">Completion Rate</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-200">
              {storyData.map((story, index) => (
                <tr key={story.story_id} className="hover:bg-gray-50">
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          index === 0
                            ? "bg-purple-500 text-white"
                            : index === 1
                            ? "bg-purple-400 text-white"
                            : index === 2
                            ? "bg-purple-300 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 first:pl-5 last:pr-5 py-3">
                    <div className="font-medium text-gray-800">
                      {story.story_title}
                    </div>
                  </td>
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                    <div className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                      {story.proficiency_level}
                    </div>
                  </td>
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="font-medium text-gray-800">
                        {story.total_readers}
                      </div>
                      <div
                        className="h-2 bg-gray-200 rounded-full overflow-hidden"
                        style={{ width: "60px" }}
                      >
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (story.total_readers /
                                Math.max(
                                  ...storyData.map((s) => s.total_readers)
                                )) *
                                100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="font-medium text-gray-800">
                        {parseFloat(story.completion_rate || 0).toFixed(1)}%
                      </div>
                      <div
                        className="h-2 bg-gray-200 rounded-full overflow-hidden"
                        style={{ width: "60px" }}
                      >
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${story.completion_rate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default DashboardCard08;
