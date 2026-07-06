import { useDroppable } from "@dnd-kit/core";
import DraggablePill from "./DraggablePill";

export default function DroppableSlot({
  id,
  placedItem,
  status,
  onRemove,
  hideLine,
  customWidth,
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-col justify-end ${
        customWidth ||
        "flex-1 max-w-[150px] sm:max-w-[160px] h-[52px] ml-6 mb-2"
      }`}
    >
      {!hideLine && (
        <div
          className={`w-full h-[1px] ${
            isOver ? "bg-blue-500 scale-y-200" : "bg-black/40"
          }`}
        />
      )}
      {placedItem && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[10px]">
          <DraggablePill
            id={placedItem.id}
            label={placedItem.label}
            isPlaced={true}
            isLocked={status === "correct"}
            status={status}
            onRemove={onRemove}
          />
        </div>
      )}
    </div>
  );
}
