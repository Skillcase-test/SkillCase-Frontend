import { useEffect, useState } from "react";
import {
  Copy,
  Eye,
  Globe,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  SquarePen,
  Trash2,
  Users,
  Download,
  Send,
  X,
} from "lucide-react";
import { skillcaseInterviewToolsApi } from "../../api/skillcaseInterviewToolsApi";
import { formatDateTimeIST } from "../../utils/dateTime";

const STATUS_META = {
  draft: "bg-slate-100 text-slate-700",
  published_open: "bg-emerald-100 text-emerald-700",
  published_closed: "bg-amber-100 text-amber-700",
};

export default function SkillcaseInterviewToolsPositionsPage({
  setActivePage,
  setSelectedInterviewPositionId,
  isSuperAdmin = false,
}) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("error");
  const [duplicatingPositionId, setDuplicatingPositionId] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    candidate_name: "",
    candidate_email: "",
    candidate_phone: "",
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadPositions = async () => {
    setLoading(true);
    try {
      const res = await skillcaseInterviewToolsApi.listPositions();
      setPositions(res.data.data || []);
    } catch (error) {
      console.error(error);
      setStatusTone("error");
      setStatus("Could not fetch interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  const updateStatus = async (positionId, nextStatus) => {
    try {
      await skillcaseInterviewToolsApi.updatePositionStatus(
        positionId,
        nextStatus,
      );
      await loadPositions();
    } catch (error) {
      console.error(error);
      setStatusTone("error");
      setStatus("Could not update interview status");
    }
  };

  const openBuilder = (positionId = null) => {
    setSelectedInterviewPositionId(positionId);
    setActivePage("interview-tools-builder", { positionId });
  };

  const openCandidates = (positionId) => {
    setSelectedInterviewPositionId(positionId);
    setActivePage("interview-tools-candidates", { positionId });
  };

  const deletePosition = async (position) => {
    const confirmed = window.confirm(
      `Delete "${position.title}"?\n\nThis will permanently delete the interview, all learner submissions, and all related videos from S3.`,
    );

    if (!confirmed) return;

    try {
      await skillcaseInterviewToolsApi.deletePosition(position.position_id);
      await loadPositions();
    } catch (error) {
      console.error(error);
      setStatusTone("error");
      setStatus(error?.response?.data?.message || "Could not delete interview");
    }
  };

  const duplicatePosition = async (position) => {
    if (duplicatingPositionId) return;

    setDuplicatingPositionId(position.position_id);
    setStatus("");

    try {
      const res = await skillcaseInterviewToolsApi.duplicatePosition(
        position.position_id,
      );
      const newPositionId = res?.data?.data?.position_id;

      await loadPositions();

      if (newPositionId) {
        openBuilder(newPositionId);
      }
    } catch (error) {
      console.error(error);
      setStatusTone("error");
      setStatus(error?.response?.data?.message || "Could not duplicate interview");
    } finally {
      setDuplicatingPositionId(null);
    }
  };

  const openInviteModal = (position) => {
    setInviteTarget(position);
    setInviteForm({
      candidate_name: "",
      candidate_email: "",
      candidate_phone: "",
    });
  };

  const closeInviteModal = () => {
    if (inviteLoading) return;
    setInviteTarget(null);
  };

  const submitInvite = async () => {
    if (!inviteTarget) return;
    setInviteLoading(true);
    setStatus("");
    try {
      await skillcaseInterviewToolsApi.inviteCandidate(
        inviteTarget.position_id,
        inviteForm,
      );
      setInviteTarget(null);
      setStatusTone("success");
      setStatus("Invite sent successfully.");
    } catch (error) {
      console.error(error);
      setStatusTone("error");
      setStatus(error?.response?.data?.message || "Could not send invite");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between font-sans">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Skillcase Interviews
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Create learning interview flows, share public links, and review
            learner submissions.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadPositions}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => openBuilder(null)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#052243] shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Interview
          </button>
        </div>
      </div>

      {status ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            statusTone === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm font-sans">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-6 py-4">Interview</th>
                {isSuperAdmin ? (
                  <th className="px-6 py-4">Created By</th>
                ) : null}
                {isSuperAdmin ? (
                  <th className="px-6 py-4">Created On (IST)</th>
                ) : null}
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4">Learners</th>
                <th className="px-6 py-4">Share Link</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
              {positions.map((position) => {
                const publicLink = `${window.location.origin}/interview/${position.slug}`;

                return (
                  <tr
                    key={position.position_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-5 align-top">
                      <div className="font-bold text-slate-900">
                        {position.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 font-medium">
                        {position.details || position.role_title}
                      </div>
                    </td>
                    {isSuperAdmin ? (
                      <td className="px-6 py-5 align-top text-xs text-slate-500 font-medium">
                        {position.created_by_username ||
                          position.created_by ||
                          "-"}
                      </td>
                    ) : null}
                    {isSuperAdmin ? (
                      <td className="px-6 py-5 align-top text-xs text-slate-500 font-medium whitespace-nowrap">
                        {formatDateTimeIST(position.created_at)}
                      </td>
                    ) : null}
                    <td className="px-6 py-5 align-top">
                      <span
                        className={`inline-flex rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          STATUS_META[position.status] || STATUS_META.draft
                        }`}
                      >
                        {position.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top">
                      {position.question_count}
                    </td>
                    <td className="px-6 py-5 align-top">
                      {position.completed_submission_count}
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-start gap-2">
                        <Link2 className="mt-0.5 h-4 w-4 text-slate-400" />
                        <div className="max-w-[240px] break-all text-xs text-slate-500 font-medium select-all">
                          <div className="flex items-center gap-2 group">
                            <span>{publicLink}</span>
                            <button
                              type="button"
                              onClick={() =>
                                navigator.clipboard.writeText(publicLink)
                              }
                              className="shrink-0 p-1 text-slate-400 hover:text-[#083262] hover:bg-slate-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy Link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openCandidates(position.position_id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                        >
                          <Users className="h-4 w-4 text-slate-500" />
                          Learners
                        </button>

                        <button
                          type="button"
                          onClick={() => openInviteModal(position)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                        >
                          <Send className="h-4 w-4 text-slate-500" />
                          Invite
                        </button>

                        <button
                          type="button"
                          onClick={() => openBuilder(position.position_id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                        >
                          <SquarePen className="h-4 w-4 text-slate-500" />
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(duplicatingPositionId)}
                          onClick={() => duplicatePosition(position)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Copy className="h-4 w-4 text-slate-500" />
                          {duplicatingPositionId === position.position_id
                            ? "Duplicating..."
                            : "Duplicate"}
                        </button>

                        {position.status === "published_open" ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(
                                position.position_id,
                                "published_closed",
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm"
                          >
                            <Lock className="h-4 w-4" />
                            Close
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(
                                position.position_id,
                                "published_open",
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                          >
                            <Globe className="h-4 w-4" />
                            Open
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => window.open(publicLink, "_blank")}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-black shadow-sm"
                        >
                          <Eye className="h-4 w-4 text-slate-300" />
                          Public
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePosition(position)}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await skillcaseInterviewToolsApi.downloadInterviewPDF(position.position_id);
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const link = document.createElement("a");
                                link.href = url;
                                link.setAttribute("download", `InterviewReport-${position.position_id}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              } catch (error) {
                                console.error("PDF download failed:", error);
                                alert("Could not download PDF report");
                              }
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#083262] bg-white px-3.5 py-2.5 text-xs font-bold text-[#083262] transition hover:bg-blue-50 shadow-sm"
                          >
                            <Download className="h-4 w-4" />
                            Report
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {inviteTarget ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Invite Candidate</h3>
              <button
                type="button"
                onClick={closeInviteModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={inviteForm.candidate_name}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, candidate_name: e.target.value }))
                }
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#083262]"
              />
              <input
                value={inviteForm.candidate_email}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, candidate_email: e.target.value }))
                }
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#083262]"
              />
              <input
                value={inviteForm.candidate_phone}
                onChange={(e) =>
                  setInviteForm((prev) => ({
                    ...prev,
                    candidate_phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                placeholder="Phone (10 digits)"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#083262]"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeInviteModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  inviteLoading ||
                  !inviteForm.candidate_name ||
                  !inviteForm.candidate_email ||
                  inviteForm.candidate_phone.length !== 10
                }
                onClick={submitInvite}
                className="rounded-xl bg-[#083262] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {inviteLoading ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
