import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Save,
} from "lucide-react";
import BlockEditor from "./blockEditors";
import IconPicker from "./IconPicker";
import OpportunityDetailView from "../../../../components/opportunity/OpportunityDetailView";
import OpportunityImage from "../../../../components/opportunity/OpportunityImage";
import { oppAlpha, oppShade } from "../../../../components/opportunity/opportunityTheme";
import {
  BLOCK_CATALOG,
  OPPORTUNITY_LIMITS as L,
  blockMeta,
  newOpportunityDraft,
  normalizePoint,
  validateOpportunity,
} from "./opportunityForm";

// Opportunity editor — left: every editable field + the ordered dynamic block
// list; right: a fixed 414×896 phone frame rendering the real candidate detail
// components so what the admin sees is exactly what candidates get.

const inputCls =
  "h-9 px-3 w-full bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#083262]/50 placeholder:text-slate-300 disabled:opacity-50";

const FieldLabel = ({ children }) => (
  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
    {children}
  </p>
);

const countWords = (s) =>
  String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const OpportunityEditor = ({
  record, // existing row (with id) or null when creating
  canEdit,
  saving,
  uploadingImage,
  onSave, // (form) => void — parent runs create/update
  onUploadImage, // (file) => void — only when record?.id exists
  onCancel,
}) => {
  const [form, setForm] = useState(() => ({
    ...newOpportunityDraft(),
    ...(record || {}),
    points: record?.points?.length
      ? record.points.map(normalizePoint)
      : [{ icon: "", text: "" }],
    blocks: (record?.blocks || []).map((b) => ({ ...b })),
  }));
  const fileRef = useRef(null);
  const errors = validateOpportunity(form);
  const descWords = countWords(form.short_description);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setBlock = (i, next) =>
    set({ blocks: form.blocks.map((b, idx) => (idx === i ? next : b)) });
  const moveBlock = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= form.blocks.length) return;
    const next = [...form.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set({ blocks: next });
  };
  const removeBlock = (i) =>
    set({ blocks: form.blocks.filter((_, idx) => idx !== i) });

  const setPoint = (i, patch) =>
    set({
      points: form.points.map((p, idx) =>
        idx === i ? { ...normalizePoint(p), ...patch } : p,
      ),
    });

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              {record?.id ? `Edit — ${record.title}` : "New opportunity"}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">
              {record?.selection_count || 0} candidate
              {record?.selection_count === 1 ? "" : "s"} selected this path
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 h-9 bg-white border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#083262]"
              checked={!!form.is_active}
              disabled={!canEdit}
              onChange={(e) => set({ is_active: e.target.checked })}
            />
            <span className="text-[11px] font-bold text-slate-600">
              Live for candidates
            </span>
          </label>
          <button
            type="button"
            disabled={!canEdit || saving || errors.length > 0}
            onClick={() => onSave(form)}
            className="h-9 px-4 bg-[#083262] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 hover:bg-[#0a2d52] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving…" : "Save opportunity"}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {errors.map((e, i) => (
            <p key={i} className="text-[10px] font-bold text-amber-700">
              • {e}
            </p>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 flex gap-4">
        {/* ---- Left: form ---- */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-1 flex flex-col gap-4">
          {/* Image */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
            <FieldLabel>Image</FieldLabel>
            <div className="flex items-center gap-3">
              <div
                className="w-28 h-20 rounded-xl border overflow-hidden flex items-center justify-center"
                style={{
                  borderColor: oppAlpha(form.color, 0.4),
                  backgroundColor: oppAlpha(form.color, 0.06),
                }}
              >
                <OpportunityImage
                  src={form.image_download_url}
                  alt=""
                  className="w-full h-full"
                  placeholder={<Upload className="w-4 h-4 text-slate-300" />}
                />
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={!canEdit || !record?.id || uploadingImage}
                  onClick={() => fileRef.current?.click()}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Upload image
                </button>
                {!record?.id && (
                  <p className="text-[9px] font-semibold text-slate-400">
                    Save once to enable image upload
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadImage(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Core fields */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
            <FieldLabel>Basics</FieldLabel>
            <input
              className={inputCls}
              placeholder="Title"
              value={form.title}
              disabled={!canEdit}
              onChange={(e) => set({ title: e.target.value })}
            />
            <div>
              <textarea
                rows={2}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#083262]/50 placeholder:text-slate-300 disabled:opacity-50 resize-none"
                placeholder="Short description (max 10 words)"
                value={form.short_description}
                disabled={!canEdit}
                onChange={(e) => set({ short_description: e.target.value })}
              />
              <p
                className={`text-[9px] font-bold text-right ${
                  descWords > L.SHORT_DESC_MAX_WORDS
                    ? "text-rose-500"
                    : "text-slate-400"
                }`}
              >
                {descWords}/{L.SHORT_DESC_MAX_WORDS} words
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Candidate level</FieldLabel>
              <div className="flex gap-1.5">
                {[
                  { value: "all", label: "All levels" },
                  { value: "b1", label: "B1" },
                  { value: "b2", label: "B2" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => set({ level: opt.value })}
                    className={`h-8 px-3.5 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer disabled:opacity-50 ${
                      (form.level || "all") === opt.value
                        ? "bg-[#083262] text-white border-[#083262]"
                        : "bg-white text-slate-500 border-slate-200 hover:border-[#083262]/40 hover:text-[#083262]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-semibold text-slate-400">
                {form.level === "b1"
                  ? "Only B1 candidates see this path"
                  : form.level === "b2"
                    ? "Only B2 candidates see this path"
                    : "Every candidate sees this path"}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Points (max 3, up to 4 words each)</FieldLabel>
              {form.points.map((p, i) => {
                const pt = normalizePoint(p);
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <IconPicker
                      value={pt.icon}
                      disabled={!canEdit}
                      onChange={(icon) => setPoint(i, { icon })}
                    />
                    <input
                      className={inputCls}
                      placeholder={`Point ${i + 1}`}
                      value={pt.text}
                      disabled={!canEdit}
                      onChange={(e) => setPoint(i, { text: e.target.value })}
                    />
                    <button
                      type="button"
                      disabled={!canEdit || form.points.length <= 1}
                      onClick={() =>
                        set({ points: form.points.filter((_, idx) => idx !== i) })
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {form.points.length < L.POINTS_MAX && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() =>
                    set({ points: [...form.points, { icon: "", text: "" }] })
                  }
                  className="h-7 px-2.5 self-start flex items-center gap-1 rounded-lg border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 hover:border-[#083262]/50 hover:text-[#083262] cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" /> Add point
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Theme color</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : "#2563eb"}
                  disabled={!canEdit}
                  onChange={(e) => set({ color: e.target.value })}
                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50 p-0.5 bg-white"
                />
                <input
                  className={`${inputCls} w-28`}
                  placeholder="#2563eb"
                  value={form.color}
                  disabled={!canEdit}
                  onChange={(e) => set({ color: e.target.value })}
                />
                <span
                  className="w-6 h-6 rounded-lg border border-slate-200"
                  style={{ backgroundColor: oppShade(form.color, 1) }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic blocks */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
            <FieldLabel>Content blocks ({form.blocks.length})</FieldLabel>
            {form.blocks.map((block, i) => (
              <div
                key={i}
                className="border border-slate-200/80 rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 text-[11px] font-extrabold text-slate-700">
                    {blockMeta(block.type).label}
                  </span>
                  <button
                    type="button"
                    disabled={!canEdit || i === 0}
                    onClick={() => moveBlock(i, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit || i === form.blocks.length - 1}
                    onClick={() => moveBlock(i, 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => removeBlock(i)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[9px] font-medium text-slate-400 -mt-1">
                  {blockMeta(block.type).hint}
                </p>
                <BlockEditor
                  block={block}
                  disabled={!canEdit}
                  onChange={(next) => setBlock(i, next)}
                />
              </div>
            ))}
            {form.blocks.length < L.BLOCKS_MAX && (
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_CATALOG.map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      set({ blocks: [...form.blocks, b.factory()] })
                    }
                    className="h-7 px-2.5 flex items-center gap-1 rounded-lg border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 hover:border-[#083262]/50 hover:text-[#083262] cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" /> {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---- Right: 414×896 live preview ---- */}
        <div className="shrink-0 hidden xl:flex flex-col items-center gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Candidate preview · 414 × 896
          </p>
          <div
            className="border-[3px] border-slate-800 rounded-[28px] overflow-hidden bg-white shadow-xl"
            style={{ width: 414, height: 896 }}
          >
            <div className="w-full h-full overflow-y-auto flex flex-col">
              <div className="w-full px-4 pt-4 pb-3 flex items-center justify-start gap-3 border-b border-slate-200/80 bg-white sticky top-0 z-10 shrink-0">
                <div className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="text-base font-semibold text-[#002856] tracking-tight">
                  German Pathways
                </span>
              </div>
              <OpportunityDetailView opportunity={form} preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityEditor;
