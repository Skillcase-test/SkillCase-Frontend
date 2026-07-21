import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FileText,
  Phone,
  ChevronDown,
} from "lucide-react";
import api from "../../api/axios";
import {
  StatCard,
  TableSkeleton,
  EmptyState,
} from "../../dashboard-src/payments-admin/components/common";

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

function getRowStatusBorder(status) {
  const s = (status || "").toLowerCase();
  if (s === "live") return "border-l-emerald-500";
  if (s === "completed") return "border-l-blue-500";
  if (s === "scheduled" || s === "pending") return "border-l-amber-400";
  return "border-l-slate-200";
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
    patch: async (path, body = {}) => {
      const res = await api.patch(path, body);
      return res.data;
    },
  };
}

function HostPicker({ candidates = [], value, disabled, onChange }) {
  const selected = candidates.find((host) => host.key === value);
  const label = selected
    ? `${selected.name}${selected.role === "primary_host" ? " (Primary)" : ""}`
    : "Select a host";

  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open || disabled) return;
    function handleOutside(event) {
      if (triggerRef.current && !triggerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, disabled]);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, { passive: true });
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <div ref={triggerRef} className="relative w-full text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
            : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-[#083262]"
        }`}
      >
        <span className="truncate">
          {candidates.length ? label : "No assigned host found"}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && candidates.length > 0 && (
        <div
          className="fixed z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          style={{
            top: `${menuRect.top}px`,
            left: `${menuRect.left}px`,
            width: `${menuRect.width}px`,
          }}
        >
          {candidates.map((host) => (
            <button
              key={host.key}
              type="button"
              onClick={() => {
                onChange(host.key);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                host.key === value
                  ? "bg-blue-50 text-[#083262]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate">{host.name}</span>
              <span className="ml-2 shrink-0 text-[10px] text-slate-400">
                {host.role === "primary_host" ? "Primary" : "Co-host"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
                setForm((prev) => ({
                  ...prev,
                  class_started_seen: e.target.checked,
                }))
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
                setForm((prev) => ({
                  ...prev,
                  students_joined_seen: e.target.checked,
                }))
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
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
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
              Batch:{" "}
              <span className="font-semibold text-slate-700">
                {session.batchName}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition focus:outline-none"
          >
            <span className="text-2xl font-bold leading-none">&times;</span>
          </button>
        </div>

        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Attendance summary
            </span>
            <span className="text-lg font-bold text-slate-800">
              {attendance.joinedStudents ?? 0} joined /{" "}
              {attendance.totalStudents ?? 0} total
            </span>
          </div>
          <div className="w-full sm:w-48 bg-slate-200 rounded-full h-2.5 overflow-hidden shrink-0">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${
                  attendance.totalStudents
                    ? (attendance.joinedStudents / attendance.totalStudents) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 my-2">
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
                          {new Date(student.joinedAt).toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
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
  const [notesJobRunning, setNotesJobRunning] = useState(false);
  const [notesJobSummary, setNotesJobSummary] = useState(null);

  const copyJoinLink = async (sessionId, joinUrl) => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId(null), 2000);
    } catch {
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
        const res = await wiseApi.get("/wise/sessions/control", {
          date: sessionDate,
        });
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
    const hostKey =
      hostSelections[session.sessionId] || session.selectedHostKey || "";
    if ((nextAction === "start" || nextAction === "restart") && !hostKey) {
      setError("Select an assigned host before starting this class");
      return;
    }
    if (
      nextAction === "start" &&
      !isStartWindowOpen(session.scheduledStartAt)
    ) {
      setError(
        "This class can be started only within 5 minutes of its scheduled time",
      );
      return;
    }

    const optimisticStatusByAction = {
      start: "live",
      end: "completed",
      restart: "live",
    };
    const optimisticNextByAction = {
      start: "end",
      end: "restart",
      restart: "end",
    };

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
                nextAction:
                  optimisticNextByAction[nextAction] || r.actions?.nextAction,
                canJoin: optimisticStatusByAction[nextAction] === "live",
              },
            }
          : r,
      ),
    );

    try {
      const response = await wiseApi.post(
        `/wise/sessions/${session.sessionId}/${verb}`,
        {
          batchId: session.batchId,
          meetingJoinUrl: session.joinUrl || "",
          ...(nextAction === "start" || nextAction === "restart"
            ? { hostKey }
            : {}),
        },
      );
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

  async function handleHostChange(session, hostKey) {
    const previousHostKey = hostSelections[session.sessionId] || "";
    if (!hostKey || hostKey === previousHostKey) return;
    setHostSelections((previous) => ({
      ...previous,
      [session.sessionId]: hostKey,
    }));
    setError("");
    try {
      await wiseApi.patch(`/wise/batches/${session.batchId}/host`, { hostKey });
      await fetchSessionControl({ silent: true });
    } catch (e) {
      setHostSelections((previous) => ({
        ...previous,
        [session.sessionId]: previousHostKey,
      }));
      setError(
        e.response?.data?.error ||
          e.message ||
          "Failed to save host assignment",
      );
    }
  }

  async function handleVerifySubmit(formData) {
    if (!verifyModalSession) return;
    setVerifySaving(true);
    setError("");
    try {
      await wiseApi.post(
        `/wise/sessions/${verifyModalSession.sessionId}/verify`,
        {
          ...formData,
          batchId: verifyModalSession.batchId,
        },
      );
      setVerifyModalSession(null);
      await fetchSessionControl({ silent: true });
    } catch (e) {
      setError(
        e.response?.data?.error || e.message || "Failed to save verification",
      );
    } finally {
      setVerifySaving(false);
    }
  }

  async function handleRunWiseNotesJob() {
    setNotesJobRunning(true);
    setError("");
    try {
      const summary = await wiseApi.post("/wise/daily-notes/run");
      setNotesJobSummary(summary);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          e.response?.data?.error ||
          e.message ||
          "Failed to run Wise daily notes job",
      );
    } finally {
      setNotesJobRunning(false);
    }
  }

  function getActionButtonStyle(nextAction, isDisabled) {
    if (isDisabled)
      return "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed";
    if (nextAction === "start")
      return "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 shadow-sm";
    if (nextAction === "end")
      return "border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 hover:border-rose-700 shadow-sm";
    if (nextAction === "restart")
      return "border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 hover:border-amber-600 shadow-sm";
    return "border border-slate-200 bg-slate-200 text-slate-500 cursor-not-allowed";
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
        {/* Header & Filter Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#083262]">
                  Session Control
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Wise Classes</h1>
              <p className="mt-1 text-sm text-slate-500">
                Auto-start control and manual admin verification
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Session Date
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm bg-white h-9"
                />
              </div>

              <button
                onClick={() => fetchSessionControl()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#083262] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#052243] disabled:opacity-60 shrink-0 h-9 mt-4"
                disabled={loading}
              >
                <RefreshCw
                  className="w-4 h-4"
                  style={
                    loading ? { animation: "spin 1s linear infinite" } : {}
                  }
                />
                Refresh
              </button>

              <button
                onClick={handleRunWiseNotesJob}
                className="inline-flex items-center gap-2 rounded-xl border border-[#083262] bg-white px-4 py-2 text-sm font-bold text-[#083262] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 shrink-0 h-9 mt-4 cursor-pointer"
                disabled={notesJobRunning}
              >
                <FileText
                  className="w-4 h-4"
                  style={
                    notesJobRunning
                      ? { animation: "spin 1s linear infinite" }
                      : {}
                  }
                />
                {notesJobRunning ? "Running Notes..." : "Run Notes Job"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard
              label="Total Sessions"
              value={sessions.length}
              tone="slate"
              infoText="Total number of sessions loaded for this date."
            />
            <StatCard
              label="Live Now"
              value={sessions.filter((s) => s.status === "live").length}
              tone="emerald"
              infoText="Sessions currently running live."
            />
            <StatCard
              label="Completed"
              value={sessions.filter((s) => s.status === "completed").length}
              tone="blue"
              infoText="Sessions successfully finished today."
            />
            <StatCard
              label="Upcoming"
              value={
                sessions.filter(
                  (s) => s.status === "scheduled" || s.status === "pending",
                ).length
              }
              tone="amber"
              infoText="Sessions scheduled to start later today."
            />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 px-5 py-3.5 text-sm font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        {notesJobSummary && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#083262]">
                  Wise Daily Notes Summary
                </p>
                <h2 className="mt-1 text-base font-bold text-slate-900">
                  Previous-day run completed
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Date (IST): {notesJobSummary.date || "-"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Yesterday sessions", notesJobSummary.sessionsFound ?? 0],
                ["Missing-note candidates", notesJobSummary.discovered ?? 0],
                ["Skipped", notesJobSummary.skipped ?? 0],
                ["Uploaded", notesJobSummary.uploaded?.length ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs font-bold text-emerald-700">
                  Notes uploaded
                </p>
                {notesJobSummary.uploaded?.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {notesJobSummary.uploaded.map((item, index) => (
                      <li
                        key={`${item.sectionName}-${item.recordingName}-${index}`}
                      >
                        • {item.sectionName} — {item.recordingName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">None</p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700">
                  Skipped details
                </p>
                {notesJobSummary.skippedItems?.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {notesJobSummary.skippedItems.map((item, index) => (
                      <li
                        key={`${item.sectionName}-${item.recordingName}-${index}`}
                      >
                        • {item.sectionName} — {item.recordingName} —{" "}
                        {item.reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">None</p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-rose-700">Failed</p>
                {notesJobSummary.failed?.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-rose-700">
                    {notesJobSummary.failed.map((item, index) => (
                      <li
                        key={`${item.sectionName}-${item.recordingName}-${index}`}
                      >
                        • {item.sectionName} — {item.recordingName} —{" "}
                        {item.reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">None</p>
                )}
              </div>
            </div>

            {notesJobSummary.sessionAudit?.length > 0 && (
              <details className="mt-4 border-t border-slate-100 pt-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-600">
                  Session audit ({notesJobSummary.sessionAudit.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {notesJobSummary.sessionAudit.map((item, index) => (
                    <li key={`${item.classId}-${item.sessionId}-${index}`}>
                      • {item.recordingName || item.sessionName || "Session"} —{" "}
                      {item.status}
                      {item.reason ? ` — ${item.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-4">
            <TableSkeleton rows={5} />
          </div>
        )}

        {/* Table - Desktop only */}
        {!loading && (
          <>
            <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">
                        Batch
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">
                        Host
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">
                        Scheduled
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                        Attendance
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">
                        Verification
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessions.map((s, idx) => {
                      const isActionLoading = Boolean(
                        rowActionState[s.sessionId],
                      );
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
                          <td
                            className={`px-5 py-4 text-left border-l-4 ${getRowStatusBorder(s.status)}`}
                          >
                            <span className="text-sm font-semibold text-slate-800">
                              {s.batchName}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-left min-w-[210px]">
                            <HostPicker
                              candidates={s.hostCandidates || []}
                              value={hostSelections[s.sessionId] || ""}
                              onChange={(hostKey) =>
                                handleHostChange(s, hostKey)
                              }
                              disabled={
                                s.status === "live" ||
                                s.status === "completed" ||
                                isActionLoading
                              }
                            />
                            {s.hostConflictSessionId && (
                              <div className="mt-1 text-[10px] font-semibold text-rose-600 text-left pl-1">
                                Host is already live
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-left">
                            <div className="inline-flex items-center gap-1.5 text-sm text-slate-700 whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatDateTime(s.scheduledStartAt)}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(s.status)}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${getStatusDot(s.status)}`}
                              />
                              {s.status}
                            </span>
                          </td>

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
                              <span>{s.attendance?.totalStudents ?? 0}</span>
                            </button>
                          </td>

                          <td className="px-5 py-4 text-left">
                            {s.verification ? (
                              <div className="flex flex-col gap-0.5 text-xs">
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

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {s.hostStartUrl && (
                                <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden shadow-sm">
                                  <a
                                    href={s.hostStartUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-slate-50 whitespace-nowrap animate-pulse-subtle"
                                    title="Join meeting as host"
                                  >
                                    <ExternalLink className="w-3 h-3 text-emerald-600" />{" "}
                                    Join as host
                                  </a>
                                  <div className="w-px bg-slate-300 self-stretch" />
                                  <button
                                    onClick={() =>
                                      copyJoinLink(
                                        `host-${s.sessionId}`,
                                        s.hostStartUrl,
                                      )
                                    }
                                    className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition hover:bg-slate-50"
                                    title="Copy host start link"
                                  >
                                    {copiedSessionId ===
                                    `host-${s.sessionId}` ? (
                                      <Check className="w-3 h-3 text-emerald-600 animate-scale-in" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              {s.actions?.canJoin && s.joinUrl ? (
                                <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden shadow-sm">
                                  <a
                                    href={s.joinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-slate-50 whitespace-nowrap"
                                    title="Wise attendee link; it does not impersonate the selected host"
                                  >
                                    <ExternalLink className="w-3 h-3 text-blue-600" />{" "}
                                    Join participant
                                  </a>
                                  <div className="w-px bg-slate-300 self-stretch" />
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      copyJoinLink(s.sessionId, s.joinUrl);
                                    }}
                                    className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 transition hover:bg-slate-50"
                                    title="Copy meeting link"
                                  >
                                    {copiedSessionId === s.sessionId ? (
                                      <Check className="w-3 h-3 text-blue-600 animate-scale-in" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                !s.hostStartUrl && (
                                  <span className="text-xs text-slate-300">
                                    —
                                  </span>
                                )
                              )}

                              {nextAction && (
                                <button
                                  onClick={() => runPrimaryAction(s)}
                                  disabled={actionDisabled}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${getActionButtonStyle(nextAction, actionDisabled)}`}
                                >
                                  {getActionButtonIcon(nextAction)}
                                  {getActionButtonLabel(
                                    nextAction,
                                    rowActionState[s.sessionId],
                                  )}
                                </button>
                              )}

                              <button
                                onClick={() => setVerifyModalSession(s)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap shadow-sm"
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
                        <td colSpan={7} className="px-5 py-10">
                          <EmptyState message="No sessions found for the selected date." />
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
                    className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden border-l-4 ${getRowStatusBorder(s.status)}`}
                  >
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
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${getStatusDot(s.status)}`}
                        />
                        {s.status}
                      </span>
                    </div>

                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Batch
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                          {s.batchName}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Scheduled
                        </div>
                        <div className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatDateTime(s.scheduledStartAt)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Host
                        </div>
                        <HostPicker
                          candidates={s.hostCandidates || []}
                          value={hostSelections[s.sessionId] || ""}
                          onChange={(hostKey) => handleHostChange(s, hostKey)}
                          disabled={
                            s.status === "live" ||
                            s.status === "completed" ||
                            isActionLoading
                          }
                        />
                        {s.hostConflictSessionId && (
                          <div className="mt-1 text-[10px] font-semibold text-rose-600">
                            Host is already running another class
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Attendance
                        </div>
                        <button
                          onClick={() => setAttendanceModalSession(s)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-[#083262] transition cursor-pointer hover:underline decoration-dashed decoration-2 underline-offset-4 focus:outline-none"
                          title="Click to view student list"
                        >
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold">
                            {s.attendance?.joinedStudents ?? 0}
                          </span>
                          <span className="text-slate-400">/</span>
                          <span>{s.attendance?.totalStudents ?? 0}</span>
                        </button>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Verification
                        </div>
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
                          <span className="text-xs text-slate-400 italic">
                            Not verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2">
                      {s.hostStartUrl && (
                        <div className="flex-1 min-w-[140px] inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden shadow-sm">
                          <a
                            href={s.hostStartUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-grow inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-slate-50"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-600" />{" "}
                            Join as host
                          </a>
                          <div className="w-px bg-slate-300 self-stretch" />
                          <button
                            onClick={() =>
                              copyJoinLink(
                                `host-${s.sessionId}`,
                                s.hostStartUrl,
                              )
                            }
                            className="inline-flex items-center justify-center px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition hover:bg-slate-50"
                            title="Copy host start link"
                          >
                            {copiedSessionId === `host-${s.sessionId}` ? (
                              <Check className="w-3 h-3 text-emerald-600 animate-scale-in" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                      {s.actions?.canJoin && s.joinUrl && (
                        <div className="flex-1 min-w-[140px] inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden shadow-sm">
                          <a
                            href={s.joinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-grow inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-slate-50"
                            title="Wise attendee link; it does not impersonate the selected host"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-600" />{" "}
                            Join participant
                          </a>
                          <div className="w-px bg-slate-300 self-stretch" />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              copyJoinLink(s.sessionId, s.joinUrl);
                            }}
                            className="inline-flex items-center justify-center px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-blue-700 transition hover:bg-slate-50"
                            title="Copy meeting link"
                          >
                            {copiedSessionId === s.sessionId ? (
                              <Check className="w-3 h-3 text-blue-600 animate-scale-in" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                      {nextAction && (
                        <button
                          onClick={() => runPrimaryAction(s)}
                          disabled={actionDisabled}
                          className={`flex-1 min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${getActionButtonStyle(nextAction, actionDisabled)}`}
                        >
                          {getActionButtonIcon(nextAction)}
                          {getActionButtonLabel(
                            nextAction,
                            rowActionState[s.sessionId],
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setVerifyModalSession(s)}
                        className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 shadow-sm"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {s.verificationExists ? "Details" : "Verify"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {sessions.length === 0 && (
                <div className="py-4">
                  <EmptyState message="No sessions found for the selected date." />
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
        @keyframes scale-in {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.82; }
        }
        .animate-scale-in {
          animation: scale-in 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
