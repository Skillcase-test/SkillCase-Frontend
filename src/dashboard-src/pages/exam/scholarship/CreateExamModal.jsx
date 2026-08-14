import { Loader2, GraduationCap } from "lucide-react";
import Modal from "./ui/Modal";
import { inputCls, labelCls } from "./ui/buttons";

/**
 * New-exam form: title, description, duration, availability window
 * and an optional "activate immediately" toggle (which deactivates any other
 * live exam). The exam always serves candidates of every level.
 */
export default function CreateExamModal({ exam, onChange, onClose, onSave, saving }) {
  const set = (patch) => onChange({ ...exam, ...patch });

  return (
    <Modal
      title="Create scholarship exam"
      subtitle="Only one exam is served at a time."
      onClose={onClose}
      icon={<GraduationCap className="w-5 h-5" />}
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Exam title *</label>
          <input
            type="text"
            value={exam.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Scholarship Exam 2026"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={exam.description}
            onChange={(e) => set({ description: e.target.value })}
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
            onChange={(e) => set({ duration_minutes: e.target.value })}
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
              Any other active exam will be deactivated.
            </span>
          </label>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
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
