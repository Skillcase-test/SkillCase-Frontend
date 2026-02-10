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
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="px-2 py-3">
        <button {...attributes} {...listeners} className="cursor-grab p-1">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
      </td>
      <td className="px-2 py-3">
        <div className="font-medium text-gray-800">
          {chapter.order_index + 1}
        </div>
      </td>
      <td className="px-2 py-3">
        <div className="font-medium text-gray-800">{chapter.chapter_name}</div>
      </td>
      <td className="px-2 py-3 text-right">
        <button
          onClick={() => onDelete(chapter)}
          disabled={deletingId === chapter.id}
          className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          {deletingId === chapter.id ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete
            </>
          )}
        </button>
      </td>
    </tr>
  );
}
export default function A2GrammarManage() {
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
      const res = await getA2Chapters("grammar");
      setChapters(res.data);
      setStatus(
        res.data.length > 0
          ? `success:Found ${res.data.length} chapters`
          : "info:No chapters found",
      );
      setHasChanges(false);
    } catch (err) {
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
    if (!window.confirm(`Delete "${chapter.chapter_name}"?`)) return;
    setDeletingId(chapter.id);
    try {
      await deleteA2Chapter("grammar", chapter.id);
      setStatus(`success:"${chapter.chapter_name}" deleted!`);
      setChapters((prev) => prev.filter((ch) => ch.id !== chapter.id));
    } catch (err) {
      setStatus(`error:Failed to delete`);
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
        "grammar",
        chapters.map((ch) => ch.id),
      );
      setStatus("success:Order saved!");
      setHasChanges(false);
      setChapters((prev) =>
        prev.map((ch, idx) => ({ ...ch, order_index: idx })),
      );
    } catch (err) {
      setStatus("error:Failed to save order");
    } finally {
      setIsSaving(false);
    }
  };
  const getStatusInfo = () => {
    if (!status) return null;
    const [type, message] = status.split(":");
    const config = {
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
    };
    return { type, message, config: config[type] || config.info };
  };
  const statusInfo = getStatusInfo();
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage A2 Grammar
          </h1>
        </div>
        <button
          onClick={fetchChapters}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      {statusInfo && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border mb-6 ${statusInfo.config.bg} ${statusInfo.config.border}`}
        >
          <statusInfo.config.icon
            className={`w-5 h-5 ${statusInfo.config.text}`}
          />
          <span className={`text-sm font-medium ${statusInfo.config.text}`}>
            {statusInfo.message}
          </span>
        </div>
      )}
      {chapters.length > 0 && (
        <div className="bg-white shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">
              Grammar Chapters ({chapters.length})
            </h2>
            {hasChanges && (
              <button
                onClick={handleSaveOrder}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
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
          <div className="p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-500 bg-gray-50 border-t border-b">
                  <tr>
                    <th className="px-2 py-3 w-10"></th>
                    <th className="px-2 py-3 text-left w-16">Order</th>
                    <th className="px-2 py-3 text-left">Name</th>
                    <th className="px-2 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <SortableContext
                  items={chapters.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="text-sm divide-y">
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
      )}
    </div>
  );
}
