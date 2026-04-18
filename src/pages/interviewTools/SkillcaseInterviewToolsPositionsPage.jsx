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
} from "lucide-react";
import { skillcaseInterviewToolsApi } from "../../api/skillcaseInterviewToolsApi";

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

  const loadPositions = async () => {
    setLoading(true);
    try {
      const res = await skillcaseInterviewToolsApi.listPositions();
      setPositions(res.data.data || []);
    } catch (error) {
      console.error(error);
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
      setStatus("Could not update interview status");
    }
  };

  const openBuilder = (positionId = null) => {
    setSelectedInterviewPositionId(positionId);
    setActivePage("interview-tools-builder");
  };

  const openCandidates = (positionId) => {
    setSelectedInterviewPositionId(positionId);
    setActivePage("interview-tools-candidates");
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
      setStatus(error?.response?.data?.message || "Could not delete interview");
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
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
                          onClick={() => openBuilder(position.position_id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                        >
                          <SquarePen className="h-4 w-4 text-slate-500" />
                          Edit
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
