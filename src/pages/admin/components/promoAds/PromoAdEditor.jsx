import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Play,
  Save,
  Upload,
  X,
} from "lucide-react";
import {
  AD_CTA_TYPES,
  AD_FREQUENCIES,
  AD_IMAGE_RATIOS,
  AD_LEVELS,
  AD_POSITIONS,
  AD_SURFACES,
  AD_TEMPLATES,
  POSITION_INNER,
  POSITION_MOTION,
} from "../../../../components/promoAds/promoAdConfig";
import { PromoAdCard } from "../../../../components/promoAds/PromoAdCard";
import UserIdPicker from "./UserIdPicker";
import ScreenPicker from "./ScreenPicker";
import {
  fromLocalInput,
  newAdDraft,
  toLocalInput,
  validateAd,
} from "./promoAdForm";

const inputCls =
  "h-9 px-3 w-full bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-slate-300 placeholder:text-slate-300 disabled:opacity-50";

// Small custom dropdown for the CTA type — replaces the native <select>.
const CtaTypeSelect = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const selected = AD_CTA_TYPES.find((t) => t.key === value);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 w-full bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 text-left flex items-center justify-between gap-2 cursor-pointer outline-none disabled:opacity-50"
      >
        <span>{selected?.label || "Select"}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="promo-picker-drop absolute top-full mt-1 left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {AD_CTA_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                onChange(t.key);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-[11px] font-bold cursor-pointer outline-none hover:bg-slate-50 ${
                value === t.key
                  ? "bg-[#002856]/5 text-[#002856]"
                  : "text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
    {children}
  </p>
);

const Section = ({ title, children }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
    <FieldLabel>{title}</FieldLabel>
    {children}
  </div>
);

const toggleInList = (list, key) =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

const CTA_PLACEHOLDERS = {
  url: "https://example.com",
  call: "+91 98xxxxxxxx",
};

