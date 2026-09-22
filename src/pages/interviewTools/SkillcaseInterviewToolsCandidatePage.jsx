import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Eye, RefreshCw, Download, Search, UserCheck, X } from "lucide-react";
import { skillcaseInterviewToolsApi } from "../../api/skillcaseInterviewToolsApi";
import { formatCurrentQuestion, formatDateTimeIST } from "../../utils/dateTime";
import { useCandidateSort } from "./shared/candidateSorting";
import CandidateSortableTh from "./shared/CandidateSortableTh";
import IconActionButton from "./shared/IconActionButton";

const STATUS_STYLE = {
  completed: "bg-emerald-100 text-emerald-700",
  started: "bg-amber-100 text-amber-700",
  abandoned: "bg-slate-100 text-slate-700",
  shortlisted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  in_review: "bg-blue-100 text-blue-700",
};

function PositionEventLog({ positionId }) {
  const [publishEvents, setPublishEvents] = useState([]);
  const [inviteEvents, setInviteEvents] = useState([]);
  const [loadingPublish, setLoadingPublish] = useState(true);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [publishError, setPublishError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [publishExpanded, setPublishExpanded] = useState(true);
  const [inviteExpanded, setInviteExpanded] = useState(true);

  useEffect(() => {
    if (!positionId) return;
    setLoadingPublish(true);
    setLoadingInvite(true);
    skillcaseInterviewToolsApi
      .getPositionEventLog(positionId)
      .then((res) => setPublishEvents(res.data.data || []))
      .catch(() => setPublishError("Could not load publish/open event log"))
      .finally(() => setLoadingPublish(false));
    skillcaseInterviewToolsApi
      .getInviteEventLog(positionId)
      .then((res) => setInviteEvents(res.data.data || []))
      .catch(() => setInviteError("Could not load invite event log"))
      .finally(() => setLoadingInvite(false));
  }, [positionId]);

  return (
    <div className="space-y-4 ">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setPublishExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">Position Event Log</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              All times this interview was opened (published_open)
            </p>
          </div>
          {publishExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {publishExpanded && (
          <div className="border-t border-slate-100">
            {loadingPublish ? (
              <div className="px-6 py-5 text-sm text-slate-400">Loading...</div>
            ) : publishError ? (
              <div className="px-6 py-5 text-sm text-rose-600">{publishError}</div>
            ) : publishEvents.length === 0 ? (
              <div className="px-6 py-5 text-sm text-slate-400">
                No publish/open events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Published By</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Published At (IST)</th>
                      <th className="px-6 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                    {publishEvents.map((event) => (
                      <tr key={event.event_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {event.actor_name || "-"}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {event.actor_user_id || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {event.actor_role || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                          {formatDateTimeIST(event.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {event.source || event.event_payload?.source || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setInviteExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <p className="text-sm font-bold text-slate-800">Invite Event Log</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Invite lifecycle events (sent, viewed, started)
          </p>
        </div>
        {inviteExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {inviteExpanded && (
        <div className="border-t border-slate-100">
          {loadingInvite ? (
            <div className="px-6 py-5 text-sm text-slate-400">Loading...</div>
          ) : inviteError ? (
            <div className="px-6 py-5 text-sm text-rose-600">{inviteError}</div>
          ) : inviteEvents.length === 0 ? (
            <div className="px-6 py-5 text-sm text-slate-400">
              No invite events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Event</th>
                    <th className="px-6 py-3">Candidate</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">At (IST)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                  {inviteEvents.map((event) => (
                    <tr key={event.event_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{event.event_type || "-"}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Invite #{event.invite_id || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div>{event.event_payload?.candidate_name || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div>{event.actor_name || event.actor_user_id || "public_candidate"}</div>
                        <div>{event.actor_role || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTimeIST(event.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// Super-admin modal for sending a candidate's submission to an admin reviewer.
// Re-selecting while an assignment is active re-assigns (backend cancels the
// old one); the secondary action removes the active assignment entirely.
export function SendForReviewModal({ positionId, candidate, onClose, onDone }) {
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    skillcaseInterviewToolsApi
      .listAssignableAdmins()
      .then((res) => {
        if (!cancelled) setAdmins(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load admins");
      })
      .finally(() => {
        if (!cancelled) setLoadingAdmins(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setSubmitting(true);
    setError("");
    try {
      await skillcaseInterviewToolsApi.assignForReview(
        positionId,
        candidate.submission_id,
        { reviewer_user_id: selectedUserId, note },
      );
      onDone?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Could not send candidate for review",
      );
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    setSubmitting(true);
    setError("");
    try {
      await skillcaseInterviewToolsApi.unassignReview(
        positionId,
        candidate.submission_id,
      );
      onDone?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Could not remove review assignment",
      );
      setSubmitting(false);
    }
  };

  const reviewerLabel = (admin) =>
    admin.fullname || admin.username || admin.email || admin.user_id;

  const reviewerInitials = (admin) =>
    reviewerLabel(admin)
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((admin) =>
      [admin.fullname, admin.username, admin.email].some((value) =>
        value?.toLowerCase().includes(q),
      ),
    );
  }, [admins, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            Send for review — {candidate.candidate_name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          {candidate.reviewing_now_name ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <span className="font-semibold">{candidate.reviewing_now_name}</span>{" "}
              is currently reviewing this submission — assignment changes are
              paused until they leave.
            </div>
          ) : null}

          {candidate.active_assignment_id ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Assigned to{" "}
              <span className="font-semibold">
                {candidate.assigned_reviewer_name}
              </span>{" "}
              — hidden from the position owner while delegated. Picking another
              admin re-assigns it; removing returns it to the owner.
            </div>
          ) : null}

          {loadingAdmins ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Loading reviewers…
            </p>
          ) : admins.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No admins with the reviewer permission available to assign.
            </p>
          ) : (
            <>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search reviewers by name or email…"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#083262] focus:bg-white focus:ring-2 focus:ring-[#083262]/10"
                />
              </div>

              <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                {filteredAdmins.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">
                    No reviewers match “{query.trim()}”.
                  </p>
                ) : (
                  filteredAdmins.map((admin) => {
                    const selected = selectedUserId === admin.user_id;
                    return (
                      <button
                        key={admin.user_id}
                        type="button"
                        onClick={() =>
                          setSelectedUserId(selected ? "" : admin.user_id)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                          selected
                            ? "border-[#083262] bg-blue-50/60 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            selected
                              ? "bg-[#083262] text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {reviewerInitials(admin)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {reviewerLabel(admin)}
                          </span>
                          {admin.email ? (
                            <span className="block truncate text-xs text-gray-500">
                              {admin.email}
                            </span>
                          ) : null}
                        </span>
                        {selected ? (
                          <Check className="h-4 w-4 shrink-0 text-[#083262]" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              {query.trim() ? (
                <p className="mt-1.5 text-right text-[10px] font-semibold text-gray-400">
                  {filteredAdmins.length} of {admins.length}
                </p>
              ) : null}
            </>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for the reviewer (optional)"
            rows={2}
            className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#083262]"
          />

          {error ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-6 py-4">
          {candidate.active_assignment_id ? (
            <button
              type="button"
              onClick={handleUnassign}
              disabled={submitting || Boolean(candidate.reviewing_now_name)}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              Return to owner
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={
                !selectedUserId ||
                submitting ||
                loadingAdmins ||
                Boolean(candidate.reviewing_now_name)
              }
              className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send for review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SkillcaseInterviewToolsCandidatesPage({
  selectedInterviewPositionId,
  setSelectedInterviewSubmissionId,
  setActivePage,
  isSuperAdmin = false,
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [reviewAssignTarget, setReviewAssignTarget] = useState(null);
  const { sort, sortedRows, toggleSort } = useCandidateSort(candidates);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await skillcaseInterviewToolsApi.getCandidates(
        selectedInterviewPositionId,
      );
      setCandidates(res.data.data || []);
    } catch (error) {
      console.error(error);
      setStatus("Could not fetch learner submissions");
    } finally {
      setLoading(false);
    }
  }, [selectedInterviewPositionId]);

  useEffect(() => {
    if (!selectedInterviewPositionId) return;
    loadCandidates();
  }, [selectedInterviewPositionId, loadCandidates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActivePage("interview-tools-positions")}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Interviews
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCandidates}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await skillcaseInterviewToolsApi.downloadInterviewPDF(selectedInterviewPositionId);
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement("a");
                  link.href = url;
                  link.setAttribute("download", `InterviewReport-${selectedInterviewPositionId}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (error) {
                  console.error("PDF download failed:", error);
                  alert("Could not download PDF report");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#083262] bg-white px-4 py-3 text-sm font-medium text-[#083262] transition hover:bg-blue-50"
            >
              <Download className="h-4 w-4" />
              Download Full Report
            </button>
          )}
        </div>
      </div>

      {status ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {status}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <CandidateSortableTh column="candidate_name" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                  Learner
                </CandidateSortableTh>
                <CandidateSortableTh column="status" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                  Submission
                </CandidateSortableTh>
                {isSuperAdmin ? (
                  <CandidateSortableTh column="current_question" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                    Current Q.
                  </CandidateSortableTh>
                ) : null}
                {isSuperAdmin ? (
                  <CandidateSortableTh column="started_at" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                    Started (IST)
                  </CandidateSortableTh>
                ) : null}
                {isSuperAdmin ? (
                  <CandidateSortableTh column="completed_at" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                    Completed (IST)
                  </CandidateSortableTh>
                ) : null}
                <CandidateSortableTh column="review_status" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                  Review Status
                </CandidateSortableTh>
                <CandidateSortableTh column="reviewed" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                  Reviewed
                </CandidateSortableTh>
                <CandidateSortableTh column="evaluated_at" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                  Evaluated At
                </CandidateSortableTh>
                <CandidateSortableTh column="score" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                  Score
                </CandidateSortableTh>
                {isSuperAdmin && (
                  <CandidateSortableTh column="ai_score" sort={sort} onToggle={toggleSort} className="px-4 py-3">
                    AI Score
                  </CandidateSortableTh>
                )}
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {sortedRows.map((item) => (
                <tr key={item.submission_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div
                      className="max-w-[200px] truncate font-semibold text-gray-900"
                      title={item.candidate_name}
                    >
                      {item.candidate_name}
                    </div>
                    {item.active_assignment_id ? (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        <UserCheck className="h-3 w-3" />
                        {item.assigned_reviewer_name || "Assigned"}
                      </div>
                    ) : null}
                    {item.reviewing_now_name ? (
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        {item.reviewing_now_name} is reviewing
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLE[item.status] || STATUS_STYLE.completed
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  {isSuperAdmin ? (
                    <td className="px-4 py-4 text-xs text-gray-600 font-semibold whitespace-nowrap">
                      {formatCurrentQuestion(
                        item.current_question_index,
                        item.total_questions,
                      )}
                    </td>
                  ) : null}
                  {isSuperAdmin ? (
                    <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTimeIST(item.started_at)}
                    </td>
                  ) : null}
                  {isSuperAdmin ? (
                    <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTimeIST(item.completed_at)}
                    </td>
                  ) : null}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLE[item.overall_review_status] ||
                        STATUS_STYLE.completed
                      }`}
                    >
                      {item.overall_review_status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      title={
                        item.is_fully_reviewed
                          ? item.reviewed_by_name
                            ? `Fully reviewed by ${item.reviewed_by_name}`
                            : "Fully reviewed"
                          : "Not fully reviewed"
                      }
                      className="inline-flex"
                    >
                      {item.is_fully_reviewed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300" />
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">
                    {item.evaluated_at ? formatDateTimeIST(item.evaluated_at) : "-"}
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">
                    {item.overall_score || item.calculated_score || "-"}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-4 font-semibold text-[#083262]">
                      {item.ai_score ? Number(item.ai_score).toFixed(1) : "-"}
                    </td>
                  )}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isSuperAdmin && (
                        <IconActionButton
                          icon={UserCheck}
                          label={item.active_assignment_id ? "Reassign" : "Send"}
                          title={
                            item.reviewing_now_name
                              ? `${item.reviewing_now_name} is currently reviewing — try again shortly`
                              : item.active_assignment_id
                                ? "Reassign reviewer"
                                : "Send for review"
                          }
                          disabled={Boolean(item.reviewing_now_name)}
                          onClick={() => setReviewAssignTarget(item)}
                        />
                      )}
                      {isSuperAdmin && (
                        <IconActionButton
                          icon={Download}
                          label="PDF"
                          title="Download PDF report"
                          onClick={async () => {
                            try {
                              const res = await skillcaseInterviewToolsApi.downloadCandidatePDF(
                                selectedInterviewPositionId,
                                item.submission_id,
                              );
                              const url = window.URL.createObjectURL(new Blob([res.data]));
                              const link = document.createElement("a");
                              link.href = url;
                              link.setAttribute("download", `CandidateReport-${item.candidate_name}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                            } catch (error) {
                              console.error("PDF download failed:", error);
                              alert("Could not download PDF report");
                            }
                          }}
                        />
                      )}
                      <IconActionButton
                        icon={Eye}
                        label="Review"
                        tone="primary"
                        alwaysShowLabel
                        title="Review submission"
                        onClick={() => {
                          setSelectedInterviewSubmissionId(item.submission_id);
                          setActivePage("interview-tools-review", {
                            positionId: selectedInterviewPositionId,
                            submissionId: item.submission_id,
                          });
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isSuperAdmin ? (
        <PositionEventLog positionId={selectedInterviewPositionId} />
      ) : null}

      {isSuperAdmin && reviewAssignTarget ? (
        <SendForReviewModal
          positionId={selectedInterviewPositionId}
          candidate={reviewAssignTarget}
          onClose={() => setReviewAssignTarget(null)}
          onDone={loadCandidates}
        />
      ) : null}
    </div>
  );
}
