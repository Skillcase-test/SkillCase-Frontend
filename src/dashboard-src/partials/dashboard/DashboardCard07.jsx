import React, { useState, useEffect } from "react";
import api from "../../../api/axios";
function DashboardCard07() {
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: 10,
  });

  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUserAnalytics = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/analytics?page=${page}&limit=${pageSize}`
      );

      const data = await response.data;
      setUserData(data.data);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      console.error("Error fetching user analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAnalytics(1);
  }, [pageSize]);

  // Filter users based on search query
  const filteredUsers = userData.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setExpandedRows(new Set()); // Clear expanded rows on page change
      fetchUserAnalytics(newPage);
    }
  };

  const fetchUserHistory = async (userId) => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/admin/analytics/user-history/${userId}`);
      setSelectedUserHistory(response.data);
    } catch (err) {
      console.error("Error fetching user history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleRow = (userId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(userId)) {
      newExpandedRows.delete(userId);
      setSelectedUserHistory(null);
    } else {
      newExpandedRows.clear(); // Only one expanded at a time
      newExpandedRows.add(userId);
      fetchUserHistory(userId);
    }
    setExpandedRows(newExpandedRows);
  };

  const getCompletedTests = (tests) => {
    if (!tests) return 0;
    return tests.filter((test) => test.test_status === true).length;
  };

  const getTotalTests = (tests) => {
    if (!tests) return 0;
    return tests.length;
  };

  const getCompletionRate = (tests) => {
    const total = getTotalTests(tests);
    if (total === 0) return 0;
    return ((getCompletedTests(tests) / total) * 100).toFixed(1);
  };

  if (loading && pagination.currentPage === 1) {
    return (
      <div className="flex flex-col col-span-full bg-white  shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500 ">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col col-span-full bg-white  shadow-xs rounded-xl p-5">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col col-span-full bg-white  shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-800">User Analytics</h2>
            <div className="text-sm text-gray-500 mt-1">
              {pagination.totalRecords} total users • {filteredUsers.length} shown
            </div>
          </div>

          {/* Page Size Selector with Custom Input */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </header>

      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-500  bg-gray-50  border-t border-b border-gray-200 ">
              <tr>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left w-10">
                  <div className="font-semibold"></div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                  <div className="font-semibold">Username</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                  <div className="font-semibold">Proficiency Level</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                  <div className="font-semibold">Tests Completed</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                  <div className="font-semibold">Completion Rate</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-2 first:pl-5 last:pr-5 py-4 text-center text-gray-500 "
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-2 first:pl-5 last:pr-5 py-4 text-center text-gray-500 "
                  >
                    {searchQuery ? "No users found matching your search" : "No users found"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <React.Fragment key={user.user_id}>
                    {/* Main Row */}
                    <tr
                      onClick={() => toggleRow(user.user_id)}
                      className="border-b border-gray-200  hover:bg-gray-50  cursor-pointer"
                    >
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <button className="text-gray-400 hover:text-gray-600 ">
                          <svg
                            className={`w-4 h-4 transform transition-transform ${
                              expandedRows.has(user.user_id) ? "rotate-90" : ""
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800 ">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                        <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.current_profeciency_level?.toUpperCase() === "A2"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-600"
                        }`}>
                          {user.current_profeciency_level}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                        <div className="font-medium text-gray-800 ">
                          {getCompletedTests(user.jsonb_agg)} /{" "}
                          {getTotalTests(user.jsonb_agg)}
                        </div>
                      </td>
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="font-medium text-gray-800 ">
                            {getCompletionRate(user.jsonb_agg)}%
                          </div>
                          <div
                            className="h-2 bg-gray-200  rounded-full overflow-hidden"
                            style={{ width: "60px" }}
                          >
                            <div
                              className="h-full bg-sky-500 rounded-full"
                              style={{
                                width: `${getCompletionRate(user.jsonb_agg)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row - Flashcard Details */}
                    {expandedRows.has(user.user_id) && (
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <td
                          colSpan="7"
                          className="px-2 first:pl-5 last:pr-5 py-4"
                        >
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-800 mb-3">
                              Complete Activity History
                            </h4>

                            {loadingHistory ? (
                              <div className="text-center py-4 text-gray-500">
                                Loading history...
                              </div>
                            ) : selectedUserHistory &&
                              selectedUserHistory.length > 0 ? (
                              <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 bg-gray-100 border-b border-gray-200">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-semibold">
                                        Type
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold">
                                        Name
                                      </th>
                                      <th className="px-3 py-2 text-left font-semibold">
                                        Level
                                      </th>
                                      <th className="px-3 py-2 text-center font-semibold">
                                        Status
                                      </th>
                                      <th className="px-3 py-2 text-center font-semibold">
                                        Progress
                                      </th>
                                      <th className="px-3 py-2 text-right font-semibold">
                                        Last Accessed
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {selectedUserHistory.map(
                                      (activity, idx) => (
                                        <tr
                                          key={idx}
                                          className="hover:bg-white"
                                        >
                                          <td className="px-3 py-2">
                                            <span
                                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                activity.activity_type ===
                                                "flashcard"
                                                  ? "bg-blue-100 text-blue-600"
                                                  : activity.activity_type ===
                                                    "pronounce"
                                                  ? "bg-amber-100 text-amber-600"
                                                  : activity.activity_type ===
                                                    "conversation"
                                                  ? "bg-green-100 text-green-600"
                                                  : activity.activity_type ===
                                                    "story"
                                                  ? "bg-purple-100 text-purple-600"
                                                  : activity.activity_type ===
                                                    "a2_flashcard"
                                                  ? "bg-sky-100 text-sky-700"
                                                  : activity.activity_type ===
                                                    "a2_grammar"
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : activity.activity_type ===
                                                    "a2_listening"
                                                  ? "bg-teal-100 text-teal-700"
                                                  : activity.activity_type ===
                                                    "a2_speaking"
                                                  ? "bg-cyan-100 text-cyan-700"
                                                  : activity.activity_type ===
                                                    "a2_reading"
                                                  ? "bg-indigo-100 text-indigo-700"
                                                  : activity.activity_type ===
                                                    "a2_test"
                                                  ? "bg-rose-100 text-rose-700"
                                                  : "bg-gray-100 text-gray-600"
                                              }`}
                                            >
                                              {activity.activity_type.startsWith("a2_")
                                                ? `A2 ${activity.activity_type.replace("a2_", "").charAt(0).toUpperCase() + activity.activity_type.replace("a2_", "").slice(1)}`
                                                : activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 font-medium text-gray-800">
                                            {activity.item_name}
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="text-gray-600">
                                              {activity.proficiency_level}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                activity.completed
                                                  ? "bg-green-100 text-green-600"
                                                  : "bg-gray-100 text-gray-600"
                                              }`}
                                            >
                                              {activity.completed
                                                ? "Completed"
                                                : "In Progress"}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-center text-gray-600">
                                            {activity.current_index !== null
                                              ? `Card ${activity.current_index}`
                                              : "-"}
                                          </td>
                                          <td className="px-3 py-2 text-right text-gray-500">
                                            {activity.last_accessed
                                              ? new Date(
                                                  activity.last_accessed
                                                ).toLocaleDateString()
                                              : "-"}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 text-center py-4">
                                No activity history available
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-4 border-t border-gray-200 ">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500  mb-3 sm:mb-0">
              Showing{" "}
              {userData.length > 0
                ? (pagination.currentPage - 1) * pagination.pageSize + 1
                : 0}{" "}
              to{" "}
              {Math.min(
                pagination.currentPage * pagination.pageSize,
                pagination.totalRecords
              )}{" "}
              of {pagination.totalRecords} users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
                className={`px-3 py-1 rounded border ${
                  pagination.hasPreviousPage
                    ? "border-gray-300  text-gray-700  hover:bg-gray-50 "
                    : "border-gray-200  text-gray-400  cursor-not-allowed"
                }`}
              >
                Previous
              </button>

              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, pagination.totalPages))].map(
                  (_, idx) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = idx + 1;
                    } else if (
                      pagination.currentPage >=
                      pagination.totalPages - 2
                    ) {
                      pageNum = pagination.totalPages - 4 + idx;
                    } else {
                      pageNum = pagination.currentPage - 2 + idx;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded ${
                          pagination.currentPage === pageNum
                            ? "bg-blue-500 text-white"
                            : "border border-gray-300  text-gray-700  hover:bg-gray-50 "
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className={`px-3 py-1 rounded border ${
                  pagination.hasNextPage
                    ? "border-gray-300  text-gray-700  hover:bg-gray-50 "
                    : "border-gray-200  text-gray-400  cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardCard07;
