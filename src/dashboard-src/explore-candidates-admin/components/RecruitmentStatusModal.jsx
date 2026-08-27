import { X, Eye, ThumbsUp, ThumbsDown, CalendarCheck, Users, Sparkles } from "lucide-react";
import { formatRecruitmentStageLabel, formatIstDateTime } from "../utils/formatters";
import { Spinner } from "./common";

export function RecruitmentStatusModal({ open, loading, data, error, onClose }) {
  if (!open) return null;

  const counts = data?.summary_counts || {
    shown_to_recruiters: 0,
    viewed: 0,
    shortlisted: 0,
    rejected: 0,
    scheduled_interview: 0,
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#083262]/10 text-[#083262]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Recruitment Funnel & Activity
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Live candidate interaction across all partner recruiter accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Spinner size="lg" color="text-[#083262]" />
              <p className="text-xs font-bold">Loading recruitment status...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Linked Learner & Current Stage Info */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    Linked Learner
                  </p>
                  <p className="text-sm text-slate-900 mt-1 font-bold truncate">
                    {data.linked_user
                      ? `${data.linked_user.fullname || "-"} (${data.linked_user.user_id})`
                      : "Not linked"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    Current Stage
                  </p>
                  <p className="text-sm text-[#083262] mt-1 font-bold">
                    {formatRecruitmentStageLabel(data.derived_stage)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    Learner Visibility
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        data?.visibility?.is_enabled
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                    <span className="text-sm text-slate-900 font-bold">
                      {data?.linked_user
                        ? data?.visibility?.is_enabled
                          ? "Active"
                          : "Inactive"
                        : "Learner not linked"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric Counts */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="rounded-xl border border-slate-200 p-3 text-center bg-white shadow-xs">
                  <Users className="h-4 w-4 mx-auto text-slate-400 mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Shown</p>
                  <p className="text-lg font-black text-slate-900">
                    {counts.shown_to_recruiters || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-center bg-white shadow-xs">
                  <Eye className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Viewed</p>
                  <p className="text-lg font-black text-blue-700">
                    {counts.viewed || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-center bg-white shadow-xs">
                  <ThumbsUp className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Shortlisted</p>
                  <p className="text-lg font-black text-emerald-700">
                    {counts.shortlisted || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-center bg-white shadow-xs">
                  <ThumbsDown className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Rejected</p>
                  <p className="text-lg font-black text-rose-700">
                    {counts.rejected || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-center bg-white shadow-xs">
                  <CalendarCheck className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Scheduled</p>
                  <p className="text-lg font-black text-purple-700">
                    {counts.scheduled_interview || 0}
                  </p>
                </div>
              </div>

              {/* Recruiter Activity Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recruiter Activity Breakdown
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Recruiter</th>
                        <th className="px-4 py-2.5">Stage</th>
                        <th className="px-4 py-2.5">Views</th>
                        <th className="px-4 py-2.5">Last Activity (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                      {(data.recruiter_breakdown || []).length ? (
                        data.recruiter_breakdown.map((row) => (
                          <tr key={`${row.account_id}-${row.recruiter_email}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {row.recruiter_email || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                                {formatRecruitmentStageLabel(row.stage)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold">{row.view_count || 0}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {formatIstDateTime(
                                row.latest_scheduled_at ||
                                  row.status_updated_at ||
                                  row.last_viewed_at ||
                                  row.assigned_at,
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>
                            No recruiter interactions recorded for this candidate yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
