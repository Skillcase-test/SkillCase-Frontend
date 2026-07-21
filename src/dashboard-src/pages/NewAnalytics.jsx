import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bookmark,
  CalendarDays,
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

// Journey Modal

function JourneyModal({ journey, loading, onClose }) {
  const rawTimeline = visibleJourneyItems(journey?.timeline || []);

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
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-950/5"
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
          /* Activity Stream Area */
          <div className="flex-1 overflow-y-auto px-8 py-7 bg-white">
            <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Activity Stream &middot; {rawTimeline.length} events
            </p>

            {rawTimeline.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">
                No events recorded for this candidate on this day.
              </p>
            ) : (
              <div className="relative flex flex-col pl-2">
                {rawTimeline.map((item, idx) => {
                  const isError =
                    String(item.event_name || "")
                      .toLowerCase()
                      .includes("fail") ||
                    String(item.label || "")
                      .toLowerCase()
                      .includes("failed") ||
                    item.feature === "diagnostic";
                  const theme = getFeatureTheme(item.feature, isError);
                  const IconComponent = theme.icon;

                  return (
                    <div
                      key={idx}
                      className="relative flex gap-4 pl-6 pb-5 group"
                    >
                      {/* Vertical connector line segment */}
                      {idx < rawTimeline.length - 1 && (
                        <div className="absolute left-[37px] top-[26px] bottom-0 w-[1.5px] bg-slate-100 group-hover:bg-slate-200 transition-colors" />
                      )}

                      {/* Icon Node bubble */}
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white shadow-sm z-10 transition-transform group-hover:scale-105 ${theme.iconBg}`}
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                      </span>

                      {/* Log body content */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-semibold tracking-tight ${isError ? "text-rose-600 font-bold" : "text-slate-800"}`}
                            >
                              {item.label ||
                                fallbackJourneyLabel(item.event_name)}
                            </span>

                            {item.count > 1 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-500 leading-none">
                                ×{item.count}
                              </span>
                            )}

                            {item.feature && !isError && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold border border-slate-100 ${theme.iconBg}`}
                              >
                                {fallbackJourneyLabel(item.feature)}
                              </span>
                            )}
                          </div>

                          <time className="text-[10px] text-slate-400 font-semibold tabular-nums leading-none shrink-0">
                            {istTime(item.started_at)}
                          </time>
                        </div>

                        {item.detail && (
                          <p
                            className={`mt-1 text-xs font-medium leading-relaxed ${isError ? "text-rose-500/90" : "text-slate-400"}`}
                          >
                            {item.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
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
    return {
      date: params.get("date") || catalog?.default_date || "",
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
        ? newAnalyticsApi.metrics(filters)
        : newAnalyticsApi.journeys({
            date: filters.date,
            page: filters.page,
            limit: filters.limit,
          });
    request
      .then(({ data }) => {
        if (!live) return;
        if (tab === "features") setMetrics(data);
        else setJourneys(data);
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
  }, [filters, tab, reloadToken]);

  const openJourney = async (subjectId) => {
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await newAnalyticsApi.journey(subjectId, filters.date);
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
      await newAnalyticsApi.refresh(filters.date);
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
                disabled={!filters.date || refreshing}
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
            {/* Calendar Day Control */}
            <div className="flex flex-col">
              <label className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                IST calendar day
              </label>
              <ControlInput
                type="date"
                aria-label="Calendar day select"
                max={catalog?.default_date}
                min={catalog?.available_from || undefined}
                value={filters.date}
                onChange={(e) => update("date", e.target.value)}
                className="w-full text-sm font-semibold text-slate-700"
              />
            </div>

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
            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
              <Clock3 className="h-3 w-3" />
              Refreshed through {catalog?.refreshed_through || "not yet"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
              <MonitorSmartphone className="h-3 w-3" />
              App = Android/iOS &middot; Web = browser/PWA
            </span>
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
                  subText="Platform-neutral denominator"
                  tone="slate"
                />
                <StatCard
                  label="Adoption"
                  value={`${number(metrics.adoption_percentage, 1)}%`}
                  subText={`${number(metrics.users)} started`}
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
                      Unique candidates reaching each semantic stage
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                    {metrics.funnel?.length || 0} steps
                  </span>
                </div>
                <HorizontalFunnel rows={metrics.funnel} />
              </div>
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
                  {formatDateLabel(filters.date)}
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
                  This will recalculate analytics for {filters.date} and may
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
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
