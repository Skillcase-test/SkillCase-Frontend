import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { Search, RefreshCw, History, Ban, X, ShieldAlert, CheckCircle, HelpCircle, Activity } from "lucide-react";

function getInitials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatIst(value) {
  if (!value) return "No recent activity";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Paywall() {
  const [students, setStudents] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  }, [page, searchQuery]);

  useEffect(() => {
    fetchProspects();
  }, []);

  useEffect(() => {
    fetchMasterLogs();
  }, [masterPage]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get("/admin/paywall/students", {
        params: { page, limit, search: searchQuery },
      });
      setStudents(response.data.students || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchProspects = async () => {
    setLoadingProspects(true);
    try {
      const response = await api.get("/admin/paywall/prospects");
      setProspects(response.data.data || []);
    } catch (err) {
      console.error("Error fetching prospects:", err);
    } finally {
      setLoadingProspects(false);
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
      classes = "bg-purple-100 text-purple-800 border border-purple-200";
    } else if (key.includes("disabled")) {
      classes = "bg-zinc-100 text-zinc-700 border border-zinc-200";
    } else if (key.includes("verified") || key.includes("charged")) {
      classes = "bg-emerald-100 text-emerald-800 border border-emerald-200";
    } else if (key.includes("cancelled") || key.includes("failed")) {
      classes = "bg-rose-100 text-rose-800 border border-rose-200";
    } else if (key.includes("session")) {
      classes = "bg-blue-100 text-blue-800 border border-blue-200";
    }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${classes}`}>
        {key}
      </span>
    );
  };

  // Utility badge formatter
  const getAutopayBadge = (status, enabled) => {
    if (enabled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    switch (status) {
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <X className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case "halted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <Ban className="w-3.5 h-3.5" />
            Halted
          </span>
        );
      case "created":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Session
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <HelpCircle className="w-3.5 h-3.5" />
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="sm:flex sm:justify-between sm:items-center bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl text-slate-800 font-extrabold tracking-tight">Paywall Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Access gates controls, active auto-pays, lead analytics and central security audit logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Student paywall list - Left/Top Card */}
        <div className="col-span-full xl:col-span-8 bg-white shadow-sm rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <header className="sm:flex sm:justify-between sm:items-center mb-5 gap-4">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Students Access Directories
              </h2>
              <div className="relative w-64 mt-2 sm:mt-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search name or phone..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </header>

            <div className="overflow-x-auto min-h-[300px]">
              <table className="table-auto w-full">
                <thead className="text-xs font-bold uppercase text-slate-400 bg-slate-50 border-t border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-center">Level</th>
                    <th className="px-4 py-3 text-center">Autopay Status</th>
                    <th className="px-4 py-3 text-center">Paywall Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loadingStudents ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Fetching directories...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            {student.fullname || student.username}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs font-semibold">
                          {student.phone || student.number || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-xs font-bold">
                            {student.current_profeciency_level || "A1"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {getAutopayBadge(student.autopay_status, student.autopay_enabled)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleTogglePaywall(student.user_id, student.paywall_active)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              student.paywall_active ? "bg-indigo-600" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                student.paywall_active ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => openAuditModal(student)}
                              title="User log history"
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            {student.autopay_enabled && student.razorpay_subscription_id && (
                              <button
                                onClick={() => openCancelModal(student)}
                                className="px-2.5 py-1 text-xs font-bold border border-rose-200 text-rose-600 rounded bg-rose-50 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                              >
                                Cancel Autopay
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
          </div>

          {/* Pagination */}
          {!loadingStudents && totalPages > 1 && (
            <div className="flex justify-between items-center mt-5 border-t border-slate-100 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 font-semibold">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* High Value Prospects - mirrors App Analytics prospect details */}
        <div className="col-span-full self-start xl:col-span-4 bg-white shadow-sm rounded-xl border border-slate-200 p-5">
          <header className="mb-4">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              High Value Prospects
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Most active students from App Analytics</p>
          </header>

          <div className="max-h-[600px] space-y-2.5 overflow-y-auto pr-1">
            {loadingProspects ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading prospects...</div>
            ) : prospects.length ? (
              prospects.map((prospect) => (
                <div
                  key={prospect.user_id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/20 p-3 transition-colors hover:bg-slate-50/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {getInitials(prospect.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-slate-700">
                        {prospect.name}{" "}
                        {prospect.phone && (
                          <span className="ml-1 text-[10px] font-normal text-slate-500">({prospect.phone})</span>
                        )}
                      </p>
                      <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        {prospect.prospect_score}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                      {prospect.level || "N/A"} - {formatNumber(prospect.activity_count)} events - {formatIst(prospect.last_activity)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">
                No data for this range
              </div>
            )}
          </div>
        </div>

        {/* Master Log Table - Full Width Bottom Section */}
        <div className="col-span-full bg-white shadow-sm rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <header className="sm:flex sm:justify-between sm:items-center mb-5 gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  System Paywall Audit Logs
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Central feed tracking admin locks, checkout session registrations, callbacks and gateway cancellations.
                </p>
              </div>
              <button
                onClick={fetchMasterLogs}
                disabled={loadingMasterLogs}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMasterLogs ? "animate-spin" : ""}`} />
                Refresh Feed
              </button>
            </header>

            <div className="overflow-x-auto min-h-[250px]">
              <table className="table-auto w-full text-xs">
                <thead className="text-slate-400 uppercase bg-slate-50 border-t border-b border-slate-100 font-bold">
                  <tr>
                    <th className="px-4 py-3 text-left">Timestamp (IST)</th>
                    <th className="px-4 py-3 text-left">Student Target</th>
                    <th className="px-4 py-3 text-left">Action Key</th>
                    <th className="px-4 py-3 text-left">Old Value → New Value</th>
                    <th className="px-4 py-3 text-left">Actor (Role)</th>
                    <th className="px-4 py-3 text-center">Subscription ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {loadingMasterLogs ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Fetching system logs...
                      </td>
                    </tr>
                  ) : masterLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        No system logs recorded.
                      </td>
                    </tr>
                  ) : (
                    masterLogs.map((log) => (
                      <tr key={log.log_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-semibold">
                          {log.created_at_ist}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{log.student_name || "System/Unknown"}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{log.student_phone || "—"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getActionBadge(log.action_key)}
                        </td>
                        <td className="px-4 py-3 max-w-sm font-mono text-[10px] break-all">
                          <div className="flex flex-col gap-0.5">
                            <div>
                              <span className="text-slate-400 font-semibold mr-1">Old:</span>
                              {JSON.stringify(log.old_value)}
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold mr-1">New:</span>
                              {JSON.stringify(log.new_value)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.actor_name ? (
                            <div>
                              <div className="font-bold text-slate-800">{log.actor_name}</div>
                              <div className="text-[10px] text-slate-400 capitalize font-medium">{log.actor_role}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold capitalize">
                              {log.actor_role || "system"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-slate-700">
                          {log.razorpay_subscription_id || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Master Log Pagination */}
          {!loadingMasterLogs && masterTotalPages > 1 && (
            <div className="flex justify-between items-center mt-5 border-t border-slate-100 pt-4">
              <button
                disabled={masterPage <= 1}
                onClick={() => setMasterPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 font-semibold">
                Page {masterPage} of {masterTotalPages}
              </span>
              <button
                disabled={masterPage >= masterTotalPages}
                onClick={() => setMasterPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal - Cancel Autopay */}
      {showCancelModal && selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Cancel Autopay Subscription?</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Are you sure you want to cancel the active autopay subscription for{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedStudent.fullname || selectedStudent.username}
                    </span>
                    ?
                  </p>
                  <p className="text-xs text-rose-500 font-semibold mt-3 bg-rose-50 p-2 rounded.border border-rose-100">
                    This will call the Razorpay API to cancel recurring billing immediately. If their paywall lock is still active, they will be blocked immediately upon checkout session ending.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                disabled={cancellingAutopay}
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedStudent(null);
                }}
                className="px-4 py-2 border rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors text-slate-700"
              >
                No, Keep it
              </button>
              <button
                disabled={cancellingAutopay}
                onClick={handleCancelAutopay}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-md shadow-rose-600/10"
              >
                {cancellingAutopay ? "Cancelling..." : "Yes, Cancel Autopay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal for Single Student */}
      {showAuditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-slate-200 overflow-hidden">
            <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Audit History: {selectedStudent.fullname || selectedStudent.username}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live database audit trail of paywall events, changes, and authorizations.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedStudent(null);
                  setAuditLogs([]);
                }}
                className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 overflow-y-auto max-h-[500px]">
              {loadingAudit ? (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  Fetching audit logs...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No logs found for this user.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-auto w-full text-xs">
                    <thead className="text-slate-500 uppercase bg-slate-50 border-t border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Action Key</th>
                        <th className="px-3 py-2 text-left">Actor (Role)</th>
                        <th className="px-3 py-2 text-left">Changes (Old → New)</th>
                        <th className="px-3 py-2 text-center">Subscription ID</th>
                        <th className="px-3 py-2 text-right">Timestamp (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {auditLogs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{log.action_key}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {log.actor_name ? (
                              <div>
                                <div className="font-semibold text-slate-800">{log.actor_name}</div>
                                <div className="text-[10px] text-slate-400 capitalize">{log.actor_role}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium capitalize">
                                {log.actor_role || "system"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 max-w-xs font-mono text-[10px] break-all">
                            <div className="flex flex-col gap-1">
                              <div>
                                <span className="text-slate-400 mr-1 font-semibold">Old:</span>
                                {JSON.stringify(log.old_value)}
                              </div>
                              <div>
                                <span className="text-slate-400 mr-1 font-semibold">New:</span>
                                {JSON.stringify(log.new_value)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center font-semibold">
                            {log.razorpay_subscription_id || "—"}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right text-slate-400">
                            {log.created_at_ist}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedStudent(null);
                  setAuditLogs([]);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Paywall;
