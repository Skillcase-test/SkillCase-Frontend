import React from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UserX,
} from "lucide-react";

const ENABLED_REASONS = {
  override_on: "User Override (ON)",
  global_on: "Global Rule",
  cohort_paid_on: "Paid Cohort Rule",
  cohort_unpaid_on: "Free Cohort Rule",
};

const DISABLED_REASONS = {
  override_off: "User Override (OFF)",
  cohort_paid_off: "Paid Cohort (Disabled)",
  cohort_unpaid_off: "Free Cohort (Disabled)",
  level_ineligible: "Level Ineligible",
};

function PaymentTier({ student }) {
  if (student.is_paid) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </span>
    );
  }
  if (student.trial_active) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
        <Sparkles className="w-3 h-3" /> Trial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
      Free
    </span>
  );
}

function EffectiveAccess({ student }) {
  const on = student.effective_status;
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          on ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            on ? "bg-emerald-600 animate-pulse" : "bg-rose-500"
          }`}
        />
        {on ? "Enabled" : "Disabled"}
      </span>
      <div className="text-[10px] text-slate-400 mt-0.5">
        {on
          ? ENABLED_REASONS[student.effective_reason] || "Enabled"
          : DISABLED_REASONS[student.effective_reason] || "Default Rule"}
      </div>
    </div>
  );
}

export default function StudentTable({
  users = [],
  loading,
  canEdit,
  page,
  pageSize,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  onToggle,
  onReset,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Level</th>
              <th className="py-3 px-4">Payment Tier</th>
              <th className="py-3 px-4">Effective Access</th>
              <th className="py-3 px-4 text-center">Toggle Access</th>
              <th className="py-3 px-4 text-right">Override Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-950" />
                    Loading eligible students...
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserX className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-600">
                      No students found matching your filters
                    </p>
                    <p className="text-xs text-slate-400">
                      Try changing your search keywords or payment filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((student) => {
                const hasOverride = student.override_status !== null;
                return (
                  <tr
                    key={student.user_id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasOverride ? "bg-purple-50/20" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                          {(student.fullname || student.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {student.fullname || student.username}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {student.user_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-700 font-medium">
                        {student.phone || "—"}
                      </div>
                      <div className="text-[11px] text-slate-400">{student.email || "—"}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                        {student.level}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <PaymentTier student={student} />
                    </td>

                    <td className="py-3.5 px-4">
                      <EffectiveAccess student={student} />
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => onToggle(student)}
                        className={`p-1 rounded-full transition-colors ${
                          !canEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        } ${
                          student.effective_status
                            ? "text-emerald-600 hover:text-emerald-700"
                            : "text-slate-400 hover:text-slate-500"
                        }`}
                        title={
                          !canEdit
                            ? "Read-only mode: contact Super Admin to edit"
                            : `Click to ${
                                student.effective_status ? "DISABLE" : "ENABLE"
                              } for this user`
                        }
                      >
                        {student.effective_status ? (
                          <ToggleRight className="w-8 h-8 fill-current" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {hasOverride ? (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => onReset(student)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            !canEdit
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 opacity-60"
                              : "bg-purple-100 hover:bg-purple-200 text-purple-700 cursor-pointer"
                          }`}
                          title={
                            !canEdit
                              ? "Read-only mode: contact Super Admin to reset"
                              : "Revert user to cohort default rule"
                          }
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Cohort Rule</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-center sm:self-auto">
          <span>
            Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </span>

          <div className="inline-flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
