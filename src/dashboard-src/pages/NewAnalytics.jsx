import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MonitorSmartphone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { newAnalyticsApi } from "../../api/newAnalyticsApi";

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

function number(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function istTime(value) {
  return value
    ? new Date(value).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
}

function fallbackJourneyLabel(value) {
  if (FEATURE_LABELS[value]) return FEATURE_LABELS[value];
  const words = String(value || "Activity")
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function visibleJourneyItems(timeline = []) {
  const technical = /^(api\.|fetch\.|performance\.|navigation\.|network\.|app\.|telemetry\.|content\.scroll_depth|page\.|route\.|interaction\.(?!rage_click|unresponsive))/;
  return timeline.filter(
    (item) => item.label || !technical.test(String(item.event_name || "").toLowerCase()),
  );
}

function Select({ label, value, onChange, children, wide = false }) {
  return (
    <label className={wide ? "lg:col-span-2" : ""}>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
        {label}
      </span>
      <div className="group relative">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.08] px-4 pr-10 text-sm font-semibold text-white shadow-inner outline-none transition hover:border-white/25 hover:bg-white/[0.12] focus:border-indigo-400 focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/15 [&>option]:bg-slate-900 [&>option]:text-white"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:rotate-180 group-focus-within:text-indigo-300" />
      </div>
    </label>
  );
}

function Skeleton() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-28 rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function MetricCard({ label, value, note, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${tones[tone]}`}
      >
        {label}
      </div>
      <div className="text-3xl font-black tracking-tight text-slate-950">
        {value}
      </div>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function Funnel({ rows = [] }) {
  const first = Math.max(1, rows[0]?.users || 0);
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[700px] items-stretch gap-2">
        {rows.map((row, index) => {
          const width = Math.max(34, (row.users / first) * 100);
          return (
            <div key={row.label} className="flex min-w-0 flex-1 items-center">
              <div className="w-full">
                <div className="mb-2 flex items-end justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {row.label}
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {number(row.users)}
                  </span>
                </div>
                <div className="h-16 rounded-xl bg-slate-100 p-2">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {number((row.users / first) * 100, 1)}% of first step
                </p>
              </div>
              {index < rows.length - 1 && (
                <ArrowRight className="mx-1 mt-5 h-4 w-4 shrink-0 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JourneyPanel({ journey, loading, onClose }) {
  if (!journey && !loading) return null;
  const timeline = visibleJourneyItems(journey?.timeline);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Daily user journey
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {journey?.name || "Loading…"}
            </h2>
            <p className="text-sm text-slate-500">{journey?.phone || ""}</p>
          </div>
          <button
            aria-label="Close journey"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <Skeleton />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 gap-3">
              <MetricCard
                label="Actions"
                value={number(journey.event_count)}
                note="Meaningful events"
              />
              <MetricCard
                label="Errors"
                value={number(journey.diagnostics?.errors)}
                note="Captured failures"
                tone="amber"
              />
              <MetricCard
                label="Rage points"
                value={number(journey.diagnostics?.rage_points)}
                note="Friction signals"
                tone="emerald"
              />
            </div>
            <div className="relative space-y-1 before:absolute before:bottom-3 before:left-[74px] before:top-3 before:w-px before:bg-slate-200">
              {timeline.map((item, index) => (
                <div
                  key={`${item.started_at}-${index}`}
                  className="relative grid grid-cols-[58px_1fr] gap-8 rounded-xl px-2 py-3 hover:bg-slate-50"
                >
                  <time className="text-xs font-semibold text-slate-500">
                    {istTime(item.started_at)}
                  </time>
                  <div className="relative">
                    <span className="absolute -left-[37px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        {item.label || fallbackJourneyLabel(item.event_name)}
                      </p>
                      {item.count > 1 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                          ×{item.count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[
                        item.detail,
                        item.feature ? fallbackJourneyLabel(item.feature) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default function NewAnalytics({ me }) {
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [journeys, setJourneys] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const tab = params.get("tab") === "journeys" ? "journeys" : "features";
  const filters = useMemo(
    () => {
      const rawLevel = String(params.get("level") || "ALL").toUpperCase();
      const level = (catalog?.levels || ["ALL", "A1", "A2", "B1"]).includes(
        rawLevel,
      )
        ? rawLevel
        : "ALL";
      const availableFeatures = (catalog?.features || []).filter(
        (feature) => level === "ALL" || feature.levels?.includes(level),
      );
      const featureKeys = availableFeatures.map((feature) => feature.key);
      const rawFeature = params.get("feature");
      const feature = featureKeys.includes(rawFeature)
        ? rawFeature
        : featureKeys[0] || "flashcards";
      const allowed = (key, fallback) => {
        const value = params.get(key) || fallback;
        return FILTERS[key].some(([option]) => option === value) ? value : fallback;
      };
      return {
        date: params.get("date") || catalog?.default_date || "",
        feature,
        level,
        user_type: allowed("user_type", "all"),
        learner_stage: allowed("learner_stage", "all"),
        platform: allowed("platform", "all"),
        page: Math.max(1, Number(params.get("page") || 1)),
        limit: [10, 20, 50].includes(Number(params.get("limit"))) ? Number(params.get("limit")) : 20,
      };
    },
    [params, catalog],
  );
  const visibleFeatures = useMemo(
    () =>
      (catalog?.features || []).filter(
        (feature) =>
          filters.level === "ALL" || feature.levels?.includes(filters.level),
      ),
    [catalog, filters.level],
  );
  const update = useCallback(
    (key, value) => {
      const next = new URLSearchParams(params);
      next.set(key, String(value));
      if (key !== "page") next.set("page", "1");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );
  const switchTab = useCallback((nextTab) => {
    const next = new URLSearchParams(params);
    next.set("tab", nextTab);
    next.set("page", "1");
    if (
      nextTab === "features" &&
      !catalog?.features?.some((feature) => feature.key === next.get("feature"))
    ) {
      next.set("feature", catalog?.features?.[0]?.key || "flashcards");
    }
    setParams(next, { replace: true });
  }, [catalog, params, setParams]);

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
      .catch((requestError) => {
        if (live)
          setError(
            requestError.response?.data?.msg ||
              "Analytics could not be loaded.",
          );
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
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.msg || "Journey could not be loaded",
      );
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
      setReloadToken((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError.response?.data?.msg || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
              <Activity className="h-4 w-4" />
              New Analytics
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Product intelligence, without raw-table load
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Daily IST rollups for feature adoption, completion, friction and
              individual operational journeys. Data is retained for 90 days.
            </p>
          </div>
          {me?.role === "super_admin" && (
            <button
              onClick={refresh}
              disabled={!filters.date || refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Rebuilding…" : "Rebuild day"}
            </button>
          )}
        </header>

        <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => switchTab("features")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "features" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Feature analytics
          </button>
          <button
            onClick={() => switchTab("journeys")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "journeys" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            User journeys
          </button>
        </div>

        <section className="mb-6 overflow-hidden rounded-2xl bg-[#10182f] shadow-[0_18px_50px_-24px_rgba(15,23,42,0.65)] ring-1 ring-slate-950/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300"><SlidersHorizontal className="h-4 w-4" /></span>
              <div><h2 className="text-sm font-bold text-white">Build your analytics view</h2><p className="text-xs text-slate-400">Every filter uses the selected IST calendar day.</p></div>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300">Daily snapshot</span>
          </div>
          <div className={`grid gap-4 px-5 py-5 ${tab === "features" ? "sm:grid-cols-2 lg:grid-cols-7" : "max-w-sm"}`}>
            <label>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                IST calendar day
              </span>
              <div className="group relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-300" />
                <input
                  aria-label="IST calendar day"
                  type="date"
                  max={catalog?.default_date}
                  min={catalog?.available_from || undefined}
                  value={filters.date}
                  onChange={(event) => update("date", event.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.08] pl-11 pr-3 text-sm font-semibold text-white shadow-inner outline-none transition hover:border-white/25 hover:bg-white/[0.12] focus:border-indigo-400 focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>
            </label>
            {tab === "features" && (
              <>
                <Select
                  label="Feature"
                  value={filters.feature}
                  onChange={(value) => update("feature", value)}
                  wide
                >
                  {visibleFeatures.map((feature) => (
                    <option key={feature.key} value={feature.key}>
                      {feature.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Level"
                  value={filters.level}
                  onChange={(value) => update("level", value)}
                >
                  {catalog?.levels?.map((level) => (
                    <option key={level} value={level}>
                      {level === "ALL"
                        ? "All levels"
                        : level === "LEARN_GERMAN"
                          ? "Learn German"
                          : level}
                    </option>
                  ))}
                </Select>
                {Object.entries(FILTERS).map(([key, choices]) => (
                  <Select
                    key={key}
                    label={key.replaceAll("_", " ")}
                    value={filters[key]}
                    onChange={(value) => update(key, value)}
                  >
                    {choices.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                ))}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 bg-black/10 px-5 py-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              Refreshed through {catalog?.refreshed_through || "not yet"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              App = Android/iOS · Web = browser/PWA
            </span>
          </div>
        </section>

        {catalog?.is_stale && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Daily analytics is behind the latest completed IST day. A super
            admin should rebuild the missing date or check the scheduled job.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
          >
            {error}
          </div>
        )}
        {loading ? (
          <Skeleton />
        ) : tab === "features" ? (
          metrics ? (
            <>
              <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Eligible users"
                  value={number(metrics.eligible_users)}
                  note="Platform-neutral denominator"
                />
                <MetricCard
                  label="Adoption"
                  value={`${number(metrics.adoption_percentage, 1)}%`}
                  note={`${number(metrics.users)} users started using it`}
                  tone="emerald"
                />
                <MetricCard
                  label="Completion"
                  value={`${number(metrics.completion_percentage, 1)}%`}
                  note={metrics.feature.completion}
                  tone="amber"
                />
                <MetricCard
                  label={`Avg ${metrics.feature.metric}`}
                  value={number(metrics.averages.units, 1)}
                  note="Distinct units per adopter"
                  tone="sky"
                />
                <MetricCard
                  label="Avg session"
                  value={`${number(metrics.averages.session_minutes, 1)} min`}
                  note="Active interaction time"
                />
                <MetricCard
                  label="Avg progress"
                  value={`${number(metrics.averages.progress_percentage, 1)}%`}
                  note="Observed item position"
                  tone="emerald"
                />
                <MetricCard
                  label="Accuracy"
                  value={`${number(metrics.averages.accuracy_percentage, 1)}%`}
                  note="Where correctness is available"
                  tone="amber"
                />
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-black text-slate-900">
                    Funnel view
                  </h2>
                  <p className="text-xs text-slate-500">
                    Unique learners reaching each trustworthy semantic
                    milestone.
                  </p>
                </div>
                <Funnel rows={metrics.funnel} />
              </section>
            </>
          ) : (
            <Empty>No rollup exists for this date yet.</Empty>
          )
        ) : journeys?.users?.length ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Candidate activity
                </h2>
                <p className="text-xs text-slate-500">
                  {number(journeys.total)} candidates with meaningful activity
                </p>
              </div>
              <Search className="h-5 w-5 text-slate-300" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Activity window</th>
                    <th className="px-5 py-3">Features</th>
                    <th className="px-5 py-3">Actions</th>
                    <th className="px-5 py-3">Diagnostics</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journeys.users.map((user) => (
                    <tr key={user.subject_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">
                          {user.phone || "No phone"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {istTime(user.first_event_at)} –{" "}
                        {istTime(user.last_event_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex max-w-sm flex-wrap gap-1">
                          {user.features?.slice(0, 4).map((feature) => (
                            <span
                              key={feature}
                              className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold capitalize text-indigo-700"
                            >
                              {fallbackJourneyLabel(feature)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {number(user.event_count)}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {number(user.diagnostics?.errors)} errors ·{" "}
                        {number(user.diagnostics?.rage_points)} rage
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openJourney(user.subject_id)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                        >
                          View journey
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
              <Select
                label="Rows"
                value={filters.limit}
                onChange={(value) => update("limit", value)}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Previous page"
                  disabled={filters.page <= 1}
                  onClick={() => update("page", filters.page - 1)}
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  Page {filters.page} of{" "}
                  {Math.max(1, Math.ceil(journeys.total / filters.limit))}
                </span>
                <button
                  aria-label="Next page"
                  disabled={filters.page * filters.limit >= journeys.total}
                  onClick={() => update("page", filters.page + 1)}
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        ) : (
          <Empty>
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            No meaningful candidate activity was recorded for this date.
          </Empty>
        )}
      </div>
      <JourneyPanel
        journey={detail}
        loading={detailLoading}
        onClose={() => {
          setDetail(null);
          setDetailLoading(false);
        }}
      />
    </div>
  );
}
