import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { RefreshCw, RotateCcw, Search, Lock, Activity, Link2, Trash2, Plus, Pencil, Infinity as InfinityIcon } from "lucide-react";
import {
  adminGetUsageLimitConfig,
  adminUpdateUsageLimitConfig,
  adminListUsageLimitUsers,
  adminGetUserUsageOverrides,
  adminUpdateUserUsageOverrides,
  adminResetUserUsage,
  adminGetUsageLimitAuditLog,
  adminCreateUsageLimitGroup,
  adminUpdateUsageLimitGroup,
  adminDeleteUsageLimitGroup,
  adminSetUsageLimitGroupActive,
  adminSetUserGroupOverride,
} from "../../api/usageLimitApi";
import { ControlDropdown } from "../payments-admin/components/controls";

// 'ALL' modules don't exist anymore (learn_german is per-level now) — every
// module in MODULE_REGISTRY lives under one of these three.
const LEVEL_ORDER = ["A1", "A2", "B1"];

// Mirrors backend util/usageLimits.js isUsageLimitEligible — cosmetic only
// (the server stays the authority), just so the admin can see at a glance
// why a given user's limits never seem to apply.
const MIN_APP_VERSION_PARTS = [1, 2, 5];
function isVersionBelowMin(version) {
  const parts = String(version || "").split(".").map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((parts[i] || 0) !== MIN_APP_VERSION_PARTS[i]) return (parts[i] || 0) < MIN_APP_VERSION_PARTS[i];
  }
  return false;
}
function ineligibleReason(u) {
  if (u.is_paid) return "paid user";
  if (u.autopay_enabled) return "autopay enabled";
  if (u.app_version && isVersionBelowMin(u.app_version)) return `app v${u.app_version} < 1.2.5`;
  return null;
}

function rowKey(level, moduleKey) {
  return `${level}:${moduleKey}`;
}

function formatCountdown(resetAt) {
  const ms = new Date(resetAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "resetting…";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Countdown({ resetAt }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!resetAt) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600">
      <Lock className="w-2.5 h-2.5" />
      {formatCountdown(resetAt)}
    </span>
  );
}

// The three rolling windows can all be armed on the same module at once —
// e.g. 20/day AND 100/week AND 500/month — each counting the same usage
// but locking out on its own independent schedule.
// TEMP TESTING: hints reflect the shrunk minute-based intervals set in
// backend util/usageLimits.js periodInterval() for manual testing. Revert
// both together before shipping.
const PERIOD_DEFS = [
  { key: "day", label: "Per day", hint: "locks for 1 minute once reached (testing)" },
  { key: "week", label: "Per week", hint: "locks for 2 minutes once reached (testing)" },
  { key: "month", label: "Per month", hint: "locks for 3 minutes once reached (testing)" },
];

// What "1" actually means for each module — spelled out in the sentence and
// shown as a standing hint even before a limit is turned on.
const MODULE_UNIT_INFO = {
  flashcard: "flashcards reviewed",
  grammar: "grammar chapters completed",
  listening: "listening exercises completed",
  speaking: "speaking exercises completed",
  reading: "reading passages completed",
  test: "tests submitted",
  describe_speak: "describe & speak submissions",
  exams: "exam papers started",
  maya: "minutes talking to Maya",
  pronounce: "pronunciation attempts",
  conversation: "conversations completed",
  learn_german: "guided lessons completed",
  story: "stories completed",
};

// Plain on/off switch, same visual language as JobScreeningAdmin's toggles.
function ToggleSwitch({ checked, onChange, disabled, size = "md" }) {
  const dims = size === "sm" ? "w-8 h-4.5" : "w-9 h-5";
  const dot = size === "sm" ? "after:h-3.5 after:w-3.5" : "after:h-4 after:w-4";
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div
        className={`${dims} bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full ${dot} after:transition-all peer-checked:bg-[#002856] peer-disabled:opacity-50`}
      ></div>
    </label>
  );
}

