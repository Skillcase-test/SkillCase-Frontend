import React from "react";
import { Plus, Copy, Play, Trash2, GraduationCap, CheckCircle2 } from "lucide-react";
import { useScholarshipWorkspace } from "./index";
import { btn } from "./ui/buttons";

function ExamRow({ exam, selected, onSelect }) {
  const {
    handleDuplicate,
    handleDeleteExam,
    handleToggleActive,
    canCreateExam,
    canEditExam,
    canDeleteExam,
    isGrader,
  } = useScholarshipWorkspace();
  const isActive = Boolean(exam.is_active);
  const isSelected = selected?.test_id === exam.test_id;
  const showActions = !isGrader && (canCreateExam || canDeleteExam);

  return (
    <div
      onClick={() => onSelect(exam.test_id)}
      className={`group w-full text-left px-3.5 py-3 rounded-xl cursor-pointer transition-colors mb-1.5 ${
        isSelected
          ? "bg-[#002856] text-white shadow-sm"
          : "bg-slate-50/80 hover:bg-slate-100 text-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
          {exam.title}
        </p>
        {showActions && (
          <div
            className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {canCreateExam && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(exam);
                }}
                className={`p-1 rounded ${
                  isSelected
                    ? "text-white/80 hover:text-white hover:bg-white/10"
                    : "text-slate-400 hover:text-[#002856] hover:bg-slate-200"
                }`}
                title="Duplicate exam"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            {canDeleteExam && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteExam(exam);
                }}
                className={`p-1 rounded ${
                  isSelected
                    ? "text-red-200 hover:text-red-100 hover:bg-white/10"
                    : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                }`}
                title="Delete exam"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className={`flex items-center gap-2 mt-1.5 text-[10px] ${
          isSelected ? "text-blue-100" : "text-slate-400"
        }`}
      >
        {isActive ? (
          <span
            className={`px-1.5 py-0.2 rounded font-bold ${
              isSelected
                ? "bg-green-500 text-white"
                : "bg-green-100 text-green-800"
            }`}
          >
            ● Live
          </span>
        ) : (
          <span
            className={`px-1.5 py-0.2 rounded ${
              isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}
          >
            Draft
          </span>
        )}
        <span>{exam.total_questions || 0} Qs</span>
        <span>·</span>
        <span>{exam.submission_count || 0} attempts</span>
      </div>

      {!isActive && !isGrader && canEditExam && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(exam, true);
          }}
          className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold ${
            isSelected
              ? "text-green-300 hover:text-green-200"
              : "text-green-700 hover:text-green-800"
          }`}
        >
          <Play className="w-2.5 h-2.5" /> Activate
        </button>
      )}
    </div>
  );
}

export default function ExamSidebar({ onSelect }) {
  const {
    exams,
    selectedExam,
    selectedPathway,
    setShowCreate,
    setNewExam,
    canCreateExam,
    isGrader,
  } = useScholarshipWorkspace();

  // Filter exams strictly for this selected pathway (or all if fallback)
  const pathwayExams = selectedPathway
    ? exams.filter((e) => Number(e.pathway_id) === Number(selectedPathway.id))
    : exams;

  const liveExam = pathwayExams.find((e) => e.is_active);
  const draftExams = pathwayExams.filter((e) => !e.is_active);

  return (
    <aside className="w-80 shrink-0 hidden lg:flex flex-col gap-4 sticky top-6">
      {/* Top action */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" /> Pathway Exams
        </h3>
        {canCreateExam && !isGrader && (
          <button
            type="button"
            onClick={() => {
              setNewExam((prev) => ({
                ...prev,
                pathway_id: selectedPathway?.id || null,
              }));
              setShowCreate(true);
            }}
            className="text-xs font-bold text-[#002856] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> New Exam
          </button>
        )}
      </div>

      {pathwayExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 text-center">
          <p className="text-xs text-slate-600 font-bold mb-1">No exams yet</p>
          <p className="text-[11px] text-slate-400 mb-3">
            {canCreateExam && !isGrader ? "Create an exam for this pathway." : "No exams have been published yet."}
          </p>
          {canCreateExam && !isGrader && (
            <button
              type="button"
              onClick={() => {
                setNewExam((prev) => ({
                  ...prev,
                  pathway_id: selectedPathway?.id || null,
                }));
                setShowCreate(true);
              }}
              className={`${btn.primary} !py-2 !text-xs mx-auto`}
            >
              <Plus className="w-3.5 h-3.5" /> Create Exam
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Live Exam Section */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live Exam
              </span>
              <span className="text-[10px] text-slate-400">1 active per pathway</span>
            </div>

            {liveExam ? (
              <ExamRow
                exam={liveExam}
                selected={selectedExam}
                onSelect={onSelect}
              />
            ) : (
              <div className="py-3 px-2 text-center bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
                <p className="text-[11px] text-amber-800 font-medium">No live exam</p>
                <p className="text-[10px] text-amber-600/80 mt-0.5">
                  Activate a draft below to make it live for candidates.
                </p>
              </div>
            )}
          </div>

          {/* Draft Exams Section */}
          {draftExams.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-3">
              <div className="pb-2 mb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Draft Exams ({draftExams.length})
                </span>
              </div>

              <div className="space-y-1">
                {draftExams.map((exam) => (
                  <ExamRow
                    key={exam.test_id}
                    exam={exam}
                    selected={selectedExam}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
