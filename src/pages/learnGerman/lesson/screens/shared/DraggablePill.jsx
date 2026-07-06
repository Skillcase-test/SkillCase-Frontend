import { useDraggable } from "@dnd-kit/core";
import { Check, X } from "lucide-react";

export default function DraggablePill({
  id,
  label,
  isPlaced,
  isLocked,
  status,
  onRemove,
  onClick,
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id,
      data: { label },
      disabled: isLocked,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 1,
      }
    : undefined;

  if (isPlaced) {
    let bgClass = "bg-white";
    let outlineClass = "outline-zinc-300 outline-solid";
    let textClass = "text-gray-900";

    if (status === "correct") {
      bgClass = "bg-emerald-100/50";
      outlineClass = "outline-green-700 outline-solid";
      textClass = "text-green-700";
    } else if (status === "incorrect") {
      bgClass = "bg-rose-200/40";
      outlineClass = "outline-red-500 outline-solid";
      textClass = "text-red-500";
    }

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => {
          if (!isLocked && onRemove) onRemove();
        }}
        style={style}
        className={`px-4 py-1.5 ${bgClass} rounded-lg outline-1 outline-offset-[-1px] ${outlineClass} flex justify-start items-center gap-2 shadow-sm whitespace-nowrap touch-none select-none ${
          isDragging ? "opacity-0" : "opacity-100"
        } ${isLocked ? "cursor-not-allowed" : "cursor-grab"}`}
      >
        <div
          className={`${textClass} text-[15px] font-medium leading-6 pointer-events-none`}
        >
          {label}
        </div>
        {status === "correct" && (
          <div className="w-3.5 h-3.5 bg-green-700 rounded-full flex items-center justify-center shrink-0 pointer-events-none">
            <Check size={8} color="white" strokeWidth={3} />
          </div>
        )}
        {status === "incorrect" && (
          <div className="w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center shrink-0 pointer-events-none">
            <X size={8} color="white" strokeWidth={3} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging && onClick) onClick();
      }}
      className={`px-3 py-2 bg-white rounded-lg outline-1 outline-offset-[-1px] outline-zinc-300 flex justify-center items-center cursor-grab active:cursor-grabbing shadow-sm transition-opacity touch-none select-none ${
        isDragging ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-gray-900 text-[14px] font-medium leading-5 pointer-events-none">
        {label}
      </div>
    </div>
  );
}
