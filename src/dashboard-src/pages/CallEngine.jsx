import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  TimeScale,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-moment";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
  PhoneMissed,
  PhoneOff,
  Play,
  Pause,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserRound,
  Waves,
  X,
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
  BarController,
  BarElement,
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
  missed: {
    label: "Missed Calls",
    color: "#f59e0b",
    cssVar: "--color-amber-500",
    icon: PhoneMissed,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toIstDateString(d) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

function getIstShiftedDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIstDateString(d);
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

function formatTotalDuration(seconds) {
  const total = Number(seconds || 0);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
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

function TableAudioPlayer({ url }) {
  const audioRef = useRef(null);
  const mountedRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener("timeupdate", () => {
        if (!mountedRef.current || audioRef.current !== audio) return;
        setCurrentTime(audio.currentTime);
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });
      audio.addEventListener("loadedmetadata", () => {
        if (!mountedRef.current || audioRef.current !== audio) return;
        setDuration(audio.duration);
      });
      audio.addEventListener("ended", () => {
        if (!mountedRef.current || audioRef.current !== audio) return;
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error("Audio play failed:", err));
      setIsPlaying(true);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const audio = audioRef.current;
      audioRef.current = null;
      audio?.pause();
      if (audio) audio.src = "";
    };
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 shadow-xs max-w-[280px]">
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 hover:scale-105 active:scale-95 cursor-pointer"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3 fill-white" />
        ) : (
          <Play className="h-3 w-3 fill-white translate-x-[0.5px]" />
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div
          onClick={handleSeek}
          className="relative h-1.5 w-full cursor-pointer rounded-full bg-slate-200 transition hover:h-2"
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-slate-900"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 select-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
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
      {Array.from({ length: 6 }).map((_, j) => (
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
  onClick,
  duration,
}) {
  const config = metricConfig[metricKey];
  const Icon = config.icon;
  const { delta, pct, tone, bg } = formatDelta(value, previousValue);

  if (loading) return <SkeletonCard />;

  return (
    <div
      onClick={onClick}
      className="group bg-white shadow-xs rounded-xl p-5 transition-all duration-200 hover:shadow-md cursor-pointer hover:scale-[1.01] border border-transparent hover:border-slate-200/60 active:scale-[0.99]"
    >
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
      <div className="mt-3 flex justify-end select-none">
        {duration !== undefined ? (
          <span className="text-xs font-semibold text-slate-500">
            {formatTotalDuration(duration)}
          </span>
        ) : (
          <span className="text-xs opacity-0">-</span>
        )}
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
          backgroundColor: rows.length === 1
            ? adjustColorOpacity(dialedColor, 0.2)
            : function (context) {
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
          backgroundColor: rows.length === 1
            ? adjustColorOpacity(connectedColor, 0.2)
            : function (context) {
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
          backgroundColor: rows.length === 1
            ? adjustColorOpacity(overFiveColor, 0.2)
            : function (context) {
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

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.isConnected || !canvas.parentElement || !chartData) return undefined;
    if (chartRef.current) {
      chartRef.current.stop();
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const newChart = new Chart(canvas, {
      type: rows.length === 1 ? "bar" : "line",
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
    return () => {
      if (chartRef.current === newChart) chartRef.current = null;
      newChart.stop();
      newChart.destroy();
    };
  }, [chartData]);

  const totalDialed = rows ? rows.reduce((s, r) => s + Number(r.dialed || 0), 0) : 0;

  return (
    <div className="col-span-full bg-white shadow-xs rounded-xl relative overflow-hidden">
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
          <div className="text-3xl font-bold text-gray-800">
            {loading ? (
              <span className="inline-block h-8 w-16 rounded bg-slate-100 animate-pulse" />
            ) : (
              totalDialed
            )}
          </div>
          <div className="text-sm text-gray-500 ml-2">total calls in period</div>
        </div>
      </div>
      {/* Chart container */}
      <div className="relative grow max-sm:max-h-[220px] xl:max-h-[220px] min-h-[220px] pb-5">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-xs flex items-center justify-center p-5">
            <div className="animate-pulse space-y-3 w-full px-5">
              <div className="h-32 rounded bg-slate-50 border border-slate-100/50" />
            </div>
          </div>
        )}
        
        {chartData ? (
          <div className="w-full h-[220px]">
            <canvas ref={canvasRef} width={800} height={220} />
          </div>
        ) : (
          <div className="px-5 pt-12 text-center text-sm text-gray-400">
            No data for this period
          </div>
        )}
      </div>
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
    const todayStr = toIstDateString(new Date());
    setTempFrom(todayStr);
    setTempTo(todayStr);
    onChange({ from: todayStr, to: todayStr });
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
                <button
                  onClick={() => {
                    const todayStr = toIstDateString(new Date());
                    setTempFrom(todayStr);
                    setTempTo(todayStr);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Today
                </button>
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      const fromStr = getIstShiftedDate(-days);
                      const toStr = toIstDateString(new Date());
                      setTempFrom(fromStr);
                      setTempTo(toStr);
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

function MultiSelectCaller({ callers, selectedDialers, onChange, callersLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCallers = useMemo(() => {
    return callers.filter((caller) => {
      const val = (caller.dialer_number || caller.number || "").toLowerCase();
      const name = (caller.name || caller.employee_name || "").toLowerCase();
      return val.includes(searchQuery.toLowerCase()) || name.includes(searchQuery.toLowerCase());
    });
  }, [callers, searchQuery]);

  const handleToggle = (value) => {
    if (selectedDialers.includes(value)) {
      onChange(selectedDialers.filter((v) => v !== value));
    } else {
      onChange([...selectedDialers, value]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
    setSearchQuery("");
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedLabels = useMemo(() => {
    if (selectedDialers.length === 0) return "All callers";
    if (selectedDialers.length === 1) {
      const match = callers.find((c) => c.dialer_number === selectedDialers[0]);
      return match ? `${match.name || match.dialer_number}` : selectedDialers[0];
    }
    return `${selectedDialers.length} callers selected`;
  }, [selectedDialers, callers]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={callersLoading}
        className={cx(
          "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
          isOpen && "border-slate-400 ring-2 ring-slate-100"
        )}
      >
        <span className="truncate text-left">{selectedLabels}</span>
        <ChevronRight className={cx("h-4 w-4 text-slate-400 transition-transform duration-200", isOpen ? "-rotate-90" : "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-full min-w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg max-h-80 flex flex-col">
          <div className="relative mb-2 flex-none">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search callers..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="flex justify-between items-center px-1 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-none">
            <button
              type="button"
              onClick={handleSelectAll}
              className="hover:text-slate-800 transition cursor-pointer"
            >
              Select All (Reset)
            </button>
            {selectedDialers.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-rose-600 transition cursor-pointer text-rose-500"
              >
                Clear Selected
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            <div className="border-b border-slate-100 pb-1.5 mb-1.5">
              <div
                onClick={handleSelectAll}
                className={cx(
                  "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none transition",
                  selectedDialers.length === 0 ? "bg-slate-50 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedDialers.length === 0}
                  readOnly
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 focus:ring-offset-0 pointer-events-none cursor-pointer"
                />
                <span className="truncate">All callers</span>
              </div>
            </div>

            {filteredCallers.map((caller, idx) => {
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
              const isChecked = selectedDialers.includes(value);

              return value ? (
                <div
                  key={`${value}-${idx}`}
                  onClick={() => handleToggle(value)}
                  className={cx(
                    "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition",
                    isChecked ? "bg-slate-50 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 focus:ring-offset-0 pointer-events-none cursor-pointer"
                  />
                  <span className="truncate text-left">
                    {label} <span className="text-[10px] text-slate-400 font-normal">({value})</span>
                  </span>
                </div>
              ) : null;
            })}

            {filteredCallers.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400">
                No callers match search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CallEnginePage() {
  const todayStr = toIstDateString(new Date());

  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedDialers, setSelectedDialers] = useState([]);
  const [sortBy, setSortBy] = useState("call_datetime");
  const [sortOrder, setSortOrder] = useState("desc");
  const [recordingFilter, setRecordingFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [callers, setCallers] = useState([]);
  const [overview, setOverview] = useState([]);
  const [report, setReport] = useState({});
  const [previousReport, setPreviousReport] = useState({});
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const loading = dashboardLoading || logsLoading;

  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [selectedMetric, setSelectedMetric] = useState(null);
  const [metricLogs, setMetricLogs] = useState([]);
  const [metricPage, setMetricPage] = useState(1);
  const [metricTotal, setMetricTotal] = useState(0);
  const [metricLoading, setMetricLoading] = useState(false);
  const [missedStatusFilter, setMissedStatusFilter] = useState("all");
  const [callersLoading, setCallersLoading] = useState(false);

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

  const dashboardSeq = useRef(0);
  const logsSeq = useRef(0);
  const chatEndRef = useRef(null);

  const selectedCallerNames = useMemo(() => {
    if (selectedDialers.length === 0) return null;
    return selectedDialers
      .map((num) => {
        const match = callers.find((c) => c.dialer_number === num);
        return match ? match.name : num;
      })
      .join(", ");
  }, [callers, selectedDialers]);

  const filterPayload = useMemo(
    () => ({ fromDate, toDate, dialerNumber: selectedDialers.length > 0 ? selectedDialers : "all" }),
    [fromDate, toDate, selectedDialers],
  );
  const previousWindow = useMemo(
    () => getPreviousWindow(fromDate, toDate),
    [fromDate, toDate],
  );
  const previousFilterPayload = useMemo(
    () => (previousWindow ? { ...previousWindow, dialerNumber: selectedDialers.length > 0 ? selectedDialers : "all" } : null),
    [previousWindow, selectedDialers],
  );

  const loadMetricLogs = useCallback(
    async (nextPage = 1) => {
      if (!selectedMetric) return;
      setMetricLoading(true);
      try {
        const res = await callEngineApi.getMetricLogs({
          ...filterPayload,
          metric: selectedMetric,
          page: nextPage,
          limit: PAGE_SIZE,
          statusFilter: selectedMetric === "missed" ? missedStatusFilter : undefined,
        });
        setMetricLogs(res.data?.rows || []);
        setMetricTotal(Number(res.data?.pagination?.total || 0));
        setMetricPage(nextPage);
      } catch (err) {
        console.error("Failed to load metric logs:", err);
      } finally {
        setMetricLoading(false);
      }
    },
    [selectedMetric, filterPayload, missedStatusFilter],
  );

  useEffect(() => {
    if (selectedMetric) {
      loadMetricLogs(1);
    } else {
      setMetricLogs([]);
      setMetricTotal(0);
      setMetricPage(1);
      setMissedStatusFilter("all");
    }
  }, [selectedMetric, loadMetricLogs]);

  const metricTotalPages = Math.max(1, Math.ceil(metricTotal / PAGE_SIZE));
  const metricPageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(metricPage - 2, metricTotalPages - 4));
    const end = Math.min(metricTotalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [metricPage, metricTotalPages]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [page, totalPages]);

  const loadCallers = useCallback(async () => {
    setCallersLoading(true);
    try {
      const res = await callEngineApi.getCallers();
      setCallers(res.data?.callers || []);
    } catch (err) {
      console.error("Failed to load callers:", err);
    } finally {
      setCallersLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    const seq = dashboardSeq.current + 1;
    dashboardSeq.current = seq;
    setDashboardLoading(true);
    setError("");
    try {
      const [overviewRes, reportRes, previousReportRes] =
        await Promise.all([
          callEngineApi.getOverview(filterPayload),
          callEngineApi.getReport(filterPayload),
          previousFilterPayload
            ? callEngineApi.getReport(previousFilterPayload)
            : Promise.resolve({ data: { report: {} } }),
        ]);

      if (dashboardSeq.current !== seq) return;
      setOverview(overviewRes.data?.rows || []);
      setReport(reportRes.data?.report || {});
      setPreviousReport(previousReportRes.data?.report || {});
    } catch (err) {
      if (dashboardSeq.current !== seq) return;
      setError(
        err?.response?.data?.msg ||
          err?.message ||
          "Failed to load call engine overview data",
      );
    } finally {
      if (dashboardSeq.current !== seq) return;
      setDashboardLoading(false);
    }
  }, [filterPayload, previousFilterPayload]);

  const loadLogs = useCallback(
    async (nextPage = 1) => {
      const seq = logsSeq.current + 1;
      logsSeq.current = seq;
      setLogsLoading(true);
      setError("");
      try {
        const res = await callEngineApi.getLogs({
          ...filterPayload,
          page: nextPage,
          limit: PAGE_SIZE,
          sortBy,
          sortOrder,
          recordingFilter,
          search,
        });

        if (logsSeq.current !== seq) return;
        setLogs(res.data?.rows || []);
        setTotal(Number(res.data?.pagination?.total || 0));
        setPage(nextPage);
      } catch (err) {
        if (logsSeq.current !== seq) return;
        setError(
          err?.response?.data?.msg ||
            err?.message ||
            "Failed to load call logs",
        );
      } finally {
        if (logsSeq.current !== seq) return;
        setLogsLoading(false);
      }
    },
    [filterPayload, sortBy, sortOrder, recordingFilter, search],
  );

  const handleRefresh = useCallback(() => {
    loadCallers();
    loadDashboard();
    loadLogs(1);
  }, [loadCallers, loadDashboard, loadLogs]);

  useEffect(() => {
    loadCallers();
  }, [loadCallers]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

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
      handleRefresh();
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
      const res = await callEngineApi.askAssistant({
        ...filterPayload,
        question: trimmed,
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

  const handleSort = (field) => {
    if (field === "call_datetime") {
      if (sortBy === "call_datetime") {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy("call_datetime");
        setSortOrder("desc");
      }
    } else {
      if (sortBy === field) {
        if (sortOrder === "desc") {
          setSortOrder("asc");
        } else {
          setSortBy("call_datetime");
          setSortOrder("desc");
        }
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
    }
  };

  const toggleRecordingFilter = () => {
    setRecordingFilter((prev) => {
      if (prev === "all") return "recorded";
      if (prev === "recorded") return "not_recorded";
      return "all";
    });
  };

  const resetFilters = () => {
    const todayStr = toIstDateString(new Date());
    setFromDate(todayStr);
    setToDate(todayStr);
    setSelectedDialers([]);
    setSortBy("call_datetime");
    setSortOrder("desc");
    setRecordingFilter("all");
    setSearch("");
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
            onClick={handleRefresh}
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
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <MultiSelectCaller
                callers={callers}
                selectedDialers={selectedDialers}
                onChange={setSelectedDialers}
                callersLoading={callersLoading}
              />
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
      <section className="mb-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.keys(metricConfig).map((key) => (
          <StatCard
            key={key}
            metricKey={key}
            value={report[key] || 0}
            previousValue={previousReport[key] || 0}
            previousWindow={previousWindow}
            loading={loading}
            onClick={() => setSelectedMetric(key)}
            duration={key !== "missed" && key !== "not_connected" ? report[`${key}_duration`] : undefined}
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
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Candidate ID or Phone..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-xs font-semibold uppercase text-slate-500 bg-slate-50 border-b border-slate-100">
              <tr>
                <th
                  onClick={() => handleSort("candidate_id")}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Candidate ID</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {sortBy === "candidate_id" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("client_number")}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Client Number</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {sortBy === "client_number" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Dialer</th>
                <th
                  onClick={() => handleSort("call_datetime")}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Call Date & Time</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {sortBy === "call_datetime" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("duration_sec")}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Duration</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {sortBy === "duration_sec" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </span>
                  </div>
                </th>
                <th
                  onClick={toggleRecordingFilter}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>Recording</span>
                      <FileAudio
                        className={cx(
                          "h-3.5 w-3.5 transition-colors",
                          recordingFilter === "recorded"
                            ? "text-emerald-600 font-semibold"
                            : recordingFilter === "not_recorded"
                              ? "text-rose-600 font-semibold"
                              : "text-slate-400"
                        )}
                      />
                    </div>
                    <span className="text-[10px] font-semibold uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                      {recordingFilter === "recorded"
                        ? "Recorded Only"
                        : recordingFilter === "not_recorded"
                          ? "No Recording"
                          : "All"}
                    </span>
                  </div>
                </th>
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
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {row.candidate_id || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
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
                          <TableAudioPlayer url={row.recording_url} />
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
                      <td colSpan={6} className="px-4 py-12 text-center">
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
                onClick={() => loadLogs(page - 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => loadLogs(pageNumber)}
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
                onClick={() => loadLogs(page + 1)}
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
                  "Evaluate the dialer performance during this period. Analyze their communication tone, sales pitch structure, objection handling, strengths, and areas of improvement.",
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
            {selectedCallerNames && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 max-w-[300px] truncate" title={selectedCallerNames}>
                <UserRound className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{selectedCallerNames}</span>
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

      {/* Metric Details Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedMetric(null)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {metricConfig[selectedMetric]?.label || "Call Details"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Showing calls matching active filters ({metricTotal} total)
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedMetric === "missed" && (
                  <select
                    value={missedStatusFilter}
                    onChange={(e) => {
                      setMissedStatusFilter(e.target.value);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-100 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="never_called">Never Called</option>
                    <option value="called_back">Called Back</option>
                  </select>
                )}
                <button
                  onClick={() => setSelectedMetric(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                <table className="w-full text-sm min-w-[600px]">
                   <thead className="text-xs font-semibold uppercase text-slate-500 bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Candidate ID</th>
                      <th className="px-4 py-3 text-left">Client Number</th>
                      <th className="px-4 py-3 text-left">Dialer</th>
                      <th className="px-4 py-3 text-left">Call Date & Time</th>
                      {selectedMetric !== "missed" && <th className="px-4 py-3 text-left">Duration</th>}
                      {selectedMetric === "missed" && <th className="px-4 py-3 text-left">Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {metricLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-t border-slate-100 animate-pulse">
                          <td className="px-4 py-4"><div className="h-4 w-16 rounded bg-slate-100" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-slate-100" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-40 rounded bg-slate-100" /></td>
                          {selectedMetric !== "missed" && <td className="px-4 py-4"><div className="h-4 w-16 rounded bg-slate-100" /></td>}
                          {selectedMetric === "missed" && <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-slate-100" /></td>}
                        </tr>
                      ))
                    ) : metricLogs.length > 0 ? (
                      metricLogs.map((row) => (
                        <tr
                          key={row.callyzer_call_id}
                          className="border-t border-slate-100 transition hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3.5 font-semibold text-slate-900">
                            {row.candidate_id || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {row.client_number || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700">
                            {row.dialer_name || row.dialer_number || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {formatDateTime(row.call_datetime)}
                          </td>
                          {selectedMetric !== "missed" && (
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {formatDuration(row.duration_sec)}
                              </span>
                            </td>
                          )}
                          {selectedMetric === "missed" && (
                            <td className="px-4 py-3.5">
                              {row.was_called_back ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                  Called Back
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                                  Never Called
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <PhoneOff className="h-8 w-8 text-slate-300" />
                            <p className="text-sm font-medium">No calls found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {!metricLoading && metricLogs.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Showing {metricLogs.length ? (metricPage - 1) * PAGE_SIZE + 1 : 0}-
                  {Math.min(metricPage * PAGE_SIZE, metricTotal)} of {metricTotal}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={metricPage <= 1 || metricLoading}
                    onClick={() => loadMetricLogs(metricPage - 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {metricPageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => loadMetricLogs(pageNumber)}
                      className={cx(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition",
                        pageNumber === metricPage
                          ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    disabled={metricPage >= metricTotalPages || metricLoading}
                    onClick={() => loadMetricLogs(metricPage + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CallEnginePage;
