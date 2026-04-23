import { useEffect, useState } from "react";
import { ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { interviewToolsApi } from "../../api/interviewToolsApi";

const STATUS_STYLE = {
  completed: "bg-emerald-100 text-emerald-700",
  started: "bg-amber-100 text-amber-700",
  abandoned: "bg-slate-100 text-slate-700",
  shortlisted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  in_review: "bg-blue-100 text-blue-700",
};

export default function InterviewToolsCandidatesPage({
  selectedInterviewPositionId,
  setSelectedInterviewSubmissionId,
  setActivePage,
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await interviewToolsApi.getCandidates(
        selectedInterviewPositionId,
      );
      setCandidates(res.data.data || []);
    } catch (error) {
      console.error(error);
      setStatus("Could not fetch candidate submissions");
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
          Back to Positions
        </button>

        <button
          type="button"
          onClick={loadCandidates}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
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
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Submission</th>
                <th className="px-6 py-4">Review</th>
                <th className="px-6 py-4">Score</th>
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
                    <div className="mt-1 text-xs text-gray-500">
                      {item.candidate_email}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {item.candidate_phone}
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
                  <td className="px-6 py-5 font-semibold text-gray-900">
                    {item.overall_score || item.calculated_score || "-"}
                  </td>
                  <td className="px-6 py-5 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
