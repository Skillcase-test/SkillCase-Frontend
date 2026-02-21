import React from "react";
import { Trash2, RefreshCw, AlertCircle, CheckCircle, Loader, ExternalLink } from "lucide-react";
import api from "../../../api/axios";

export default function DeleteTest() {
  const [proficiency, setProficiency] = React.useState("");
  const [chapterTests, setChapterTests] = React.useState([]);
  const [finalTests, setFinalTests] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [deletingTest, setDeletingTest] = React.useState(null);

  const proficiencyLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

  const fetchChaptersAndFinal = async () => {
    if (!proficiency) {
      setStatus("error:Please select a proficiency level");
      return;
    }

    setLoading(true);
    setStatus("loading:Fetching tests...");

    try {
      const res = await api.get(`/admin/getTest/${proficiency}`);

      const results = res.data.results || {};

      setChapterTests(results.chapter || []);
      setFinalTests(results.final || []);

      const totalTests = (results.chapter?.length || 0) + (results.final?.length || 0);
      setStatus(`success:Found ${totalTests} tests`);
    } catch (err) {
      console.error(err);
      setChapterTests([]);
      setFinalTests([]);
      setStatus("error:Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const deleteChapterTest = async (test) => {
    if (!window.confirm(`Are you sure you want to delete chapter test "${test.test_name}"?`)) return;

    setDeletingTest(test.test_id);
    setStatus(`deleting:Deleting chapter test "${test.test_name}"...`);

    try {
      await api.post("/admin/deleteChTest", {
        test_id: test.test_id
      });

      setChapterTests((prev) =>
        prev.filter((item) => item.test_id !== test.test_id)
      );

      setStatus(`success:Chapter test "${test.test_name}" deleted successfully`);
      
      setTimeout(() => {
        if (chapterTests.length === 1 && finalTests.length === 0) {
          setStatus("");
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus(`error:Failed to delete chapter test`);
    } finally {
      setDeletingTest(null);
    }
  };

  const deleteFinalTest = async (test) => {
    if (!window.confirm(`Are you sure you want to delete final test "${test.test_name}"?`)) return;

    setDeletingTest(test.test_id);
    setStatus(`deleting:Deleting final test "${test.test_name}"...`);

    try {
      await api.post("/admin/deleteFinalTest", {
        test_id: test.test_id
      });

      setFinalTests((prev) =>
        prev.filter((item) => item.test_id !== test.test_id)
      );

      setStatus(`success:Final test "${test.test_name}" deleted successfully`);
      
      setTimeout(() => {
        if (finalTests.length === 1 && chapterTests.length === 0) {
          setStatus("");
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus(`error:Failed to delete final test`);
    } finally {
      setDeletingTest(null);
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
          Manage Tests
        </h1>
        <p className="text-sm text-gray-600  mt-1">
          View and delete chapter and final tests
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
                setStatus("");
                setChapterTests([]);
                setFinalTests([]);
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

          {/* Fetch Tests Button */}
          <button
            onClick={fetchChaptersAndFinal}
            disabled={!proficiency || loading}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Loading..." : "Fetch Tests"}</span>
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

      {/* Final Tests */}
      {finalTests.length > 0 && (
        <div className="mt-6 bg-white  shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 ">
            <h2 className="font-semibold text-gray-800 ">
              Final Tests ({finalTests.length})
            </h2>
          </div>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-500  bg-gray-50  border-t border-b border-gray-200 ">
                  <tr>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Test Name</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Link</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                      <div className="font-semibold">Action</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-200 ">
                  {finalTests.map((test) => (
                    <tr key={test.test_id} className="hover:bg-gray-50 ">
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800 ">
                          {test.test_name}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <a 
                          href={test.test_link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-blue-600  hover:text-blue-700 "
                        >
                          <span className="text-sm">Open Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => deleteFinalTest(test)}
                          disabled={deletingTest === test.test_id}
                          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingTest === test.test_id ? (
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

      {/* Chapter Tests */}
      {chapterTests.length > 0 && (
        <div className="mt-6 bg-white  shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 ">
            <h2 className="font-semibold text-gray-800 ">
              Chapter Tests ({chapterTests.length})
            </h2>
          </div>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-500  bg-gray-50  border-t border-b border-gray-200 ">
                  <tr>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Test Name</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                      <div className="font-semibold">Link</div>
                    </th>
                    <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                      <div className="font-semibold">Action</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-200 ">
                  {chapterTests.map((test) => (
                    <tr key={test.test_id} className="hover:bg-gray-50 ">
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800 ">
                          {test.test_name}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <a 
                          href={test.easy_test_link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-blue-600  hover:text-blue-700 "
                        >
                          <span className="text-sm">Open Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => deleteChapterTest(test)}
                          disabled={deletingTest === test.test_id}
                          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingTest === test.test_id ? (
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
              Deleting a test will permanently remove it from the system. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