// One self-explanatory card per module, shared by the global defaults tab and
// the per-user override grid. `value` shape: { locked, unit, day, week, month }
// where day/week/month are a positive cap or null (that window is off) — all
// three can be on at the same time, independently of one another.
function ModuleLimitCard({
  label,
  level,
  moduleKey,
  value,
  onChange,
  disabled,
  usageByPeriod,
  onResetPeriod,
  footer,
  allowUnlimited,
}) {
  const locked = !!value?.locked;
  const unlimited = !!value?.unlimited;
  const noun = MODULE_UNIT_INFO[moduleKey] || "uses";

  // Lock and unlimited are opposites — turning one on clears the other so a
  // row set can never carry both (the backend resolves that fail-closed).
  const setLocked = (next) => onChange({ ...value, locked: next, unlimited: next ? false : unlimited });
  const setUnlimited = (next) => onChange({ ...value, unlimited: next, locked: next ? false : locked });
  const setPeriodOn = (period, on) =>
    onChange({ ...value, [period]: on ? value?.[period] || 20 : null });
  const setPeriodValue = (period, n) =>
    onChange({ ...value, [period]: Math.max(1, n || 1) });

  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        {level && level !== "ALL" && (
          <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">
            {level}
          </span>
        )}
      </div>
      <span className="text-[10px] text-slate-400 -mt-2">Counted as: 1 = one {noun}</span>

      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-700">Locked</span>
          <span className="text-[10px] text-slate-400">
            {locked
              ? "Free users can't open this at all"
              : "Free users can open this"}
          </span>
        </div>
        <ToggleSwitch
          checked={locked}
          onChange={setLocked}
          disabled={disabled}
        />
      </div>

      {allowUnlimited && !locked && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-700">Unlimited</span>
            <span className="text-[10px] text-slate-400">
              {unlimited
                ? "Exempt from every limit, including group locks"
                : "Exempt this one user, even while the global cap stays on"}
            </span>
          </div>
          <ToggleSwitch checked={unlimited} onChange={setUnlimited} disabled={disabled} />
        </div>
      )}

      {locked ? (
        <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Locked — free users see "Subscribe to
          unlock"
        </span>
      ) : unlimited ? (
        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
          <InfinityIcon className="w-3 h-3" /> Unlimited — this user is never
          counted or locked for this module
        </span>
      ) : (
        <div className="flex flex-col gap-2.5">
          {PERIOD_DEFS.map((p) => {
            const on = value?.[p.key] != null;
            const usage = usageByPeriod?.[p.key];
            const periodLocked =
              usage?.locked_until && new Date(usage.locked_until) > new Date();
            return (
              <div
                key={p.key}
              className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    {p.label}
                  </span>
                  <ToggleSwitch
                    size="sm"
                    checked={on}
                    onChange={(v) => setPeriodOn(p.key, v)}
                    disabled={disabled}
                  />
                </div>
                {on && (
                  <>
                    <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
                      <span className="text-slate-500">Allow up to</span>
                      <input
                        type="number"
                        min={1}
                        disabled={disabled}
                        value={value[p.key]}
                        onChange={(e) =>
                          setPeriodValue(p.key, parseInt(e.target.value, 10))
                        }
                        className="w-14 border border-slate-200 rounded-lg px-1.5 py-1 text-xs bg-white text-center font-bold focus:outline-none focus:border-[#083262] disabled:opacity-50"
                      />
                      <span className="text-slate-500">{noun}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">{p.hint}</span>
                    {usageByPeriod && (
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/70">
                        <span className="text-[9px] text-slate-400">
                          Used {usage?.used ?? 0} of {value[p.key]}
                        </span>
                        <div className="flex items-center gap-2">
                          {periodLocked && (
                            <Countdown resetAt={usage.locked_until} />
                          )}
                          {(periodLocked || usage?.used > 0) &&
                            onResetPeriod && (
                              <button
                                type="button"
                                onClick={() => onResetPeriod(p.key)}
                                disabled={disabled}
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#083262] hover:underline disabled:opacity-40"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Reset
                              </button>
                            )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {footer}
    </div>
  );
}

function emptyModuleValue(unit) {
  return { locked: false, unlimited: false, unit, day: null, week: null, month: null };
}

// Create OR edit a bundle: pick a level, name it, check which of that
// level's modules belong, then set each member's own plain number right
// here (same ModuleLimitCard used everywhere else). A bundle starts
// inactive — nothing changes for users until it's switched on in the list
// below, and at most one bundle per level can be active at a time:
// everything at that level NOT in the active bundle is locked out for free
// users, same as a manual lock. In edit mode (editingGroup set) the level
// is fixed — the backend doesn't support moving a bundle to a new level.
function CreateGroupForm({ modulesByLevel, disabled, onCreate, onUpdate, editingGroup, onCancelEdit, rows, setRows, onSaveConfig }) {
  const [level, setLevel] = useState("");
  const [label, setLabel] = useState("");
  const [moduleKeys, setModuleKeys] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingGroup) {
      setLevel(editingGroup.level);
      setLabel(editingGroup.label);
      setModuleKeys(editingGroup.module_keys || []);
    }
  }, [editingGroup]);

  const availableModules = level ? modulesByLevel[level] || [] : [];

  const toggleModule = (key) => {
    setModuleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const reset = () => {
    setLevel("");
    setLabel("");
    setModuleKeys([]);
  };

  const submit = async () => {
    if (!level || !label.trim() || !moduleKeys.length) {
      toast.error("Pick a level, a name, and at least one module");
      return;
    }
    setSubmitting(true);
    try {
      await onSaveConfig(); // persist any numbers edited below before the group references them
      if (editingGroup) {
        await onUpdate(editingGroup.group_id, label.trim(), moduleKeys);
      } else {
        await onCreate(level, label.trim(), moduleKeys);
      }
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`border rounded-2xl p-4 flex flex-col gap-3 ${
        editingGroup ? "border-amber-300 bg-amber-50/40" : "border-dashed border-indigo-200 bg-indigo-50/20"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-bold ${editingGroup ? "text-amber-700" : "text-indigo-700"}`}>
        <Plus className="w-3.5 h-3.5" /> {editingGroup ? `Editing "${editingGroup.label}"` : "Create a bundle"}
      </div>
      <p className="text-[10px] text-slate-400 -mt-2">
        A bundle is the set of modules free users can use at this level — everything else at that
        level locks out for free users automatically once the bundle is active, so you only ever
        pick what stays open, never what to block. Only one bundle per level can be active — turn
        it on in the list below once you're ready. To leave a module effectively unlimited inside
        an active bundle, just include it here and skip setting a day/week/month number on its
        card below (no cap, no lock).
      </p>
      <div className="flex flex-wrap gap-2">
        <ControlDropdown
          value={level}
          disabled={disabled || !!editingGroup}
          onChange={(v) => {
            setLevel(v);
            setModuleKeys([]);
          }}
          placeholder="Level…"
          options={LEVEL_ORDER.map((lvl) => ({ value: lvl, label: lvl }))}
          className="w-28"
          compact
        />
        <input
          type="text"
          value={label}
          disabled={disabled}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Group name, e.g. Reading bundle"
          className="flex-1 min-w-[160px] border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white disabled:opacity-50"
        />
      </div>
      {level && (
        <div className="flex flex-wrap gap-2">
          {availableModules.length === 0 ? (
            <span className="text-[10px] text-slate-400">No modules for this level.</span>
          ) : (
            availableModules.map((m) => (
              <label
                key={m.module_key}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={moduleKeys.includes(m.module_key)}
                  disabled={disabled}
                  onChange={() => toggleModule(m.module_key)}
                  className="w-3.5 h-3.5"
                />
                {m.label}
              </label>
            ))
          )}
        </div>
      )}
      {moduleKeys.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-indigo-700">
            Set each module's own number below (saving the bundle saves these too):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {availableModules
              .filter((m) => moduleKeys.includes(m.module_key))
              .map((m) => {
                const key = rowKey(m.level, m.module_key);
                return (
                  <ModuleLimitCard
                    key={key}
                    label={m.label}
                    level={m.level}
                    moduleKey={m.module_key}
                    disabled={disabled}
                    value={rows[key] || emptyModuleValue(m.default_unit || "count")}
                    onChange={(v) => setRows((prev) => ({ ...prev, [key]: v }))}
                  />
                );
              })}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={disabled || submitting || !level || !label.trim() || !moduleKeys.length}
          className={`self-start px-4 py-1.5 text-white rounded-lg text-[11px] font-extrabold transition-all disabled:opacity-40 ${
            editingGroup ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {submitting ? "Saving…" : editingGroup ? "Save changes" : "Create bundle"}
        </button>
        {editingGroup && (
          <button
            type="button"
            onClick={() => {
              reset();
              onCancelEdit();
            }}
            disabled={submitting}
            className="self-start px-4 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// List of bundles grouped by level, each with an Active toggle. Flipping one
// on deactivates any other active bundle at that level server-side (a
// partial unique index backs the exclusivity) — this list mirrors that by
// only ever showing one checked per level once the refetch lands.
function GroupsList({ groups, modulesByKey, disabled, onDelete, onSetActive, onEdit, editingGroupId }) {
  if (!groups.length) return null;
  const byLevel = {};
  groups.forEach((g) => {
    if (!byLevel[g.level]) byLevel[g.level] = [];
    byLevel[g.level].push(g);
  });
  return (
    <div className="bg-white rounded-2xl border border-indigo-200/80 p-5 flex flex-col gap-4">
      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5" /> Bundles (only one active per level)
      </span>
      {LEVEL_ORDER.filter((lvl) => byLevel[lvl]?.length).map((lvl) => (
        <div key={lvl} className="flex flex-col gap-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lvl}</span>
          {byLevel[lvl].map((g) => (
            <div
              key={g.group_id}
              className={`flex items-center justify-between gap-3 border rounded-xl px-3 py-2 ${
                editingGroupId === g.group_id
                  ? "bg-amber-50/60 border-amber-300"
                  : g.is_active
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-indigo-50/40 border-indigo-100"
              }`}
            >
              <div className="text-[11px] flex-1">
                <span className="font-bold text-slate-700">{g.label}</span>{" "}
                {g.is_active && (
                  <span className="text-[9px] font-extrabold text-emerald-600 uppercase">Active</span>
                )}
                <div className="text-slate-400">
                  {g.module_keys.map((k) => modulesByKey[k]?.label || k).join(", ")}
                </div>
              </div>
              <ToggleSwitch
                size="sm"
                checked={g.is_active}
                disabled={disabled}
                onChange={(next) => onSetActive(g.group_id, next, g.level)}
              />
              <button
                type="button"
                onClick={() => onEdit(g)}
                disabled={disabled}
                title="Edit bundle"
                className="text-slate-400 hover:text-indigo-600 disabled:opacity-40 shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(g.group_id, g.label)}
                disabled={disabled}
                title="Delete bundle"
                className="text-slate-400 hover:text-rose-600 disabled:opacity-40 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GlobalTab({ canEdit }) {
  const [modules, setModules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null);
  const [rows, setRows] = useState({}); // key -> {locked, unit, day, week, month}
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await adminGetUsageLimitConfig();
      if (res.data) {
        const mods = res.data.modules || [];
        setModules(mods);
        setGroups(res.data.groups || []);
        const map = {};
        mods.forEach((m) => {
          map[rowKey(m.level, m.module_key)] = emptyModuleValue(
            m.default_unit || "count",
          );
        });
        (res.data.config || []).forEach((c) => {
          const key = rowKey(c.level, c.module_key);
          if (!map[key]) map[key] = emptyModuleValue(c.limit_unit);
          if (c.period === "lock") map[key].locked = true;
          else {
            map[key][c.period] = c.limit_value;
            map[key].unit = c.limit_unit;
          }
        });
        setRows(map);
      }
    } catch (err) {
      console.error("Failed to load usage limit config:", err);
      toast.error("Failed to load usage limit config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const grouped = useMemo(() => {
    const byLevel = {};
    modules.forEach((m) => {
      if (!byLevel[m.level]) byLevel[m.level] = [];
      byLevel[m.level].push(m);
    });
    return byLevel;
  }, [modules]);

  const modulesByKey = useMemo(() => {
    const map = {};
    modules.forEach((m) => {
      map[m.module_key] = m;
    });
    return map;
  }, [modules]);

  const handleCreateGroup = async (level, label, moduleKeys) => {
    try {
      await adminCreateUsageLimitGroup(level, label, moduleKeys);
      toast.success("Bundle created");
      fetchConfig();
    } catch (err) {
      console.error("Failed to create group:", err);
      toast.error(err.response?.data?.msg || "Failed to create bundle");
    }
  };

  const handleUpdateGroup = async (groupId, label, moduleKeys) => {
    try {
      await adminUpdateUsageLimitGroup(groupId, label, moduleKeys);
      toast.success("Bundle updated");
      setEditingGroup(null);
      fetchConfig();
    } catch (err) {
      console.error("Failed to update group:", err);
      toast.error(err.response?.data?.msg || "Failed to update bundle");
    }
  };

  const handleSetGroupActive = async (groupId, isActive, level) => {
    if (
      isActive &&
      !window.confirm(
        `Activate this bundle for ${level}? Every other ${level} module NOT in it will lock out for free users, and any other active bundle at ${level} will be deactivated.`,
      )
    ) {
      return;
    }
    try {
      await adminSetUsageLimitGroupActive(groupId, isActive);
      toast.success(isActive ? "Bundle activated" : "Bundle deactivated");
      fetchConfig();
    } catch (err) {
      console.error("Failed to update bundle:", err);
      toast.error(err.response?.data?.msg || "Failed to update bundle");
    }
  };

  const handleDeleteGroup = async (groupId, label) => {
    if (!window.confirm(`Delete the "${label}" limit group? This cannot be undone.`)) return;
    try {
      await adminDeleteUsageLimitGroup(groupId);
      toast.success("Group deleted");
      fetchConfig();
    } catch (err) {
      console.error("Failed to delete group:", err);
      toast.error(err.response?.data?.msg || "Failed to delete group");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadRows = modules.map((m) => {
        const key = rowKey(m.level, m.module_key);
        const value = rows[key] || emptyModuleValue(m.default_unit || "count");
        return {
          level: m.level,
          module_key: m.module_key,
          locked: value.locked,
          unit: value.unit || m.default_unit || "count",
          day: value.day,
          week: value.week,
          month: value.month,
        };
      });
      const { data } = await adminUpdateUsageLimitConfig(payloadRows);
      if (data?.msg) toast.success("Global usage limits saved");
      fetchConfig();
    } catch (err) {
      console.error("Failed to save usage limit config:", err);
      toast.error(
        err.response?.data?.msg || "Failed to save usage limit config",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading global config…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
        <p className="text-[10px] text-slate-400 font-medium max-w-lg leading-relaxed">
          Turn features on/off for free users. You can cap a feature per day,
          per week, and per month all at once — each cap locks out on its own
          timer, independently.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canEdit}
          title={!canEdit ? "You have view-only access" : undefined}
          className="px-6 py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 shadow-sm cursor-pointer shrink-0"
        >
          {saving ? "Saving…" : "Save Global Defaults"}
        </button>
      </div>

      <CreateGroupForm
        modulesByLevel={grouped}
        disabled={!canEdit}
        onCreate={handleCreateGroup}
        onUpdate={handleUpdateGroup}
        editingGroup={editingGroup}
        onCancelEdit={() => setEditingGroup(null)}
        rows={rows}
        setRows={setRows}
        onSaveConfig={handleSave}
      />

      <GroupsList
        groups={groups}
        modulesByKey={modulesByKey}
        disabled={!canEdit}
        onDelete={handleDeleteGroup}
        onSetActive={handleSetGroupActive}
        onEdit={setEditingGroup}
        editingGroupId={editingGroup?.group_id}
      />

      {LEVEL_ORDER.filter((lvl) => grouped[lvl]?.length).map((level) => (
        <div
          key={level}
          className="bg-white rounded-2xl border border-slate-200/80 p-5"
        >
          <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block border-b border-slate-100 pb-2 mb-3">
            {level === "ALL" ? "Shared across all levels" : `${level} modules`}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {grouped[level].map((m) => {
              const key = rowKey(m.level, m.module_key);
              return (
                <ModuleLimitCard
                  key={key}
                  label={m.label}
                  level={m.level}
                  moduleKey={m.module_key}
                  disabled={!canEdit}
                  value={
                    rows[key] || emptyModuleValue(m.default_unit || "count")
                  }
                  onChange={(v) => setRows((prev) => ({ ...prev, [key]: v }))}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function UserOverridesTab({ canEdit }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [overrideFilter, setOverrideFilter] = useState(""); // "" | "true" | "false"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [detail, setDetail] = useState(null); // { modules, global, overrides, usage }
  const [rows, setRows] = useState({}); // key -> {locked, unit, day, week, month} | "revert"
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await adminListUsageLimitUsers(page, 10, search, levelFilter, overrideFilter);
      setUsers(res.data?.users || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to list users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, levelFilter, overrideFilter]);

  const fetchAuditLog = async () => {
    setLoadingAudit(true);
    try {
      const res = await adminGetUsageLimitAuditLog(1, 20);
      setAuditLogs(res.data?.logs || []);
    } catch (err) {
      console.error("Failed to load audit log:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const openUser = async (user) => {
    setSelectedUser(user);
    setLoadingDetail(true);
    try {
      const res = await adminGetUserUsageOverrides(user.user_id);
      setDetail(res.data);
      const overrideMap = {};
      (res.data?.overrides || []).forEach((o) => {
        const key = rowKey(o.level, o.module_key);
        if (!overrideMap[key])
          overrideMap[key] = emptyModuleValue(o.limit_unit);
        if (o.period === "lock") overrideMap[key].locked = true;
        else if (o.period === "none") overrideMap[key].unlimited = true;
        else {
          overrideMap[key][o.period] = o.limit_value;
          overrideMap[key].unit = o.limit_unit;
        }
      });
      setRows(overrideMap);
    } catch (err) {
      console.error("Failed to load user overrides:", err);
      toast.error("Failed to load user overrides");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUser || !detail) return;
    setSaving(true);
    try {
      const payloadRows = detail.modules
        .map((m) => {
          const key = rowKey(m.level, m.module_key);
          if (!Object.prototype.hasOwnProperty.call(rows, key)) return null; // untouched
          const value = rows[key];
          if (value === "revert") {
            return { level: m.level, module_key: m.module_key, revert: true };
          }
          return {
            level: m.level,
            module_key: m.module_key,
            locked: value.locked,
            unlimited: value.unlimited,
            unit: value.unit || "count",
            day: value.day,
            week: value.week,
            month: value.month,
          };
        })
        .filter(Boolean);

      if (!payloadRows.length) {
        toast("No changes to save");
        setSaving(false);
        return;
      }

      await adminUpdateUserUsageOverrides(selectedUser.user_id, payloadRows);
      toast.success("User overrides saved");
      openUser(selectedUser);
      fetchAuditLog();
    } catch (err) {
      console.error("Failed to save user overrides:", err);
      toast.error(err.response?.data?.msg || "Failed to save user overrides");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPeriod = async (level, moduleKey, period) => {
    if (!selectedUser) return;
    try {
      await adminResetUserUsage(selectedUser.user_id, level, moduleKey, period);
      toast.success("Usage reset");
      openUser(selectedUser);
      fetchAuditLog();
    } catch (err) {
      console.error("Failed to reset usage:", err);
      toast.error("Failed to reset usage");
    }
  };

  const detailModulesByKey = useMemo(() => {
    const map = {};
    (detail?.modules || []).forEach((m) => {
      map[m.module_key] = m;
    });
    return map;
  }, [detail]);

  // The level's globally active bundle — NOT necessarily what applies to
  // this user; only relevant as "what everyone else on this level gets".
  const globalActiveBundleForLevel = useMemo(() => {
    if (!selectedUser) return null;
    return (detail?.active_bundles || []).find((g) => g.level === selectedUser.current_profeciency_level) || null;
  }, [detail, selectedUser]);

  // Every bundle defined at this user's level — lets the admin pin this one
  // user to any of them, independent of whichever is globally active.
  const bundlesForUserLevel = useMemo(() => {
    if (!selectedUser) return [];
    return (detail?.groups || []).filter((g) => g.level === selectedUser.current_profeciency_level);
  }, [detail, selectedUser]);

  const pinnedGroupIdForUser = useMemo(() => {
    if (!selectedUser) return "";
    const pin = (detail?.group_overrides || []).find((o) => o.level === selectedUser.current_profeciency_level);
    return pin ? pin.group_id : "";
  }, [detail, selectedUser]);

  // What THIS user actually gets: their own pin if set (it wins server-side
  // regardless of is_active), otherwise the level's global bundle. This is
  // the one to show as "active for this user" — showing the global bundle
  // unconditionally was the bug: it kept saying "X is active" even after
  // the user had been pinned to a different bundle Y.
  const effectiveBundleForUser = useMemo(() => {
    if (pinnedGroupIdForUser) {
      return bundlesForUserLevel.find((g) => g.group_id === pinnedGroupIdForUser) || null;
    }
    return globalActiveBundleForLevel;
  }, [pinnedGroupIdForUser, bundlesForUserLevel, globalActiveBundleForLevel]);

  const handleSetGroupOverride = async (groupId) => {
    if (!selectedUser) return;
    try {
      await adminSetUserGroupOverride(selectedUser.user_id, selectedUser.current_profeciency_level, groupId || null);
      toast.success(groupId ? "User pinned to bundle" : "Reverted to the level's global bundle");
      openUser(selectedUser);
      fetchAuditLog();
    } catch (err) {
      console.error("Failed to update bundle override:", err);
      toast.error(err.response?.data?.msg || "Failed to update bundle override");
    }
  };

  const globalByKey = useMemo(() => {
    const map = {};
    (detail?.global || []).forEach((g) => {
      const key = rowKey(g.level, g.module_key);
      if (!map[key]) map[key] = emptyModuleValue(g.limit_unit);
      if (g.period === "lock") map[key].locked = true;
      else {
        map[key][g.period] = g.limit_value;
        map[key].unit = g.limit_unit;
      }
    });
    return map;
  }, [detail]);

  const usageByKey = useMemo(() => {
    const map = {};
    (detail?.usage || []).forEach((u) => {
      const key = rowKey(u.level, u.module_key);
      if (!map[key]) map[key] = {};
      map[key][u.period] = u;
    });
    return map;
  }, [detail]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col gap-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or phone…"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#083262]"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex gap-2">
          <ControlDropdown
            value={levelFilter}
            onChange={(v) => {
              setLevelFilter(v === "__any__" ? "" : v);
              setPage(1);
            }}
            placeholder="All levels"
            options={[
              { value: "__any__", label: "All levels" },
              ...LEVEL_ORDER.map((lvl) => ({ value: lvl, label: lvl })),
            ]}
            className="flex-1"
            compact
          />
          <ControlDropdown
            value={overrideFilter}
            onChange={(v) => {
              setOverrideFilter(v === "__any__" ? "" : v);
              setPage(1);
            }}
            placeholder="Any override state"
            options={[
              { value: "__any__", label: "Any override state" },
              { value: "true", label: "Has overrides" },
              { value: "false", label: "No overrides" },
            ]}
            className="flex-1"
            compact
          />
        </div>
        <div className="max-h-[500px] overflow-y-auto flex flex-col gap-1">
          {loadingUsers ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Loading…
            </div>
          ) : users.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No users found.
            </div>
          ) : (
            users.map((u) => {
              const reason = ineligibleReason(u);
              return (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => openUser(u)}
                  className={`text-left px-3 py-2 rounded-lg border transition-all ${
                    selectedUser?.user_id === u.user_id
                      ? "border-[#083262] bg-[#083262]/5"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-bold text-slate-800">
                    {u.fullname || u.username}
                    {u.current_profeciency_level && (
                      <span className="ml-1.5 text-[9px] font-bold text-slate-400 uppercase">
                        {u.current_profeciency_level}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center flex-wrap gap-x-2 gap-y-0.5">
                    <span>{u.phone || u.number || "—"}</span>
                    {u.has_overrides && (
                      <span className="text-[9px] font-bold text-[#083262]">has overrides</span>
                    )}
                    {reason && (
                      <span className="text-[9px] font-bold text-rose-600">Not eligible — {reason}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-[10px] font-bold text-slate-500 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-[10px] text-slate-400">
              {page}/{totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-[10px] font-bold text-slate-500 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5">
        {!selectedUser ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Select a user to view/edit their overrides.
          </div>
        ) : loadingDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Loading…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {effectiveBundleForUser && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[10px] text-emerald-700">
                <Link2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>{effectiveBundleForUser.label}</strong> is what this user actually gets at{" "}
                  {selectedUser.current_profeciency_level} right now (
                  {effectiveBundleForUser.module_keys.map((k) => detailModulesByKey[k]?.label || k).join(", ")}) —
                  everything else at that level is locked out.{" "}
                  {pinnedGroupIdForUser ? (
                    <>
                      This is a per-user pin, overriding the level's global bundle
                      {globalActiveBundleForLevel && globalActiveBundleForLevel.group_id !== pinnedGroupIdForUser
                        ? ` (${globalActiveBundleForLevel.label})`
                        : ""}
                      .
                    </>
                  ) : (
                    "This is the level's global default — every other free user at this level gets it too."
                  )}
                </span>
              </div>
            )}
            {bundlesForUserLevel.length > 0 && (
              <div className="flex items-center justify-between gap-3 bg-indigo-50/40 border border-indigo-100 rounded-xl px-3 py-2">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-700">Bundle for this user</span>
                  <span className="text-[10px] text-slate-400">
                    Pin this user to a specific bundle, independent of whichever is globally active.
                  </span>
                </div>
                <ControlDropdown
                  value={pinnedGroupIdForUser}
                  disabled={!canEdit}
                  onChange={(v) => handleSetGroupOverride(v === "__global__" ? null : v)}
                  placeholder="Use global default"
                  options={[
                    { value: "__global__", label: "Use global default" },
                    ...bundlesForUserLevel.map((g) => ({
                      value: g.group_id,
                      label: g.is_active ? `${g.label} (global default)` : g.label,
                    })),
                  ]}
                  className="w-56"
                  compact
                />
              </div>
            )}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#083262] flex items-center gap-2">
                  {selectedUser.fullname || selectedUser.username}
                  {selectedUser.current_profeciency_level && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 rounded-full px-2 py-0.5">
                      {selectedUser.current_profeciency_level}
                    </span>
                  )}
                  {ineligibleReason(selectedUser) && (
                    <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 rounded-full px-2 py-0.5">
                      Not eligible — {ineligibleReason(selectedUser)}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400">
                  Showing {selectedUser.current_profeciency_level || "this user's"} modules only.
                  Untouched modules keep following the global defaults.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !canEdit}
                className="px-5 py-2 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-extrabold transition-all disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Overrides"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {(detail?.modules || [])
                .filter((m) => m.level === selectedUser.current_profeciency_level)
                .map((m) => {
                const key = rowKey(m.level, m.module_key);
                const globalCfg =
                  globalByKey[key] ||
                  emptyModuleValue(m.default_unit || "count");
                const usageByPeriod = usageByKey[key];
                const rawRow = rows[key];
                const hasOverride = rawRow !== undefined && rawRow !== "revert";
                const cardValue =
                  rawRow === "revert" ? globalCfg : (rawRow ?? globalCfg);

                return (
                  <ModuleLimitCard
                    key={key}
                    label={m.label}
                    level={m.level}
                    moduleKey={m.module_key}
                    disabled={!canEdit}
                    value={cardValue}
                    onChange={(v) => setRows((prev) => ({ ...prev, [key]: v }))}
                    // Per-user only: globally, "unlimited" is just leaving
                    // every window off, so a toggle there would be noise.
                    allowUnlimited
                    usageByPeriod={usageByPeriod}
                    onResetPeriod={(period) =>
                      handleResetPeriod(m.level, m.module_key, period)
                    }
                    footer={
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 mt-1">
                        {hasOverride ? (
                          <span className="text-[9px] font-bold text-amber-600">
                            Special rule for this person
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-300">
                            Following global default
                          </span>
                        )}
                        {hasOverride && (
                          <button
                            type="button"
                            onClick={() =>
                              setRows((prev) => ({ ...prev, [key]: "revert" }))
                            }
                            disabled={!canEdit}
                            className="text-[9px] font-bold text-slate-500 hover:underline disabled:opacity-40"
                          >
                            Use global default
                          </button>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="xl:col-span-12 bg-white rounded-2xl border border-slate-200/80 p-5">
        <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-[#083262] flex items-center gap-2">
            <Activity className="w-4 h-4" /> Usage Limit Audit Log
          </h3>
          <button
            type="button"
            onClick={fetchAuditLog}
            disabled={loadingAudit}
            className="text-[10px] font-bold text-slate-500 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${loadingAudit ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-auto w-full text-[10px]">
            <thead className="text-slate-400 uppercase bg-slate-50 border-t border-b font-bold">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Module</th>
                <th className="px-3 py-2 text-left">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No entries yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {log.student_name || "Global"}
                    </td>
                    <td className="px-3 py-2 font-bold">{log.action_key}</td>
                    <td className="px-3 py-2">
                      {log.level ? `${log.level} / ${log.module_key}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {log.actor_name || log.actor_role || "system"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsageLimits({ canEdit = true }) {
  const [tab, setTab] = useState("global");

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto space-y-6">
      <div className="sm:flex sm:justify-between sm:items-center bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl text-slate-800 font-extrabold tracking-tight">
            Usage Limits
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Per-module, per-level usage caps and hard locks for free/unpaid
            users.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 mt-3 sm:mt-0">
          <button
            type="button"
            onClick={() => setTab("global")}
            className={`px-4 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
              tab === "global"
                ? "bg-[#083262] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Global Defaults
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`px-4 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
              tab === "users"
                ? "bg-[#083262] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Per-User Overrides
          </button>
        </div>
      </div>

      {tab === "global" ? (
        <GlobalTab canEdit={canEdit} />
      ) : (
        <UserOverridesTab canEdit={canEdit} />
      )}
    </div>
  );
}

export default UsageLimits;
