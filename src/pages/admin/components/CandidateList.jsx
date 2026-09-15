import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

const SCORE_OPERATORS = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
];

const DepartmentMultiSelect = ({ options, selected, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggle = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={`h-8 min-w-32 max-w-44 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10 flex items-center justify-between gap-1.5 ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        <span className="truncate">
          {selected.length === 0
            ? "All Departments"
            : selected.length === 1
              ? selected[0]
              : `${selected.length} selected`}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-52 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {options.length === 0 && (
            <div className="px-2 py-3 text-center text-[10px] font-semibold text-slate-400">
              No departments configured
            </div>
          )}
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt)}
                  className="h-3 w-3 rounded border-slate-300 text-[#083262] focus:ring-0"
                />
                <span className="truncate">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CandidateList = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  searchVal,
  setSearchVal,
  currentPage,
  totalPages,
  onPageChange,
  loading,
  startDate,
  endDate,
  proficiencyLevel,
  onProficiencyLevelChange,
  sortBy,
  onSortChange,
  onStartDateChange,
  onEndDateChange,
  onClearDates,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  onClearFilters,
  paymentStatus,
  onPaymentStatusChange,
  scoreOp,
  onScoreOpChange,
  scoreValue,
  onScoreValueChange,
  experienceFilter,
  onExperienceChange,
  experienceOptions,
  experienceEnabled = true,
  qualificationFilter,
  onQualificationChange,
  qualificationOptions,
  qualificationEnabled = true,
  departmentFilters,
  onDepartmentsChange,
  departmentOptions,
  departmentsEnabled = true,
}) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-100 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-end gap-2.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#083262] focus:border-transparent transition-all"
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Sort By
              </span>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="h-8 min-w-24 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
              >
                <option value="activity_desc">Last Updated</option>
                <option value="created_desc">Created (Newest)</option>
                <option value="created_asc">Created (Oldest)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                &nbsp;
              </span>
              <button
                type="button"
                onClick={onToggleFilters}
                className={`relative h-8 rounded-lg border px-3 text-[10px] font-bold transition flex items-center gap-1.5 ${
                  filtersOpen || activeFilterCount > 0
                    ? "border-[#083262] bg-blue-50/60 text-[#083262]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#083262] px-1 text-[8px] font-extrabold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Created From
              </span>
              <span className="relative">
                <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Created To
              </span>
              <span className="relative">
                <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
                />
              </span>
            </label>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={onClearDates}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-2.5 flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Proficiency
              </span>
              <select
                value={proficiencyLevel}
                onChange={(e) => onProficiencyLevelChange(e.target.value)}
                className="h-8 min-w-24 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
              >
                <option value="">All Levels</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Payment
              </span>
              <select
                value={paymentStatus}
                onChange={(e) => onPaymentStatusChange(e.target.value)}
                className="h-8 min-w-24 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
              >
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Interview Score
              </span>
              <span className="flex items-center gap-1">
                <select
                  value={scoreOp}
                  onChange={(e) => onScoreOpChange(e.target.value)}
                  className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
                >
                  {SCORE_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  placeholder="0-10"
                  value={scoreValue}
                  onChange={(e) => onScoreValueChange(e.target.value)}
                  className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
                />
              </span>
            </label>

            <label
              className="flex flex-col gap-1"
              title={experienceEnabled ? undefined : "Enable this field in Global Pipeline → Profile Fields"}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Experience
              </span>
              <select
                value={experienceFilter}
                onChange={(e) => onExperienceChange(e.target.value)}
                disabled={!experienceEnabled}
                className="h-8 min-w-28 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">All Experience</option>
                {experienceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="flex flex-col gap-1"
              title={qualificationEnabled ? undefined : "Enable this field in Global Pipeline → Profile Fields"}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Qualification
              </span>
              <select
                value={qualificationFilter}
                onChange={(e) => onQualificationChange(e.target.value)}
                disabled={!qualificationEnabled}
                className="h-8 min-w-28 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">All Qualifications</option>
                {qualificationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="flex flex-col gap-1"
              title={departmentsEnabled ? undefined : "Enable this field in Global Pipeline → Profile Fields"}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Departments
              </span>
              <DepartmentMultiSelect
                options={departmentOptions}
                selected={departmentFilters}
                onChange={onDepartmentsChange}
                disabled={!departmentsEnabled}
              />
            </label>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Candidate List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-semibold gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#083262]" />
            <span>Loading candidates...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold">
            No candidates found
          </div>
        ) : (
          candidates.map((candidate) => {
            const isActive = candidate.user_id === selectedCandidateId;
            const steps = candidate.steps_config || [];
            
            // Calculate step-based completion percentage matching candidate dashboard logic (ignoring skipped steps)
            const visibleSteps = steps.filter((s) => s.status !== "skipped");
            const totalSteps = visibleSteps.length || 8;
            const currentStepIndex = visibleSteps.findIndex((s) => s.id === candidate.current_step_id);
            const activeStep = currentStepIndex !== -1 ? visibleSteps[currentStepIndex] : null;

            const progressPercent = totalSteps > 0
              ? (activeStep?.status === "completed" || (currentStepIndex !== -1 && currentStepIndex === totalSteps - 1)
                  ? 100
                  : Math.round((currentStepIndex !== -1 ? currentStepIndex : 0) / totalSteps * 100))
              : 0;

            // Find name of current active step
            const currentStepTitle =
              steps.find((s) => s.id === candidate.current_step_id)?.title ||
              candidate.current_step_id ||
              "Welcome";

            return (
              <button
                type="button"
                key={candidate.user_id}
                onClick={() => onSelectCandidate(candidate.user_id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-2.5 ${
                  isActive
                    ? "bg-slate-50 border-[#083262] shadow-sm"
                    : "bg-white hover:bg-slate-50/50 border-slate-100"
                }`}
              >
                {/* Name & Proficiency */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm truncate max-w-[170px]">
                    {candidate.fullname || "Unnamed Candidate"}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-[#083262] text-[9px] font-extrabold rounded-md border border-blue-100 uppercase">
                    {candidate.language_level || candidate.current_profeciency_level || "B1"}
                  </span>
                </div>

                {/* Email & Current Step Label */}
                <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                  <div className="flex justify-between items-center">
                    <span className="truncate max-w-[150px]">{candidate.email || "No Email"}</span>
                    <span className="font-bold text-slate-600 text-[10px] truncate max-w-[120px]">
                      {currentStepTitle}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#083262] rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#083262] shrink-0">
                    {progressPercent}%
                  </span>
                </div>

                {/* Activity and verification markers */}
                <div className="flex items-center gap-1.5 self-start mt-0.5 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${
                      candidate.is_active === false
                        ? "bg-rose-50 border-rose-100 text-rose-600"
                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                    }`}
                  >
                    {candidate.is_active === false ? "Inactive" : "Active"}
                  </span>
                  {candidate.email_verified && (
                    <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600">
                      <Check className="w-2 h-2" />
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600">
                      Profile Verified
                    </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateList;
