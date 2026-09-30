import React, { useState, useEffect } from "react";
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import {
  getNursingAdminChapters,
  deleteNursingChapter,
} from "../../../../api/a1NursingApi";

export default function A1NursingManage() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchChapters = async () => {
    setLoading(true);
    setStatus("loading:Fetching chapters...");
    try {
      const res = await getNursingAdminChapters();
      const rows = res.data || [];
      setChapters(rows);
      setStatus(
        rows.length > 0
          ? `success:Found ${rows.length} chapters`
          : "info:No chapters uploaded yet",
      );
    } catch (err) {
      console.error(err);
      setChapters([]);
      setStatus("error:Error fetching chapters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  const handleDelete = async (chapter) => {
    if (
      !window.confirm(
        `Delete chapter ${chapter.chapter_number} "${chapter.title_en}"? This removes its cards, questions and learner progress.`,
      )
    ) {
      return;
    }

    setDeletingId(chapter.id);
    setStatus(`deleting:Deleting chapter ${chapter.chapter_number}...`);
    try {
      await deleteNursingChapter(chapter.id);
      setStatus(`success:Chapter ${chapter.chapter_number} deleted`);
      setChapters((prev) => prev.filter((ch) => ch.id !== chapter.id));
    } catch (err) {
      console.error(err);
      setStatus(`error:Failed to delete chapter ${chapter.chapter_number}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusInfo = () => {
    if (!status) return null;
    const [type, message] = status.split(":");
    const statusConfig = {
      success: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: CheckCircle,
      },
      error: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: AlertCircle,
      },
      info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: AlertCircle,
      },
      loading: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: Loader,
      },
      deleting: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        icon: Loader,
      },
    };
    return { type, message, config: statusConfig[type] };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage A1 Nursing German
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Chapter order is fixed by chapter_number — re-upload via Add to
            replace content
          </p>
        </div>
        <button
          onClick={fetchChapters}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {statusInfo && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border mb-6 ${statusInfo.config.bg} ${statusInfo.config.border}`}
        >
          <statusInfo.config.icon
            className={`w-5 h-5 flex-shrink-0 ${statusInfo.config.text} ${
              ["loading", "deleting"].includes(statusInfo.type)
                ? "animate-spin"
                : ""
            }`}
          />
          <span className={`text-sm font-medium ${statusInfo.config.text}`}>
            {statusInfo.message}
          </span>
        </div>
      )}

      {chapters.length > 0 && (
        <div className="bg-white shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="font-semibold text-gray-800">
              Chapters ({chapters.length})
            </h2>
          </div>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-500 bg-gray-50 border-t border-b border-gray-200">
                  <tr>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left w-16">
                      <div className="font-semibold">No.</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Chapter</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Cards</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Questions</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Status</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                      <div className="font-semibold">Action</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-200">
                  {chapters.map((chapter) => (
                    <tr key={chapter.id} className="hover:bg-gray-50">
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {chapter.chapter_number}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3">
                        <div className="font-medium text-gray-800">
                          {chapter.title_en}
                        </div>
                        <div className="text-xs text-gray-500">
                          {chapter.chapter_uid}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-gray-700">
                        {chapter.card_count}
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-gray-700">
                        {chapter.question_count}
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            chapter.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {chapter.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(chapter)}
                          disabled={deletingId === chapter.id}
                          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                        >
                          {deletingId === chapter.id ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
