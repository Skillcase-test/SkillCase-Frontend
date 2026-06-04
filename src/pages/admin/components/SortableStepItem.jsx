import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

const SortableStepItem = ({ id, step, onToggleSkippable }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm mb-2"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#002856]">{step.title}</span>
            {step.status === "completed" && (
              <span className="text-emerald-700 bg-emerald-50 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Completed
              </span>
            )}
            {step.status === "in_progress" && (
              <span className="text-amber-700 bg-amber-50 text-[10px] px-2 py-0.5 rounded-full font-bold">
                In Progress
              </span>
            )}
            {step.status === "not_started" && (
              <span className="text-zinc-500 bg-zinc-150/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Not Started
              </span>
            )}
            {step.status !== "completed" && step.status !== "in_progress" && step.status !== "not_started" && (
              <span className="text-zinc-500 bg-zinc-150/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {step.status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {step.status === "skipped" ? (
          <button
            type="button"
            onClick={() => onToggleSkippable(step.id, false)}
            className="px-2.5 py-1 bg-blue-50 text-[#002856] border border-blue-100 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition-all shadow-none"
          >
            Unskip Step
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleSkippable(step.id, true)}
            disabled={step.status === "completed"}
            className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 rounded-lg text-[10px] font-bold transition-all shadow-none"
          >
            Skip Step
          </button>
        )}
      </div>
    </div>
  );
};

export default SortableStepItem;
