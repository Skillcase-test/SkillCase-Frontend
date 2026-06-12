import React, { useState, useEffect } from "react";
import api from "../../../api/axios";
import { Search, UserCheck, UserPlus, Phone, Calendar, Smartphone, ShieldCheck, MoreVertical, X } from "lucide-react";

function DashboardCardAllUsers() {
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: 10,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch only the count on load
  useEffect(() => {
    const fetchInitialCount = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          "/admin/analytics/version-users?version=1.1.7,1.1.8&page=1&limit=1"
        );
        setTotalCount(response.data.pagination?.totalRecords || 0);
        setError(null);
      } catch (err) {
        console.error("Error fetching version users count:", err);
        setError("Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialCount();
  }, []);

  // Fetch full details for the Modal
  const fetchModalUsers = async (page = 1) => {
    try {
      setModalLoading(true);
      const response = await api.get(
        `/admin/analytics/version-users?version=1.1.7,1.1.8&page=${page}&limit=10&search=${debouncedSearch}`
      );
      setUsers(response.data.data || []);
      setPagination(response.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        pageSize: 10,
      });
      // Sync the main count if search is empty
      if (!debouncedSearch) {
        setTotalCount(response.data.pagination?.totalRecords || 0);
      }
      setModalError(null);
    } catch (err) {
      console.error("Error fetching modal users:", err);
      setModalError("Failed to load users");
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch modal data when modal opens or search changes
  useEffect(() => {
    if (isModalOpen) {
      fetchModalUsers(1);
    }
  }, [isModalOpen, debouncedSearch]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchModalUsers(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl border border-slate-100 p-5">
      <header className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">v1.1.7 + v1.1.8 Onboardings</h2>
          <p className="text-xs text-slate-400 mt-0.5">Active reviewees on versions 1.1.7 &amp; 1.1.8</p>
        </div>
        
        {/* Dropdown Options Menu */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {dropdownOpen && (
            <>
              {/* Overlay Backdrop to Close on Click Outside */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              ></div>
              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-100 rounded-lg shadow-lg py-1 z-20">
                <button
                  onClick={() => {
                    setIsModalOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  View Users
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Card Body */}
      <div className="mt-4 flex items-center gap-3">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          {loading ? (
            <div className="text-2xl font-bold text-slate-300">--</div>
          ) : error ? (
            <div className="text-sm font-semibold text-red-500">{error}</div>
          ) : (
            <div className="text-3xl font-bold text-slate-800">
              {totalCount}
            </div>
          )}
          <div className="text-xs font-medium text-slate-400">Total Reviewees</div>
        </div>
      </div>

      {/* Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  Users Review (v1.1.7 + v1.1.8)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Review users registered on release versions 1.1.7 &amp; 1.1.8.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            
            {/* Modal Search Bar */}
            <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by full name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
            
            {/* Modal Body / Table */}
            <div className="p-6 overflow-y-auto grow">
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="table-auto w-full">
                  <thead className="text-xs font-semibold uppercase text-slate-400 bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Full Name</th>
                      <th className="px-4 py-3 text-left">Phone Number</th>
                      <th className="px-4 py-3 text-left">Registered On</th>
                      <th className="px-4 py-3 text-center">Age Status</th>
                      <th className="px-4 py-3 text-center">Login Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {modalLoading && users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400 font-medium">
                          Loading users list...
                        </td>
                      </tr>
                    ) : modalError ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-red-500 font-medium">
                          Error loading data: {modalError}
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400 font-medium">
                          No users found on versions 1.1.7 or 1.1.8
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.user_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{user.fullname || "Anonymous"}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">@{user.username}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {user.phone || "No Phone"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(user.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.user_age_status === "New User"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {user.user_age_status === "New User" ? (
                                <UserPlus className="w-3 h-3" />
                              ) : (
                                <UserCheck className="w-3 h-3" />
                              )}
                              {user.user_age_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              user.login_status === "Logged In"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {user.login_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination inside Modal */}
              {!modalLoading && !modalError && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs font-medium text-slate-500">
                    Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{" "}
                    {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)} of{" "}
                    {pagination.totalRecords} users
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPreviousPage}
                      className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-xs font-semibold text-slate-600">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardCardAllUsers;
