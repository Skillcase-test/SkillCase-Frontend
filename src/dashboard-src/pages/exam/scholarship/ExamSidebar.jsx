import { Copy, Play, Trash2 } from "lucide-react";
import { useScholarshipWorkspace } from "./index";
import Chip from "./ui/Chip";

function ExamRow({ exam, selected, onSelect }) {
  const { handleDuplicate, handleDeleteExam, handleToggleActive } =
    useScholarshipWorkspace();
  const isActive = Boolean(exam.is_active);
  const isSelected = selected?.test_id === exam.test_id;

  return (
    <div
      onClick={() => onSelect(exam.test_id)}
      className={`group w-full text-left px-4 py-3 border-b border-[#f1f5f9] cursor-pointer transition-colors ${
        isSelected ? "bg-[#eff6ff]" : "hover:bg-[#f8fafc]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#181d27] truncate">
          {exam.title}
        </p>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate(exam);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-[#002856] hover:bg-slate-100 transition-colors"
            title="Duplicate exam (media copied, copy is a draft)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteExam(exam);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete exam"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
        {isActive ? (
          <Chip cls="bg-green-50 text-green-700 border-green-200">● Live</Chip>
        ) : (
          <Chip cls="bg-slate-100 text-slate-500 border-slate-200">Draft</Chip>
        )}
        <span>{exam.total_questions || 0} Qs</span>
        <span>·</span>
        <span>{exam.submission_count || 0} started</span>
      </div>
      {!isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(exam, true);
          }}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-green-700 hover:text-green-800 transition-colors"
        >
          <Play className="w-3 h-3" /> Activate
        </button>
      )}
    </div>
  );
}

function Section({ label, tone, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#f1f5f9] flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tone === "green" ? "bg-green-500" : "bg-slate-300"
          }`}
        />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </h3>
      </div>
      {children}
    </div>
  );
}

/**
 * All-exams sidebar: the live exam at the top, drafts below. Clicking a row
 * opens it in the workspace. Hover reveals Duplicate / Delete; drafts get a
 * quick Activate action.
 */
export default function ExamSidebar({ onSelect }) {
  const { exams, loading, activeExam, selectedExam } = useScholarshipWorkspace();
  const drafts = exams.filter((e) => !e.is_active);

  return (
    <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-4 sticky top-6">
      <Section label="Live exam" tone="green">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            Loading…
          </div>
        ) : activeExam ? (
          <ExamRow
            exam={activeExam}
            selected={selectedExam}
            onSelect={onSelect}
          />
        ) : (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            No live exam — activate a draft to serve it.
          </div>
        )}
      </Section>

      <Section label={`Drafts (${drafts.length})`} tone="slate">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            Loading…
          </div>
        ) : drafts.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            No drafts yet.
          </div>
        ) : (
          drafts.map((exam) => (
            <ExamRow
              key={exam.test_id}
              exam={exam}
              selected={selectedExam}
              onSelect={onSelect}
            />
          ))
        )}
      </Section>
    </aside>
  );
}
