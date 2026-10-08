import { useEffect, useState } from "react";
import {
  adminGetIrelandOpportunityContent,
  adminUpdateIrelandOpportunityContent,
} from "../../../api/irelandJobsAdminApi";
import { Plus, RotateCcw, Save, X } from "lucide-react";
import { toast } from "react-hot-toast";

const INPUT =
  "w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all";
const LABEL =
  "text-[9px] font-bold text-slate-400 uppercase tracking-widest";
const SECTION_CARD =
  "p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2.5";
const REMOVE_BTN =
  "text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0 disabled:opacity-40";
const ADD_BTN =
  "py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-[10px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1";

const KIND_LABELS = {
  table: "Table (label/value rows)",
  steps: "Journey steps",
  cards: "Cards (title + text)",
  text: "Text + bullets",
};

const clone = (v) => JSON.parse(JSON.stringify(v));

const newSectionFor = (kind) => ({
  id: `sec_${Date.now().toString(36)}`,
  title: "New section",
  kind,
  ...(kind === "table" ? { rows: [{ label: "", value: "" }] } : {}),
  ...(kind === "steps" ? { steps: [] } : {}),
  ...(kind === "cards" ? { items: [{ title: "", text: "" }] } : {}),
});

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className={LABEL}>{label}</label>
    {children}
  </div>
);

