import React from "react";
import { Trash2, RefreshCw, AlertCircle, CheckCircle, Loader } from "lucide-react";
import api from "../../../api/axios";

export default function DeletePronounceSet() {
  const [proficiency, setProficiency] = React.useState("");
  const [chapters, setChapters] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [deletingChapter, setDeletingChapter] = React.useState(null);

  const proficiencyLevels = ["A1", "A2", "B1", "B2", "C1", "C2", "Test"];
  // Fetch chapters for selected proficiency
  const fetchChapters = async () => {
    if (!proficiency) {
      setStatus("error:Please select a proficiency level");
      return;
    }

    setLoading(true);
    setStatus("loading:Fetching chapters...");

    try {
      const res = await api.get(`/admin/getPronounceChapters/${proficiency}`);

      // Normalize response: assume array of objects with pronounce_name
      const data = Array.isArray(res.data) ? res.data : res.data.chapters;

      if (data && data.length > 0) {
        setChapters(data);
        setStatus(`success:Found ${data.length} chapters`);
      } else {
        setChapters([]);
        setStatus("info:No chapters found for this level");
      }
    } catch (err) {
      console.error(err);
      setChapters([]);
      setStatus("error:Error fetching chapters");
    } finally {
      setLoading(false);
    }
  };

  // Delete a chapter
  const handleDelete = async (chapterName) => {
    if (!window.confirm(`Are you sure you want to delete "${chapterName}"?`)) return;

    setDeletingChapter(chapterName);
    setStatus(`deleting:Deleting "${chapterName}"...`);

    try {
      await api.post(`/admin/deletePronounceSet`, {
        pronounce_name: chapterName,
        proficiency_level: proficiency,
      });

      setStatus(`success:"${chapterName}" deleted successfully!`);
      setChapters((prev) => prev.filter((ch) => ch.pronounce_name !== chapterName));
      
      setTimeout(() => {
        if (chapters.length === 1) {
          setStatus("");
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus(`error:Failed to delete "${chapterName}"`);
    } finally {
      setDeletingChapter(null);
    }
  };

  const getStatusInfo = () => {
    if (!status) return null;
    
    const [type, message] = status.split(':');
    
    const statusConfig = {
      success: {
        bg: 'bg-green-50 ',
        border: 'border-green-200 ',
        text: 'text-green-700 ',
        icon: CheckCircle
      },
      error: {
        bg: 'bg-red-50 ',
        border: 'border-red-200 ',
        text: 'text-red-700 ',
        icon: AlertCircle
      },
      info: {
        bg: 'bg-blue-50 ',
        border: 'border-blue-200 ',
        text: 'text-blue-700 ',
        icon: AlertCircle
      },
      loading: {
        bg: 'bg-blue-50 ',
        border: 'border-blue-200 ',
        text: 'text-blue-700 ',
        icon: Loader
      },
      deleting: {
        bg: 'bg-amber-50 ',
        border: 'border-amber-200 ',
        text: 'text-amber-700 ',
        icon: Loader
      }
    };

    return { type, message, config: statusConfig[type] };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800  font-bold">
          Delete Pronunciation Sets
        </h1>
        <p className="text-sm text-gray-600  mt-1">
          Remove specific pronunciation chapters from the database
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white  shadow-xs rounded-xl">
        <div className="p-6 space-y-6">
          
          {/* Select Proficiency Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-800  mb-3">
              Proficiency Level
            </label>
            <select
              value={proficiency}
              onChange={(e) => {
                setProficiency(e.target.value);
                setChapters([]);
                setStatus("");
              }}
              className="w-full px-4 py-3 border border-gray-300  rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white  text-gray-800 "
            >
              <option value="">Select proficiency level</option>
              {proficiencyLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Fetch Chapters Button */}
          <button
            onClick={fetchChapters}
            disabled={!proficiency || loading}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Loading..." : "Fetch Chapters"}</span>
          </button>

          {/* Status Message */}
          {statusInfo && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.config.bg} ${statusInfo.config.border}`}>
              <statusInfo.config.icon 
                className={`w-5 h-5 flex-shrink-0 ${statusInfo.config.text} ${
                  (statusInfo.type === 'loading' || statusInfo.type === 'deleting') ? 'animate-spin' : ''
                }`}
              />
              <span className={`text-sm font-medium ${statusInfo.config.text}`}>
                {statusInfo.message}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chapters List */}
      {chapters.length > 0 && (
        <div className="mt-6 bg-white  shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 ">
            <h2 className="font-semibold text-gray-800 ">
              Chapters in {proficiency} ({chapters.length})
            </h2>
          </div>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-500  bg-gray-50  border-t border-b border-gray-200 ">
                  <tr>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Chapter Name</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                      <div className="font-semibold">Action</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-200 ">
                  {chapters.map((chapter) => (
                    <tr 
                      key={chapter.set_id || chapter.pronounce_name}
                      className="hover:bg-gray-50 "
                    >
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800 ">
                          {chapter.pronounce_name}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(chapter.pronounce_name)}
                          disabled={deletingChapter === chapter.pronounce_name}
                          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingChapter === chapter.pronounce_name ? (
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

      {/* Warning Info Card */}
      <div className="mt-6 bg-red-50  border border-red-200  rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600  flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 ">
            <p className="font-semibold mb-1">Warning:</p>
            <p className="text-red-600 ">
              Deleting a chapter will permanently remove all associated pronunciation data. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
