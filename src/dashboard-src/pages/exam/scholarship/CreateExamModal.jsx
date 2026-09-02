import { Loader2, GraduationCap } from "lucide-react";
import Modal from "./ui/Modal";
import { inputCls, labelCls } from "./ui/buttons";

export default function CreateExamModal({
  exam,
  onChange,
  onClose,
  onSave,
  saving,
  pathways = [],
}) {
  const set = (patch) => onChange({ ...exam, ...patch });
  const customPathways = pathways.filter((p) => !p.is_builtin);

  return (
    <Modal
      title="Create Scholarship Exam"
      subtitle="Create an exam inside a pathway. Exactly one exam can be live per pathway."
      onClose={onClose}
      icon={<GraduationCap className="w-5 h-5 text-[#002856]" />}
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Target Pathway *</label>
          <select
            value={exam.pathway_id || ""}
            onChange={(e) => set({ pathway_id: Number(e.target.value) || null })}
            className={inputCls}
          >
            <option value="">Select a Pathway...</option>
            {customPathways.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.badge ? `(${p.badge})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Exam Title *</label>
          <input
            type="text"
            value={exam.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Nursing Scholarship Exam — Cohort 1"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={exam.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Instructions or information for candidates..."
            rows={2}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Duration (minutes)</label>
          <input
            type="number"
            min={1}
            value={exam.duration_minutes}
            onChange={(e) => set({ duration_minutes: Number(e.target.value) || 60 })}
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
          <input
            type="checkbox"
            id="create-active"
            checked={exam.is_active}
            onChange={(e) => set({ is_active: e.target.checked })}
            className="w-4 h-4 accent-[#002856]"
          />
          <label htmlFor="create-active" className="text-sm text-slate-600 cursor-pointer">
            Activate immediately
            <span className="block text-[11px] text-slate-400">
              Any other active exam in this pathway will be deactivated.
            </span>
          </label>
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !exam.title?.trim() || !exam.pathway_id}
            className="flex-1 py-3 bg-[#002856] text-white rounded-xl text-sm font-bold hover:bg-[#001e40] transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "Create Exam"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