// Per-role editor for the candidate-facing opportunity pages. Edits a local
// draft of content[role]; Save replaces the stored override; Reset drops it
// so the code defaults apply again.
const IrelandOpportunityEditor = ({ canEdit }) => {
  const [content, setContent] = useState(null);
  const [role, setRole] = useState("nurse");
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [newKind, setNewKind] = useState("text");

  useEffect(() => {
    let cancelled = false;
    adminGetIrelandOpportunityContent()
      .then(({ data }) => {
        if (!cancelled) setContent(data?.data || null);
      })
      .catch(() => toast.error("Failed to load opportunity content"));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraft(content?.[role] ? clone(content[role]) : null);
    setDirty(false);
    setResetArmed(false);
  }, [content, role]);

  const update = (fn) => {
    setDraft((d) => {
      const next = clone(d);
      fn(next);
      return next;
    });
    setDirty(true);
  };

  const updateHeader = (k, v) => update((d) => (d.header[k] = v));
  const updateCta = (k, v) => update((d) => (d.cta[k] = v));
  const updateSection = (i, patch) =>
    update((d) => Object.assign(d.sections[i], patch));
  const removeSection = (i) => update((d) => d.sections.splice(i, 1));
  const addSection = () =>
    update((d) => d.sections.push(newSectionFor(newKind)));

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await adminUpdateIrelandOpportunityContent(role, {
        content: draft,
      });
      if (data?.success) {
        setContent(data.data);
        toast.success("Opportunity content saved");
      } else {
        toast.error("Failed to save");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!resetArmed) {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    try {
      setSaving(true);
      const { data } = await adminUpdateIrelandOpportunityContent(role, {
        reset: true,
      });
      if (data?.success) {
        setContent(data.data);
        toast.success("Restored default content");
      } else {
        toast.error("Failed to reset");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset");
    } finally {
      setSaving(false);
      setResetArmed(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pr-1 pb-10">
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
        <div className="text-left">
          <h3 className="text-sm font-extrabold text-[#083262]">
            Opportunity Content
          </h3>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">
            The text candidates see on each role&apos;s opportunity page.
            Defaults ship with the app — edits here override them.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 shrink-0">
          {["nurse", "caregiver"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                role === r
                  ? "bg-[#083262] text-white shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!draft ? (
        <p className="text-[10px] text-slate-400 italic">Loading…</p>
      ) : (
        <fieldset disabled={!canEdit || saving} className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-3">
            <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
              Header
            </span>
            <div className="grid sm:grid-cols-2 gap-3 text-left">
              <Field label="Title">
                <input
                  value={draft.header.title || ""}
                  onChange={(e) => updateHeader("title", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Status chip">
                <input
                  value={draft.header.status || ""}
                  onChange={(e) => updateHeader("status", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Subtitle">
                  <input
                    value={draft.header.subtitle || ""}
                    onChange={(e) => updateHeader("subtitle", e.target.value)}
                    className={INPUT}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-3">
            <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
              Sections — shown in order, first one stays expanded
            </span>
            <div className="flex flex-col gap-3 text-left">
              {draft.sections.map((section, i) => (
                <div key={section.id || i} className={SECTION_CARD}>
                  <div className="flex items-center gap-2">
                    <input
                      value={section.title || ""}
                      onChange={(e) =>
                        updateSection(i, { title: e.target.value })
                      }
                      placeholder="Section title"
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:border-[#083262]"
                    />
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider bg-blue-50 text-[#083262] border-blue-100 shrink-0">
                      {KIND_LABELS[section.kind] || section.kind}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeSection(i)}
                        className={REMOVE_BTN}
                        title="Remove section"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <textarea
                    value={section.body || ""}
                    onChange={(e) =>
                      updateSection(i, {
                        body: e.target.value || undefined,
                      })
                    }
                    placeholder="Intro text (optional)"
                    rows={2}
                    className={`${INPUT} resize-none`}
                  />

                  {section.kind === "table" && (
                    <div className="flex flex-col gap-1.5">
                      {(section.rows || []).map((r, ri) => (
                        <div key={ri} className="flex items-center gap-1.5">
                          <input
                            value={r.label}
                            onChange={(e) =>
                              update((d) => {
                                d.sections[i].rows[ri].label = e.target.value;
                              })
                            }
                            placeholder="Label"
                            className="w-2/5 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white focus:outline-none focus:border-[#083262]"
                          />
                          <input
                            value={r.value}
                            onChange={(e) =>
                              update((d) => {
                                d.sections[i].rows[ri].value = e.target.value;
                              })
                            }
                            placeholder="Value"
                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white focus:outline-none focus:border-[#083262]"
                          />
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                update((d) => d.sections[i].rows.splice(ri, 1))
                              }
                              className={REMOVE_BTN}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            update((d) =>
                              (d.sections[i].rows ||= []).push({
                                label: "",
                                value: "",
                              }),
                            )
                          }
                          className={ADD_BTN}
                        >
                          <Plus className="w-3 h-3" /> Add row
                        </button>
                      )}
                    </div>
                  )}

                  {section.kind === "steps" && (
                    <textarea
                      value={(section.steps || []).join("\n")}
                      onChange={(e) =>
                        updateSection(i, {
                          steps: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="One step per line"
                      rows={4}
                      className={`${INPUT} resize-y`}
                    />
                  )}

                  {section.kind === "cards" && (
                    <div className="flex flex-col gap-2">
                      {(section.items || []).map((it, ii) => (
                        <div
                          key={ii}
                          className="bg-white border border-slate-100 rounded-lg p-2 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              value={it.title}
                              onChange={(e) =>
                                update((d) => {
                                  d.sections[i].items[ii].title =
                                    e.target.value;
                                })
                              }
                              placeholder="Title"
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold bg-white focus:outline-none focus:border-[#083262]"
                            />
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() =>
                                  update((d) =>
                                    d.sections[i].items.splice(ii, 1),
                                  )
                                }
                                className={REMOVE_BTN}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <textarea
                            value={it.text}
                            onChange={(e) =>
                              update((d) => {
                                d.sections[i].items[ii].text = e.target.value;
                              })
                            }
                            placeholder="Text"
                            rows={2}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white focus:outline-none focus:border-[#083262] resize-none"
                          />
                        </div>
                      ))}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            update((d) =>
                              (d.sections[i].items ||= []).push({
                                title: "",
                                text: "",
                              }),
                            )
                          }
                          className={ADD_BTN}
                        >
                          <Plus className="w-3 h-3" /> Add item
                        </button>
                      )}
                    </div>
                  )}

                  {(section.kind === "text" || section.list) && (
                    <textarea
                      value={(section.list || []).join("\n")}
                      onChange={(e) =>
                        updateSection(i, {
                          list: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Bullet points — one per line (optional)"
                      rows={3}
                      className={`${INPUT} resize-y`}
                    />
                  )}

                  <input
                    value={section.note || ""}
                    onChange={(e) =>
                      updateSection(i, { note: e.target.value || undefined })
                    }
                    placeholder="Footnote — highlighted box (optional)"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-amber-50/40 focus:outline-none focus:border-[#083262]"
                  />
                </div>
              ))}

              {canEdit && (
                <div className="flex items-center gap-2">
                  <select
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
                  >
                    {Object.entries(KIND_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addSection}
                    className={ADD_BTN}
                  >
                    <Plus className="w-3 h-3" /> Add section
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-3">
            <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
              Closing Call-to-Action
            </span>
            <div className="grid sm:grid-cols-2 gap-3 text-left">
              <Field label="Heading">
                <input
                  value={draft.cta.heading || ""}
                  onChange={(e) => updateCta("heading", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Subtext">
                <input
                  value={draft.cta.subtext || ""}
                  onChange={(e) => updateCta("subtext", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Primary button">
                <input
                  value={draft.cta.primaryLabel || ""}
                  onChange={(e) => updateCta("primaryLabel", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Secondary button">
                <input
                  value={draft.cta.secondaryLabel || ""}
                  onChange={(e) => updateCta("secondaryLabel", e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className={`py-2 px-4 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  resetArmed
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                } disabled:opacity-40`}
              >
                <RotateCcw className="w-3 h-3" />
                {resetArmed ? "Click again to confirm reset" : "Reset to defaults"}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className="py-2.5 px-6 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save Content"}
              </button>
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
};

export default IrelandOpportunityEditor;