// Editor — fields left; right shows the real ad components in a phone frame.
const PromoAdEditor = ({ record, canEdit, saving, onSave, onCancel }) => {
  const [form, setForm] = useState(() => ({
    ...newAdDraft(),
    ...(record || {}),
    placements: record?.placements || [],
    levels: record?.levels || [],
    target_user_ids: record?.target_user_ids || [],
    exclude_user_ids: record?.exclude_user_ids || [],
    starts_at: toLocalInput(record?.starts_at),
    ends_at: toLocalInput(record?.ends_at),
  }));
  const [pendingFile, setPendingFile] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [animKey, setAnimKey] = useState(0); // bump to replay entrance
  const [previewShown, setPreviewShown] = useState(true);
  const fileRef = useRef(null);

  // Reshow the preview ad when its shape changes.
  useEffect(() => setPreviewShown(true), [form.template, form.position]);

  const replayPreview = () => {
    setPreviewShown(true);
    setAnimKey((k) => k + 1);
  };
  const errors = validateAd(form);

  const pendingPreview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  useEffect(
    () => () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    },
    [pendingPreview],
  );

  const shownImage =
    pendingPreview || (imageRemoved ? null : record?.image_download_url) || null;

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      return toast.error("Image must be under 5MB");
    }
    setPendingFile(f);
    setImageRemoved(false);
  };

  const clearImage = () => {
    setPendingFile(null);
    if (record?.image_download_url) setImageRemoved(true);
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const previewAd = {
    ...form,
    image_download_url: shownImage,
    title: form.title || "Ad title",
    body: form.body || "Ad body text goes here",
    cta_label: form.cta_label || "Open",
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
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
              {record?.id ? `Edit — ${record.title}` : "New ad"}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">
              {record?.view_count || 0} views · {record?.click_count || 0} clicks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="checkbox"
            aria-checked={!!form.is_active}
            disabled={!canEdit}
            onClick={() => set({ is_active: !form.is_active })}
            className="flex items-center gap-2 px-3 h-9 bg-white border border-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                form.is_active
                  ? "bg-[#002856] border-[#002856]"
                  : "bg-white border-slate-300"
              }`}
            >
              {form.is_active && (
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              )}
            </span>
            <span className="text-[11px] font-bold text-slate-600">
              Live for users
            </span>
          </button>
          <button
            type="button"
            disabled={!canEdit || saving || errors.length > 0}
            onClick={() =>
              onSave(
                {
                  ...form,
                  starts_at: fromLocalInput(form.starts_at),
                  ends_at: fromLocalInput(form.ends_at),
                },
                pendingFile,
                imageRemoved,
              )
            }
            className="h-9 px-4 bg-[#002856] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 hover:bg-[#083262] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving…" : "Save ad"}
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
        <div className="flex-1 min-w-0 overflow-y-auto pr-1 flex flex-col gap-4">
          <Section title="Content">
            <input
              className={inputCls}
              value={form.title}
              disabled={!canEdit}
              placeholder="Title"
              onChange={(e) => set({ title: e.target.value })}
            />
            <textarea
              className={`${inputCls} h-auto py-2 resize-none`}
              rows={2}
              value={form.body}
              disabled={!canEdit}
              placeholder="Body text (optional)"
              onChange={(e) => set({ body: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <div className="relative w-28 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {shownImage ? (
                  <img
                    src={shownImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-4 h-4 text-slate-300" />
                )}
                {shownImage && canEdit && (
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={clearImage}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center cursor-pointer hover:bg-slate-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => fileRef.current?.click()}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {shownImage ? "Change image" : "Upload image"}
                </button>
                {pendingFile && (
                  <p className="text-[9px] font-semibold text-slate-400">
                    Uploads on save · PNG/JPG/WebP, max 5MB
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            {form.template === "card" && (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-slate-500">
                  Image shape{" "}
                  <span className="font-medium text-slate-400">
                    (how the image frame is cropped)
                  </span>
                </p>
                <div className="flex gap-1.5">
                  {AD_IMAGE_RATIOS.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => set({ image_ratio: r.key })}
                      className={`h-7 px-3 rounded-lg text-[10px] font-extrabold cursor-pointer border transition-colors disabled:opacity-50 ${
                        form.image_ratio === r.key
                          ? "bg-[#002856] text-white border-[#002856]"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <FieldLabel>Accent</FieldLabel>
              <input
                type="color"
                value={form.color}
                disabled={!canEdit}
                onChange={(e) => set({ color: e.target.value })}
                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50"
              />
              <span className="text-[10px] font-mono text-slate-400">
                {form.color}
              </span>
            </div>
          </Section>

          <Section title="Action button">
            <div className="grid grid-cols-2 gap-2">
              <CtaTypeSelect
                value={form.cta_type}
                disabled={!canEdit}
                onChange={(k) => set({ cta_type: k })}
              />
              {form.cta_type !== "none" && (
                <input
                  className={inputCls}
                  value={form.cta_label}
                  disabled={!canEdit}
                  placeholder="Button label"
                  onChange={(e) => set({ cta_label: e.target.value })}
                />
              )}
            </div>
            {form.cta_type === "route" && (
              <ScreenPicker
                value={form.cta_target}
                disabled={!canEdit}
                onChange={(p) => set({ cta_target: p })}
              />
            )}
            {(form.cta_type === "url" || form.cta_type === "call") && (
              <input
                className={inputCls}
                type={form.cta_type === "call" ? "tel" : "url"}
                value={form.cta_target}
                disabled={!canEdit}
                placeholder={CTA_PLACEHOLDERS[form.cta_type] || "Target"}
                onChange={(e) => set({ cta_target: e.target.value })}
              />
            )}
          </Section>

          <Section title="Template & position">
            <div className="flex gap-1.5">
              {AD_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => set({ template: t.key })}
                  className={`h-8 px-3 rounded-lg text-[11px] font-extrabold cursor-pointer border transition-colors disabled:opacity-50 ${
                    form.template === t.key
                      ? "bg-[#002856] text-white border-[#002856]"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {AD_POSITIONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => set({ position: p.key })}
                  className={`h-8 rounded-lg text-[10px] font-bold cursor-pointer border transition-colors disabled:opacity-50 ${
                    form.position === p.key
                      ? "bg-[#002856]/5 text-[#002856] border-[#002856]/30"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Where it shows">
            <div className="flex flex-wrap gap-1.5">
              {AD_SURFACES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() =>
                    set({ placements: toggleInList(form.placements, s.key) })
                  }
                  className={`h-7 px-2.5 rounded-full text-[10px] font-extrabold cursor-pointer border transition-colors disabled:opacity-50 ${
                    form.placements.includes(s.key)
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Who sees it">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-500">
                Levels{" "}
                <span className="font-medium text-slate-400">
                  (none picked = all levels)
                </span>
              </p>
              <div className="flex gap-1.5">
                {AD_LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      set({ levels: toggleInList(form.levels, l) })
                    }
                    className={`h-7 px-3 rounded-full text-[10px] font-extrabold uppercase cursor-pointer border transition-colors disabled:opacity-50 ${
                      form.levels.includes(l)
                        ? "bg-[#002856]/5 text-[#002856] border-[#002856]/30"
                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-500">
                Only these users{" "}
                <span className="font-medium text-slate-400">
                  (empty = everyone matching)
                </span>
              </p>
              <UserIdPicker
                values={form.target_user_ids}
                onChange={(v) => set({ target_user_ids: v })}
                canEdit={canEdit}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-500">
                Exclude these users
              </p>
              <UserIdPicker
                values={form.exclude_user_ids}
                onChange={(v) => set({ exclude_user_ids: v })}
                canEdit={canEdit}
                placeholder="Search users to exclude…"
              />
            </div>
          </Section>

          <Section title="Frequency & schedule">
            <div className="flex gap-1.5">
              {AD_FREQUENCIES.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => set({ frequency: f.key })}
                  className={`h-8 px-3 rounded-lg text-[11px] font-extrabold cursor-pointer border transition-colors disabled:opacity-50 ${
                    form.frequency === f.key
                      ? "bg-[#002856] text-white border-[#002856]"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-slate-500">
                  Starts at <span className="font-medium text-slate-400">(optional)</span>
                </p>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.starts_at}
                  disabled={!canEdit}
                  onChange={(e) => set({ starts_at: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-slate-500">
                  Ends at <span className="font-medium text-slate-400">(optional)</span>
                </p>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.ends_at}
                  disabled={!canEdit}
                  onChange={(e) => set({ ends_at: e.target.value })}
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Right: live preview in a phone-ish frame */}
        <div className="w-[300px] shrink-0 hidden lg:flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FieldLabel>Live preview</FieldLabel>
            <button
              type="button"
              onClick={replayPreview}
              className="h-6 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-extrabold text-slate-500 flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3" />
              Replay
            </button>
          </div>
          <div className="flex-1 min-h-0 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-12 bg-[#002856] rounded-t-2xl" />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-white border-t border-slate-200" />
            <div className="absolute inset-0 p-3 pt-14 pb-16">
              <AnimatePresence>
                {previewShown && (
                  <motion.div
                    key={`${animKey}-${form.template}-${form.position}`}
                    initial={{
                      opacity: 0.6,
                      scale: 0.92,
                      ...(POSITION_MOTION[form.position] ||
                        POSITION_MOTION.bottom_right),
                    }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      ...(POSITION_MOTION[form.position] ||
                        POSITION_MOTION.bottom_right),
                      transition: { duration: 0.22, ease: [0.5, 0, 1, 0.4] },
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className={`w-full h-full flex flex-col min-h-0 ${POSITION_INNER[form.position] || POSITION_INNER.bottom_right}`}
                  >
                    <PromoAdCard
                      ad={previewAd}
                      onDismiss={() => setPreviewShown(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-[9px] font-semibold text-slate-400">
            Rendered with the real in-app ad components
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromoAdEditor;
