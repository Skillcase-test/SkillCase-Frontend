import React, { useEffect, useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { getNewsFeed } from "../../../../api/newsApi";

export default function A1NewsManage() {
  const [loading, setLoading] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [error, setError] = useState("");

  const fetchNews = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getNewsFeed({ level: "A1", lang: "de", limit: 30 });
      setNewsItems(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch A1 news feed");
      setNewsItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="px-4 py-8 max-w-9xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">A1 News Feed</h1>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        News content is auto-ingested by backend jobs. This panel shows the
        active A1 feed currently available to users.
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xs overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase text-gray-600">
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Published</th>
              <th className="text-right px-4 py-3">Open</th>
            </tr>
          </thead>
          <tbody>
            {newsItems.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-800">
                  {item.title}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.sourceName || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleString()
                    : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {item.articleUrl ? (
                    <a
                      href={item.articleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      Link <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}

            {!loading && newsItems.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No A1 news articles available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
