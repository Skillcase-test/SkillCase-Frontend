import React from "react";
import { Search, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
}) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-sans">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <div className="relative">
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

                {/* Badges / verified marker */}
                {candidate.email_verified && (
                  <div className="flex items-center gap-1 self-start mt-0.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600">
                      <Check className="w-2 h-2" />
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600">
                      Profile Verified
                    </span>
                  </div>
                )}
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
