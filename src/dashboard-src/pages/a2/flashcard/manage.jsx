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
// Sortable Row Component
function SortableRow({ chapter, onDelete, deletingId }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: chapter.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="font-medium text-gray-800">
          {chapter.order_index + 1}
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="font-medium text-gray-800">{chapter.chapter_name}</div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
        <button
          onClick={() => onDelete(chapter)}
          disabled={deletingId === chapter.id}
          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
        >
          {deletingId === chapter.id ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </>
          )}
        </button>
      </td>
    </tr>
  );
}
export default function A2FlashcardManage() {
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
    setStatus("loading:Fetching chapters...");
    try {
      const res = await getA2Chapters("flashcard");
      setChapters(res.data);
      setStatus(
        res.data.length > 0
          ? `success:Found ${res.data.length} chapters`
          : "info:No chapters found",
      );
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      setChapters([]);
      setStatus("error:Error fetching chapters");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchChapters();
  }, []);
  const handleDelete = async (chapter) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${chapter.chapter_name}"?`,
      )
    )
      return;
    setDeletingId(chapter.id);
    setStatus(`deleting:Deleting "${chapter.chapter_name}"...`);
    try {
      await deleteA2Chapter("flashcard", chapter.id);
      setStatus(`success:"${chapter.chapter_name}" deleted successfully!`);
      setChapters((prev) => prev.filter((ch) => ch.id !== chapter.id));
    } catch (err) {
      console.error(err);
      setStatus(`error:Failed to delete "${chapter.chapter_name}"`);
    } finally {
      setDeletingId(null);
    }
  };
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };
  const handleSaveOrder = async () => {
    setIsSaving(true);
    setStatus("uploading:Saving new order...");
    try {
      const orderedIds = chapters.map((ch) => ch.id);
      await reorderA2Chapters("flashcard", orderedIds);
      setStatus("success:Order saved successfully!");
      setHasChanges(false);

      // Update local order_index
      setChapters((prev) =>
        prev.map((ch, idx) => ({ ...ch, order_index: idx })),
      );
    } catch (err) {
      console.error(err);
      setStatus("error:Failed to save order");
    } finally {
      setIsSaving(false);
    }
  };
  const getStatusInfo = () => {
    if (!status) return null;
    const [type, message] = status.split(":");
    const statusConfig = {
      success: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: CheckCircle,
      },
      error: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: AlertCircle,
      },
      info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: AlertCircle,
      },
      loading: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: Loader,
      },
      deleting: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        icon: Loader,
      },
      uploading: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: Loader,
      },
    };
    return { type, message, config: statusConfig[type] };
  };
  const statusInfo = getStatusInfo();
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage A2 Flashcard Chapters
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Reorder or delete A2 flashcard chapters
          </p>
        </div>
        <button
          onClick={fetchChapters}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>
      {/* Status Message */}
      {statusInfo && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border mb-6 ${statusInfo.config.bg} ${statusInfo.config.border}`}
        >
          <statusInfo.config.icon
            className={`w-5 h-5 flex-shrink-0 ${statusInfo.config.text} ${
              ["loading", "deleting", "uploading"].includes(statusInfo.type)
                ? "animate-spin"
                : ""
            }`}
          />
          <span className={`text-sm font-medium ${statusInfo.config.text}`}>
            {statusInfo.message}
          </span>
        </div>
      )}
      {/* Chapters List */}
      {chapters.length > 0 && (
        <div className="bg-white shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">
              A2 Flashcard Chapters ({chapters.length})
            </h2>
            {hasChanges && (
              <button
                onClick={handleSaveOrder}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Order</span>
              </button>
            )}
          </div>
          <div className="p-3">
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="table-auto w-full">
                  <thead className="text-xs font-semibold uppercase text-gray-500 bg-gray-50 border-t border-b border-gray-200">
                    <tr>
                      <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left w-10"></th>
                      <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left w-16">
                        <div className="font-semibold">Order</div>
                      </th>
                      <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                        <div className="font-semibold">Chapter Name</div>
                      </th>
                      <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                        <div className="font-semibold">Action</div>
                      </th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={chapters.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="text-sm divide-y divide-gray-200">
                      {chapters.map((chapter) => (
                        <SortableRow
                          key={chapter.id}
                          chapter={chapter}
                          onDelete={handleDelete}
                          deletingId={deletingId}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
          </div>
        </div>
      )}
      
      {/* Warning Info Card */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-semibold mb-1">Drag & Drop to Reorder:</p>
            <p className="text-amber-600">
              Drag chapters using the grip icon to reorder them. Click "Save
              Order" to persist changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
