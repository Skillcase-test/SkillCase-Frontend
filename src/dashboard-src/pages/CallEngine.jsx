import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-moment";
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DownloadCloud,
  FileAudio,
  Filter,
  Loader2,
  MessageSquareText,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
  Waves,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { callEngineApi } from "../../api/callEngineApi";
import { chartAreaGradient } from "../charts/ChartjsConfig";
import { adjustColorOpacity, getCssVariable } from "../utils/Utils";

Chart.register(
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
);

const PAGE_SIZE = 10;

const metricConfig = {
  dialed: {
    label: "Dialed Calls",
    color: "#3b82f6",
    cssVar: "--color-blue-500",
    icon: PhoneForwarded,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
  },
  connected: {
    label: "Connected Calls",
    color: "#10b981",
    cssVar: "--color-emerald-500",
    icon: PhoneCall,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  over_five: {
    label: ">= 5 Min Calls",
    color: "#8b5cf6",
    cssVar: "--color-violet-500",
    icon: Clock3,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
  },
  not_connected: {
    label: "Not Connected",
    color: "#f43f5e",
    cssVar: "--color-rose-500",
    icon: PhoneOff,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600",
  },
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toDateInput(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function toUtcDate(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function shiftDate(dateStr, days) {
  const d = toUtcDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getPreviousWindow(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const from = toUtcDate(fromDate);
  const to = toUtcDate(toDate);
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const windowDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  const prevTo = shiftDate(fromDate, -1);
  const prevFrom = shiftDate(prevTo, -(windowDays - 1));
  return { fromDate: prevFrom, toDate: prevTo };
}

function formatDelta(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  const delta = c - p;
  if (p === 0 && c > 0)
    return {
      delta,
      pct: "new",
      tone: "text-emerald-700",
      bg: "bg-emerald-500/20",
    };
  if (p === 0)
    return { delta: 0, pct: "0%", tone: "text-slate-500", bg: "bg-slate-100" };
  const pct = (delta / p) * 100;
  return {
    delta,
    pct: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
    tone:
      delta > 0
        ? "text-emerald-700"
        : delta < 0
          ? "text-rose-700"
          : "text-slate-500",
    bg:
      delta > 0
        ? "bg-emerald-500/20"
        : delta < 0
          ? "bg-rose-500/20"
          : "bg-slate-100",
  };
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds) {
  const total = Number(seconds || 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function Button({
  children,
  variant = "secondary",
  loading = false,
  className = "",
  size = "md",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]";
  const sizes = {
    sm: "rounded-lg px-3 py-1.5 text-xs",
    md: "rounded-xl px-4 py-2.5 text-sm",
    lg: "rounded-xl px-6 py-3 text-base",
  };
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md",
    soft: "border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:shadow-md",
    ghost: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger:
      "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:shadow-md",
  };

  return (
    <button
      className={cx(base, sizes[size], variants[variant], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white shadow-xs rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-8 w-16 rounded bg-slate-100" />
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 h-4 w-20 rounded bg-slate-100" />
    </div>
  );
}

function SkeletonTableRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-t border-slate-100">
      {Array.from({ length: 5 }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
        </td>
      ))}
    </tr>
  ));
}

function StatCard({
  metricKey,
  value,
  previousValue,
  previousWindow,
  loading,
}) {
  const config = metricConfig[metricKey];
  const Icon = config.icon;
  const { delta, pct, tone, bg } = formatDelta(value, previousValue);

  if (loading) return <SkeletonCard />;

  return (
    <div className="group bg-white shadow-xs rounded-xl p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {config.label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-900">
              {Number(value || 0)}
            </p>
            {previousValue !== undefined && (
              <span
                className={cx(
                  "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                  tone,
                  bg,
                )}
              >
                {delta > 0 ? "+" : ""}
                {pct}
              </span>
            )}
          </div>
        </div>
        <div
          className={cx(
            "flex h-9 w-9 items-center justify-center rounded-full",
            config.iconBg,
          )}
        >
          <Icon className={cx("h-4 w-4", config.iconColor)} />
        </div>
      </div>
      {previousWindow && (
        <div className="mt-3 flex items-center justify-between">
          <div className="h-px flex-1 bg-slate-100" />
          <p className="ml-3 text-[10px] text-slate-400">
            vs {Number(previousValue || 0)}
          </p>
        </div>
      )}
    </div>
  );
}

function OverviewChart({ rows, loading }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Exactly the same pattern as DashboardCardDAU / LineChartDAU
  const chartData = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    const labels = rows.map((r) => {
      const raw = String(r.day || "").slice(0, 10);
      const d = new Date(raw + "T00:00:00");
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      return raw;
    });

    const dialedColor  = getCssVariable("--color-blue-500")   || "#3b82f6";
    const connectedColor = getCssVariable("--color-emerald-500") || "#10b981";
    const overFiveColor  = getCssVariable("--color-violet-500")  || "#8b5cf6";

    return {
      labels,
      datasets: [
        {
          label: "Dialed",
          data: rows.map((r) => Number(r.dialed || 0)),
          fill: true,
          backgroundColor: function (context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(dialedColor, 0) },
              { stop: 1, color: adjustColorOpacity(dialedColor, 0.2) },
            ]);
          },
          borderColor: dialedColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: dialedColor,
          clip: 20,
          tension: 0.2,
        },
        {
          label: "Connected",
          data: rows.map((r) => Number(r.connected || 0)),
          fill: true,
          backgroundColor: function (context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(connectedColor, 0) },
              { stop: 1, color: adjustColorOpacity(connectedColor, 0.2) },
            ]);
          },
          borderColor: connectedColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: connectedColor,
          clip: 20,
          tension: 0.2,
        },
        {
          label: ">= 5 Min",
          data: rows.map((r) => Number(r.over_five || 0)),
          fill: true,
          backgroundColor: function (context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(overFiveColor, 0) },
              { stop: 1, color: adjustColorOpacity(overFiveColor, 0.2) },
            ]);
          },
          borderColor: overFiveColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: overFiveColor,
          clip: 20,
          tension: 0.2,
        },
      ],
    };
  }, [rows]);

  useEffect(() => {
    if (!canvasRef.current || !chartData) return undefined;
    if (chartRef.current) chartRef.current.destroy();

    const newChart = new Chart(canvasRef.current, {
      type: "line",
      data: chartData,
      options: {
        layout: { padding: 20 },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#9ca3af",
              font: { size: 11 },
              maxRotation: 0,
              maxTicksLimit: 10,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#f3f4f6" },
            ticks: {
              color: "#9ca3af",
              font: { size: 11 },
              precision: 0,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (ctx) => ctx[0].label,
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
            },
            bodyColor: "#6b7280",
            backgroundColor: "#ffffff",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            titleColor: "#1f2937",
            titleFont: { weight: "bold" },
            cornerRadius: 8,
            padding: 8,
            caretSize: 0,
            caretPadding: 20,
          },
          legend: { display: false },
        },
        interaction: { intersect: false, mode: "nearest" },
        maintainAspectRatio: false,
        resizeDelay: 200,
      },
    });

    chartRef.current = newChart;
    return () => newChart.destroy();
  }, [chartData]);

  const totalDialed = rows ? rows.reduce((s, r) => s + Number(r.dialed || 0), 0) : 0;

  // Loading skeleton
  if (loading) {
    return (
      <div className="col-span-full bg-white shadow-xs rounded-xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 rounded bg-slate-100" />
          <div className="h-3 w-48 rounded bg-slate-100" />
          <div className="h-40 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-full bg-white shadow-xs rounded-xl">
      {/* Header — same structure as DashboardCardDAU */}
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Call Overview</h2>
          {/* Inline legend dots */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">Dialed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500">Connected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-xs text-gray-500">5+ Min</span>
            </div>
          </div>
        </header>
        <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Daily call movement</div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-gray-800">{totalDialed}</div>
          <div className="text-sm text-gray-500">total calls in period</div>
        </div>
      </div>
      {/* Chart — taller than DAU to fit axes */}
      {chartData ? (
        <div className="grow max-sm:max-h-[220px] xl:max-h-[220px]">
          <canvas ref={canvasRef} width={800} height={220} />
        </div>
      ) : (
        <div className="px-5 pb-5 pt-4 text-center text-sm text-gray-400">
          No data for this period
        </div>
      )}
    </div>
  );
}

function DateRangePicker({ fromDate, toDate, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(fromDate);
  const [tempTo, setTempTo] = useState(toDate);

  const handleApply = () => {
    onChange({ from: tempFrom, to: tempTo });
    setOpen(false);
  };

  const handleClear = () => {
    const now = new Date();
    const fromDefault = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    setTempFrom(toDateInput(fromDefault));
    setTempTo(toDateInput(now));
    onChange({ from: toDateInput(fromDefault), to: toDateInput(now) });
    setOpen(false);
  };

  const formatDateDisplay = (d) => {
    if (!d) return "Select date";
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={cx(
          "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed",
          open && "border-slate-400 ring-2 ring-slate-100",
        )}
      >
        <CalendarDays className="h-4 w-4 text-slate-400" />
        <span className="text-slate-600">
          {formatDateDisplay(fromDate)} - {formatDateDisplay(toDate)}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                  From
                </label>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                  To
                </label>
                <input
                  type="date"
                  value={tempTo}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleApply}
                  size="sm"
                  variant="primary"
                  className="flex-1"
                >
                  Apply
                </Button>
                <Button
                  onClick={handleClear}
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      const now = new Date();
                      const from = new Date(
                        now.getTime() - days * 24 * 60 * 60 * 1000,
                      );
                      setTempFrom(toDateInput(from));
                      setTempTo(toDateInput(now));
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    Last {days}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CallEnginePage() {
  const now = new Date();
  const fromDefault = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(toDateInput(fromDefault));
  const [toDate, setToDate] = useState(toDateInput(now));
  const [dialer, setDialer] = useState("all");
  const [sort, setSort] = useState("recent");
  const [hasRecording, setHasRecording] = useState(false);

  const [callers, setCallers] = useState([]);
  const [overview, setOverview] = useState([]);
  const [report, setReport] = useState({});
  const [previousReport, setPreviousReport] = useState({});
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask me about call quality, dialer performance, objections, or follow-up patterns for the active filters.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [assistantLoading, setAssistantLoading] = useState(false);

  const loadSeq = useRef(0);
  const chatEndRef = useRef(null);

  const selectedCaller = useMemo(
    () => callers.find((caller) => caller.dialer_number === dialer),
    [callers, dialer],
  );

  const filterPayload = useMemo(
    () => ({ fromDate, toDate, dialerNumber: dialer }),
    [fromDate, toDate, dialer],
  );
  const previousWindow = useMemo(
    () => getPreviousWindow(fromDate, toDate),
    [fromDate, toDate],
  );
  const previousFilterPayload = useMemo(
    () => (previousWindow ? { ...previousWindow, dialerNumber: dialer } : null),
    [previousWindow, dialer],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [page, totalPages]);

  const loadAll = useCallback(
    async (nextPage = 1) => {
      const seq = loadSeq.current + 1;
      loadSeq.current = seq;
      setLoading(true);
      setError("");
      try {
        const [callersRes, overviewRes, reportRes, previousReportRes, logsRes] =
          await Promise.all([
            callEngineApi.getCallers(),
            callEngineApi.getOverview(filterPayload),
            callEngineApi.getReport(filterPayload),
            previousFilterPayload
              ? callEngineApi.getReport(previousFilterPayload)
              : Promise.resolve({ data: { report: {} } }),
            callEngineApi.getLogs({
              ...filterPayload,
              page: nextPage,
              limit: PAGE_SIZE,
              sort,
              hasRecording,
            }),
          ]);

        if (loadSeq.current !== seq) return;
        setCallers(callersRes.data?.callers || []);
        setOverview(overviewRes.data?.rows || []);
        setReport(reportRes.data?.report || {});
        setPreviousReport(previousReportRes.data?.report || {});
        setLogs(logsRes.data?.rows || []);
        setTotal(Number(logsRes.data?.pagination?.total || 0));
        setPage(nextPage);
      } catch (err) {
        if (loadSeq.current === seq) {
          setError(
            err?.response?.data?.msg ||
              err?.message ||
              "Failed to load call engine data",
          );
        }
      } finally {
        if (loadSeq.current === seq) setLoading(false);
      }
    },
    [filterPayload, previousFilterPayload, sort, hasRecording],
  );

  useEffect(() => {
    loadAll(1);
  }, [loadAll]);

  const runBackfill = async () => {
    setSyncing(true);
    setError("");
    try {
      await callEngineApi.syncBackfill({
        fromDate,
        toDate,
        page: 1,
        limit: 100,
        maxPages: 10,
      });
      await loadAll(1);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.msg ||
          err?.message ||
          "Sync failed",
      );
    } finally {
      setSyncing(false);
    }
  };

  const sendQuestion = async (text = question) => {
    const trimmed = String(text || "").trim();
    if (!trimmed || assistantLoading) return;
    setQuestion("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: new Date().toISOString() },
    ]);
    setAssistantLoading(true);
    try {
      const systemPrompt =
        "You are a call analytics assistant. Respond in 2-4 short sentences max. Use bullet points for lists. Be direct and concise. No long explanations. Use brief markdown formatting only when helpful.";
      const res = await callEngineApi.askAssistant({
        ...filterPayload,
        question: `${systemPrompt}\n\nQuestion: ${trimmed}`,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            res.data?.answer ||
            "No response generated for the selected filters.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err?.response?.data?.msg ||
            err?.message ||
            "Assistant request failed.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const loadInsights = async () => {
    if (assistantLoading) return;
    setAssistantLoading(true);
    try {
      const res = await callEngineApi.getInsights(filterPayload);
      const cards = res.data?.cards || [];
      const content = cards.length
        ? cards
            .map((card) => `### ${card.title}\n\n${card.answer}`)
            .join("\n\n---\n\n")
        : "No insights available for the selected filters yet.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err?.response?.data?.msg ||
            err?.message ||
            "Insight generation failed.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const resetFilters = () => {
    setFromDate(toDateInput(fromDefault));
    setToDate(toDateInput(now));
    setDialer("all");
    setSort("recent");
    setHasRecording(false);
  };

  const handleDateRangeChange = ({ from, to }) => {
    setFromDate(from);
    setToDate(to);
  };

  const formatMessageTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:p-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Call Engine</h1>
          <p className="text-sm text-slate-500">
            Monitor dialer performance, call logs, and AI-powered insights
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => loadAll(1)}
            loading={loading}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={runBackfill}
            loading={syncing}
            variant="primary"
            size="sm"
          >
            <DownloadCloud className="h-4 w-4" />
            Sync Calls
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
              Date Range
            </label>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onChange={handleDateRangeChange}
              disabled={loading}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
              Caller
            </label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={dialer}
                onChange={(e) => setDialer(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all duration-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
              >
                <option value="all">All callers</option>
                {callers.map((caller, idx) => {
                  const value =
                    caller.dialer_number ||
                    caller.number ||
                    caller.employee_number ||
                    caller.mobile ||
                    "";
                  const label =
                    caller.name ||
                    caller.employee_name ||
                    caller.dialer_number ||
                    value;
                  return value ? (
                    <option key={`${value}-${idx}`} value={value}>
                      {label} ({value})
                    </option>
                  ) : null;
                })}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
            </div>
          </div>
          <Button
            onClick={resetFilters}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            <Filter className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
      </section>

      {/* Overview Chart */}
      <section className="mb-4">
        <OverviewChart rows={overview} loading={loading} />
      </section>

      {/* Report Cards */}
      <section className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.keys(metricConfig).map((key) => (
          <StatCard
            key={key}
            metricKey={key}
            value={report[key] || 0}
            previousValue={previousReport[key] || 0}
            previousWindow={previousWindow}
            loading={loading}
          />
        ))}
      </section>

      {/* Call Logs */}
      <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Call Logs</h2>
            <p className="text-sm text-slate-500">
              Recent calls, recordings, and dialer activity
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all duration-200 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="recent">Recent first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              onClick={() => setHasRecording((value) => !value)}
              disabled={loading}
              className={cx(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed",
                hasRecording
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
              )}
            >
              <FileAudio className="h-4 w-4" />
              Recordings only
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-xs font-semibold uppercase text-slate-500 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Client Number</th>
                <th className="px-4 py-3 text-left">Dialer</th>
                <th className="px-4 py-3 text-left">Call Date & Time</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Recording</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows />
              ) : (
                <>
                  {logs.map((row) => (
                    <tr
                      key={row.callyzer_call_id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.client_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.dialer_name || row.dialer_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(row.call_datetime)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {formatDuration(row.duration_sec)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.recording_url ? (
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm max-w-sm">
                            <Waves className="h-4 w-4 flex-none text-sky-600" />
                            <audio
                              controls
                              preload="none"
                              src={row.recording_url}
                              className="h-8 w-full min-w-[180px]"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No recording
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!logs.length && !loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <FileAudio className="h-8 w-8" />
                          <p className="text-sm font-medium">
                            No logs found for the selected filters
                          </p>
                          <p className="text-xs">
                            Try adjusting the date range or caller selection
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        {!loading && logs.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {logs.length ? (page - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1 || loading}
                onClick={() => loadAll(page - 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => loadAll(pageNumber)}
                  className={cx(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all duration-200",
                    pageNumber === page
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                  )}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                disabled={page >= totalPages || loading}
                onClick={() => loadAll(page + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* AI Assistant */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Assistant
              </h2>
              <p className="text-xs text-slate-500">
                Conversation scoped to active filters
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadInsights}
              loading={assistantLoading}
              variant="soft"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Top Insights
            </Button>
            <Button
              onClick={() =>
                sendQuestion(
                  "How did the selected dialer perform with these clients?",
                )
              }
              variant="secondary"
              size="sm"
              disabled={assistantLoading}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Dialer Performance
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="max-h-[600px] overflow-y-auto bg-slate-50/50 p-4 space-y-4">
          {messages.map((message, idx) => {
            const isUser = message.role === "user";
            return (
              <div
                key={`${message.role}-${idx}`}
                className={cx("flex", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cx(
                    "flex gap-3 max-w-[85%]",
                    isUser ? "flex-row-reverse" : "",
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cx(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                      isUser
                        ? "bg-slate-900"
                        : "bg-white border border-slate-200",
                    )}
                  >
                    {isUser ? (
                      <UserRound className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-slate-700" />
                    )}
                  </div>
                  {/* Bubble */}
                  <div className="space-y-1">
                    <div
                      className={cx(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm",
                        isUser
                          ? "bg-slate-900 text-white rounded-br-md"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-md",
                      )}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                      ) : (
                        <div className="markdown-body leading-relaxed space-y-2">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-base font-bold text-slate-900 mt-3 mb-1 first:mt-0">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-1 first:mt-0">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-semibold text-slate-800 mt-2 mb-0.5 first:mt-0">
                                  {children}
                                </h3>
                              ),
                              h4: ({ children }) => (
                                <h4 className="text-sm font-semibold text-slate-800 mt-2 mb-0.5 first:mt-0">
                                  {children}
                                </h4>
                              ),
                              p: ({ children }) => (
                                <p className="text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 mb-2">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1 mb-2">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-sm text-slate-700">
                                  {children}
                                </li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-slate-900">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic text-slate-600">
                                  {children}
                                </em>
                              ),
                              code: ({ children }) => (
                                <code className="inline-block bg-slate-100 rounded px-1.5 py-0.5 text-xs font-mono text-slate-800">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-slate-100 rounded-lg p-3 overflow-x-auto my-2">
                                  <code className="text-xs font-mono text-slate-800">
                                    {children}
                                  </code>
                                </pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-slate-300 pl-3 text-sm text-slate-500 italic my-2">
                                  {children}
                                </blockquote>
                              ),
                              hr: () => (
                                <hr className="border-slate-200 my-3" />
                              ),
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  className="text-blue-600 underline hover:text-blue-800"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                              table: ({ children }) => (
                                <table className="w-full text-sm border-collapse my-2">
                                  {children}
                                </table>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-slate-100">
                                  {children}
                                </thead>
                              ),
                              th: ({ children }) => (
                                <th className="border border-slate-200 px-3 py-1.5 text-left text-xs font-semibold text-slate-700">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
                                  {children}
                                </td>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {message.timestamp && (
                      <p
                        className={cx(
                          "text-[10px] text-slate-400",
                          isUser ? "text-right" : "text-left",
                        )}
                      >
                        {formatMessageTime(message.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {assistantLoading && (
            <div className="flex justify-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white border border-slate-200">
                <Bot className="h-4 w-4 text-slate-700" />
              </div>
              <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing call data...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <CalendarDays className="h-3 w-3" />
              {fromDate} to {toDate}
            </span>
            {selectedCaller && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                <UserRound className="h-3 w-3" />
                {selectedCaller.name || dialer}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !assistantLoading) sendQuestion();
              }}
              placeholder="Ask about call performance, objections, lead quality, or follow-up strategy..."
              disabled={assistantLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <Button
              onClick={() => sendQuestion()}
              loading={assistantLoading}
              variant="primary"
              size="sm"
              disabled={!question.trim()}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CallEnginePage;
