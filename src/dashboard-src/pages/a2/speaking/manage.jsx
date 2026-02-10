import React, { useState, useEffect } from "react";
import { Trash2, RefreshCw, GripVertical, Save, Loader } from "lucide-react";
import {
  getA2Chapters,
  reorderA2Chapters,
  deleteA2Chapter,
} from "../../../../api/a2Api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
function SortableRow({ chapter, onDelete, deletingId }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: chapter.id });
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <td className="px-2 py-3">
        <button {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
      </td>
      <td className="px-2 py-3">{chapter.order_index + 1}</td>
      <td className="px-2 py-3">{chapter.chapter_name}</td>
      <td className="px-2 py-3 text-right">
        <button
          onClick={() => onDelete(chapter)}
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
export default function A2SpeakingManage() {
  const [chapters, setChapters] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));
  useEffect(() => {
    getA2Chapters("speaking").then((res) => setChapters(res.data));
  }, []);
  const handleDelete = async (ch) => {
    if (!confirm(`Delete "${ch.chapter_name}"?`)) return;
    setDeletingId(ch.id);
    await deleteA2Chapter("speaking", ch.id);
    setChapters((prev) => prev.filter((c) => c.id !== ch.id));
    setDeletingId(null);
  };
  const handleDragEnd = (e) => {
    if (e.active.id !== e.over.id) {
      setChapters((items) =>
        arrayMove(
          items,
          items.findIndex((i) => i.id === e.active.id),
          items.findIndex((i) => i.id === e.over.id),
        ),
      );
      setHasChanges(true);
    }
  };
  const handleSave = async () => {
    await reorderA2Chapters(
      "speaking",
      chapters.map((c) => c.id),
    );
    setHasChanges(false);
  };
  return (
    <div className="px-4 py-8 max-w-9xl mx-auto">
      <div className="mb-8 flex justify-between">
        <h1 className="text-2xl font-bold">Manage A2 Speaking</h1>
      </div>
      {chapters.length > 0 && (
        <div className="bg-white rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b flex justify-between">
            <span>Chapters ({chapters.length})</span>
            {hasChanges && (
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase">
                  <th className="px-2 py-3 w-10"></th>
                  <th className="px-2 py-3 text-left">Order</th>
                  <th className="px-2 py-3 text-left">Name</th>
                  <th className="px-2 py-3 text-right">Action</th>
                </tr>
              </thead>
              <SortableContext
                items={chapters.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {chapters.map((ch) => (
                    <SortableRow
                      key={ch.id}
                      chapter={ch}
                      onDelete={handleDelete}
                      deletingId={deletingId}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      )}
    </div>
  );
}
