import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { switchScholarshipToMode } from "../utils/lgMode";

const LEVELS = [
  {
    code: "A1",
    title: "A1 – Beginner",
    bars: 1,
  },
  {
    code: "A2",
    title: "A2 – Elementary",
    bars: 2,
  },
  {
    code: "B1",
    title: "B1 – Intermediate",
    bars: 3,
  },
  {
    code: "B2",
    title: "B2 – Upper Intermediate",
    bars: 4,
  },
];

function LevelBars({ level }) {
  const heights = [12, 16, 20, 24];
  return (
    <div className="w-8 h-8 relative flex items-end justify-center gap-[3px] pb-1.5 shrink-0">
      {[1, 2, 3, 4].map((i, idx) => (
        <div
          key={i}
          className={`w-1 rounded-lg ${
            i <= level ? "bg-[#001D4A]" : "bg-zinc-300"
          }`}
          style={{ height: `${heights[idx]}px` }}
        />
      ))}
    </div>
  );
}

/**
 * Modal shown on the scholarship results-awaited screen. The candidate picks
 * the level they want to continue learning/practicing at, and the modal hands
 * them off to the mode they chose (learn or practice) with that level set.
 *
 * @param {"learn"|"practice"} mode      target mode after switching
 * @param {(user: object|null) => void} onDone  called after switching completes
 * @param {() => void} onClose            called when dismissed (no switch)
 */
export default function ScholarshipLevelPickerModal({ mode, onDone, onClose }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // Await the switch: routing decisions downstream read the fresh user, and
      // firing navigation before the mode lands sends them back to /scholarship.
      const user = await switchScholarshipToMode(mode, selected);
      onDone?.(user);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#002856]">
              {mode === "learn" ? "Start learning German" : "Start practicing German"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Which level would you like to start at?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {LEVELS.map((lvl) => {
            const isSelected = selected === lvl.code;
            return (
              <button
                key={lvl.code}
                type="button"
                onClick={() => setSelected(lvl.code)}
                className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                  isSelected
                    ? "border-[#1E76F3] bg-blue-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <LevelBars level={lvl.bars} />
                <span className="flex-1 min-w-0">
                  <span
                    className={`block text-sm font-semibold ${
                      isSelected ? "text-[#1E76F3]" : "text-[#111827]"
                    }`}
                  >
                    {lvl.title}
                  </span>
                </span>
                {isSelected && (
                  <span className="w-6 h-6 rounded-full bg-[#1E76F3] flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || saving}
            className={`w-full h-12 rounded-xl text-base font-semibold transition-all ${
              selected && !saving
                ? "bg-gradient-to-r from-[#edb843] to-[#e0a92e] text-[#002856] shadow-md active:scale-[0.99]"
                : "bg-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
            }`}
          >
            {saving
              ? "Please wait..."
              : mode === "learn"
                ? "Start Learning"
                : "Start Practicing"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
