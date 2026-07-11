import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Phone,
} from "lucide-react";
import api from "../../api/axios";

function toDateString(date) {
  return date.toISOString().split("T")[0];
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isStartWindowOpen(scheduledStartAt) {
  if (!scheduledStartAt) return false;
  const scheduledMs = new Date(scheduledStartAt).getTime();
  if (Number.isNaN(scheduledMs)) return false;
  return Date.now() >= scheduledMs - 5 * 60 * 1000;
}

function makeWiseApi() {
  return {
    get: async (path, params = {}) => {
      const res = await api.get(path, { params });
      return res.data;
    },
    post: async (path, body = {}) => {
      const res = await api.post(path, body);
      return res.data;
    },
  };
}

function getStatusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "live")
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (s === "completed")
    return "bg-blue-50 text-blue-700 border border-blue-200";
  if (s === "scheduled" || s === "pending")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  if (s === "failed" || s === "error")
    return "bg-rose-50 text-rose-700 border border-rose-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function getStatusDot(status) {
  const s = (status || "").toLowerCase();
  if (s === "live") return "bg-emerald-500";
  if (s === "completed") return "bg-blue-500";
  if (s === "scheduled" || s === "pending") return "bg-amber-500";
  if (s === "failed" || s === "error") return "bg-rose-500";
  return "bg-slate-400";
}

