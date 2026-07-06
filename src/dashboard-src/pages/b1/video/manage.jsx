import React, { useState, useEffect } from "react";
import { Trash2, Loader2, Play } from "lucide-react";
import { getB1VideosAdmin, deleteB1Video } from "../../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

export default function B1VideoManage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await getB1VideosAdmin();
      setVideos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId, title) => {
    if (!window.confirm(`Are you sure you want to delete video "${title}" permanently?`)) return;
    try {
      const res = await deleteB1Video(videoId);
      if (res.data?.success) {
        toast.success("Video deleted successfully");
        fetchVideos();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete video");
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage B1 Videos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            List and delete existing B1 instructional videos.
          </p>
        </div>
        <button
          onClick={fetchVideos}
          className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
        >
          Refresh List
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="font-semibold text-slate-700">Videos ({videos.length})</span>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
          </div>
        ) : videos.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            No videos uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3">Thumbnail</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Level</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {videos.map((vid, idx) => (
                  <tr key={vid.video_id || idx} className="hover:bg-slate-50/40 transition">
                    <td className="px-6 py-4 w-28">
                      <div className="w-20 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center">
                        {vid.thumbnail_url ? (
                          <img
                            src={vid.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{vid.title}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {vid.video_duration ? `${Math.round(vid.video_duration / 60)}m ${vid.video_duration % 60}s` : "0s"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold uppercase">
                        {vid.proficiency_level || "B1"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(vid.video_id, vid.title)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
