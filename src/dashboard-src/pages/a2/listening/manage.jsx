import React, { useState, useEffect } from "react";
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader,
  GripVertical,
  Save,
} from "lucide-react";
import {
  getA2Chapters,
  reorderA2Chapters,
  deleteA2Chapter,
} from "../../../../api/a2Api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
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
      className="hover:bg-gray-50"
    >
      <td className="px-2 py-3">
        <button {...attributes} {...listeners} className="cursor-grab p-1">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
      </td>
      <td className="px-2 py-3">{chapter.order_index + 1}</td>
      <td className="px-2 py-3">{chapter.chapter_name}</td>
      <td className="px-2 py-3 text-right">
        <button
          onClick={() => onDelete(chapter)}
          disabled={deletingId === chapter.id}
          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {deletingId === chapter.id ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete
        </button>
      </td>
    </tr>
  );
}
export default function A2ListeningManage() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await getA2Chapters("listening");
      setChapters(res.data);
      setHasChanges(false);
    } catch (err) {
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchChapters();
  }, []);
  const handleDelete = async (chapter) => {
    if (!window.confirm(`Delete "${chapter.chapter_name}"?`)) return;
    setDeletingId(chapter.id);
    try {
      await deleteA2Chapter("listening", chapter.id);
      setChapters((prev) => prev.filter((ch) => ch.id !== chapter.id));
    } catch (err) {
      setStatus("error:Failed");
    } finally {
      setDeletingId(null);
    }
  };
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setChapters((items) =>
        arrayMove(
          items,
          items.findIndex((i) => i.id === active.id),
          items.findIndex((i) => i.id === over.id),
        ),
      );
      setHasChanges(true);
    }
  };
  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      await reorderA2Chapters(
        "listening",
        chapters.map((ch) => ch.id),
      );
      setHasChanges(false);
      setChapters((prev) =>
        prev.map((ch, idx) => ({ ...ch, order_index: idx })),
      );
    } catch (err) {
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Manage A2 Listening
        </h1>
        <button
          onClick={fetchChapters}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      {chapters.length > 0 && (
        <div className="bg-white shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b flex justify-between">
            <h2 className="font-semibold">Chapters ({chapters.length})</h2>
            {hasChanges && (
              <button
                onClick={handleSaveOrder}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                {isSaving ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Order
              </button>
            )}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="table-auto w-full">
              <thead>
                <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
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
