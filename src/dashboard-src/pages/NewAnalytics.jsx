import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Headphones,
  Mic,
  MessageSquare,
  MonitorSmartphone,
  RefreshCw,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { newAnalyticsApi } from "../../api/newAnalyticsApi";

import {
  ActionChip,
  ControlButton,
  ControlInput,
  ControlSelect,
  ControlDropdown,
} from "../payments-admin/components/controls";

import {
  EmptyState,
  StatCard,
  TableSkeleton,
} from "../payments-admin/components/common";

// Constants

const FILTERS = {
  user_type: [
    ["all", "All users"],
    ["first_time", "First-time"],
    ["returning", "Returning"],
  ],
  learner_stage: [
    ["all", "All stages"],
    ["new", "New learner"],
    ["active", "Active learner"],
    ["dormant", "Dormant learner"],
  ],
  platform: [
    ["all", "App & web"],
    ["app", "Mobile app"],
    ["web", "Web / PWA"],
  ],
};

const FEATURE_LABELS = {
  flashcards: "Flashcards",
  grammar: "Grammar",
  listening: "Listening",
  reading: "Reading",
  speaking: "Speaking",
  tests: "Practice Tests",
  b1_read_listen_news: "Reading & Listening — News",
  b1_read_listen_articles: "Reading & Listening — Articles",
  b1_read_listen_video: "Reading & Listening — Video & Audio",
  describe_speak: "Describe & Speak",
  certificate_tests: "TELC & Goethe Exam Papers",
  hardcore_exams: "Hardcore Exams",
  learn_german: "Guided Lessons",
  maya: "Talk to Maya",
  news: "Daily News",
  diagnostic: "Diagnostic",
};

const FEATURE_THEMES = {
  diagnostic: {
    border: "border-rose-300",
    iconBg: "bg-rose-50 text-rose-600",
    icon: AlertCircle,
  },
  flashcards: {
    border: "border-indigo-400",
    iconBg: "bg-indigo-50 text-indigo-600",
    icon: Bookmark,
  },
  maya: {
    border: "border-violet-400",
    iconBg: "bg-violet-50 text-violet-600",
    icon: MessageSquare,
  },
  grammar: {
    border: "border-blue-400",
    iconBg: "bg-blue-50 text-blue-600",
    icon: FileText,
  },
  listening: {
    border: "border-sky-400",
    iconBg: "bg-sky-50 text-sky-600",
    icon: Headphones,
  },
  reading: {
    border: "border-sky-400",
    iconBg: "bg-sky-50 text-sky-600",
    icon: FileText,
  },
  speaking: {
    border: "border-emerald-400",
    iconBg: "bg-emerald-50 text-emerald-600",
    icon: Mic,
  },
  default: {
    border: "border-slate-300",
    iconBg: "bg-slate-100 text-slate-600",
    icon: Activity,
  },
};

const AVATAR_COLORS = [
  "bg-indigo-50 text-indigo-700 border-indigo-100",
  "bg-violet-50 text-violet-700 border-violet-100",
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-blue-50 text-blue-700 border-blue-100",
  "bg-amber-50 text-amber-700 border-amber-100",
  "bg-rose-50 text-rose-700 border-rose-100",
  "bg-sky-50 text-sky-700 border-sky-100",
];

// Utility functions

function number(val, digits = 0) {
  return Number(val || 0).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function istTime(val) {
  return val
    ? new Date(val).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
}

function shiftDate(date, days) {
  if (!date) return "";
  const parsed = new Date(`${date}T12:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

// Presets are expressed as a day count ending on the latest completed IST day,
// which is what the catalog reports as default_date.
const RANGE_PRESETS = [
  ["Day", 1],
  ["7 days", 7],
  ["30 days", 30],
];

function formatRangeLabel(from, to) {
  if (!from || !to) return "";
  return from === to
    ? formatDateLabel(from)
    : `${formatDateLabel(from)} — ${formatDateLabel(to)}`;
}

function formatDateLabel(str) {
  if (!str) return "";
  try {
    return new Date(`${str}T00:00:00+05:30`).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return str;
  }
}

function fallbackJourneyLabel(val) {
  if (FEATURE_LABELS[val]) return FEATURE_LABELS[val];
  const words = String(val || "Activity")
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function visibleJourneyItems(timeline = []) {
  const technical =
    /^(api\.|fetch\.|performance\.|navigation\.|network\.|app\.|telemetry\.|content\.scroll_depth|page\.|route\.|interaction\.(?!rage_click|unresponsive))/;
  return timeline.filter(
    (item) =>
      item.label ||
      !technical.test(String(item.event_name || "").toLowerCase()),
  );
}

// Clubs every occurrence of the same activity (e.g. "Flashcard flipped")
// across the whole day into one row with a combined count, instead of one
// row per event — mergeTimeline on the backend only collapses *consecutive*
// repeats, so a repeated action interspersed with other events still arrives
// here as separate entries.
function groupJourneyItems(items = []) {
  const order = [];
  const grouped = new Map();
  items.forEach((item) => {
    const key = `${item.feature || ""}|${item.label || ""}|${item.detail || ""}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += item.count || 1;
      if (item.started_at < existing.first_at) existing.first_at = item.started_at;
      if (item.started_at > existing.last_at) existing.last_at = item.started_at;
    } else {
      const entry = {
        ...item,
        count: item.count || 1,
        first_at: item.started_at,
        last_at: item.started_at,
      };
      grouped.set(key, entry);
      order.push(key);
    }
  });
  return order.map((key) => grouped.get(key));
}

