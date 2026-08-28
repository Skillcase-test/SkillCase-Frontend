import { Download, ListChecks } from "lucide-react";
import { useScholarshipWorkspace } from "./index";
import { formatDateTime } from "../../../../utils/dateTime";
import StatusPill from "./ui/StatusPill";
import EmptyState from "./ui/EmptyState";
import SubmissionReview from "./SubmissionReview";
import { btn } from "./ui/buttons";

/**
 * Submissions tab: the full list of candidate submissions with Review,
 * Reopen and Clear & Retest actions, plus Excel export and the per-submission
 * review modal.
 */
export default function SubmissionsTab() {
  const {
    submissions,
    openSubmissionDetail,
    handleReopen,
    handleResetRetest,
    handleExport,
  } = useScholarshipWorkspace();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700">
          Submissions ({submissions.length})
        </h3>
        <button onClick={handleExport} className={btn.secondary}>
          <Download className="w-3.5 h-3.5" /> Export Excel
        </button>
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No submissions yet"
          sub="Submissions appear here as candidates start and finish the exam."
          compact
        />
      ) : (
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f1f5f9] text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Candidate</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold">Finished</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, i) => (
                  <tr
                    key={s.submission_id}
                    className={`border-b border-[#f1f5f9] hover:bg-slate-50/60 ${
                      i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">
                        {s.fullname || s.username}
                      </p>
                      <p className="text-[11px] text-slate-400">@{s.username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {s.status === "completed" && s.score !== null
                        ? `${parseFloat(s.score).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDateTime(s.started_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDateTime(s.finished_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openSubmissionDetail(s.submission_id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#002856] text-white text-[11px] font-bold hover:bg-[#001e40] transition"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handleReopen(s.submission_id)}
                          className={btn.blueGhost}
                        >
                          Reopen
                        </button>
                        <button
                          onClick={() => handleResetRetest(s.submission_id)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[11px] font-bold hover:bg-slate-50 transition"
                        >
                          Clear & Retest
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SubmissionReview />
    </div>
  );
}
