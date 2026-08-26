import { formatInrFromPaise, formatIstDate } from "../utils/formatters";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export function EMandateViewTab({
  rows,
  emandateSortBy,
  emandateSortOrder,
  setEMandateSortBy,
  setEMandateSortOrder,
  setCurrentPage,
  setEditDraft,
}) {
  const handleSort = (field) => {
    setCurrentPage(1);
    if (emandateSortBy === field) {
      setEMandateSortOrder(emandateSortOrder === "asc" ? "desc" : "asc");
    } else {
      // Natural reading order for dates is oldest/soonest first.
      setEMandateSortBy(field);
      setEMandateSortOrder(field === "next_due_date" ? "asc" : "desc");
    }
  };

  const renderSortIcon = (field) => {
    if (emandateSortBy === field) {
      return emandateSortOrder === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
      );
    }
    return (
      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  };

  const openDetails = (row) => {
    if (setEditDraft && row?.enrollment_id) {
      setEditDraft(row);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <th
              onClick={() => handleSort("student_name")}
              className="px-4 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Student</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("student_name")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("student_phone")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Phone Number</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("student_phone")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("created_at")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Created At</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("created_at")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("next_due_date")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Next Payment Date</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("next_due_date")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("next_amount_paise")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Next Payment</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("next_amount_paise")}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                No active e-mandates found for this month.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={r.enrollment_id || i}
                className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                }`}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openDetails(r)}
                    className="font-medium text-slate-800 hover:text-blue-700 hover:underline cursor-pointer"
                    title="Open candidate details"
                  >
                    {r.student_name || "Unknown"}
                  </button>
                </td>
                <td className="px-2 py-3 text-slate-700">{r.student_phone || "-"}</td>
                <td className="px-2 py-3 text-slate-700">{formatIstDate(r.created_at)}</td>
                <td className="px-2 py-3 text-slate-700">{formatIstDate(r.next_due_date)}</td>
                <td className="px-2 py-3">
                  {r.is_paid ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Paid
                    </span>
                  ) : (
                    <span className="text-slate-800 font-medium">
                      {formatInrFromPaise(r.next_amount_paise)}
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
