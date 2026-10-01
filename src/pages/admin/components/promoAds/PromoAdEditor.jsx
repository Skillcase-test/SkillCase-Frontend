import { useRef, useState } from "react";
import { ArrowLeft, Loader2, Save, Upload } from "lucide-react";
import {
  AD_CTA_TYPES,
  AD_FREQUENCIES,
  AD_LEVELS,
  AD_POSITIONS,
  AD_SURFACES,
  AD_TEMPLATES,
  POSITION_ALIGN,
} from "../../../../components/promoAds/promoAdConfig";
import { PromoAdCard } from "../../../../components/promoAds/PromoAdCard";
import UserIdPicker from "./UserIdPicker";
import {
  fromLocalInput,
  newAdDraft,
  toLocalInput,
  validateAd,
} from "./promoAdForm";

const inputCls =
  "h-9 px-3 w-full bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#083262]/50 placeholder:text-slate-300 disabled:opacity-50";

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
  route: "/video-courses",
  url: "https://…",
  whatsapp: "+91…",
  call: "+91…",
};

// Editor — fields left; right shows the real ad components in a phone frame.
const PromoAdEditor = ({
  record,
  canEdit,
  saving,
  uploadingImage,
  onSave,
  onUploadImage,
  onCancel,
}) => {
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
  const fileRef = useRef(null);
  const errors = validateAd(form);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const previewAd = {
    ...form,
    image_download_url:
      record?.image_download_url || form.image_download_url || null,
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
          <label className="flex items-center gap-2 px-3 h-9 bg-white border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#083262]"
              checked={!!form.is_active}
              disabled={!canEdit}
              onChange={(e) => set({ is_active: e.target.checked })}
            />
            <span className="text-[11px] font-bold text-slate-600">
              Live for users
            </span>
          </label>
          <button
            type="button"
            disabled={!canEdit || saving || errors.length > 0}
            onClick={() =>
              onSave({
                ...form,
                starts_at: fromLocalInput(form.starts_at),
                ends_at: fromLocalInput(form.ends_at),
              })
            }
            className="h-9 px-4 bg-[#083262] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 hover:bg-[#0a2d52] disabled:opacity-50 cursor-pointer"
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
              <div className="w-28 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {previewAd.image_download_url ? (
                  <img
                    src={previewAd.image_download_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-4 h-4 text-slate-300" />
                )}
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
              <select
                className={inputCls}
                value={form.cta_type}
                disabled={!canEdit}
                onChange={(e) => set({ cta_type: e.target.value })}
              >
                {AD_CTA_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
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
            {form.cta_type !== "none" && (
              <input
                className={inputCls}
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
                      ? "bg-[#083262] text-white border-[#083262]"
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
                      ? "bg-indigo-50 text-indigo-700 border-indigo-300"
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
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300"
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
                      ? "bg-[#083262] text-white border-[#083262]"
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
          <FieldLabel>Live preview</FieldLabel>
          <div className="flex-1 min-h-0 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-12 bg-[#002856] rounded-t-2xl" />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-white border-t border-slate-200" />
            <div
              className={`absolute inset-0 p-3 pt-14 pb-16 flex ${POSITION_ALIGN[form.position] || POSITION_ALIGN.bottom_right}`}
            >
              <PromoAdCard
                key={`${form.template}-${form.position}`}
                ad={previewAd}
              />
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
