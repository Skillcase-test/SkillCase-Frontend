import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Copy,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
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
  adminCreatePromoAd,
  adminDeletePromoAd,
  adminDuplicatePromoAd,
  adminListPromoAds,
  adminReorderPromoAds,
  adminUpdatePromoAd,
  adminUploadPromoAdImage,
} from "../../../../api/promoAdAdminApi";
import PromoAdEditor from "./PromoAdEditor";
import {
  AD_FREQUENCIES,
  AD_POSITIONS,
  AD_SURFACES,
  AD_TEMPLATES,
} from "../../../../components/promoAds/promoAdConfig";

const label = (list, key) => list.find((x) => x.key === key)?.label || key;
const surfaceLabel = (key) => label(AD_SURFACES, key);

const Chip = ({ className = "", children }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${className}`}
  >
    {children}
  </span>
);

const RowSkeleton = () => (
  <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl px-3 py-2.5 animate-pulse">
    <div className="w-4 h-4 rounded bg-slate-200" />
    <div className="w-11 h-11 rounded-xl bg-slate-200/80 shrink-0" />
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="h-3 w-2/5 bg-slate-200 rounded" />
      <div className="h-2.5 w-3/5 bg-slate-100 rounded" />
    </div>
    <div className="h-4.5 w-12 rounded-full bg-slate-200" />
    <div className="h-4.5 w-16 rounded-full bg-slate-100" />
    <div className="flex items-center gap-1">
      <div className="w-7 h-7 rounded-lg bg-slate-100" />
      <div className="w-7 h-7 rounded-lg bg-slate-100" />
      <div className="w-7 h-7 rounded-lg bg-slate-100" />
    </div>
  </div>
);

const SortableRow = ({
  item,
  canEdit,
  busy,
  onEdit,
  onToggleActive,
  onDelete,
  onDuplicate,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const schedule =
    item.starts_at || item.ends_at
      ? `${item.starts_at ? new Date(item.starts_at).toLocaleDateString() : "now"} → ${
          item.ends_at ? new Date(item.ends_at).toLocaleDateString() : "∞"
        }`
      : "always on";
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
        className="w-11 h-11 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 text-sm font-extrabold"
        style={{
          borderColor: `${item.color}55`,
          backgroundColor: `${item.color}14`,
          color: item.color,
        }}
      >
        {item.image_download_url ? (
          <img
            src={item.image_download_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          item.title?.[0]?.toUpperCase() || "A"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-800 truncate">
          {item.title}
        </p>
        <p className="text-[10px] font-medium text-slate-400 truncate">
          {item.placements.map(surfaceLabel).join(", ")} ·{" "}
          {label(AD_POSITIONS, item.position)} ·{" "}
          {label(AD_FREQUENCIES, item.frequency)} · {schedule}
        </p>
      </div>
      <Chip
        className={
          item.is_active
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-slate-100 text-slate-500 border-slate-200"
        }
      >
        {item.is_active ? "Live" : "Draft"}
      </Chip>
      <Chip className="bg-indigo-50 text-indigo-600 border-indigo-200">
        {label(AD_TEMPLATES, item.template)}
      </Chip>
      <Chip className="bg-slate-50 text-slate-500 border-slate-200">
        {item.levels.length ? item.levels.join("/").toUpperCase() : "All"}
      </Chip>
      <span className="text-[10px] font-bold text-slate-400 shrink-0 whitespace-nowrap">
        {item.view_count} views · {item.click_count} clicks
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
          onClick={() => onDuplicate(item)}
          disabled={!canEdit || busy}
          className="h-7 px-2.5 rounded-lg text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer disabled:opacity-40 flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          Duplicate
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

const PromoAdManager = ({ canEdit }) => {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined=list, null=new, record=edit
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(null);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refresh = async () => {
    try {
      const res = await adminListPromoAds();
      setItems(res.data?.data || []);
      return res.data?.data || [];
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load ads");
      setItems([]);
      return [];
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeCount = (items || []).filter((a) => a.is_active).length;

  const handleToggleActive = async (item) => {
    if (!canEdit) return toast.error("You have view-only access to Promo Ads");
    setBusy(true);
    try {
      await adminUpdatePromoAd(item.id, { is_active: !item.is_active });
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
      await adminReorderPromoAds(next.map((o) => o.id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reorder failed");
      refresh();
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const res = editing?.id
        ? await adminUpdatePromoAd(editing.id, form)
        : await adminCreatePromoAd(form);
      toast.success(editing?.id ? "Ad updated" : "Ad created");
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
      const res = await adminUploadPromoAdImage(editing.id, fd);
      toast.success("Image uploaded");
      setEditing(res.data?.data || editing);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDuplicate = async () => {
    const item = confirmDuplicate;
    setConfirmDuplicate(null);
    if (!canEdit) return toast.error("You have view-only access to Promo Ads");
    setBusy(true);
    try {
      const res = await adminDuplicatePromoAd(item.id);
      toast.success(`Duplicated "${item.title}" as a draft`);
      if (res.data?.data?.id) setEditing(res.data.data);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Duplicate failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const item = confirmDelete;
    setConfirmDelete(null);
    setBusy(true);
    try {
      await adminDeletePromoAd(item.id);
      toast.success("Ad deleted");
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
      <PromoAdEditor
        // Re-key on save so the editor re-inits from the persisted record.
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
          {activeCount} live · drafts are unlimited · drag to set priority
          (first eligible ad wins each screen entry)
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
            <Plus className="w-3.5 h-3.5" /> New ad
          </button>
        </div>
      </div>

      {items === null ? (
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {Array.from({ length: 4 }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-white border border-dashed border-slate-300 rounded-2xl">
          <p className="text-xs font-bold text-slate-500">No ads yet</p>
          <p className="text-[10px] font-medium text-slate-400">
            Create one — published ads appear on the hub screens you pick.
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
                  onDuplicate={setConfirmDuplicate}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {confirmDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-80 flex flex-col gap-3">
            <h4 className="text-sm font-extrabold text-slate-800">
              Duplicate “{confirmDuplicate.title}”?
            </h4>
            <p className="text-[11px] font-medium text-slate-500">
              A draft copy is created with its own image — edits won't affect
              the original. It won't be live until you publish it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDuplicate(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3" />
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-80 flex flex-col gap-3">
            <h4 className="text-sm font-extrabold text-slate-800">
              Delete “{confirmDelete.title}”?
            </h4>
            <p className="text-[11px] font-medium text-slate-500">
              Deletes the ad and its stats. This cannot be undone.
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

export default PromoAdManager;
