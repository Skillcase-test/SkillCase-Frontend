import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  adminListOpportunities,
  adminCreateOpportunity,
  adminUpdateOpportunity,
  adminReorderOpportunities,
  adminDeleteOpportunity,
  adminUploadOpportunityImage,
} from "../../../../api/jobScreeningAdminApi";
import OpportunityEditor from "./OpportunityEditor";
import { oppAlpha, oppShade } from "../../../../components/opportunity/opportunityTheme";
import { OPPORTUNITY_LIMITS as L } from "./opportunityForm";

// Opportunities tab — drafts are unlimited, at most L.ACTIVE_MAX may be live.
// Rows are drag-reordered; that order is also the candidate listing order.

const SortableRow = ({ item, canEdit, busy, onEdit, onToggleActive, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl px-3 py-2.5 ${
        isDragging ? "shadow-lg z-10 relative" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={!canEdit}
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing disabled:opacity-30"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div
        className="w-11 h-11 rounded-xl border overflow-hidden flex items-center justify-center shrink-0"
        style={{
          borderColor: oppAlpha(item.color, 0.4),
          backgroundColor: oppAlpha(item.color, 0.08),
        }}
      >
        {item.image_download_url ? (
          <img
            src={item.image_download_url}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: oppShade(item.color, 0.7) }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-800 truncate">
          {item.title}
        </p>
        <p className="text-[10px] font-medium text-slate-400 truncate">
          {item.short_description || "—"}
        </p>
      </div>
      <span
        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
          item.is_active
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}
      >
        {item.is_active ? "Live" : "Draft"}
      </span>
      <span className="text-[10px] font-bold text-slate-400 w-14 text-right">
        {item.selection_count || 0} picked
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleActive(item)}
          disabled={!canEdit || busy}
          className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold cursor-pointer disabled:opacity-40 ${
            item.is_active
              ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          {item.is_active ? "Unpublish" : "Publish"}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#083262] hover:bg-blue-50 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={!canEdit || busy}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const OpportunityManager = ({ canEdit }) => {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined=list, null=new, record=edit
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refresh = async () => {
    try {
      const res = await adminListOpportunities();
      setItems(res.data?.data || []);
      return res.data?.data || [];
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load opportunities");
      setItems([]);
      return [];
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeCount = (items || []).filter((o) => o.is_active).length;

  const handleToggleActive = async (item) => {
    if (!canEdit) return toast.error("You have view-only access to Job Screening");
    if (!item.is_active && activeCount >= L.ACTIVE_MAX) {
      return toast.error(`Only ${L.ACTIVE_MAX} opportunities can be live at once`);
    }
    setBusy(true);
    try {
      await adminUpdateOpportunity(item.id, { is_active: !item.is_active });
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id || !canEdit) return;
    const oldIdx = items.findIndex((o) => o.id === active.id);
    const newIdx = items.findIndex((o) => o.id === over.id);
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    try {
      await adminReorderOpportunities(next.map((o) => o.id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reorder failed");
      refresh();
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        short_description: form.short_description,
        color: form.color,
        points: (form.points || []).filter((p) => String(p).trim()),
        blocks: form.blocks,
        is_active: !!form.is_active,
      };
      const res = editing?.id
        ? await adminUpdateOpportunity(editing.id, payload)
        : await adminCreateOpportunity(payload);
      toast.success(editing?.id ? "Opportunity updated" : "Opportunity created");
      await refresh();
      setEditing(res.data?.data || null); // stay open — enables image upload
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (file) => {
    if (!editing?.id) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminUploadOpportunityImage(editing.id, fd);
      toast.success("Image uploaded");
      setEditing(res.data?.data || editing);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    const item = confirmDelete;
    setConfirmDelete(null);
    setBusy(true);
    try {
      await adminDeleteOpportunity(item.id);
      toast.success("Opportunity deleted");
      if (editing?.id === item.id) setEditing(undefined);
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (editing !== undefined) {
    return (
      <OpportunityEditor
        // Re-key on save/upload so the editor re-initializes from the
        // persisted record (e.g. new image_download_url) instead of stale form state.
        key={`${editing?.id ?? "new"}:${editing?.updated_at ?? ""}`}
        record={editing}
        canEdit={canEdit}
        saving={saving}
        uploadingImage={uploadingImage}
        onSave={handleSave}
        onUploadImage={handleUploadImage}
        onCancel={() => {
          setEditing(undefined);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[11px] font-semibold text-slate-500">
          {activeCount}/{L.ACTIVE_MAX} live · drafts are unlimited · drag to set
          candidate listing order
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setEditing(null)}
            className="h-9 px-3.5 bg-[#083262] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 hover:bg-[#0a2d52] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New opportunity
          </button>
        </div>
      </div>

      {items === null ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-white border border-dashed border-slate-300 rounded-2xl">
          <p className="text-xs font-bold text-slate-500">
            No opportunities yet
          </p>
          <p className="text-[10px] font-medium text-slate-400">
            Create one — while none are live, candidates auto-skip this step.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  busy={busy}
                  onEdit={(it) => setEditing(it)}
                  onToggleActive={handleToggleActive}
                  onDelete={setConfirmDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-80 flex flex-col gap-3">
            <h4 className="text-sm font-extrabold text-slate-800">
              Delete “{confirmDelete.title}”?
            </h4>
            <p className="text-[11px] font-medium text-slate-500">
              {confirmDelete.selection_count > 0
                ? `${confirmDelete.selection_count} candidate(s) picked this — their selection will be cleared.`
                : "This cannot be undone."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityManager;
