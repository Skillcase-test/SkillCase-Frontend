import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  Search,
  RefreshCw,
  History,
  Ban,
  X,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Activity,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { ControlDropdown } from "../payments-admin/components/controls";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Default (Active Trials First)" },
  { value: "created_desc", label: "Created (Newest)" },
  { value: "created_asc", label: "Created (Oldest)" },
  { value: "trial_expiry_desc", label: "Trial Expiry (Latest)" },
  { value: "trial_expiry_asc", label: "Trial Expiry (Oldest)" },
  { value: "score_desc", label: "Scores (Highest)" },
  { value: "score_asc", label: "Scores (Lowest)" },
];

function formatTrialEnd(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Paywall() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(10);

  // Master system logs states
  const [masterLogs, setMasterLogs] = useState([]);
  const [loadingMasterLogs, setLoadingMasterLogs] = useState(false);
  const [masterPage, setMasterPage] = useState(1);
  const [masterTotalPages, setMasterTotalPages] = useState(1);
  const [masterLimit] = useState(10);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [cancellingAutopay, setCancellingAutopay] = useState(false);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Fetch lists
  useEffect(() => {
    fetchStudents();
  }, [page, searchQuery, statusFilter, startDate, endDate, sortOption]);

  useEffect(() => {
    fetchMasterLogs();
  }, [masterPage]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get("/admin/paywall/students", {
        params: {
          page,
          limit,
          search: searchQuery,
          status: statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sort: sortOption !== "default" ? sortOption : undefined,
        },
      });
      setStudents(response.data.students || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalCount(response.data.pagination?.total || 0);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchMasterLogs = async () => {
    setLoadingMasterLogs(true);
    try {
      const response = await api.get("/admin/paywall/audit-log", {
        params: { page: masterPage, limit: masterLimit },
      });
      setMasterLogs(response.data.logs || []);
      setMasterTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching master logs:", err);
    } finally {
      setLoadingMasterLogs(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setPage(1);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setPage(1);
  };

  const handleSortChange = (value) => {
    setSortOption(value);
    setPage(1);
  };

  const handleResetDates = () => {
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Toggle Paywall Active
  const handleTogglePaywall = async (studentId, currentStatus) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) => (s.user_id === studentId ? { ...s, paywall_active: nextStatus } : s))
    );

    try {
      await api.post("/admin/paywall/toggle", {
        userId: studentId,
        paywallActive: nextStatus,
      });
      fetchMasterLogs(); // Refresh general log feed
    } catch (err) {
      console.error("Error toggling paywall status:", err);
      // Revert optimistic update
      setStudents((prev) =>
        prev.map((s) => (s.user_id === studentId ? { ...s, paywall_active: currentStatus } : s))
      );
    }
  };

  // Cancel Autopay Flow
  const openCancelModal = (student) => {
    setSelectedStudent(student);
    setShowCancelModal(true);
  };

  const handleCancelAutopay = async () => {
    if (!selectedStudent) return;
    setCancellingAutopay(true);
    try {
      await api.post("/admin/paywall/cancel-autopay", {
        userId: selectedStudent.user_id,
      });
      setShowCancelModal(false);
      setSelectedStudent(null);
      fetchStudents();
      fetchMasterLogs(); // Refresh feed
    } catch (err) {
      console.error("Error cancelling autopay:", err);
      alert(err.response?.data?.msg || "Failed to cancel autopay subscription");
    } finally {
      setCancellingAutopay(false);
    }
  };

  // View Audit Logs Flow for Single Student
  const openAuditModal = async (student) => {
    setSelectedStudent(student);
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const response = await api.get(`/admin/paywall/students/${student.user_id}/audit-log`);
      setAuditLogs(response.data.logs || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Utility badge styling for Action Keys
  const getActionBadge = (key) => {
    let classes = "bg-slate-100 text-slate-600";
    if (key.includes("enabled")) {
      classes = "bg-purple-50 text-purple-700 border border-purple-200";
    } else if (key.includes("disabled")) {
      classes = "bg-slate-100 text-slate-600 border border-slate-200";
    } else if (key.includes("verified") || key.includes("charged")) {
      classes = "bg-emerald-50 text-emerald-700 border border-emerald-200";
    } else if (key.includes("cancelled") || key.includes("failed")) {
      classes = "bg-rose-50 text-rose-700 border border-rose-200";
    } else if (key.includes("session")) {
      classes = "bg-blue-50 text-blue-700 border border-blue-200";
    }
    return (
      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${classes}`}>
        {key}
      </span>
    );
  };

  // Utility badge formatter
  const getAutopayBadge = (status, enabled) => {
    if (enabled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    }
    switch (status) {
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3 h-3" />
            Cancelled
          </span>
        );
      case "halted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            <Ban className="w-3 h-3" />
            Halted
          </span>
        );
      case "created":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            <HelpCircle className="w-3 h-3" />
            Checkout Started
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-9xl mx-auto space-y-5">
      {/* Flat Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Paywall Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Student access directories, autopay subscriptions, activity scores, and system audit logs.
          </p>
        </div>
      </div>

      {/* Main Student Directory */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Students Directory</h2>
            {totalCount > 0 && (
              <span className="text-xs font-medium text-slate-400">({totalCount})</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search student or phone..."
                className="w-full h-9 pl-8 pr-3 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              />
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            {/* Status Filter */}
            <ControlDropdown
              aria-label="Paywall status filter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              options={STATUS_FILTER_OPTIONS}
              compact
              className="w-32"
            />

            {/* Sorter */}
            <ControlDropdown
              aria-label="Sort students"
              value={sortOption}
              onChange={handleSortChange}
              options={SORT_OPTIONS}
              compact
              className="w-48"
            />

            {/* Date Range */}
            <div className="flex items-center gap-2 h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-slate-700 text-xs cursor-pointer p-0"
                title="Created from (12:00 AM IST)"
              />
              <span className="text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-slate-700 text-xs cursor-pointer p-0"
                title="Created to (11:59 PM IST)"
              />
              {(startDate || endDate) && (
                <button
                  onClick={handleResetDates}
                  title="Clear dates"
                  className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors ml-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px] border border-slate-200 rounded-lg">
          <table className="table-auto w-full text-left">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Student</th>
                <th className="px-3.5 py-2.5">Phone</th>
                <th className="px-3.5 py-2.5 text-center">Level</th>
                <th className="px-3.5 py-2.5 text-center">Score</th>
                <th className="px-3.5 py-2.5 text-center">Trial Ends</th>
                <th className="px-3.5 py-2.5 text-center">Autopay Status</th>
                <th className="px-3.5 py-2.5 text-center">Paywall Active</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
              {loadingStudents ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.user_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {student.fullname || student.username}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {student.phone || student.number || "—"}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {student.current_profeciency_level || "A1"}
                        {String(student.current_profeciency_level || "").toUpperCase() === "B1" &&
                          (student.is_job_screening ? " · Job" : " · Practice")}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        {student.prospect_score != null ? student.prospect_score : 0}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center text-slate-600">
                      {student.trial_end_at ? (
                        <span className="text-amber-700 font-medium text-[11px]">
                          {formatTrialEnd(student.trial_end_at)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      {getAutopayBadge(student.autopay_status, student.autopay_enabled)}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePaywall(student.user_id, student.paywall_active)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                          student.paywall_active ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            student.paywall_active ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openAuditModal(student)}
                          title="User audit log"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {student.autopay_enabled && student.razorpay_subscription_id && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(student)}
                            className="px-2 py-0.5 text-[11px] font-medium text-rose-600 border border-rose-200 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loadingStudents && totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="text-slate-400 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Master Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              System Audit Logs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live log of paywall toggles, checkout registrations, and gateway updates.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchMasterLogs}
            disabled={loadingMasterLogs}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loadingMasterLogs ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto min-h-[220px] border border-slate-200 rounded-lg">
          <table className="table-auto w-full text-left text-xs">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Timestamp (IST)</th>
                <th className="px-3.5 py-2.5">Student</th>
                <th className="px-3.5 py-2.5">Action Key</th>
                <th className="px-3.5 py-2.5">Changes (Old → New)</th>
                <th className="px-3.5 py-2.5">Actor</th>
                <th className="px-3.5 py-2.5 text-center">Subscription ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loadingMasterLogs ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : masterLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    No system logs recorded.
                  </td>
                </tr>
              ) : (
                masterLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {log.created_at_ist}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{log.student_name || "System"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.student_phone || "—"}</div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {getActionBadge(log.action_key)}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-sm font-mono text-[10px] break-all">
                      <div className="flex flex-col gap-0.5">
                        <div>
                          <span className="text-slate-400 mr-1">Old:</span>
                          {JSON.stringify(log.old_value)}
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">New:</span>
                          {JSON.stringify(log.new_value)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {log.actor_name ? (
                        <div>
                          <div className="font-semibold text-slate-800">{log.actor_name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{log.actor_role}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 capitalize">{log.actor_role || "system"}</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center font-mono text-[11px] text-slate-700">
                      {log.razorpay_subscription_id || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Master Log Pagination */}
        {!loadingMasterLogs && masterTotalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              disabled={masterPage <= 1}
              onClick={() => setMasterPage((p) => p - 1)}
              className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="text-slate-400 font-medium">
              Page {masterPage} of {masterTotalPages}
            </span>
            <button
              disabled={masterPage >= masterTotalPages}
              onClick={() => setMasterPage((p) => p + 1)}
              className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal - Cancel Autopay */}
      {showCancelModal && selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cancel Autopay Subscription</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to cancel recurring autopay for{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedStudent.fullname || selectedStudent.username}
                    </span>
                    ?
                  </p>
                  <p className="text-[11px] text-rose-600 mt-2 bg-rose-50 p-2 rounded border border-rose-100">
                    This calls Razorpay to cancel future billing cycles immediately.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                disabled={cancellingAutopay}
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedStudent(null);
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors text-slate-700 cursor-pointer"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={cancellingAutopay}
                onClick={handleCancelAutopay}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancellingAutopay ? "Cancelling..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal for Single Student */}
      {showAuditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-slate-200 overflow-hidden">
            <header className="flex justify-between items-center px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Audit History: {selectedStudent.fullname || selectedStudent.username}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Database record of paywall events, changes, and authorizations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedStudent(null);
                  setAuditLogs([]);
                }}
                className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 overflow-y-auto max-h-[450px]">
              {loadingAudit ? (
                <div className="text-center py-10 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading audit logs...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No logs found for this user.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="table-auto w-full text-left text-xs">
                    <thead className="text-[11px] font-semibold uppercase text-slate-600 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Action Key</th>
                        <th className="px-3 py-2">Actor</th>
                        <th className="px-3 py-2">Changes (Old → New)</th>
                        <th className="px-3 py-2 text-center">Subscription ID</th>
                        <th className="px-3 py-2 text-right">Timestamp (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {auditLogs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{log.action_key}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {log.actor_name ? (
                              <div>
                                <div className="font-semibold text-slate-800">{log.actor_name}</div>
                                <div className="text-[10px] text-slate-400 capitalize">{log.actor_role}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 capitalize">{log.actor_role || "system"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 max-w-xs font-mono text-[10px] break-all">
                            <div className="flex flex-col gap-0.5">
                              <div>
                                <span className="text-slate-400 mr-1">Old:</span>
                                {JSON.stringify(log.old_value)}
                              </div>
                              <div>
                                <span className="text-slate-400 mr-1">New:</span>
                                {JSON.stringify(log.new_value)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center font-mono text-[11px]">
                            {log.razorpay_subscription_id || "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-slate-400 font-mono text-[11px]">
                            {log.created_at_ist}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedStudent(null);
                  setAuditLogs([]);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Paywall;
