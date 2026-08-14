import { useEffect } from "react";
import {
  FileQuestion,
  Users,
  ListChecks,
  CheckCircle2,
  Loader2,
  Save,
  Info,
  GraduationCap,
} from "lucide-react";
import { useScholarshipWorkspace } from "./index";
import StatCard from "./ui/StatCard";
import { btn, inputCls, labelCls } from "./ui/buttons";

/**
 * Overview tab: quick stats about the selected exam, its settings form,
 * and a short "how it works" card.
 */
export default function OverviewTab() {
  const {
    selectedExam,
    examQuestions,
    visStudents,
    submissions,
    editSettings,
    setEditSettings,
    openSettings,
    handleSaveSettings,
    saving,
    loadVisibility,
    loadSubmissions,
  } = useScholarshipWorkspace();

  // Load the visibility + submission counts when the overview opens.
  useEffect(() => {
    loadVisibility();
    loadSubmissions();
    openSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam?.test_id]);

  // Only answerable items count as questions (blocks render as content)
  const NON_ANSWERABLE = new Set([
    "page_break",
    "reading_passage",
    "audio_block",
    "content_block",
    "image_block",
  ]);
  const answerableCount = examQuestions.filter(
    (q) => !NON_ANSWERABLE.has(q.question_type),
  ).length;

  const stats = [
    {
      icon: FileQuestion,
      label: "Questions",
      value: answerableCount,
      tone: "bg-[#eef2f6] text-[#002856]",
    },
    {
      icon: Users,
      label: "Candidates with access",
      value: visStudents.length,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      icon: ListChecks,
      label: "Submissions",
      value: submissions.length,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      icon: CheckCircle2,
      label: "Results",
      value: selectedExam?.results_visible ? "Released" : "Awaited",
      tone: selectedExam?.results_visible
        ? "bg-green-50 text-green-700"
        : "bg-slate-50 text-slate-500",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* Settings */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <h3 className="text-sm font-bold text-slate-700">Exam settings</h3>
          </div>
          {!editSettings ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#002856]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Exam title *</label>
                <input
                  type="text"
                  value={editSettings.title}
                  onChange={(e) => setEditSettings({ ...editSettings, title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea
                  value={editSettings.description || ""}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, description: e.target.value })
                  }
                  rows={3}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={editSettings.duration_minutes}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, duration_minutes: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Available from</label>
                <input
                  type="datetime-local"
                  value={editSettings.available_from || ""}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, available_from: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Available until</label>
                <input
                  type="datetime-local"
                  value={editSettings.available_until || ""}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, available_until: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className={btn.primary}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#002856]">
              <Info className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-700">How it works</h3>
          </div>
          <ul className="space-y-3 text-xs text-slate-500 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">1.</span>
              <span>
                <b className="text-slate-600">One exam is served at a time.</b>{" "}
                Activating a draft automatically deactivates the current live
                exam.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">2.</span>
              <span>
                <b className="text-slate-600">Candidates are auto-added.</b>{" "}
                Anyone who visits the exam is granted access automatically — no
                bulk uploads needed.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">3.</span>
              <span>
                <b className="text-slate-600">Results release manually.</b>{" "}
                Candidates see "Results awaited" until you hit{" "}
                <b className="text-slate-600">Release Results</b>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">4.</span>
              <span>
                <b className="text-slate-600">Duplicates are drafts.</b>{" "}
                Duplicating an exam copies all questions, audio and images to
                fresh files — the copy starts as a draft.
              </span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
            <GraduationCap className="w-4 h-4 text-[#edb843]" />
            <span>Scholarship exam workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
}