const LEVEL_LABELS = { ALL: "—", LEARN_GERMAN: "Lessons", UNKNOWN: "—" };

// Days rolled up before the journey stored `modules` only have a timeline, and
// the position is buried in strings like "Item 14 of 20". Reading it back keeps
// those days looking like every other day instead of empty.
const POSITION_IN_DETAIL = /(\d+)\s+of\s+(\d+)/;

function moduleFromTimeline(items = []) {
  const grouped = new Map();
  items.forEach((item) => {
    const feature = item.feature || "diagnostic";
    const entry = grouped.get(feature) || {
      feature,
      level: null,
      module_key: feature,
      module_kind: null,
      module_label: null,
      positions: new Set(),
      total_items: null,
      step_index: null,
      step_label: null,
      events: 0,
      errors: 0,
      friction: 0,
      completed: false,
      first_at: item.first_at,
      last_at: item.last_at,
      timeline: [],
    };
    entry.timeline.push(item);
    entry.events += item.count || 1;
    if (item.kind === "error") entry.errors += item.count || 1;
    if (item.kind === "friction") entry.friction += item.count || 1;
    if (["completed", "flow_completed"].includes(item.kind)) entry.completed = true;
    if (item.first_at < entry.first_at) entry.first_at = item.first_at;
    if (item.last_at > entry.last_at) entry.last_at = item.last_at;
    const match = POSITION_IN_DETAIL.exec(item.detail || "");
    if (match) {
      entry.positions.add(Number(match[1]));
      entry.total_items = Math.max(entry.total_items || 0, Number(match[2]));
    }
    grouped.set(feature, entry);
  });
  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      items_used: entry.positions.size,
      furthest_item: entry.positions.size ? Math.max(...entry.positions) : null,
      positions: undefined,
    }))
    // Matches the order the backend serialises modules in, so the Last activity
    // column reads top to bottom either way.
    .sort((a, b) => new Date(a.last_at) - new Date(b.last_at));
}

// One row per chapter, set or flow the candidate worked on, with the raw events
// behind it kept for the expanded view.
function summarizeJourney(journey) {
  const timeline = groupJourneyItems(
    visibleJourneyItems(journey?.timeline || []),
  );
  const modules = Array.isArray(journey?.modules) ? journey.modules : [];
  if (!modules.length) return moduleFromTimeline(timeline);

  const byModule = new Map();
  timeline.forEach((item) => {
    const key = `${item.feature || ""}|${item.module_key || ""}`;
    byModule.set(key, [...(byModule.get(key) || []), item]);
  });
  return modules.map((module) => ({
    ...module,
    timeline: byModule.get(`${module.feature}|${module.module_key}`) || [],
  }));
}

function moduleProgressText(module, metric) {
  if (module.step_label || module.step_index != null) {
    const position =
      module.step_index == null
        ? null
        : module.total_items
          ? `Step ${module.step_index} of ${module.total_items}`
          : `Step ${module.step_index}`;
    return [position, module.step_label].filter(Boolean).join(" · ") || null;
  }
  const used = module.items_used || 0;
  if (!used) return null;
  const noun = metric || "actions";
  return module.total_items
    ? `${used} of ${module.total_items} ${noun}`
    : `${used} ${noun}`;
}

function initials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getFeatureTheme(featureKey, isError) {
  if (isError) return FEATURE_THEMES.diagnostic;
  if (!featureKey) return FEATURE_THEMES.default;

  const key = String(featureKey).toLowerCase();
  if (key.includes("maya")) return FEATURE_THEMES.maya;
  if (key.includes("flashcard")) return FEATURE_THEMES.flashcards;
  if (key.includes("grammar")) return FEATURE_THEMES.grammar;
  if (key.includes("listen")) return FEATURE_THEMES.listening;
  if (key.includes("read")) return FEATURE_THEMES.reading;
  if (key.includes("speak")) return FEATURE_THEMES.speaking;
  if (key.includes("test") || key.includes("exam") || key.includes("paper")) {
    return {
      border: "border-amber-400",
      iconBg: "bg-amber-50 text-amber-600",
      icon: FileText,
    };
  }

  return FEATURE_THEMES.default;
}

// Horizontal Funnel

