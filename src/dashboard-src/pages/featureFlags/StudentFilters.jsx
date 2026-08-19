import React from "react";
import { Search } from "lucide-react";

const PAYMENT_TABS = [
  { key: "all", label: "All Students", activeColor: "text-blue-950" },
  { key: "paid", label: "Paid Only", activeColor: "text-emerald-700" },
  { key: "unpaid", label: "Free / Unpaid", activeColor: "text-amber-700" },
];

const selectClass =
  "px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-950";

export default function StudentFilters({
  filters,
  onChange,
  levels = [],
  shownCount = 0,
  total = 0,
}) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search by student name, phone, email, or Zoho ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-950 focus:bg-white transition-all"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          {PAYMENT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange({ paymentFilter: tab.key })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filters.paymentFilter === tab.key
                  ? `bg-white shadow-xs ${tab.activeColor}`
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Level:</span>
          <select
            value={filters.levelFilter}
            onChange={(e) => onChange({ levelFilter: e.target.value })}
            className={selectClass}
          >
            <option value="all">All Eligible ({levels.join(", ")})</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl} Only
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <select
            value={filters.statusFilter}
            onChange={(e) => onChange({ statusFilter: e.target.value })}
            className={selectClass}
          >
            <option value="all">All Statuses</option>
            <option value="enabled">Access Enabled</option>
            <option value="disabled">Access Disabled</option>
            <option value="override">Custom Overrides Only</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-900">{shownCount}</span> of{" "}
          <span className="font-semibold text-slate-900">{total}</span> eligible students
        </div>
      </div>
    </div>
  );
}
