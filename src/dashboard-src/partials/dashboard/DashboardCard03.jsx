import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import EditMenu from "../../components/DropdownEditMenu";
import api from "../../../api/axios";
import { X, Search, Download } from "lucide-react";

function DashboardCard03() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [a1Count, setA1Count] = useState(0);
  const [a2Count, setA2Count] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get("/admin/analytics/user-count");
        const data = await response.data;
        setTotalUsers(data.count);
        setA1Count(data.a1Count || 0);
        setA2Count(data.a2Count || 0);
        setError(null);
      } catch (err) {
        console.error("Error fetching total users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTotalUsers();
  }, []);

  const handleViewUsers = async () => {
    setShowModal(true);
    setUsersLoading(true);
    try {
      const response = await api.get("/admin/analytics/all-users");
      setAllUsers(response.data);
    } catch (err) {
      console.error("Error fetching all users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    const q = searchQuery.toLowerCase();
    return (
      (user.username || "").toLowerCase().includes(q) ||
      (user.fullname || "").toLowerCase().includes(q) ||
      (user.phone || "").toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatLastUsage = (dateStr) => {
    if (!dateStr) return "—";
    const cleanTs = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
    const diff = Math.floor((Date.now() - new Date(cleanTs).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleDownloadCSV = () => {
    const headers = [
      "Username",
      "Full Name",
      "Phone",
      "Level",
      "Source",
      "Payment Status",
      "Signup Date",
      "Last Activity",
    ];
    const rows = filteredUsers.map((u) => [
      u.username,
      u.fullname || "",
      u.phone || "",
      u.current_profeciency_level || "",
      u.signup_source || "",
      u.is_paid ? "Paid" : "Not Paid",
      formatDate(u.created_at),
      formatDate(u.last_activity_at),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl">
        <div className="px-5 pt-5 pb-5">
          <header className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Total Users
            </h2>
            {/* Menu button */}
            <EditMenu align="right" className="relative inline-flex">
              <li>
                <Link
                  className="font-medium text-sm text-gray-600 hover:text-gray-800 flex py-1 px-3"
                  to="#0"
                >
                  Refresh
                </Link>
              </li>
              <li>
                <button
                  className="font-medium text-sm text-gray-600 hover:text-gray-800 flex py-1 px-3 w-full text-left"
                  onClick={handleViewUsers}
                >
                  View All Users
                </button>
              </li>
              <li>
                <Link
                  className="font-medium text-sm text-red-500 hover:text-red-600 flex py-1 px-3"
                  to="#0"
                >
                  Remove
                </Link>
              </li>
            </EditMenu>
          </header>
          <div className="text-xs font-semibold text-gray-400 uppercase mb-1">
            All Time
          </div>
          <div className="flex items-start">
            <div className="text-3xl font-bold text-gray-800 mr-2">
              {totalUsers.toLocaleString()}
            </div>
          </div>

          {/* A1/A2 Breakdown */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
                A1
              </div>
              <div className="text-lg font-bold text-gray-800">
                {Number(a1Count).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mb-1">
                A2
              </div>
              <div className="text-lg font-bold text-gray-800">
                {Number(a2Count).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODAL ========== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  All Users
                </h3>
                <p className="text-sm text-gray-500">
                  {filteredUsers.length} users found
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {usersLoading ? (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  Loading users...
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                      <th className="py-3 pr-4">#</th>
                      <th className="py-3 pr-4">User Name</th>
                      <th className="py-3 pr-4">Phone</th>
                      <th className="py-3 pr-4">Level</th>
                      <th className="py-3 pr-4">Payment</th>
                      <th className="py-3 pr-4">Signup Date</th>
                      <th className="py-3">Last Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, idx) => (
                      <tr
                        key={user.user_id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2.5 pr-4 text-gray-400">{idx + 1}</td>
                        <td className="py-2.5 pr-4">
                          <div className="font-medium text-gray-800">
                            {user.fullname || user.username}
                          </div>
                          {user.fullname && user.fullname !== user.username && (
                            <div className="text-xs text-gray-400">
                              @{user.username}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">
                          {user.phone || "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.current_profeciency_level?.toUpperCase() ===
                              "A2"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {user.current_profeciency_level || "A1"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.is_paid
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {user.is_paid ? "Paid" : "Not Paid"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-2.5 text-gray-600">
                          {formatLastUsage(user.last_activity_at)}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan="7"
                          className="py-8 text-center text-gray-400"
                        >
                          No users match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardCard03;