function HorizontalFunnel({ rows = [] }) {
  if (!rows.length) return null;
  const first = Math.max(1, rows[0]?.users || 0);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px] items-stretch gap-3">
        {rows.map((row, i) => {
          const pct = i === 0 ? 100 : (row.users / first) * 100;
          const prev = i === 0 ? first : rows[i - 1]?.users || first;
          const drop = i === 0 ? 0 : ((prev - row.users) / prev) * 100;
          const bigDrop = drop > 30;

          return (
            <div
              key={row.label}
              className="flex flex-1 min-w-[140px] items-stretch"
            >
              {i > 0 && (
                <div className="mr-3 flex shrink-0 flex-col items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                  {drop > 0 && (
                    <span
                      className={`mt-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        bigDrop
                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      -{number(drop, 0)}%
                    </span>
                  )}
                </div>
              )}
              <div
                className={`relative flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-4 transition hover:shadow-sm ${
                  i === 0
                    ? "border-indigo-200 bg-indigo-50/40"
                    : bigDrop
                      ? "border-rose-200 bg-rose-50/20"
                      : "border-slate-200 bg-slate-50/30"
                }`}
              >
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {row.label}
                </p>
                <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">
                  {number(row.users)}
                </p>
                <div className="mt-2">
                  {i === 0 ? (
                    <span className="text-[10px] font-semibold text-indigo-500">
                      baseline
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                        bigDrop ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {bigDrop && <TrendingDown className="h-3 w-3" />}
                      {number(pct, 1)}% of start
                    </span>
                  )}
                </div>
                {/* Bottom line marker */}
                <div className="absolute bottom-0 left-0 right-0 h-1">
                  <div
                    className={`h-full transition-all duration-700 ${
                      i === 0
                        ? "bg-indigo-400"
                        : bigDrop
                          ? "bg-rose-500"
                          : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Feature Overview Table — every feature side by side, click a row to drill
// into that feature's funnel below.

const FEATURE_TABLE_COLLAPSED_COUNT = 3;

function FeatureOverviewTable({ rows = [], selectedFeature, onSelectFeature, loading }) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6 h-3 w-40 animate-pulse rounded bg-slate-100" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) return null;

  const ranked = [...rows].sort(
    (a, b) => (b.adoption_percentage || 0) - (a.adoption_percentage || 0),
  );
  const visible = showAll ? ranked : ranked.slice(0, FEATURE_TABLE_COLLAPSED_COUNT);
  const hiddenCount = ranked.length - visible.length;

  const RANK_BADGE = [
    "bg-indigo-500 text-white",
    "bg-indigo-400 text-white",
    "bg-indigo-300 text-white",
  ];

  const MiniBar = ({ value, colorClass }) => (
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-xs font-semibold tabular-nums text-slate-700">
        {number(value, 1)}%
      </span>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.min(100, Math.max(4, value || 0))}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-7 py-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">All Features at a Glance</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Ranked by adoption &middot; click a row to drill into that feature&apos;s funnel below.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
          {rows.length} features
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-t border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Rank</th>
              <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Feature</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Eligible</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Users</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Usage %</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Completion</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg Session</th>
              <th className="px-7 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row, index) => {
              const isSelected = row.feature.key === selectedFeature;
              const theme = getFeatureTheme(row.feature.key, false);
              const Icon = theme.icon;
              return (
                <tr
                  key={row.feature.key}
                  onClick={() => onSelectFeature(row.feature.key)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-5 py-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        RANK_BADGE[index] || "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-100 px-2.5 py-1 text-xs font-bold ${theme.iconBg}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {row.feature.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-500">
                    {number(row.eligible_users)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-slate-800">
                    {number(row.users)}
                  </td>
                  <td className="px-4 py-3">
                    <MiniBar value={row.adoption_percentage} colorClass="bg-indigo-500" />
                  </td>
                  <td className="px-4 py-3">
                    <MiniBar value={row.completion_percentage} colorClass="bg-emerald-500" />
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-600">
                    {number(row.averages?.session_minutes, 1)}m
                  </td>
                  <td className="px-7 py-3">
                    {row.averages?.accuracy_percentage ? (
                      <MiniBar value={row.averages.accuracy_percentage} colorClass="bg-amber-500" />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ranked.length > FEATURE_TABLE_COLLAPSED_COUNT && (
        <div className="border-t border-slate-100 px-7 py-3 text-center">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            {showAll ? "Show less" : `Show ${hiddenCount} more feature${hiddenCount > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}

// Journey Modal

function JourneyModal({ journey, loading, features = [], onClose }) {
  const [expanded, setExpanded] = useState(null);
  const modules = useMemo(() => summarizeJourney(journey), [journey]);
  // Labels and the per-feature metric word ("cards", "questions", "screens")
  // come from the catalog so this table never drifts from the backend registry.
  const featureMeta = useMemo(
    () => new Map(features.map((feature) => [feature.key, feature])),
    [features],
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ animation: "analyticsModalFadeIn 150ms ease-out" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />

      {/* Modal Container */}
      <div
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-950/5"
        style={{ animation: "analyticsModalSlideUp 200ms ease-out" }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-8 pb-6 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <span
                className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black shadow-sm border ${getAvatarColor(journey?.name)}`}
              >
                {initials(journey?.name)}
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
                  {journey?.name || "Loading…"}
                </h2>
                {journey?.phone && (
                  <p className="mt-0.5 text-sm text-slate-400 font-medium">
                    {journey.phone}
                  </p>
                )}
                {/* Single line metadata row */}
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {number(journey?.event_count)} actions
                  </span>
                  {(journey?.diagnostics?.errors || 0) > 0 && (
                    <span className="inline-flex items-center rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                      {number(journey.diagnostics.errors)} error
                      {journey.diagnostics.errors > 1 ? "s" : ""}
                    </span>
                  )}
                  {(journey?.diagnostics?.rage_points || 0) > 0 && (
                    <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">
                      {number(journey.diagnostics.rage_points)} friction
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ControlButton
              onClick={onClose}
              variant="secondary"
              className="h-10 w-10 !p-0"
            >
              <X className="h-5 w-5" />
            </ControlButton>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 px-8 py-10 space-y-6">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="space-y-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-7 w-7 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
                    <div className="h-2 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* One row per chapter, set or flow — click a row for the raw events */
          <div className="flex-1 overflow-y-auto bg-white px-8 py-6">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              What they worked on &middot; {modules.length} module
              {modules.length === 1 ? "" : "s"} &middot;{" "}
              {number(
                modules.reduce((sum, module) => sum + (module.events || 0), 0),
              )}{" "}
              actions
            </p>

            {modules.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">
                No events recorded for this candidate on this day.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-t border-b border-slate-200 bg-slate-50">
                      <th className="w-8 px-3 py-3" />
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Feature
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Chapter
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Level
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Progress
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Last activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modules.map((module) => {
                      const rowKey = `${module.feature}|${module.level || ""}|${module.module_key}`;
                      const isOpen = expanded === rowKey;
                      const isError =
                        module.feature === "diagnostic" ||
                        (module.errors || 0) > 0;
                      const theme = getFeatureTheme(module.feature, isError);
                      const Icon = theme.icon;
                      const meta = featureMeta.get(module.feature);
                      const progress = moduleProgressText(module, meta?.metric);
                      const level =
                        LEVEL_LABELS[module.level] || module.level || "—";

                      return (
                        <Fragment key={rowKey}>
                          <tr
                            onClick={() => setExpanded(isOpen ? null : rowKey)}
                            className={`cursor-pointer transition-colors ${
                              isOpen
                                ? "bg-indigo-50/60"
                                : isError
                                  ? "bg-rose-50/40"
                                  : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-3 py-3">
                              <ChevronRight
                                className={`h-4 w-4 text-slate-400 transition-transform ${
                                  isOpen ? "rotate-90" : ""
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-100 px-2.5 py-1 text-[10px] font-bold ${theme.iconBg}`}
                              >
                                <Icon className="h-3 w-3" />
                                {meta?.label ||
                                  fallbackJourneyLabel(module.feature)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {module.module_label ||
                                meta?.label ||
                                fallbackJourneyLabel(module.feature)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded px-2 py-0.5 text-xs font-semibold text-slate-500">
                                {level}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-slate-500">
                              {progress || (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {module.completed ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                                  title="Completed"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Done
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"
                                  title="Still in progress"
                                >
                                  <Clock3 className="h-3 w-3" />
                                  In progress
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-500">
                              {istTime(module.last_at)}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-slate-50">
                              <td colSpan={7} className="px-6 py-4">
                                {module.timeline?.length ? (
                                  <ul className="space-y-2">
                                    {module.timeline.map((item, itemIndex) => (
                                      <li
                                        key={`${rowKey}-${itemIndex}`}
                                        className="flex items-start justify-between gap-4"
                                      >
                                        <div className="min-w-0">
                                          <p
                                            className={`text-xs font-semibold ${
                                              item.kind === "error"
                                                ? "text-rose-600"
                                                : "text-slate-700"
                                            }`}
                                          >
                                            {item.label ||
                                              fallbackJourneyLabel(
                                                item.event_name,
                                              )}
                                            {item.count > 1 && (
                                              <span className="ml-2 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                                                ×{item.count}
                                              </span>
                                            )}
                                          </p>
                                          {item.detail && (
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                              {item.detail}
                                            </p>
                                          )}
                                        </div>
                                        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">
                                          {item.first_at !== item.last_at
                                            ? `${istTime(item.first_at)} – ${istTime(item.last_at)}`
                                            : istTime(item.started_at)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-400">
                                    {number(module.events)} action
                                    {module.events === 1 ? "" : "s"} recorded, with
                                    no further detail stored for this module.
                                  </p>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes analyticsModalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes analyticsModalSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

// Skeletons for Loading

function PageSkeletonWrapper({ isFeatures }) {
  if (isFeatures) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 h-2 w-16 animate-pulse rounded bg-slate-100" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
              <div className="mt-3 h-2 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-6 h-3 w-32 animate-pulse rounded bg-slate-100" />
          <div className="flex gap-3">
            {[44, 30, 18, 8].map((f, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-slate-100"
                style={{ flex: `${f} 1 0%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return <TableSkeleton rows={8} />;
}

// Main Component

export default function NewAnalytics({ me }) {
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [featureTable, setFeatureTable] = useState([]);
  const [journeys, setJourneys] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rebuildConfirmOpen, setRebuildConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const tab = params.get("tab") === "journeys" ? "journeys" : "features";

  const filters = useMemo(() => {
    const rawLevel = String(params.get("level") || "ALL").toUpperCase();
    const level = (catalog?.levels || ["ALL", "A1", "A2", "B1"]).includes(
      rawLevel,
    )
      ? rawLevel
      : "ALL";
    const availableFeatures = (catalog?.features || []).filter(
      (f) => level === "ALL" || f.levels?.includes(level),
    );
    const featureKeys = availableFeatures.map((f) => f.key);
    const rawFeature = params.get("feature");
    const feature = featureKeys.includes(rawFeature)
      ? rawFeature
      : featureKeys[0] || "flashcards";
    const allowed = (key, fallback) => {
      const val = params.get(key) || fallback;
      return FILTERS[key].some(([o]) => o === val) ? val : fallback;
    };
    // The journeys tab stays on a single day because a journey timeline is
    // stored per day. The features tab reads an inclusive window, defaulting
    // to that same single day so existing links keep working.
    const date = params.get("date") || catalog?.default_date || "";
    const latest = catalog?.default_date || "";
    const earliest = catalog?.available_from || "";
    // Clamp to the window the API will actually accept, so a stale bookmark or
    // a hand-edited URL renders the nearest valid range instead of erroring.
    const clamp = (value) => {
      if (!value) return value;
      if (earliest && value < earliest) return earliest;
      if (latest && value > latest) return latest;
      return value;
    };
    const dateTo = clamp(params.get("date_to") || date);
    const rawFrom = clamp(params.get("date_from") || dateTo);
    const dateFrom = rawFrom > dateTo ? dateTo : rawFrom;
    return {
      date,
      date_from: dateFrom,
      date_to: dateTo,
      feature,
      level,
      user_type: allowed("user_type", "all"),
      learner_stage: allowed("learner_stage", "all"),
      platform: allowed("platform", "all"),
      page: Math.max(1, Number(params.get("page") || 1)),
      limit: [10, 20, 50].includes(Number(params.get("limit")))
        ? Number(params.get("limit"))
        : 20,
    };
  }, [params, catalog]);

  const visibleFeatures = useMemo(
    () =>
      (catalog?.features || []).filter(
        (f) => filters.level === "ALL" || f.levels?.includes(filters.level),
      ),
    [catalog, filters.level],
  );

  const update = useCallback(
    (key, val) => {
      const next = new URLSearchParams(params);
      next.set(key, String(val));
      if (key !== "page") next.set("page", "1");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // Both endpoints move together so the window can never invert, and `date`
  // is kept in sync for the journeys tab and the rebuild action.
  const updateRange = useCallback(
    (from, to) => {
      const end = to || from;
      const start = from && from <= end ? from : end;
      const next = new URLSearchParams(params);
      next.set("date_from", start);
      next.set("date_to", end);
      next.set("date", end);
      next.set("page", "1");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // A preset is only offered when its whole window exists. Telemetry began on
  // catalog.available_from, so on a short history "7 days" would silently ask
  // for days that predate the data and the API would reject the range.
  const presetRanges = useMemo(() => {
    const end = catalog?.default_date || "";
    const earliest = catalog?.available_from || "";
    return RANGE_PRESETS.map(([label, days]) => {
      const start = end ? shiftDate(end, -(days - 1)) : "";
      const available =
        Boolean(end) && (!earliest || (Boolean(start) && start >= earliest));
      return { label, days, start, end, available };
    });
  }, [catalog]);

  const applyPreset = useCallback(
    (preset) => {
      if (!preset?.available) return;
      updateRange(preset.start, preset.end);
    },
    [updateRange],
  );

  const activePresetDays = useMemo(() => {
    const end = catalog?.default_date;
    if (!end || filters.date_to !== end) return null;
    const match = RANGE_PRESETS.find(
      ([, days]) => shiftDate(end, -(days - 1)) === filters.date_from,
    );
    return match ? match[1] : null;
  }, [catalog, filters.date_from, filters.date_to]);

  const switchTab = useCallback(
    (nextTab) => {
      const next = new URLSearchParams(params);
      next.set("tab", nextTab);
      next.set("page", "1");
      if (
        nextTab === "features" &&
        !catalog?.features?.some((f) => f.key === next.get("feature"))
      ) {
        next.set("feature", catalog?.features?.[0]?.key || "flashcards");
      }
      setParams(next, { replace: true });
    },
    [catalog, params, setParams],
  );

  useEffect(() => {
    let live = true;
    newAnalyticsApi
      .catalog()
      .then(({ data }) => {
        if (live) setCatalog(data);
      })
      .catch(() => {
        if (live) setError("Could not load analytics catalog.");
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!filters.date) return;
    let live = true;
    setLoading(true);
    setError("");
    const request =
      tab === "features"
        ? Promise.all([
            newAnalyticsApi.metrics(filters),
            // One call per visible feature so the overview table can show every
            // feature side by side, independent of which single feature is
            // selected in the drill-down dropdown above.
            Promise.all(
              visibleFeatures.map((feature) =>
                newAnalyticsApi
                  .metrics({ ...filters, feature: feature.key })
                  .then(({ data }) => ({ ...data, feature }))
                  .catch(() => null),
              ),
            ),
          ])
        : newAnalyticsApi.journeys({
            date: filters.date_to,
            page: filters.page,
            limit: filters.limit,
          });
    request
      .then((result) => {
        if (!live) return;
        if (tab === "features") {
          const [metricsRes, tableRows] = result;
          setMetrics(metricsRes.data);
          setFeatureTable(tableRows.filter(Boolean));
        } else {
          setJourneys(result.data);
        }
      })
      .catch((err) => {
        if (live)
          setError(err.response?.data?.msg || "Analytics could not be loaded.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [filters, tab, reloadToken, visibleFeatures]);

  const openJourney = async (subjectId) => {
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await newAnalyticsApi.journey(subjectId, filters.date_to);
      setDetail(data);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Journey could not be loaded");
    } finally {
      setDetailLoading(false);
    }
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await newAnalyticsApi.refresh(filters.date_to);
      toast.success("Analytics day rebuilt");
      setReloadToken((v) => v + 1);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const TABS = [
    { key: "features", label: "Feature analytics" },
    { key: "journeys", label: "User journeys" },
  ];

  const totalPages = Math.max(
    1,
    Math.ceil((journeys?.total || 0) / filters.limit),
  );

  // Options converters for ControlDropdown
  const featureDropdownOptions = visibleFeatures.map((f) => ({
    value: f.key,
    label: f.label,
  }));

  const levelDropdownOptions = (catalog?.levels || []).map((lvl) => ({
    value: lvl,
    label:
      lvl === "ALL"
        ? "All levels"
        : lvl === "LEARN_GERMAN"
          ? "Learn German"
          : lvl,
  }));

  const userTypeOptions = FILTERS.user_type.map(([val, lbl]) => ({
    value: val,
    label: lbl,
  }));

  const stageOptions = FILTERS.learner_stage.map(([val, lbl]) => ({
    value: val,
    label: lbl,
  }));

  const platformOptions = FILTERS.platform.map(([val, lbl]) => ({
    value: val,
    label: lbl,
  }));

  // Render

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-7 lg:p-8">
        {/* Header & Tabs Row Consolidated */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-7 py-4.5 shadow-sm">
          <div className="flex items-center gap-5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 shadow-sm">
              <Activity className="h-4.5 w-4.5 text-indigo-500" />
            </span>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-slate-900 leading-none">
                Analytics
              </h1>
            </div>
            {/* Inline Sub-Tabs Control */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-5">
              {TABS.map((t) => (
                <ActionChip
                  key={t.key}
                  active={tab === t.key}
                  onClick={() => switchTab(t.key)}
                  className="h-8 px-3 text-xs"
                >
                  {t.label}
                </ActionChip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {catalog && (
              <span className="hidden items-center gap-1.5 text-[10px] text-slate-400 lg:inline-flex">
                <Clock3 className="h-3 w-3" />
                Synced: {catalog.refreshed_through || "not yet"}
              </span>
            )}
            {me?.role === "super_admin" && (
              <ControlButton
                onClick={() => setRebuildConfirmOpen(true)}
                disabled={!filters.date_to || refreshing}
                variant="secondary"
                className="h-8 text-[11px] gap-1.5 px-3"
              >
                <RefreshCw
                  className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                />
                Rebuild day
              </ControlButton>
            )}
          </div>
        </div>

        {/* Filters Card (Safe absolute menus via fixedMenu) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            className={`grid gap-x-5 gap-y-4 px-7 py-6 ${
              tab === "features"
                ? "grid-cols-1 sm:grid-cols-3 lg:grid-cols-7"
                : "max-w-sm grid-cols-1"
            }`}
          >
            {/* Calendar Day Control — a window on features, one day on journeys */}
            {tab === "features" ? (
              <>
                <div className="flex flex-col">
                  <label
                    htmlFor="analytics-date-from"
                    className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    From (IST)
                  </label>
                  <ControlInput
                    id="analytics-date-from"
                    type="date"
                    aria-label="Range start date"
                    max={filters.date_to || catalog?.default_date}
                    min={catalog?.available_from || undefined}
                    value={filters.date_from}
                    onChange={(e) => updateRange(e.target.value, filters.date_to)}
                    className="w-full text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="analytics-date-to"
                    className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    To (IST)
                  </label>
                  <ControlInput
                    id="analytics-date-to"
                    type="date"
                    aria-label="Range end date"
                    max={catalog?.default_date}
                    min={filters.date_from || catalog?.available_from || undefined}
                    value={filters.date_to}
                    onChange={(e) => updateRange(filters.date_from, e.target.value)}
                    className="w-full text-sm font-semibold text-slate-700"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col">
                <label className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  IST calendar day
                </label>
                <ControlInput
                  type="date"
                  aria-label="Calendar day select"
                  max={catalog?.default_date}
                  min={catalog?.available_from || undefined}
                  value={filters.date_to}
                  onChange={(e) => updateRange(e.target.value, e.target.value)}
                  className="w-full text-sm font-semibold text-slate-700"
                />
              </div>
            )}

            {tab === "features" && (
              <>
                <div className="flex flex-col sm:col-span-2">
                  <label htmlFor="analytics-feature" className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Feature
                  </label>
                  <ControlDropdown
                    id="analytics-feature"
                    value={filters.feature}
                    options={featureDropdownOptions}
                    onChange={(v) => update("feature", v)}
                    fixedMenu={true}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="analytics-level" className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Level
                  </label>
                  <ControlDropdown
                    id="analytics-level"
                    value={filters.level}
                    options={levelDropdownOptions}
                    onChange={(v) => update("level", v)}
                    fixedMenu={true}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="analytics-user-type" className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    User type
                  </label>
                  <ControlDropdown
                    id="analytics-user-type"
                    value={filters.user_type}
                    options={userTypeOptions}
                    onChange={(v) => update("user_type", v)}
                    fixedMenu={true}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="analytics-learner-stage" className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Learner Stage
                  </label>
                  <ControlDropdown
                    id="analytics-learner-stage"
                    value={filters.learner_stage}
                    options={stageOptions}
                    onChange={(v) => update("learner_stage", v)}
                    fixedMenu={true}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="analytics-platform" className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Platform
                  </label>
                  <ControlDropdown
                    id="analytics-platform"
                    value={filters.platform}
                    options={platformOptions}
                    onChange={(v) => update("platform", v)}
                    fixedMenu={true}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer details info */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-slate-100 px-7 py-3">
            {tab === "features" && (
              <span className="inline-flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Quick range
                </span>
                {presetRanges.map((preset) => (
                  <ActionChip
                    key={preset.label}
                    active={activePresetDays === preset.days}
                    disabled={!preset.available}
                    onClick={() => applyPreset(preset)}
                    title={
                      preset.available
                        ? `${formatRangeLabel(preset.start, preset.end)}`
                        : `Needs data from ${formatDateLabel(preset.start)}; analytics begin ${formatDateLabel(catalog?.available_from)}`
                    }
                    className="h-6 px-2 text-[10px]"
                  >
                    {preset.label}
                  </ActionChip>
                ))}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
              <Clock3 className="h-3 w-3" />
              Refreshed through {catalog?.refreshed_through || "not yet"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
              <MonitorSmartphone className="h-3 w-3" />
              App = Android/iOS &middot; Web = browser/PWA
            </span>
            {catalog?.min_app_version && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"
                title={catalog.eligibility_note || undefined}
              >
                <Users className="h-3 w-3" />
                Eligible = last seen on v{catalog.min_app_version}+ (older builds
                cannot report)
              </span>
            )}
          </div>
        </div>

        {/* Banner */}
        {catalog?.is_stale && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            Analytics snapshots are behind the latest IST day. Super admins can
            rebuild.
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </div>
        )}

        {/* Content Are */}
        {loading ? (
          <PageSkeletonWrapper isFeatures={tab === "features"} />
        ) : tab === "features" ? (
          metrics ? (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                <StatCard
                  label="Eligible users"
                  value={number(metrics.eligible_users)}
                  subText={
                    catalog?.min_app_version
                      ? `On app v${catalog.min_app_version}+`
                      : "Platform-neutral denominator"
                  }
                  tone="slate"
                />
                <StatCard
                  label="Adoption"
                  value={`${number(metrics.adoption_percentage, 1)}%`}
                  subText={`${number(metrics.users)} started${
                    (metrics.days || 1) > 1 ? ` over ${metrics.days} days` : ""
                  }`}
                  tone="emerald"
                />
                <StatCard
                  label="Completion"
                  value={`${number(metrics.completion_percentage, 1)}%`}
                  subText={metrics.feature.completion || "Completion criteria"}
                  tone="amber"
                />
                <StatCard
                  label={`Avg ${metrics.feature.metric}`}
                  value={number(metrics.averages.units, 1)}
                  subText="Distinct units per adopter"
                  tone="indigo"
                />
                <StatCard
                  label="Avg session"
                  value={`${number(metrics.averages.session_minutes, 1)}m`}
                  subText="Active interaction time"
                  tone="blue"
                />
                <StatCard
                  label="Avg progress"
                  value={`${number(metrics.averages.progress_percentage, 1)}%`}
                  subText="Observed item position"
                  tone="purple"
                />
                <StatCard
                  label="Accuracy"
                  value={`${number(metrics.averages.accuracy_percentage, 1)}%`}
                  subText="Where correctness is tracked"
                  tone="rose"
                />
              </div>

              {/* Conversion funnel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Conversion Funnel
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Unique candidates reaching each semantic stage &middot;{" "}
                      {formatRangeLabel(filters.date_from, filters.date_to)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                    {metrics.funnel?.length || 0} steps
                  </span>
                </div>
                <HorizontalFunnel rows={metrics.funnel} />
              </div>

              {/* Feature Overview Table */}
              <FeatureOverviewTable
                rows={featureTable}
                selectedFeature={filters.feature}
                onSelectFeature={(key) => update("feature", key)}
              />
            </div>
          ) : (
            <EmptyState message="No rollup data exists for this date. Select another day." />
          )
        ) : journeys?.users?.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Table Controller Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Candidate Activity Journeys
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {number(journeys.total)} candidates with activity on{" "}
                  {formatDateLabel(filters.date_to)}
                </p>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rows
                  </span>
                  <ControlSelect
                    value={filters.limit}
                    onChange={(e) => update("limit", e.target.value)}
                    className="h-8 py-0 pl-2 pr-7 text-xs font-semibold"
                  >
                    {[10, 20, 50].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </ControlSelect>
                </div>
                <span className="h-5 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <ControlButton
                    aria-label="Previous page"
                    disabled={filters.page <= 1}
                    onClick={() => update("page", filters.page - 1)}
                    variant="secondary"
                    className="h-8 w-8 !p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </ControlButton>
                  <span className="min-w-[56px] text-center text-xs font-semibold tabular-nums text-slate-600">
                    {filters.page} / {totalPages}
                  </span>
                  <ControlButton
                    aria-label="Next page"
                    disabled={filters.page * filters.limit >= journeys.total}
                    onClick={() => update("page", filters.page + 1)}
                    variant="secondary"
                    className="h-8 w-8 !p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </ControlButton>
                </div>
              </div>
            </div>

            {/* Candidate Table */}
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full min-w-[740px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-7 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Candidate
                    </th>
                    <th className="px-7 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Active window
                    </th>
                    <th className="px-7 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Features
                    </th>
                    <th className="px-7 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Actions
                    </th>
                    <th className="px-7 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Diagnostics
                    </th>
                    <th className="w-[140px] px-7 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  {journeys.users.map((user) => {
                    const hasErrors = (user.diagnostics?.errors || 0) > 0;
                    const hasRage = (user.diagnostics?.rage_points || 0) > 0;

                    return (
                      <tr
                        key={user.subject_id}
                        className="border-b border-slate-100 transition hover:bg-slate-50/50"
                      >
                        {/* Candidate avatar + info */}
                        <td className="px-7 py-5">
                          <div className="flex items-center gap-3.5">
                            <span
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm border ${getAvatarColor(user.name)}`}
                            >
                              {initials(user.name)}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {user.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {user.phone || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Active Window */}
                        <td className="px-7 py-5">
                          <span className="text-xs tabular-nums text-slate-500">
                            {istTime(user.first_event_at)}
                          </span>
                          <span className="mx-1.5 text-slate-300">—</span>
                          <span className="text-xs tabular-nums text-slate-500">
                            {istTime(user.last_event_at)}
                          </span>
                        </td>

                        {/* Feature Badges */}
                        <td className="px-7 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {user.features?.slice(0, 3).map((f) => (
                              <span
                                key={f}
                                className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-600"
                              >
                                {fallbackJourneyLabel(f)}
                              </span>
                            ))}
                            {(user.features?.length || 0) > 3 && (
                              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                +{user.features.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Actions */}
                        <td className="px-7 py-5">
                          <span className="text-sm font-bold tabular-nums text-slate-800">
                            {number(user.event_count)}
                          </span>
                        </td>

                        {/* Diagnostics counters */}
                        <td className="px-7 py-5">
                          <div className="flex gap-2 min-h-[20px]">
                            {hasErrors && (
                              <span className="rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100 px-2.5 py-0.5 text-[10px] font-bold">
                                {number(user.diagnostics.errors)} err
                              </span>
                            )}
                            {hasRage && (
                              <span className="rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100 px-2.5 py-0.5 text-[10px] font-bold">
                                {number(user.diagnostics.rage_points)} rage
                              </span>
                            )}
                            {!hasErrors && !hasRage && (
                              <span className="text-slate-300 text-xs font-semibold select-none">
                                —
                              </span>
                            )}
                          </div>
                        </td>

                        {/* CTA button */}
                        <td className="px-7 py-5 text-right">
                          <ControlButton
                            onClick={() => openJourney(user.subject_id)}
                            variant="secondary"
                            className="h-9 w-full text-xs font-semibold"
                          >
                            View journey
                          </ControlButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState message="No meaningful candidate activity recorded for this day." />
        )}
      </div>

      {rebuildConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel rebuild"
            className="absolute inset-0 cursor-default bg-slate-950/60"
            onClick={() => setRebuildConfirmOpen(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rebuild-analytics-title"
            aria-describedby="rebuild-analytics-description"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2
                  id="rebuild-analytics-title"
                  className="text-base font-bold text-slate-900"
                >
                  Rebuild this analytics day?
                </h2>
                <p
                  id="rebuild-analytics-description"
                  className="mt-2 text-sm leading-6 text-slate-600"
                >
                  This will recalculate analytics for {filters.date_to} and may
                  temporarily place a heavy load on the database. Run it only
                  when this day&apos;s data is missing or outdated.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <ControlButton
                type="button"
                variant="secondary"
                onClick={() => setRebuildConfirmOpen(false)}
              >
                Cancel
              </ControlButton>
              <ControlButton
                type="button"
                variant="primary"
                onClick={() => {
                  setRebuildConfirmOpen(false);
                  refresh();
                }}
              >
                Rebuild analytics
              </ControlButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {detail && (
        <JourneyModal
          journey={detail}
          loading={detailLoading}
          features={catalog?.features || []}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
