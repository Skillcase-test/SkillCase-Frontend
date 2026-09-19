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
import SkillcaseInterviewNavTabs from "./shared/SkillcaseInterviewNavTabs";
import IconActionButton from "./shared/IconActionButton";

const STATUS_META = {
  draft: "bg-slate-100 text-slate-700",
  published_open: "bg-emerald-100 text-emerald-700",
  published_closed: "bg-amber-100 text-amber-700",
};

// Compact icon buttons for table actions — see shared/IconActionButton.jsx.

export default function SkillcaseInterviewToolsPositionsPage({
  setActivePage,
  setSelectedInterviewPositionId,
  canManageAll = false,
  canViewAll = false,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  canInvite = false,
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between ">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Skillcase Interviews
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Create learning interview flows, share public links, and review
            learner submissions.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadPositions}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => openBuilder(null)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#083262] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#052243] shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create Interview
            </button>
          )}
        </div>
      </div>

      <SkillcaseInterviewNavTabs
        active="positions"
        setActivePage={setActivePage}
      />

      {status ? (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            statusTone === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Interview</th>
                {canViewAll ? (
                  <th className="px-4 py-3">Created By</th>
                ) : null}
                {canViewAll ? (
                  <th className="px-4 py-3">Created On (IST)</th>
                ) : null}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Learners</th>
                <th className="px-4 py-3">Share</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
              {positions.map((position) => {
                const publicLink = `${window.location.origin}/interview/${position.slug}`;
                const canWriteThisPosition =
                  canManageAll || position.is_own_position;

                return (
                  <tr
                    key={position.position_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4 align-top">
                      <div
                        className="max-w-[260px] truncate font-bold text-slate-900"
                        title={position.title}
                      >
                        {position.title}
                      </div>
                      <div
                        className="mt-1 max-w-[260px] truncate text-xs text-slate-500 font-medium"
                        title={position.details || position.role_title}
                      >
                        {position.details || position.role_title}
                      </div>
                    </td>
                    {canViewAll ? (
                      <td className="px-4 py-4 align-top text-xs text-slate-500 font-medium">
                        <div
                          className="max-w-[140px] truncate"
                          title={
                            position.created_by_username ||
                            position.created_by ||
                            "-"
                          }
                        >
                          {position.created_by_username ||
                            position.created_by ||
                            "-"}
                        </div>
                      </td>
                    ) : null}
                    {canViewAll ? (
                      <td className="px-4 py-4 align-top text-xs text-slate-500 font-medium whitespace-nowrap">
                        {formatDateTimeIST(position.created_at)}
                      </td>
                    ) : null}
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          STATUS_META[position.status] || STATUS_META.draft
                        }`}
                      >
                        {position.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {position.question_count}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {position.completed_submission_count}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <IconActionButton
                        icon={Link2}
                        label="Copy"
                        confirmLabel="Copied"
                        alwaysShowLabel
                        title={`Copy public link\n${publicLink}`}
                        onClick={() =>
                          navigator.clipboard.writeText(publicLink)
                        }
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-1.5">
                        <IconActionButton
                          icon={Users}
                          label="Learners"
                          title="View learners"
                          alwaysShowLabel
                          onClick={() => openCandidates(position.position_id)}
                        />

                        {canInvite && (
                          <IconActionButton
                            icon={Send}
                            label="Invite"
                            title="Invite candidate"
                            onClick={() => openInviteModal(position)}
                          />
                        )}

                        {canWriteThisPosition && canEdit && (
                          <IconActionButton
                            icon={SquarePen}
                            label="Edit"
                            title="Edit interview"
                            onClick={() => openBuilder(position.position_id)}
                          />
                        )}

                        {canWriteThisPosition && canCreate && (
                          <IconActionButton
                            icon={Copy}
                            label={
                              duplicatingPositionId === position.position_id
                                ? "Duplicating…"
                                : "Duplicate"
                            }
                            title={
                              duplicatingPositionId === position.position_id
                                ? "Duplicating…"
                                : "Duplicate interview"
                            }
                            disabled={Boolean(duplicatingPositionId)}
                            onClick={() => duplicatePosition(position)}
                          />
                        )}

                        {canWriteThisPosition &&
                          canEdit &&
                          (position.status === "published_open" ? (
                            <IconActionButton
                              icon={Lock}
                              label="Close"
                              tone="danger"
                              title="Close interview (stop accepting submissions)"
                              onClick={() =>
                                updateStatus(
                                  position.position_id,
                                  "published_closed",
                                )
                              }
                            />
                          ) : (
                            <IconActionButton
                              icon={Globe}
                              label="Open"
                              tone="success"
                              title="Open interview (accept submissions)"
                              onClick={() =>
                                updateStatus(
                                  position.position_id,
                                  "published_open",
                                )
                              }
                            />
                          ))}

                        <IconActionButton
                          icon={Eye}
                          label="Public"
                          tone="primary"
                          title="View public page"
                          onClick={() => window.open(publicLink, "_blank")}
                        />

                        {canWriteThisPosition && canDelete && (
                          <IconActionButton
                            icon={Trash2}
                            label="Delete"
                            tone="danger"
                            title="Delete interview"
                            onClick={() => deletePosition(position)}
                          />
                        )}

                        {canManageAll && (
                          <IconActionButton
                            icon={Download}
                            label="Report"
                            tone="info"
                            title="Download interview report (PDF)"
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
                          />
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
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
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
