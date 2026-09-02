import React from "react";
import {
  Layers,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Briefcase,
} from "lucide-react";
import { btn } from "./ui/buttons";

export default function PathwaysHub({
  pathways = [],
  exams = [],
  loading = false,
  onSelectPathway,
  onOpenCreatePathway,
  onEditPathway,
  onDeletePathway,
}) {
  const examPathways = pathways.filter((p) => !p.is_builtin);

  // Compute aggregate stats across exam pathways
  const totalPathways = examPathways.length;
  const activePathways = examPathways.filter((p) => p.is_active).length;
  const totalExams = exams.length;
  const totalAttempts = exams.reduce((sum, e) => sum + (e.submission_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e5e7eb] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#002856] flex items-center justify-center shrink-0 shadow-sm">
            <Layers className="w-6 h-6 text-[#edb843]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Exam Pathways</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and manage candidate exam pathways. Each pathway hosts its own live and draft scholarship exams.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCreatePathway}
          className={`${btn.primary} shrink-0`}
        >
          <Plus className="w-4 h-4" /> New Pathway
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-blue-600" /> Total Pathways
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalPathways}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Active in Onboarding
          </div>
          <p className="text-2xl font-bold text-green-700">{activePathways}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Total Exams
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalExams}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5 text-amber-600" /> Total Candidates
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalAttempts}</p>
        </div>
      </div>

      {/* Pathways List */}
      {loading && examPathways.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-12 text-center text-sm text-slate-400">
          Loading exam pathways...
        </div>
      ) : examPathways.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#002856] flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Exam Pathways Yet</h3>
          <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
            Create an exam pathway (e.g. Nursing Scholarship, Tech Apprenticeship) to host and manage exams for candidate onboarding.
          </p>
          <button
            type="button"
            onClick={onOpenCreatePathway}
            className={`${btn.primary} mx-auto`}
          >
            <Plus className="w-4 h-4" /> Create First Pathway
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {examPathways.map((pathway) => {
            const pathwayExams = exams.filter(
              (e) => Number(e.pathway_id) === Number(pathway.id),
            );
            const liveExam = pathwayExams.find((e) => e.is_active);
            const attemptsCount = pathwayExams.reduce(
              (sum, e) => sum + (e.submission_count || 0),
              0,
            );

            return (
              <div
                key={pathway.id}
                className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Top Section */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#002856] flex items-center justify-center shrink-0 border border-blue-100 overflow-hidden">
                        {pathway.image_url ? (
                          <img
                            src={pathway.image_url}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <GraduationCap className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-800 truncate">
                            {pathway.title}
                          </h3>
                          {pathway.badge && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                              {pathway.badge}
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5 ${
                            pathway.is_active
                              ? "text-green-700"
                              : "text-slate-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              pathway.is_active ? "bg-green-500" : "bg-slate-300"
                            }`}
                          />
                          {pathway.is_active ? "Shown in onboarding" : "Hidden from onboarding"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {pathway.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                      {pathway.description}
                    </p>
                  )}

                  {/* Metrics Box */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Live Exam:</span>
                      {liveExam ? (
                        <span className="font-bold text-green-700 truncate max-w-[160px]">
                          {liveExam.title}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No live exam</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Total Exams:</span>
                      <span className="font-bold text-slate-700">
                        {pathwayExams.length} ({liveExam ? "1 Live" : "0 Live"},{" "}
                        {pathwayExams.length - (liveExam ? 1 : 0)} Drafts)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Candidates:</span>
                      <span className="font-bold text-slate-700">{attemptsCount} attempts</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditPathway(pathway)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#002856] hover:bg-slate-200/70 transition"
                      title="Edit pathway details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePathway(pathway)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete pathway"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPathway(pathway)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002856] text-white rounded-lg text-xs font-bold hover:bg-[#001e40] transition shadow-xs"
                  >
                    Manage Exams <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
