import React from "react";
import { Lock, RefreshCw, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";

function ToggleCard({ title, description, on, onToggle, canEdit }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => canEdit && onToggle()}
        className={`p-1 rounded-full transition-colors ${
          !canEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${on ? "text-emerald-400" : "text-slate-500"}`}
      >
        {on ? (
          <ToggleRight className="w-9 h-9 fill-current" />
        ) : (
          <ToggleLeft className="w-9 h-9" />
        )}
      </button>
    </div>
  );
}

export default function RolloutRules({
  feature,
  isGlobalOnly,
  levels = [],
  rules,
  onChange,
  onSave,
  saving,
  canEdit,
}) {
  const levelText = levels.join(", ");
  const toggle = (key) => onChange({ ...rules, [key]: !rules[key] });
  const currentLevels = rules.eligible_levels || levels || [];
  const isAllLevels = currentLevels.some((l) =>
    ["ALL", "*"].includes(String(l).toUpperCase())
  );

  return (
    <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3 h-3" />{" "}
            {isGlobalOnly ? "All-or-Nothing Release" : "Cohort & Global Release Rules"}
          </div>
          <h2 className="text-lg font-bold text-white">
            Rollout Rules for {feature?.name || "Feature"}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {isGlobalOnly
              ? feature?.description || "Enabled for everyone or no one."
              : `Rules apply automatically to all students in eligible levels (${levelText}).`}
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || !canEdit}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 self-start md:self-auto ${
            !canEdit
              ? "bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600 opacity-60"
              : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white cursor-pointer hover:shadow"
          }`}
          title={
            !canEdit
              ? "Read-only mode: contact Super Admin to edit"
              : "Save changes to rollout rules"
          }
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Saving Rules...
            </>
          ) : !canEdit ? (
            <>
              <Lock className="w-3.5 h-3.5" /> Read-Only
            </>
          ) : (
            "Save Rollout Rules"
          )}
        </button>
      </div>

      <div className={`grid grid-cols-1 gap-4 pt-5 ${isGlobalOnly ? "" : "md:grid-cols-3"}`}>
        <ToggleCard
          title="Global Feature Release"
          description={
            isGlobalOnly
              ? "Single switch for every student. No cohort rules, no per-student exceptions."
              : `Enable for 100% of students in ${levelText} regardless of payment tier.`
          }
          on={rules.global_enabled}
          onToggle={() => toggle("global_enabled")}
          canEdit={canEdit}
        />

        {!isGlobalOnly && (
          <>
            <ToggleCard
              title="Paid Students Cohort"
              description="Enable for all current and future students with active paid / autopay status."
              on={rules.paid_enabled}
              onToggle={() => toggle("paid_enabled")}
              canEdit={canEdit}
            />
            <ToggleCard
              title="Free / Unpaid Students Cohort"
              description={`Enable for all free tier and trial users in ${levelText}.`}
              on={rules.unpaid_enabled}
              onToggle={() => toggle("unpaid_enabled")}
              canEdit={canEdit}
            />
          </>
        )}
      </div>

      {!isGlobalOnly && (
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Target Proficiency Levels</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select which levels are eligible for this feature. Toggling off a level disables the feature for all students in that level.
            </p>
          </div>
          {isAllLevels ? (
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
              All levels (ALL)
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {["A1", "A2", "B1", "B2"].map((lvl) => {
                const active = currentLevels.includes(lvl);
                return (
                <button
                  key={lvl}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    const next = active
                      ? currentLevels.filter((l) => l !== lvl)
                      : [...currentLevels, lvl];
                    onChange({ ...rules, eligible_levels: next });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-700/60 text-slate-400 hover:bg-slate-700"
                  } ${!canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {active ? `✓ ${lvl}` : lvl}
                </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
