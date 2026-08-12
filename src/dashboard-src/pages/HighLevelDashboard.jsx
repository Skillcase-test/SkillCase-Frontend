import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  Target,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
} from "chart.js";
import { biginDashboardApi } from "../../api/biginDashboardApi";
import api from "../../api/axios";
import { TableSkeleton, EmptyState } from "../payments-admin/components/common";
import { chartAreaGradient } from "../charts/ChartjsConfig";
import { adjustColorOpacity } from "../utils/Utils";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
);

const DONUT_COLORS = [
  "#2563eb",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#94a3b8",
  "#10b981",
  "#06b6d4",
];

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------

function toIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Overall numbers only - rounded so they give a sense of scale without
// revealing exact figures. e.g. 12341 -> "12.3K", 4567 -> "4.6K", 543 -> "540".
function approxNumber(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (v >= 100) return `${Math.round(v / 10) * 10}`;
  return `${Math.round(v)}`;
}

function approxDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "—";
  const mins = Math.round(s / 60);
  if (mins >= 60) return `~${Math.floor(mins / 60)}h ${mins % 60}m`;
  if (mins >= 1) return `~${mins}m`;
  return `~${Math.max(1, Math.round(s / 5) * 5)}s`;
}

function formatSyncedAt(iso) {
  if (!iso) return "not yet synced";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// "2026-07" -> "Jul 26"
function monthLabel(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

// Groups daily rows into calendar-month buckets. Every numeric field is summed
// into bucket.sum; bucket.n is the number of daily rows, so averages can be
// derived as sum/n where needed.
function monthlyBuckets(rows, dateKey) {
  const map = new Map();
  for (const row of rows) {
    const key = (row[dateKey] || "").slice(0, 7);
    if (!key) continue;
    if (!map.has(key)) map.set(key, { key, sum: {}, n: 0 });
    const bucket = map.get(key);
    bucket.n += 1;
    for (const field of Object.keys(row)) {
      if (field === dateKey) continue;
      bucket.sum[field] = (bucket.sum[field] || 0) + Number(row[field] || 0);
    }
  }
  let buckets = [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  // Backfill missing months with empty buckets so the time-series axes are
  // continuous (no gaps where a month simply had zero activity).
  if (buckets.length > 1) {
    const filled = [];
    let cursor = buckets[0].key;
    const last = buckets[buckets.length - 1].key;
    while (cursor <= last) {
      filled.push(map.get(cursor) || { key: cursor, sum: {}, n: 0 });
      const [y, m] = cursor.split("-").map(Number);
      cursor =
        m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    }
    buckets = filled;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// UI building blocks (BiginDashboard-inspired chrome)
// ---------------------------------------------------------------------------

function MetricTile({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {Icon && (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50">
            <Icon className="h-3.5 w-3.5 text-indigo-500" />
          </span>
        )}
      </div>
      <h3 className="mt-2.5 text-2xl font-bold tabular-nums text-slate-900">
        {value}
      </h3>
      {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Clean line/area chart: smooth filled lines, month labels on the x-axis,
// legend for the series - and deliberately NO numbers anywhere (no y-axis,
// no data labels, no tooltips). Pure visuals.
function CleanTrendChart({ labels, series, height = 320 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.isConnected || !canvas.parentElement || labels.length === 0)
      return undefined;

    if (chartRef.current) {
      chartRef.current.stop();
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data,
          borderColor: s.color,
          backgroundColor: (context) => {
            const { ctx, chartArea } = context.chart;
            if (!chartArea) return adjustColorOpacity(s.color, 0.12);
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(s.color, 0) },
              { stop: 1, color: adjustColorOpacity(s.color, 0.16) },
            ]);
          },
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: true,
          tension: 0.35,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        layout: { padding: { top: 8, right: 6, bottom: 0, left: 0 } },
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: {
              color: "#64748b",
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: "circle",
              font: { size: 11, weight: 600 },
              padding: 14,
            },
          },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#9ca3af",
              font: { size: 10 },
              maxRotation: 0,
              maxTicksLimit: 10,
              padding: 8,
            },
          },
          y: { display: false },
        },
      },
    });

    chartRef.current = chart;
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, series]);

  return (
    <div className="relative" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// Clean doughnut: slices + an optional HTML legend of colour dots and labels.
// No numbers anywhere - no tooltips, no percentage labels, just the shape.
// Pass showLabels={false} when even the category names themselves are
// considered sensitive (e.g. paid/free split, proficiency levels).
function CleanDonut({ items, height = 180, showLabels = true }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const total = items.reduce((sum, i) => sum + (i.value || 0), 0);

  const data = useMemo(
    () => ({
      labels: items.map((i) => i.label),
      datasets: [
        {
          data: items.map((i) => i.value || 0),
          backgroundColor: items.map(
            (_, i) => DONUT_COLORS[i % DONUT_COLORS.length],
          ),
          borderWidth: 0,
        },
      ],
    }),
    [items],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.isConnected || !canvas.parentElement || !total)
      return undefined;

    if (chartRef.current) {
      chartRef.current.stop();
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const chart = new Chart(canvas, {
      type: "doughnut",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "78%",
        animation: { duration: 500 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });

    chartRef.current = chart;
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, total]);

  if (!total) return <EmptyState message="No data available." />;

  return (
    <div>
      <div className="relative" style={{ height }}>
        <canvas ref={canvasRef} />
      </div>
      {showLabels && (
        <ul className="mt-4 space-y-2">
          {items.map((item, i) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs font-medium text-slate-600"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                }}
              />
              <span className="truncate">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HighLevelDashboard() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });

  useEffect(() => {
    let live = true;

    // All-time view: no date pickers anywhere on this page. Trends are capped
    // at ~2 years of history so the charts stay clean and the queries stay
    // light; the product's actual data is far newer than that anyway.
    // DAU / WAU / MAU and the trend windows are anchored to YESTERDAY rather
    // than today, because today's activity is still incomplete.
    const twoYearsAgo = toIso(new Date(Date.now() - 730 * 86400000));
    const yesterday = toIso(new Date(Date.now() - 86400000));
    const biginFilters = {
      pipeline: "all",
      owner: "all",
      scope: "active",
      all_time: "true",
    };
    const appParams = {
      startDate: twoYearsAgo,
      endDate: yesterday,
      platform: "both",
      appVersions: [],
    };

    // Each call resolves to its payload or null, so one failing endpoint
    // never takes down the whole page - sections just fall back to empty
    // states / "—" tiles.
    const fetchJson = (promise) =>
      promise.then(({ data }) => data).catch(() => null);
    Promise.all([
      fetchJson(biginDashboardApi.summary(biginFilters)),
      fetchJson(biginDashboardApi.dailyTrend(biginFilters)),
      fetchJson(biginDashboardApi.syncStatus()),
      fetchJson(api.get("/admin/app-analytics/summary", { params: appParams })),
      fetchJson(
        api.get("/admin/app-analytics/active-trend", { params: appParams }),
      ),
      fetchJson(
        api.get("/admin/app-analytics/new-user-trend", { params: appParams }),
      ),
      fetchJson(
        api.get("/admin/app-analytics/retention", {
          params: { ...appParams, granularity: "month", paidStatus: "all" },
        }),
      ),
    ]).then(
      ([
        biginSummary,
        biginTrend,
        syncStatus,
        appSummary,
        activeTrend,
        newUserTrend,
        retention,
      ]) => {
        if (!live) return;
        // If the two core endpoints both failed there is nothing to show.
        if (!biginSummary && !appSummary) {
          setState({
            loading: false,
            error: "Could not load the high level dashboard.",
            data: null,
          });
          return;
        }
        setState({
          loading: false,
          error: "",
          data: {
            biginSummary,
            biginTrend: biginTrend || [],
            syncStatus,
            appSummary,
            activeTrend: activeTrend?.data || [],
            newUserTrend: newUserTrend?.data || [],
            retention: retention?.data || [],
          },
        });
      },
    );

    return () => {
      live = false;
    };
  }, []);

  // ----- Derived data (monthly buckets + aggregations) -----
  const leadTrend = useMemo(
    () => monthlyBuckets(state.data?.biginTrend || [], "date"),
    [state.data],
  );
  const activeTrend = useMemo(
    () => monthlyBuckets(state.data?.activeTrend || [], "activity_date"),
    [state.data],
  );
  const newUserTrend = useMemo(
    () => monthlyBuckets(state.data?.newUserTrend || [], "signup_date"),
    [state.data],
  );

  const leadGrowthChart = useMemo(
    () => ({
      labels: leadTrend.map((b) => monthLabel(b.key)),
      series: [
        {
          label: "New Leads",
          color: "#3b82f6",
          data: leadTrend.map((b) => b.sum.new_leads || 0),
        },
      ],
    }),
    [leadTrend],
  );

  const qualifiedChart = useMemo(
    () => ({
      labels: leadTrend.map((b) => monthLabel(b.key)),
      series: [
        {
          label: "Qualified Leads",
          color: "#22c55e",
          data: leadTrend.map((b) => b.sum.qualified_leads || 0),
        },
      ],
    }),
    [leadTrend],
  );

  const cumulativeChart = useMemo(() => {
    let running = 0;
    const data = leadTrend.map((b) => {
      running += b.sum.new_leads || 0;
      return running;
    });
    return {
      labels: leadTrend.map((b) => monthLabel(b.key)),
      series: [
        {
          label: "Total Leads",
          color: "#0ea5e9",
          data,
        },
      ],
    };
  }, [leadTrend]);

  const activeChart = useMemo(
    () => ({
      labels: activeTrend.map((b) => monthLabel(b.key)),
      series: [
        {
          label: "DAU",
          color: "#10b981",
          data: activeTrend.map((b) =>
            b.n ? Math.round((b.sum.dau || 0) / b.n) : 0,
          ),
        },
        {
          label: "WAU",
          color: "#6366f1",
          data: activeTrend.map((b) =>
            b.n ? Math.round((b.sum.wau || 0) / b.n) : 0,
          ),
        },
        {
          label: "MAU",
          color: "#8b5cf6",
          data: activeTrend.map((b) =>
            b.n ? Math.round((b.sum.mau || 0) / b.n) : 0,
          ),
        },
      ],
    }),
    [activeTrend],
  );

  const newUsersChart = useMemo(
    () => ({
      labels: newUserTrend.map((b) => monthLabel(b.key)),
      series: [
        {
          label: "New Users",
          color: "#f59e0b",
          data: newUserTrend.map((b) => b.sum.users || 0),
        },
      ],
    }),
    [newUserTrend],
  );

  const platformChart = useMemo(
    () => ({
      labels: newUserTrend.map((b) => monthLabel(b.key)),
      series: [
        {
          label: "App",
          color: "#10b981",
          data: newUserTrend.map((b) => b.sum.app_users || 0),
        },
        {
          label: "Web",
          color: "#94a3b8",
          data: newUserTrend.map((b) => b.sum.web_users || 0),
        },
      ],
    }),
    [newUserTrend],
  );

  const levelItems = useMemo(() => {
    const levels = state.data?.appSummary?.levels || {};
    return ["A1", "A2", "B1", "B2", "Job Flow", "Other"]
      .map((key) => ({ label: key, value: Number(levels[key] || 0) }))
      .filter((i) => i.value > 0);
  }, [state.data]);

  // Unweighted average of retention_rate across cohorts per month-since-signup
  // bucket (cohort_size is ignored) - accurate enough for a visual-only curve.
  const retentionCurve = useMemo(() => {
    const byBucket = new Map();
    for (const row of state.data?.retention || []) {
      const n = Number(row.bucket_number);
      const rate = Number(row.retention_rate);
      if (!Number.isFinite(n) || !Number.isFinite(rate)) continue;
      if (!byBucket.has(n)) byBucket.set(n, { sum: 0, count: 0 });
      const b = byBucket.get(n);
      b.sum += rate;
      b.count += 1;
    }
    return [...byBucket.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, 8)
      .map(([n, b]) => ({
        label: `M${n}`,
        value: b.count ? b.sum / b.count : 0,
      }));
  }, [state.data]);

  const retentionChart = useMemo(
    () => ({
      labels: retentionCurve.map((r) => r.label),
      series: [
        {
          label: "Retained",
          color: "#8b5cf6",
          data: retentionCurve.map((r) => r.value),
        },
      ],
    }),
    [retentionCurve],
  );

  if (state.loading) {
    return (
      <div className="min-h-full bg-slate-50/60">
        <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-7 lg:p-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <TableSkeleton rows={8} />
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-full bg-slate-50/60">
        <div className="mx-auto max-w-[1440px] p-5 sm:p-7 lg:p-8">
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700"
          >
            {state.error}
          </div>
        </div>
      </div>
    );
  }

  const { biginSummary, appSummary, syncStatus } = state.data;

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-[1440px] space-y-8 p-5 sm:p-7 lg:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-7 py-4.5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <BarChart3 className="h-4.5 w-4.5 text-indigo-500" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-none text-slate-900">
                High Level Dashboard
              </h1>
              <p className="mt-1 text-[11px] text-slate-400">
                High-level overview of candidate pipeline and app activity
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <Clock3 className="h-3 w-3" />
                Candidate data synced: {formatSyncedAt(syncStatus?.synced_to)}
              </p>
            </div>
          </div>
        </div>

        {/* Candidate Data */}
        <section className="space-y-4">
          <SectionHeading
            title="Candidate Data"
            subtitle="CRM pipeline totals · All-time"
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <MetricTile
              label="Total Leads"
              value={approxNumber(biginSummary.new_leads)}
              sub="Leads created all-time"
              icon={UserPlus}
            />
            <MetricTile
              label="Active Leads"
              value={approxNumber(biginSummary.active_leads)}
              sub="Currently in-progress"
              icon={Users}
            />
            <MetricTile
              label="Qualified Leads"
              value={approxNumber(biginSummary.qualified_leads)}
              sub="Reached qualified stage"
              icon={Target}
            />
          </div>

          <ChartCard
            title="Lead Growth"
            subtitle="New leads added per month · All-time"
          >
            {leadGrowthChart.labels.length ? (
              <CleanTrendChart
                labels={leadGrowthChart.labels}
                series={leadGrowthChart.series}
              />
            ) : (
              <EmptyState message="No candidate data available." />
            )}
          </ChartCard>
          <ChartCard
            title="Qualified Leads Growth"
            subtitle="Leads reaching the qualified stage per month"
          >
            {qualifiedChart.labels.length ? (
              <CleanTrendChart
                labels={qualifiedChart.labels}
                series={qualifiedChart.series}
              />
            ) : (
              <EmptyState message="No candidate data available." />
            )}
          </ChartCard>

          <ChartCard
            title="Cumulative Lead Growth"
            subtitle="Total leads accumulated over time"
          >
            {cumulativeChart.labels.length ? (
              <CleanTrendChart
                labels={cumulativeChart.labels}
                series={cumulativeChart.series}
              />
            ) : (
              <EmptyState message="No candidate data available." />
            )}
          </ChartCard>
        </section>

        {/* App Data */}
        <section className="space-y-4">
          <SectionHeading
            title="App Data"
            subtitle="App activity totals · as of yesterday"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <MetricTile
              label="Total Users"
              value={approxNumber(appSummary.total_users)}
              sub="Registered users all-time"
              icon={Users}
            />
            <MetricTile
              label="DAU"
              value={approxNumber(appSummary.dau)}
              sub="Daily active · as of yesterday"
              icon={Activity}
            />
            <MetricTile
              label="WAU"
              value={approxNumber(appSummary.wau)}
              sub="Weekly active · as of yesterday"
              icon={Activity}
            />
            <MetricTile
              label="MAU"
              value={approxNumber(appSummary.mau)}
              sub="Monthly active · as of yesterday"
              icon={Activity}
            />
            <MetricTile
              label="Avg Session"
              value={approxDuration(appSummary.avg_session_duration_seconds)}
              sub="Per session · as of yesterday"
              icon={Timer}
            />
          </div>

          <ChartCard
            title="Active Users Trend"
            subtitle="Average DAU / WAU / MAU per month"
          >
            {activeChart.labels.length ? (
              <CleanTrendChart
                labels={activeChart.labels}
                series={activeChart.series}
              />
            ) : (
              <EmptyState message="No activity data available." />
            )}
          </ChartCard>

          <ChartCard
            title="New Users Trend"
            subtitle="New registrations per month"
          >
            {newUsersChart.labels.length ? (
              <CleanTrendChart
                labels={newUsersChart.labels}
                series={newUsersChart.series}
              />
            ) : (
              <EmptyState message="No signup data available." />
            )}
          </ChartCard>
          <ChartCard
            title="New Users by Platform"
            subtitle="App vs web registrations per month"
          >
            {platformChart.labels.length ? (
              <CleanTrendChart
                labels={platformChart.labels}
                series={platformChart.series}
              />
            ) : (
              <EmptyState message="No signup data available." />
            )}
          </ChartCard>

          <ChartCard
            title="Users by Level"
            subtitle="Proficiency distribution · All-time"
          >
            <CleanDonut items={levelItems} showLabels={false} height={260} />
          </ChartCard>
          <ChartCard
            title="Retention Curve"
            subtitle="Average share retained by month after signup"
          >
            {retentionChart.labels.length ? (
              <CleanTrendChart
                labels={retentionChart.labels}
                series={retentionChart.series}
              />
            ) : (
              <EmptyState message="No retention data available." />
            )}
          </ChartCard>
        </section>
      </div>
    </div>
  );
}
