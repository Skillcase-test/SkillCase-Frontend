import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, RefreshCw, Download } from "lucide-react";
import { skillcaseInterviewToolsApi } from "../../api/skillcaseInterviewToolsApi";
import { formatCurrentQuestion, formatDateTimeIST } from "../../utils/dateTime";

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
    <div className="space-y-4 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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

export default function SkillcaseInterviewToolsCandidatesPage({
  selectedInterviewPositionId,
  setSelectedInterviewSubmissionId,
  setActivePage,
  isSuperAdmin = false,
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadCandidates = async () => {
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
  };

  useEffect(() => {
    if (!selectedInterviewPositionId) return;
    loadCandidates();
  }, [selectedInterviewPositionId]);

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

      {status ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {status}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
              <tr>
                <th className="px-6 py-4">Learner</th>
                <th className="px-6 py-4">Submission</th>
                {isSuperAdmin ? (
                  <th className="px-6 py-4">Current Question</th>
                ) : null}
                {isSuperAdmin ? (
                  <th className="px-6 py-4">Started (IST)</th>
                ) : null}
                {isSuperAdmin ? (
                  <th className="px-6 py-4">Completed (IST)</th>
                ) : null}
                <th className="px-6 py-4">Review Status</th>
                <th className="px-6 py-4">Reviewed</th>
                <th className="px-6 py-4">Score</th>
                {isSuperAdmin && <th className="px-6 py-4">AI Score</th>}
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {candidates.map((item) => (
                <tr key={item.submission_id} className="hover:bg-gray-50">
                  <td className="px-6 py-5">
                    <div className="font-semibold text-gray-900">
                      {item.candidate_name}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLE[item.status] || STATUS_STYLE.completed
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  {isSuperAdmin ? (
                    <td className="px-6 py-5 text-xs text-gray-600 font-semibold whitespace-nowrap">
                      {formatCurrentQuestion(
                        item.current_question_index,
                        item.total_questions,
                      )}
                    </td>
                  ) : null}
                  {isSuperAdmin ? (
                    <td className="px-6 py-5 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTimeIST(item.started_at)}
                    </td>
                  ) : null}
                  {isSuperAdmin ? (
                    <td className="px-6 py-5 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTimeIST(item.completed_at)}
                    </td>
                  ) : null}
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLE[item.overall_review_status] ||
                        STATUS_STYLE.completed
                      }`}
                    >
                      {item.overall_review_status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        item.is_fully_reviewed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.is_fully_reviewed ? "Reviewed" : "Not Reviewed"}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-semibold text-gray-900">
                    {item.overall_score || item.calculated_score || "-"}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-5 font-semibold text-[#083262]">
                      {item.ai_score ? Number(item.ai_score).toFixed(1) : "-"}
                    </td>
                  )}
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {isSuperAdmin && (
                        <button
                          type="button"
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
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                          title="Download PDF Report"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInterviewSubmissionId(item.submission_id);
                          setActivePage("interview-tools-review", {
                            positionId: selectedInterviewPositionId,
                            submissionId: item.submission_id,
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                      >
                        <Eye className="h-4 w-4" />
                        Review
                      </button>
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
    </div>
  );
}
