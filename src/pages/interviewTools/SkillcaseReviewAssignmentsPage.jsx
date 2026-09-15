import { useEffect, useState } from "react";
import { ClipboardCheck, Eye, RefreshCw } from "lucide-react";
import { skillcaseInterviewToolsApi } from "../../api/skillcaseInterviewToolsApi";
import { formatDateTimeIST } from "../../utils/dateTime";
import SkillcaseInterviewNavTabs from "./shared/SkillcaseInterviewNavTabs";
import IconActionButton from "./shared/IconActionButton";

const STATUS_STYLE = {
  completed: "bg-emerald-100 text-emerald-700",
  started: "bg-amber-100 text-amber-700",
  abandoned: "bg-slate-100 text-slate-700",
  shortlisted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  in_review: "bg-blue-100 text-blue-700",
};

// The assigned reviewer's queue: submissions a super admin sent to the current
// admin. Reviewing an item completes its assignment, clearing it here.
export default function SkillcaseReviewAssignmentsPage({ setActivePage }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res =
        await skillcaseInterviewToolsApi.listMyReviewAssignments();
      setAssignments(res.data.data || []);
    } catch (error) {
      console.error(error);
      setStatus("Could not fetch assigned reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openReview = (item) => {
    setActivePage("interview-tools-review", {
      positionId: item.position_id,
      submissionId: item.submission_id,
      from: "reviews",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Skillcase Interviews
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Candidate submissions assigned to you for review.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <SkillcaseInterviewNavTabs active="reviews" setActivePage={setActivePage} />

      {status ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {status}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Interview</th>
                <th className="px-4 py-3">Submission</th>
                <th className="px-4 py-3">Assigned By</th>
                <th className="px-4 py-3">Assigned (IST)</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
              {!loading && assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    No pending reviews assigned to you.
                  </td>
                </tr>
              ) : (
                assignments.map((item) => (
                  <tr
                    key={item.assignment_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">
                        {item.candidate_name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {item.candidate_email}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.position_title}
                      </div>
                      {item.position_role ? (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {item.position_role}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_STYLE[item.submission_status] ||
                          STATUS_STYLE.completed
                        }`}
                      >
                        {item.submission_status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {item.assigned_by_name || "-"}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTimeIST(item.assigned_at)}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 max-w-[220px] truncate">
                      {item.note || "-"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <IconActionButton
                        icon={Eye}
                        label="Review"
                        tone="primary"
                        title="Review submission"
                        onClick={() => openReview(item)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