function VerificationModal({ session, saving, onClose, onSubmit }) {
  const [form, setForm] = useState({
    class_started_seen: false,
    students_joined_seen: false,
    issues_found: false,
    notes: "",
  });
  const hasExisting = Boolean(session?.verification);
  const [isEditMode, setIsEditMode] = useState(!hasExisting);

  useEffect(() => {
    if (!session) return;
    const existing = session.verification;
    setForm({
      class_started_seen: Boolean(existing?.classStartedSeen),
      students_joined_seen: Boolean(existing?.studentsJoinedSeen),
      issues_found: Boolean(existing?.issuesFound),
      notes: existing?.notes || "",
    });
    setIsEditMode(!existing);
  }, [session]);

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#083262]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#083262]">
            {hasExisting ? "Verification Details" : "Verify Session"}
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">
          {session.sessionTitle}
        </h3>
        <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {formatDateTime(session.scheduledStartAt)}
        </p>
        {hasExisting && (
          <p className="mt-1 text-xs text-slate-400">
            Verified at: {formatDateTime(session.verification?.verifiedAt)}
          </p>
        )}

        <div className="mt-5 space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={form.class_started_seen}
              disabled={!isEditMode || saving}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, class_started_seen: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-[#083262] focus:ring-[#083262]/20"
            />
            <span className="text-sm font-medium text-slate-700">
              Class started seen
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={form.students_joined_seen}
              disabled={!isEditMode || saving}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, students_joined_seen: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-[#083262] focus:ring-[#083262]/20"
            />
            <span className="text-sm font-medium text-slate-700">
              Students joined seen
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={form.issues_found}
              disabled={!isEditMode || saving}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, issues_found: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-[#083262] focus:ring-[#083262]/20"
            />
            <span className="text-sm font-medium text-slate-700">
              Issues found
            </span>
          </label>
          <textarea
            value={form.notes}
            disabled={!isEditMode || saving}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Add notes..."
            className="w-full min-h-[88px] rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition resize-y placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          {hasExisting && !isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={saving}
          >
            Cancel
          </button>
          {isEditMode && (
            <button
              onClick={() => onSubmit(form)}
              className="rounded-full bg-[#083262] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#052243] disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AttendanceDetailsModal({ session, onClose }) {
  if (!session) return null;

  const attendance = session.attendance || {};
  const studentList = attendance.studentList || [];

  const absentStudents = studentList
    .filter((s) => !s.joined)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const presentStudents = studentList
    .filter((s) => s.joined)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 flex flex-col max-h-[85vh] transition-all transform scale-100">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-[#083262]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#083262]">
                Attendance details
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 truncate max-w-md">
              {session.sessionTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Batch: <span className="font-semibold text-slate-700">{session.batchName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition focus:outline-none"
          >
            <span className="text-2xl font-bold leading-none">&times;</span>
          </button>
        </div>

        {/* Progress Bar & Summary */}
        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Attendance summary</span>
            <span className="text-lg font-bold text-slate-800">
              {attendance.joinedStudents ?? 0} joined / {attendance.totalStudents ?? 0} total
            </span>
          </div>
          <div className="w-full sm:w-48 bg-slate-200 rounded-full h-2.5 overflow-hidden shrink-0">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${
                  attendance.totalStudents
                    ? (attendance.joinedStudents / attendance.totalStudents) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Student Lists Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 my-2">
          {/* Absent / Not Joined List */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Not Joined ({absentStudents.length})
            </div>
            {absentStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {absentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 flex items-center justify-between gap-3 hover:bg-rose-50/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 truncate block text-sm">
                        {student.name}
                      </span>
                      {student.phone && (
                        <span className="text-xs text-slate-500 block font-mono mt-0.5">
                          {student.phone}
                        </span>
                      )}
                    </div>
                    {student.phone && (
                      <a
                        href={`tel:${student.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 shadow-sm shrink-0"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic pl-3.5">
                No absent students. Everyone has joined!
              </p>
            )}
          </div>

          {/* Present / Joined List */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Joined ({presentStudents.length})
            </div>
            {presentStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 truncate block text-sm">
                        {student.name}
                      </span>
                      {student.joinedAt && (
                        <span className="text-[10px] text-emerald-600 block mt-0.5">
                          Joined at:{" "}
                          {new Date(student.joinedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100 shrink-0">
                      Present
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic pl-3.5">
                No students have joined yet.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-4 border-t border-slate-100 pt-4 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WiseClassesDashboard() {
  const wiseApi = useMemo(() => makeWiseApi(), []);
  const AUTO_SYNC_MS = 30000;
  const [sessionDate, setSessionDate] = useState(toDateString(new Date()));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rowActionState, setRowActionState] = useState({});
  const [hostSelections, setHostSelections] = useState({});
  const [copiedSessionId, setCopiedSessionId] = useState(null);
  const [verifyModalSession, setVerifyModalSession] = useState(null);
  const [verifySaving, setVerifySaving] = useState(false);
  const [attendanceModalSession, setAttendanceModalSession] = useState(null);

  const copyJoinLink = async (sessionId, joinUrl) => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = joinUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId(null), 2000);
    }
  };

  const fetchSessionControl = useCallback(
    async ({ silent = false } = {}) => {
      if (!sessionDate) return;
      if (!silent) setLoading(true);
      setError("");
      try {
        const res = await wiseApi.get("/wise/sessions/control", { date: sessionDate });
        const nextSessions = res.sessions || [];
        setSessions(nextSessions);
        setHostSelections((previous) => {
          const next = {};
          nextSessions.forEach((session) => {
            const candidates = session.hostCandidates || [];
            const previousKey = previous[session.sessionId];
            next[session.sessionId] = candidates.some(
              (candidate) => candidate.key === previousKey,
            )
              ? previousKey
              : session.selectedHostKey || candidates[0]?.key || "";
          });
          return next;
        });
      } catch (e) {
        setError(e.message || "Failed to load session control");
        if (!silent) setSessions([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [sessionDate, wiseApi],
  );

  useEffect(() => {
    fetchSessionControl();
  }, [fetchSessionControl]);

  useEffect(() => {
    if (!sessionDate) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSessionControl({ silent: true });
      }
    }, AUTO_SYNC_MS);
    return () => clearInterval(id);
  }, [sessionDate, fetchSessionControl]);

  useEffect(() => {
    function onFocus() {
      fetchSessionControl({ silent: true });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchSessionControl]);

  async function runPrimaryAction(session) {
    const nextAction = session.actions?.nextAction;
    if (!nextAction) return;

    const routeByAction = { start: "start", end: "end", restart: "restart" };
    const verb = routeByAction[nextAction];
    if (!verb) return;
    const hostKey = hostSelections[session.sessionId] || session.selectedHostKey || "";
    if ((nextAction === "start" || nextAction === "restart") && !hostKey) {
      setError("Select an assigned host before starting this class");
      return;
    }
    if (nextAction === "start" && !isStartWindowOpen(session.scheduledStartAt)) {
      setError("This class can be started only within 5 minutes of its scheduled time");
      return;
    }

    const optimisticStatusByAction = { start: "live", end: "completed", restart: "live" };
    const optimisticNextByAction = { start: "end", end: "restart", restart: "end" };

    setError("");
    setRowActionState((prev) => ({ ...prev, [session.sessionId]: nextAction }));

    setSessions((prev) =>
      prev.map((r) =>
        r.sessionId === session.sessionId
          ? {
              ...r,
              status: optimisticStatusByAction[nextAction] || r.status,
              actions: {
                ...(r.actions || {}),
                nextAction: optimisticNextByAction[nextAction] || r.actions?.nextAction,
                canJoin: optimisticStatusByAction[nextAction] === "live",
              },
            }
          : r,
      ),
    );

    try {
      await wiseApi.post(`/wise/sessions/${session.sessionId}/${verb}`, {
        batchId: session.batchId,
        meetingJoinUrl: session.joinUrl || "",
        ...(nextAction === "start" || nextAction === "restart"
          ? { hostKey }
          : {}),
      });
      await fetchSessionControl({ silent: true });
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          e.response?.data?.error ||
          e.message ||
          `Failed to ${nextAction} session`,
      );
      await fetchSessionControl({ silent: true });
    } finally {
      setRowActionState((prev) => {
        const copy = { ...prev };
        delete copy[session.sessionId];
        return copy;
      });
    }
  }

  async function handleVerifySubmit(formData) {
    if (!verifyModalSession) return;
    setVerifySaving(true);
    setError("");
    try {
      await wiseApi.post(`/wise/sessions/${verifyModalSession.sessionId}/verify`, {
        ...formData,
        batchId: verifyModalSession.batchId,
      });
      setVerifyModalSession(null);
      await fetchSessionControl({ silent: true });
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to save verification");
    } finally {
      setVerifySaving(false);
    }
  }


  function getActionButtonStyle(nextAction, isDisabled) {
    if (isDisabled)
      return "bg-slate-100 text-slate-400 cursor-not-allowed";
    if (nextAction === "start")
      return "bg-emerald-600 text-white hover:bg-emerald-700";
    if (nextAction === "end")
      return "bg-rose-600 text-white hover:bg-rose-700";
    if (nextAction === "restart")
      return "bg-amber-500 text-white hover:bg-amber-600";
    return "bg-slate-200 text-slate-500 cursor-not-allowed";
  }

  function getActionButtonIcon(nextAction) {
    if (nextAction === "start") return <Play className="w-3.5 h-3.5" />;
    if (nextAction === "end") return <Square className="w-3.5 h-3.5" />;
    if (nextAction === "restart") return <RotateCcw className="w-3.5 h-3.5" />;
    return null;
  }

  function getActionButtonLabel(nextAction, rowActionState) {
    if (rowActionState) {
      return `${rowActionState[0].toUpperCase()}${rowActionState.slice(1)}ing...`;
    }
    if (nextAction === "restart") return "Restart";
    if (nextAction === "end") return "End";
    if (nextAction === "start") return "Start";
    return "Action";
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#083262]">
                Session Control
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Wise Classes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Auto-start control and manual admin verification
            </p>
          </div>
          <button
            onClick={() => fetchSessionControl()}
            className="inline-flex items-center gap-2 rounded-full bg-[#083262] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#052243] disabled:opacity-60 shrink-0"
            disabled={loading}
          >
            <RefreshCw
              className="w-4 h-4"
              style={loading ? { animation: "spin 1s linear infinite" } : {}}
            />
            Refresh
          </button>
        </div>

        {/* Filter Row */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Session Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm bg-white"
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 px-5 py-3.5 text-sm font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2
              className="w-5 h-5 text-[#083262]"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span className="ml-3 text-sm text-slate-500">Loading sessions...</span>
          </div>
        )}

        {/* Table - Desktop only */}
        {!loading && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Session
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Batch
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Host
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Scheduled
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Attendance
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Verification
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessions.map((s, idx) => {
                      const isActionLoading = Boolean(rowActionState[s.sessionId]);
                      const nextAction = s.actions?.nextAction;
                      const actionDisabled =
                        !nextAction ||
                        isActionLoading ||
                        (nextAction === "start" &&
                          (!hostSelections[s.sessionId] ||
                            s.hostConflictSessionId ||
                            !isStartWindowOpen(s.scheduledStartAt)));
                      return (
                        <tr
                          key={s.sessionId || idx}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {/* Session */}
                          <td className="px-5 py-4">
                            <div>
                              <span className="font-bold text-slate-900">
                                {s.sessionTitle}
                              </span>
                              <div className="mt-0.5 text-xs text-slate-400 font-mono">
                                {s.sessionId}
                              </div>
                            </div>
                          </td>

                          {/* Batch */}
                          <td className="px-5 py-4 text-center">
                            <span className="text-sm text-slate-600 font-medium">
                              {s.batchName}
                            </span>
                          </td>

                          {/* Host */}
                          <td className="px-4 py-4 text-center min-w-[190px]">
                            <select
                              value={hostSelections[s.sessionId] || ""}
                              onChange={(event) =>
                                setHostSelections((previous) => ({
                                  ...previous,
                                  [s.sessionId]: event.target.value,
                                }))
                              }
                              disabled={s.status === "live" || s.status === "completed" || isActionLoading}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#083262] disabled:bg-slate-50 disabled:text-slate-500"
                            >
                              {(s.hostCandidates || []).length === 0 && (
                                <option value="">No assigned host found</option>
                              )}
                              {(s.hostCandidates || []).map((host) => (
                                <option key={host.key} value={host.key}>
                                  {host.name}{host.role === "primary_host" ? " (Primary)" : ""}
                                </option>
                              ))}
                            </select>
                            {s.hostConflictSessionId && (
                              <div className="mt-1 text-[10px] font-semibold text-rose-600">
                                Host is already live
                              </div>
                            )}
                          </td>

                          {/* Scheduled */}
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatDateTime(s.scheduledStartAt)}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(s.status)}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(s.status)}`} />
                              {s.status}
                            </span>
                          </td>

                          {/* Attendance */}
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => setAttendanceModalSession(s)}
                              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#083262] transition cursor-pointer hover:underline decoration-dashed decoration-2 underline-offset-4 focus:outline-none"
                              title="Click to view student list"
                            >
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold">
                                {s.attendance?.joinedStudents ?? 0}
                              </span>
                              <span className="text-slate-400">/</span>
                              <span>
                                {s.attendance?.totalStudents ?? 0}
                              </span>
                            </button>
                          </td>

                          {/* Verification */}
                          <td className="px-5 py-4 text-center">
                            {s.verification ? (
                              <div className="inline-flex flex-col gap-0.5 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  {s.verification.classStartedSeen ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-rose-400" />
                                  )}
                                  <span>Started</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  {s.verification.studentsJoinedSeen ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-rose-400" />
                                  )}
                                  <span>Students</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Not verified
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                            {/* Join Button */}
                            {s.actions?.canJoin && s.joinUrl ? (
                              <>
                                <a
                                  href={s.joinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Join
                                </a>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    copyJoinLink(s.sessionId, s.joinUrl);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                  title="Copy meeting link"
                                >
                                  {copiedSessionId === s.sessionId ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  {copiedSessionId === s.sessionId ? "Copied" : "Copy"}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}

                              {/* Primary Action Button */}
                              <button
                                onClick={() => runPrimaryAction(s)}
                                disabled={actionDisabled}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${getActionButtonStyle(nextAction, actionDisabled)}`}
                              >
                                {getActionButtonIcon(nextAction)}
                                {getActionButtonLabel(nextAction, rowActionState[s.sessionId])}
                              </button>

                              {/* Verify Button */}
                              <button
                                onClick={() => setVerifyModalSession(s)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {s.verificationExists ? "Details" : "Verify"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-14">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Calendar className="w-10 h-10 text-slate-300" />
                            <p className="text-sm font-medium">
                              No sessions found for selected date.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {sessions.map((s) => {
                const isActionLoading = Boolean(rowActionState[s.sessionId]);
                const nextAction = s.actions?.nextAction;
                const actionDisabled =
                  !nextAction ||
                  isActionLoading ||
                  (nextAction === "start" &&
                    (!hostSelections[s.sessionId] ||
                      s.hostConflictSessionId ||
                      !isStartWindowOpen(s.scheduledStartAt)));
                return (
                  <div
                    key={s.sessionId}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 text-sm truncate block">
                          {s.sessionTitle}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {s.sessionId}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ml-3 shrink-0 ${getStatusBadge(s.status)}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(s.status)}`} />
                        {s.status}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Batch</div>
                        <div className="text-sm font-medium text-slate-700">{s.batchName}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Scheduled</div>
                        <div className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatDateTime(s.scheduledStartAt)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Host</div>
                        <select
                          value={hostSelections[s.sessionId] || ""}
                          onChange={(event) =>
                            setHostSelections((previous) => ({
                              ...previous,
                              [s.sessionId]: event.target.value,
                            }))
                          }
                          disabled={s.status === "live" || s.status === "completed" || isActionLoading}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#083262] disabled:bg-slate-50"
                        >
                          {(s.hostCandidates || []).length === 0 && (
                            <option value="">No assigned host found</option>
                          )}
                          {(s.hostCandidates || []).map((host) => (
                            <option key={host.key} value={host.key}>
                              {host.name}{host.role === "primary_host" ? " (Primary)" : ""}
                            </option>
                          ))}
                        </select>
                        {s.hostConflictSessionId && (
                          <div className="mt-1 text-[10px] font-semibold text-rose-600">
                            Host is already running another class
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Attendance</div>
                        <button
                          onClick={() => setAttendanceModalSession(s)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-[#083262] transition cursor-pointer hover:underline decoration-dashed decoration-2 underline-offset-4 focus:outline-none"
                          title="Click to view student list"
                        >
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold">{s.attendance?.joinedStudents ?? 0}</span>
                          <span className="text-slate-400">/</span>
                          <span>{s.attendance?.totalStudents ?? 0}</span>
                        </button>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Verification</div>
                        {s.verification ? (
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              {s.verification.classStartedSeen ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                              )}
                              Started
                            </div>
                            <div className="flex items-center gap-1">
                              {s.verification.studentsJoinedSeen ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                              )}
                              Students
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not verified</span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2">
                      {s.actions?.canJoin && s.joinUrl && (
                        <>
                          <a
                            href={s.joinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Join
                          </a>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              copyJoinLink(s.sessionId, s.joinUrl);
                            }}
                            className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            title="Copy meeting link"
                          >
                            {copiedSessionId === s.sessionId ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedSessionId === s.sessionId ? "Copied" : "Copy"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => runPrimaryAction(s)}
                        disabled={actionDisabled}
                        className={`flex-1 min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${getActionButtonStyle(nextAction, actionDisabled)}`}
                      >
                        {getActionButtonIcon(nextAction)}
                        {getActionButtonLabel(nextAction, rowActionState[s.sessionId])}
                      </button>
                      <button
                        onClick={() => setVerifyModalSession(s)}
                        className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {s.verificationExists ? "Details" : "Verify"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {sessions.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm py-14">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Calendar className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-medium">
                      No sessions found for selected date.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Verification Modal */}
        <VerificationModal
          session={verifyModalSession}
          saving={verifySaving}
          onClose={() => setVerifyModalSession(null)}
          onSubmit={handleVerifySubmit}
        />

        {/* Attendance Details Modal */}
        <AttendanceDetailsModal
          session={attendanceModalSession}
          onClose={() => setAttendanceModalSession(null)}
        />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
