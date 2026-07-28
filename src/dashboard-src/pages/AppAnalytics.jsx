import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  TrendingUp,
  ChevronDown,
  Globe,
  Trophy,
  Medal,
  Flame,
  Search,
  Download,
  X,
} from "lucide-react";
import api from "../../api/axios";
import DoughnutChart from "../charts/DoughnutChart";
import {
  Chart,
  LineController,
  LineElement,
  Filler,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
} from "chart.js";
import "chartjs-adapter-moment";

import { ControlInput, ControlSelect, ControlButton } from "../payments-admin/components/controls";
import { chartColors } from "../charts/ChartjsConfig";

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  Filler,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend
);

function todayMinus(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatDuration(seconds) {
  if (!seconds) return "Waiting";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatIst(value) {
  if (!value) return "Not refreshed yet";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function queryString(filters, extra = {}) {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
    platform: filters.platform,
    ...extra,
  });
  if (filters.appVersions.length) {
    params.set("appVersions", filters.appVersions.join(","));
  }
  return params.toString();
}

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

// Track options mirror the legacy "All Users" editor so admins can still
// reassign a learner's level/mode straight from this list.
const USER_TRACK_OPTIONS = [
  {
    value: "A1",
    label: "A1",
    badgeClass: "bg-blue-50 text-blue-700",
    payload: {
      current_profeciency_level: "A1",
      language_level: "A1",
      lg_preferred_mode: "practice",
      german_preference: "2",
    },
  },
  {
    value: "A2",
    label: "A2",
    badgeClass: "bg-emerald-50 text-emerald-700",
    payload: {
      current_profeciency_level: "A2",
      language_level: "A2",
      lg_preferred_mode: "practice",
      german_preference: "2",
    },
  },
  {
    value: "B1_PRACTICE",
    label: "B1 Practice",
    badgeClass: "bg-purple-50 text-purple-700",
    payload: {
      current_profeciency_level: "B1",
      language_level: "B1",
      lg_preferred_mode: "practice",
      german_preference: "2",
    },
  },
  {
    value: "B2_PRACTICE",
    label: "B2 Practice",
    badgeClass: "bg-purple-50 text-purple-700",
    payload: {
      current_profeciency_level: "B2",
      language_level: "B2",
      lg_preferred_mode: "practice",
      german_preference: "2",
    },
  },
  {
    value: "B1_JOB_SCREENING",
    label: "B1 Job Screening",
    badgeClass: "bg-amber-50 text-amber-700",
    payload: {
      current_profeciency_level: "B1",
      language_level: "B1",
      lg_preferred_mode: "job_screening",
      german_preference: "3",
    },
  },
  {
    value: "B2_JOB_SCREENING",
    label: "B2 Job Screening",
    badgeClass: "bg-amber-50 text-amber-700",
    payload: {
      current_profeciency_level: "B1",
      language_level: "B2",
      lg_preferred_mode: "job_screening",
      german_preference: "3",
    },
  },
];

function getUserTrackValue(user = {}) {
  const mode = String(user.lg_preferred_mode || "").toLowerCase();
  const preference = String(user.german_preference || "");
  const languageLevel = String(
    user.language_level || user.current_profeciency_level || "A1",
  ).toUpperCase();
  const learningLevel = String(user.current_profeciency_level || "A1").toUpperCase();
  const isJobScreening = mode === "job_screening" || preference === "3";

  if (isJobScreening) {
    return languageLevel === "B2" ? "B2_JOB_SCREENING" : "B1_JOB_SCREENING";
  }
  if (languageLevel === "B2" || learningLevel === "B2") return "B2_PRACTICE";
  if (languageLevel === "B1" || learningLevel === "B1") return "B1_PRACTICE";
  if (learningLevel === "A2") return "A2";
  return "A1";
}

function DashboardCard({ title, action, children, className = "" }) {
  return (
    <div className={`flex flex-col bg-white shadow-xs rounded-xl p-5 ${className}`}>
      <header className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>
        {action}
      </header>
      <div className="grow flex flex-col justify-center">{children}</div>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            value === option.value
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ label = "No data for this range" }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">
      {label}
    </div>
  );
}

function SingleSelectDropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative inline-block w-28">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      >
        <span className="truncate">{selected?.label || "Select"}</span>
        <ChevronDown size={14} className="ml-2 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                value === opt.value
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectDropdown({ options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleToggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const displayText =
    selected.length === 0
      ? "All Versions"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} Selected`;

  return (
    <div ref={dropdownRef} className="relative inline-block w-40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className="ml-2 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(opt)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="truncate">{opt}</span>
              </label>
            );
          })}
          {options.length === 0 && (
            <p className="p-2 text-xs text-slate-400">No versions</p>
          )}
        </div>
      )}
    </div>
  );
}

function AppTrendChart({ data = [] }) {
  const canvasRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx?.isConnected || !ctx.parentElement || data.length === 0) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      existingChart.stop();
      existingChart.destroy();
    }

    const labels = data.map((d) => (d.activity_date ? d.activity_date.slice(5, 10) : ""));
    const dauData = data.map((d) => Number(d.dau || 0));
    const wauData = data.map((d) => Number(d.wau || 0));
    const mauData = data.map((d) => Number(d.mau || 0));

    const {
      textColor,
      gridColor,
      tooltipBgColor,
      tooltipBorderColor,
      tooltipTitleColor,
      tooltipBodyColor,
    } = chartColors;

    const chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "DAU",
            data: dauData,
            borderColor: "#6366f1", // Indigo
            backgroundColor: "rgba(99, 102, 241, 0.04)",
            fill: true,
            tension: 0.2,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: "WAU",
            data: wauData,
            borderColor: "#3b82f6", // Blue
            backgroundColor: "transparent",
            fill: false,
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: "MAU",
            data: mauData,
            borderColor: "#14b8a6", // Teal
            backgroundColor: "transparent",
            fill: false,
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: 10,
              color: textColor,
              font: {
                size: 10,
                weight: "500",
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              font: {
                size: 10,
                weight: "500",
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: "circle",
              padding: 12,
              font: {
                size: 10,
                weight: "600",
              },
              color: "#64748b",
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: tooltipBgColor,
            titleColor: tooltipTitleColor,
            bodyColor: tooltipBodyColor,
            borderColor: tooltipBorderColor,
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            titleFont: {
              weight: "bold",
            },
          },
        },
        interaction: {
          mode: "index",
          intersect: false,
        },
      },
    });

    return () => {
      chartInstance.stop();
      chartInstance.destroy();
    };
  }, [data]);

  if (data.length === 0) return <EmptyState />;

  return (
    <div className="h-64 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

function NewUserTrendChart({ data = [] }) {
  const canvasRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx?.isConnected || !ctx.parentElement || data.length === 0) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      existingChart.stop();
      existingChart.destroy();
    }

    const labels = data.map((d) => (d.signup_date ? d.signup_date.slice(5, 10) : ""));
    const usersData = data.map((d) => Number(d.users || 0));

    const {
      textColor,
      gridColor,
      tooltipBgColor,
      tooltipBorderColor,
      tooltipTitleColor,
      tooltipBodyColor,
    } = chartColors;

    const chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "New Users",
            data: usersData,
            borderColor: "#6366f1", // Indigo
            backgroundColor: "rgba(99, 102, 241, 0.04)",
            fill: true,
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 0,
            left: 0,
            right: 0,
          },
        },
        scales: {
          x: {
            display: false,
            grid: {
              display: false,
            },
          },
          y: {
            display: false,
            beginAtZero: true,
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: tooltipBgColor,
            titleColor: tooltipTitleColor,
            bodyColor: tooltipBodyColor,
            borderColor: tooltipBorderColor,
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
          },
        },
        interaction: {
          mode: "index",
          intersect: false,
        },
      },
    });

    return () => {
      chartInstance.stop();
      chartInstance.destroy();
    };
  }, [data]);

  if (data.length === 0) return <EmptyState />;

  return <canvas ref={canvasRef} />;
}

function RetentionCurveChart({ rows = [], granularity }) {
  const canvasRef = useRef(null);
  const matrix = useMemo(() => buildRetentionMatrix(rows), [rows]);
  const visibleRows = matrix.rows.slice(0, 5);
  const colors = ["#4f46e5", "#0f766e", "#2563eb", "#9333ea", "#16a34a"];
  const prefix = granularity === "month" ? "M" : "W";

  useLayoutEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx?.isConnected || !ctx.parentElement || visibleRows.length === 0) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      existingChart.stop();
      existingChart.destroy();
    }

    const {
      textColor,
      gridColor,
      tooltipBgColor,
      tooltipBorderColor,
      tooltipTitleColor,
      tooltipBodyColor,
    } = chartColors;

    const datasets = visibleRows.map(([cohort, data], idx) => {
      const cohortData = matrix.columns.map((bucket) => {
        const cell = data.buckets[bucket];
        return cell ? cell.rate : null;
      });

      return {
        label: cohort,
        data: cohortData,
        borderColor: colors[idx % colors.length],
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.25,
        spanGaps: true,
        pointRadius: 2.5,
        pointHoverRadius: 4,
        pointBackgroundColor: colors[idx % colors.length],
      };
    });

    const chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: matrix.columns.map((c) => `${prefix}${c}`),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: textColor,
              font: {
                size: 10,
                weight: "500",
              },
            },
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              callback: (val) => `${val}%`,
              font: {
                size: 10,
                weight: "500",
              },
            },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: "circle",
              padding: 10,
              font: {
                size: 9,
                weight: "600",
              },
              color: "#64748b",
            },
          },
          tooltip: {
            backgroundColor: tooltipBgColor,
            titleColor: tooltipTitleColor,
            bodyColor: tooltipBodyColor,
            borderColor: tooltipBorderColor,
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw.toFixed(1)}%`,
            },
          },
        },
      },
    });

    return () => {
      chartInstance.stop();
      chartInstance.destroy();
    };
  }, [rows, granularity, visibleRows, matrix.columns, prefix]);

  if (rows.length === 0) return <EmptyState label="No cohorts found" />;

  return (
    <div className="h-64 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

function buildRetentionMatrix(rows = []) {
  const cohorts = {};
  let maxBucket = 0;

  rows.forEach((row) => {
    const cohort = String(row.cohort_bucket || "").slice(0, 10);
    const bucket = Number(row.bucket_number || 0);
    if (!cohorts[cohort]) {
      cohorts[cohort] = { cohortSize: Number(row.cohort_size || 0), buckets: {} };
    }
    cohorts[cohort].buckets[bucket] = {
      rate: Number(row.retention_rate || 0),
      users: Number(row.retained_users || 0),
    };
    maxBucket = Math.max(maxBucket, bucket);
  });

  return {
    rows: Object.entries(cohorts).sort(([a], [b]) => b.localeCompare(a)),
    columns: Array.from({ length: maxBucket + 1 }, (_, idx) => idx),
  };
}

function RetentionHeatmap({ rows = [], granularity, maxColumns }) {
  const matrix = useMemo(() => buildRetentionMatrix(rows), [rows]);
  const prefix = granularity === "month" ? "M" : "W";
  const displayColumns = maxColumns != null
    ? matrix.columns.slice(0, maxColumns + 1)
    : matrix.columns;

  if (!rows.length) return <EmptyState label="No retention cohorts found" />;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-3 py-3 text-left">Cohort</th>
            <th className="px-3 py-3 text-left">Size</th>
            {displayColumns.map((bucket) => (
              <th key={bucket} className="w-12 px-2 py-3 text-center">
                {prefix}{bucket}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {matrix.rows.map(([cohort, data]) => (
            <tr key={cohort} className="hover:bg-slate-50/30 transition-colors">
              <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-700">
                {cohort}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-400">
                {formatNumber(data.cohortSize)}
              </td>
              {displayColumns.map((bucket) => {
                const cell = data.buckets[bucket];
                if (!cell) {
                  return (
                    <td key={bucket} className="py-2.5 text-center font-medium text-slate-200">
                      -
                    </td>
                  );
                }
                const alpha = Math.min(0.9, 0.05 + cell.rate / 115);
                return (
                  <td
                    key={bucket}
                    className="group relative py-2.5 text-center font-bold"
                    style={{
                      backgroundColor: `rgba(99, 102, 241, ${alpha})`,
                      color: cell.rate >= 50 ? "#ffffff" : "#4338ca",
                    }}
                  >
                    {cell.rate.toFixed(0)}%
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white shadow-md group-hover:block whitespace-nowrap">
                      {formatNumber(cell.users)} active
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveUsersModal({ users = [], appUsers, webUsers, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Live Users</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              <Smartphone className="mr-1 inline h-3 w-3 text-violet-500" />
              App {formatNumber(appUsers)} &middot;{" "}
              <Globe className="mr-1 inline h-3 w-3 text-amber-500" />
              Web {formatNumber(webUsers)}
            </p>
          </div>
          <ControlButton onClick={onClose} variant="secondary" className="h-9 w-9 !p-0">
            <X className="h-4 w-4" />
          </ControlButton>
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {users.length ? (
            users.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/20 p-3 hover:bg-slate-50/40 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {(user.fullname || user.username || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {user.fullname || user.username}
                    </p>
                    {user.current_profeciency_level && (
                      <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                        {user.current_profeciency_level}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    {user.signup_source === "app" ? (
                      <Smartphone className="h-3 w-3 text-violet-500" />
                    ) : (
                      <Globe className="h-3 w-3 text-amber-500" />
                    )}
                    <span>{user.signup_source === "app" ? "App" : "Web"}</span>
                    <span>&middot;</span>
                    <span>{timeAgo(user.last_activity_at)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState label="No users active right now" />
          )}
        </div>
      </div>
    </div>
  );
}

function AllUsersModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState("all");
  const [savingUserId, setSavingUserId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    let live = true;
    api
      .get("/admin/analytics/all-users")
      .then((res) => {
        if (live) setUsers(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching all users:", err);
        if (live) setError("Could not load users");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const updateUser = async (userId, fields, revert) => {
    setSavingUserId(userId);
    setRowErrors((prev) => ({ ...prev, [userId]: null }));
    try {
      await api.patch(`/admin/users/${userId}`, fields);
    } catch (err) {
      console.error("Error updating user:", err);
      revert();
      setRowErrors((prev) => ({ ...prev, [userId]: "Save failed, reverted." }));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleTrackChange = (userId, trackValue) => {
    const option = USER_TRACK_OPTIONS.find((o) => o.value === trackValue);
    if (!option) return;
    const prevUsers = users;
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, ...option.payload } : u)));
    updateUser(userId, option.payload, () => setUsers(prevUsers));
  };

  const handlePaidToggle = (userId, currentPaid) => {
    const prevUsers = users;
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, is_paid: !currentPaid } : u)),
    );
    updateUser(userId, { is_paid: !currentPaid }, () => setUsers(prevUsers));
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (q) {
        const matches =
          (user.fullname || "").toLowerCase().includes(q) ||
          (user.username || "").toLowerCase().includes(q) ||
          (user.phone || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (trackFilter !== "all" && getUserTrackValue(user) !== trackFilter) return false;
      if (paidFilter === "paid" && !user.is_paid) return false;
      if (paidFilter === "unpaid" && user.is_paid) return false;
      return true;
    });
  }, [users, search, trackFilter, paidFilter]);

  const handleDownloadCSV = () => {
    const headers = ["Full Name", "Phone", "Track", "Source", "Payment", "Signup Date", "Last Active"];
    const rows = filteredUsers.map((u) => [
      u.fullname || u.username || "",
      u.phone || "",
      USER_TRACK_OPTIONS.find((o) => o.value === getUserTrackValue(u))?.label || "",
      u.signup_source || "",
      u.is_paid ? "Paid" : "Free",
      u.created_at ? u.created_at.slice(0, 10) : "",
      u.last_activity_at || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_users_${todayMinus(0)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">All Users</h3>
            <p className="mt-0.5 text-xs text-slate-400">{formatNumber(filteredUsers.length)} users found</p>
          </div>
          <div className="flex items-center gap-2">
            <ControlButton onClick={handleDownloadCSV} variant="secondary" className="h-9 gap-1.5 px-3 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </ControlButton>
            <ControlButton onClick={onClose} variant="secondary" className="h-9 w-9 !p-0">
              <X className="h-4 w-4" />
            </ControlButton>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-3">
          <div className="flex-1 min-w-[200px]">
            <ControlInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-9 w-full text-xs"
            />
          </div>
          <SingleSelectDropdown
            value={trackFilter}
            onChange={setTrackFilter}
            options={[{ value: "all", label: "All Tracks" }, ...USER_TRACK_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
          />
          <Segmented
            value={paidFilter}
            onChange={setPaidFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Paid", value: "paid" },
              { label: "Free", value: "unpaid" },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-400 animate-pulse">Loading users...</div>
          ) : error ? (
            <div className="py-12 text-center text-sm font-semibold text-rose-500">{error}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-3">Name</th>
                  <th className="py-2.5 pr-3">Phone</th>
                  <th className="py-2.5 pr-3">Track</th>
                  <th className="py-2.5 pr-3">Payment</th>
                  <th className="py-2.5 pr-3">Signed Up</th>
                  <th className="py-2.5">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isSaving = savingUserId === user.user_id;
                  const trackValue = getUserTrackValue(user);
                  const trackOption = USER_TRACK_OPTIONS.find((o) => o.value === trackValue);
                  return (
                    <tr key={user.user_id} className={isSaving ? "bg-indigo-50/40" : "hover:bg-slate-50/50"}>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-slate-700">{user.fullname || user.username}</div>
                        {rowErrors[user.user_id] && (
                          <div className="mt-0.5 text-[10px] font-semibold text-rose-500">{rowErrors[user.user_id]}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">{user.phone || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <select
                          value={trackValue}
                          disabled={isSaving}
                          onChange={(e) => handleTrackChange(user.user_id, e.target.value)}
                          className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 ${trackOption?.badgeClass || "bg-slate-100 text-slate-600"}`}
                        >
                          {USER_TRACK_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 pr-3">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handlePaidToggle(user.user_id, user.is_paid)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-opacity hover:opacity-80 disabled:opacity-60 ${
                            user.is_paid ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isSaving ? "Saving…" : user.is_paid ? "Paid" : "Free"}
                        </button>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">
                        {user.created_at ? user.created_at.slice(0, 10) : "—"}
                      </td>
                      <td className="py-2.5 text-slate-500">{timeAgo(user.last_activity_at)}</td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppAnalytics({ me }) {
  const [filters, setFilters] = useState({
    startDate: todayMinus(29),
    endDate: todayMinus(0),
    platform: "both",
    appVersions: [],
  });
  const [retentionGranularity, setRetentionGranularity] = useState("month");
  const [retentionPaidStatus, setRetentionPaidStatus] = useState("all");
  const [retentionWeeks, setRetentionWeeks] = useState(6);
  const [retentionMonths, setRetentionMonths] = useState(6);
  const [options, setOptions] = useState({ appVersions: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveUsersOpen, setLiveUsersOpen] = useState(false);
  const [allUsersOpen, setAllUsersOpen] = useState(false);
  const [streakView, setStreakView] = useState("current");
  const [state, setState] = useState({
    summary: null,
    activeTrend: [],
    streaks: { current: [], summary: {} },
    retention: [],
    learning: [],
    topUsage: [],
    funnel: [],
    prospects: [],
    recent: [],
    newUsers: [],
    activeNow: null,
    metadata: null,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = queryString(filters);
      const retentionQs = queryString(filters, {
        granularity: retentionGranularity,
        paidStatus: retentionPaidStatus,
      });
      const [
        filterRes,
        summary,
        activeTrend,
        streaks,
        retention,
        learning,
        topUsage,
        funnel,
        prospects,
        recent,
        newUsers,
        activeNow,
      ] = await Promise.all([
        api.get("/admin/app-analytics/filters"),
        api.get(`/admin/app-analytics/summary?${qs}`),
        api.get(`/admin/app-analytics/active-trend?${qs}`),
        api.get(`/admin/app-analytics/streaks?${qs}`),
        api.get(`/admin/app-analytics/retention?${retentionQs}`),
        api.get(`/admin/app-analytics/learning-overview?${qs}`),
        api.get(`/admin/app-analytics/top-usage?${qs}`),
        api.get(`/admin/app-analytics/funnel?${qs}`),
        api.get(`/admin/app-analytics/high-prospects?${qs}`),
        api.get(`/admin/app-analytics/recent-usage?${qs}`),
        api.get(`/admin/app-analytics/new-user-trend?${qs}`),
        api.get("/admin/analytics/active-users-now"),
      ]);
      setOptions(filterRes.data || { appVersions: [] });
      setState({
        summary: summary.data,
        activeTrend: activeTrend.data?.data || [],
        streaks: streaks.data || { current: [], summary: {} },
        retention: retention.data?.data || [],
        learning: learning.data?.data || [],
        topUsage: topUsage.data?.data || [],
        funnel: funnel.data?.data || [],
        prospects: prospects.data?.data || [],
        recent: recent.data?.data || [],
        newUsers: newUsers.data?.data || [],
        activeNow: activeNow.data,
        metadata: summary.data?.metadata || null,
      });
    } catch (error) {
      console.error("Error loading app analytics:", error);
      toast.error("Could not load app analytics");
    } finally {
      setLoading(false);
    }
  }, [filters, retentionGranularity, retentionPaidStatus]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await api.get("/admin/analytics/active-users-now");
        setState((prev) => ({ ...prev, activeNow: res.data }));
      } catch (_error) {}
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const levelRows = useMemo(() => {
    const levels = state.summary?.levels || {};
    const total = Number(state.summary?.total_users || 0);
    return ["A1", "A2", "B1", "B2", "Job Flow", "Other"].map((key) => ({
      key,
      count: Number(levels[key] || 0),
      pct: total ? Math.round((Number(levels[key] || 0) / total) * 100) : 0,
    }));
  }, [state.summary]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post("/admin/app-analytics/refresh");
      toast.success("Analytics refreshed");
      setState((prev) => ({ ...prev, metadata: res.data?.metadata || prev.metadata }));
      await fetchAll();
    } catch (error) {
      console.error("Manual app analytics refresh failed:", error);
      toast.error("Refresh failed. Showing previous data.");
    } finally {
      setRefreshing(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const doughnutData = useMemo(() => {
    return {
      labels: ["Paid Users", "Free Users"],
      datasets: [
        {
          data: [Number(state.summary?.paid_users || 0), Number(state.summary?.unpaid_users || 0)],
          backgroundColor: ["#10b981", "#6366f1"],
          hoverBackgroundColor: ["#059669", "#4f46e5"],
          borderWidth: 0,
        },
      ],
    };
  }, [state.summary]);

  return (
    <div className="min-h-full bg-slate-50 p-4 lg:p-6 space-y-5">
      {/* Header Panel */}
      <div className="rounded-xl bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">App Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time app usage telemetry, retention cohorts, learning indicators and user journeys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLiveUsersOpen(true)}
            className="rounded-xl bg-slate-955 px-4 py-2 text-left text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <p className="text-[10px] uppercase opacity-70">Active Now</p>
            <p className="font-bold text-lg leading-none mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {formatNumber(state.activeNow?.activeUsersNow)}
            </p>
            <div className="flex items-center gap-2.5 mt-1.5 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-violet-500" />
                App {formatNumber(state.activeNow?.appUsers)}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-amber-500" />
                Web {formatNumber(state.activeNow?.webUsers)}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform</span>
            <SingleSelectDropdown
              options={[
                { value: "both", label: "Both" },
                { value: "app", label: "App" },
                { value: "web", label: "Web" },
              ]}
              value={filters.platform}
              onChange={(val) => setFilters((prev) => ({ ...prev, platform: val }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</span>
            <ControlInput
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              className="h-9 text-xs w-36"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</span>
            <ControlInput
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              className="h-9 text-xs w-36"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">App Versions</span>
            <MultiSelectDropdown
              options={options.appVersions || []}
              selected={filters.appVersions}
              onChange={(vals) => setFilters((prev) => ({ ...prev, appVersions: vals }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 self-end">
          <span className="text-xs text-slate-400 font-medium">
            Updated: {formatIst(state.metadata?.last_refreshed_at)}
          </span>

          {me?.role === "super_admin" && (
            <ControlButton
              onClick={handleRefresh}
              disabled={refreshing}
              variant="secondary"
              className="h-9 px-3.5 text-xs"
            >
              <RefreshCw className={`mr-1.5 w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </ControlButton>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-12 text-center text-sm font-semibold text-slate-400 animate-pulse shadow-xs">
          Loading analytics suite...
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          
          {/* Six Metric Cards */}
          <div className="col-span-full sm:col-span-6 xl:col-span-2 bg-white shadow-xs rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
            <div>
              <header className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Users</span>
                <button
                  type="button"
                  onClick={() => setAllUsersOpen(true)}
                  title="View all users"
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Users className="w-4 h-4" />
                </button>
              </header>
              <div className="text-3xl font-bold text-slate-800 leading-tight">
                {formatNumber(state.summary?.total_users)}
              </div>
            </div>
            <div className="mt-3 border-t border-slate-50 pt-2.5 space-y-1.5">
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Paid: <span className="font-semibold text-slate-700">{formatNumber(state.summary?.paid_users)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Free: <span className="font-semibold text-slate-700">{formatNumber(state.summary?.unpaid_users)}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-400 font-medium">
                {levelRows.map((row) => (
                  <span key={row.key}>
                    {row.key} <span className="font-bold text-slate-600">{formatNumber(row.count)}</span>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAllUsersOpen(true)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
              >
                View all users →
              </button>
            </div>
          </div>

          <div className="col-span-full sm:col-span-6 xl:col-span-2 bg-white shadow-xs rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
            <div>
              <header className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">New Yesterday</span>
                <Users className="w-4 h-4 text-blue-500" />
              </header>
              <div className="text-3xl font-bold text-slate-800 leading-tight">
                {formatNumber(state.summary?.new_users_yesterday)}
              </div>
            </div>
            <div className="text-[11px] text-gray-500 mt-3 border-t border-slate-50 pt-2.5">
              <span>New registrations</span>
            </div>
          </div>

          <div className="col-span-full sm:col-span-6 xl:col-span-2 bg-white shadow-xs rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
            <div>
              <header className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">DAU</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </header>
              <div className="text-3xl font-bold text-slate-800 leading-tight">
                {formatNumber(state.summary?.dau)}
              </div>
            </div>
            <div className="text-[11px] text-gray-500 mt-3 border-t border-slate-50 pt-2.5 truncate">
              <span>Source: {state.summary?.activity_source || "App / Web"}</span>
            </div>
          </div>

          <div className="col-span-full sm:col-span-6 xl:col-span-2 bg-white shadow-xs rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
            <div>
              <header className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">WAU</span>
                <Activity className="w-4 h-4 text-indigo-500" />
              </header>
              <div className="text-3xl font-bold text-slate-800 leading-tight">
                {formatNumber(state.summary?.wau)}
              </div>
            </div>
            <div className="text-[11px] text-gray-500 mt-3 border-t border-slate-50 pt-2.5">
              <span>Weekly active users</span>
            </div>
          </div>

          <div className="col-span-full sm:col-span-6 xl:col-span-2 bg-white shadow-xs rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
            <div>
              <header className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">MAU</span>
                <Activity className="w-4 h-4 text-purple-500" />
              </header>
              <div className="text-3xl font-bold text-slate-800 leading-tight">
                {formatNumber(state.summary?.mau)}
              </div>
            </div>
            <div className="text-[11px] text-gray-500 mt-3 border-t border-slate-50 pt-2.5">
              <span>Monthly active users</span>
            </div>
          </div>

          <div className="col-span-full sm:col-span-6 xl:col-span-2 bg-white shadow-xs rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
            <div>
              <header className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Session</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </header>
              <div className="text-3xl font-bold text-slate-800 leading-tight">
                {formatDuration(state.summary?.avg_session_duration_seconds)}
              </div>
            </div>
            <div className="text-[11px] text-gray-500 mt-3 border-t border-slate-50 pt-2.5">
              <span>Duration per session</span>
            </div>
          </div>

          {/* Active Trend Card */}
          <DashboardCard title="Active Users Trend" className="col-span-full">
            <AppTrendChart data={state.activeTrend} />
          </DashboardCard>

          {/* Retention Matrix Card */}
          <div className="col-span-full bg-white shadow-xs rounded-xl p-5">
            <header className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Cohort Retention</h2>
              </div>
              <div className="flex items-center gap-2.5">
                <Segmented
                  value={retentionPaidStatus}
                  onChange={setRetentionPaidStatus}
                  options={[
                    { label: "All", value: "all" },
                    { label: "Paid", value: "paid" },
                    { label: "Unpaid", value: "unpaid" },
                  ]}
                />
                {retentionGranularity === "week" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Show</span>
                    <SingleSelectDropdown
                      options={[2, 4, 6, 8, 10, 12].map((n) => ({ value: n, label: `${n} Weeks` }))}
                      value={retentionWeeks}
                      onChange={(val) => setRetentionWeeks(Number(val))}
                    />
                  </div>
                )}
                {retentionGranularity === "month" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Show</span>
                    <SingleSelectDropdown
                      options={[3, 6, 9, 12, 18, 24].map((n) => ({ value: n, label: `${n} Months` }))}
                      value={retentionMonths}
                      onChange={(val) => setRetentionMonths(Number(val))}
                    />
                  </div>
                )}
                <Segmented
                  value={retentionGranularity}
                  onChange={setRetentionGranularity}
                  options={[
                    { label: "Weeks", value: "week" },
                    { label: "Months", value: "month" },
                  ]}
                />
              </div>
            </header>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <RetentionHeatmap
                  rows={state.retention}
                  granularity={retentionGranularity}
                  maxColumns={retentionGranularity === "week" ? retentionWeeks : retentionMonths}
                />
              </div>
              <div className="xl:col-span-5 rounded-xl border border-slate-200 p-4 bg-slate-50/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Retention Decay Curve</p>
                <RetentionCurveChart rows={state.retention} granularity={retentionGranularity} />
              </div>
            </div>
          </div>

          {/* User Paid vs Unpaid Donut */}
          <DashboardCard title="Acquisition Split" className="col-span-full sm:col-span-6 xl:col-span-4">
            {(() => {
              const totalUsers = Number(state.summary?.paid_users || 0) + Number(state.summary?.unpaid_users || 0);
              return (
                <div className="flex flex-col items-center justify-between h-full">
                  <div className="h-48 w-full flex items-center justify-center">
                    <DoughnutChart data={doughnutData} width={220} height={180} />
                  </div>
                  <div className="w-full flex justify-center gap-6 mt-2 pb-2 text-xs border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                      <span className="text-slate-500 font-medium">Paid</span>
                      <span className="font-bold text-slate-800">
                        {formatNumber(state.summary?.paid_users)} ({totalUsers ? Math.round((Number(state.summary?.paid_users || 0) / totalUsers) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                      <span className="text-slate-500 font-medium">Free</span>
                      <span className="font-bold text-slate-800">
                        {formatNumber(state.summary?.unpaid_users)} ({totalUsers ? Math.round((Number(state.summary?.unpaid_users || 0) / totalUsers) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DashboardCard>

          {/* Level Wise Users */}
          <DashboardCard title="Users by Proficiency Level" className="col-span-full sm:col-span-6 xl:col-span-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6 h-full items-center">
              {levelRows.map((row) => (
                <div key={row.key} className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 text-center hover:bg-slate-50/60 transition-colors">
                  <p className="text-xl font-bold text-slate-855 tracking-tight">{formatNumber(row.count)}</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wide">{row.key}</p>
                  <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${row.pct}%` }} />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">{row.pct}%</p>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Learning Overview */}
          <DashboardCard title="Learning Module Overview" className="col-span-full sm:col-span-6">
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-auto pr-1">
              {state.learning.length ? (
                state.learning.map((row) => {
                  const diff = Number(row.current_count || 0) - Number(row.previous_count || 0);
                  const isUp = diff >= 0;
                  return (
                    <div key={row.feature_key} className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 hover:bg-slate-50/60 transition-colors">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{row.feature_key}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-700">{formatNumber(row.current_count)}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold">
                        <span className={`inline-flex rounded px-1.5 py-0.5 ${
                          isUp ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {isUp ? "+" : ""}{formatNumber(diff)}
                        </span>
                        <span className="text-slate-400 font-medium">vs prev</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full"><EmptyState /></div>
              )}
            </div>
          </DashboardCard>

          {/* Top Usage Features */}
          <DashboardCard title="Top Usage Features" className="col-span-full sm:col-span-6">
            <div className="space-y-2.5 max-h-72 overflow-auto pr-1">
              {state.topUsage.length ? (
                state.topUsage.map((row) => (
                  <div key={`${row.feature_key}-${row.title}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/20 p-3.5 hover:bg-slate-50/55 transition-colors">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {row.feature_key}
                      </span>
                      <p className="mt-1.5 text-xs font-semibold text-slate-700">{row.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                        {formatNumber(row.users)} users
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">{formatNumber(row.usage_count)}</p>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Usage</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </DashboardCard>

          {/* Overall Funnel */}
          <DashboardCard title="Overall Funnel" className="col-span-full sm:col-span-6">
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {state.funnel.map((row, idx) => {
                const firstCount = Number(state.funnel[0]?.count || 1);
                const prevCount = idx > 0 ? Number(state.funnel[idx - 1]?.count || 1) : firstCount;
                const pctOfFirst = Math.round((Number(row.count || 0) / firstCount) * 100);
                const dropoff = idx > 0 ? Math.round(((prevCount - Number(row.count || 0)) / prevCount) * 100) : 0;

                return (
                  <div key={row.step} className="relative">
                    {idx > 0 && (
                      <div className="my-1.5 flex items-center justify-center gap-1.5 text-[9px] font-bold text-rose-500">
                        <span className="h-3 border-l border-dashed border-rose-300" />
                        <span className="bg-rose-50 px-1.5 py-0.5 rounded-full">-{dropoff}% loss</span>
                      </div>
                    )}
                    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/20 px-3 py-2 hover:bg-slate-50/40 transition-colors">
                      <span className="grid h-6 w-6 place-items-center rounded bg-slate-100 text-xs font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{row.step}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{pctOfFirst}% conversion</p>
                      </div>
                      <span className="text-xs font-bold text-indigo-600">{formatNumber(row.count)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>

          {/* High Value Prospects */}
          <DashboardCard title="High Value Prospects" className="col-span-full sm:col-span-6">
            <div className="max-h-80 space-y-2.5 overflow-auto pr-1">
              {state.prospects.length ? (
                state.prospects.map((row) => (
                  <div key={row.user_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/20 p-3 hover:bg-slate-50/40 transition-colors">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {getInitials(row.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {row.name} {row.phone && <span className="ml-1 text-[10px] text-slate-500 font-normal">({row.phone})</span>}
                        </p>
                        <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          {row.prospect_score}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {row.level || "N/A"} • {formatNumber(row.activity_count)} events • {formatIst(row.last_activity)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </DashboardCard>

          {/* Recent User Activity */}
          <DashboardCard title="Recent User Activity" className="col-span-full sm:col-span-6">
            <div className="max-h-80 space-y-2.5 overflow-auto pr-1">
              {state.recent.length ? (
                state.recent.map((row) => (
                  <div key={row.user_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/20 p-3 hover:bg-slate-50/40 transition-colors">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {getInitials(row.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-slate-700">{row.name}</p>
                        <span className="text-xs font-bold text-slate-700">{row.activity_count}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {row.level || "N/A"} • Active {formatIst(row.last_activity)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </DashboardCard>

          {/* New User Trend Line Chart */}
          <div className="flex flex-col col-span-full sm:col-span-6 bg-white shadow-xs rounded-xl">
            <div className="px-5 pt-5 pb-4">
              <header className="flex justify-between items-start mb-1">
                <h2 className="text-lg font-semibold text-slate-800">New Users</h2>
                <div className="flex items-center gap-1.5 rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                  <Smartphone className="w-3 h-3 text-indigo-600" />
                  App {formatNumber(state.activeNow?.appUsers)} / Web {formatNumber(state.activeNow?.webUsers)}
                </div>
              </header>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Last 30 Days
              </div>
              {(() => {
                const totalSignups = state.newUsers.reduce((sum, d) => sum + Number(d.users || 0), 0);
                const appSignups = state.newUsers.reduce((sum, d) => sum + Number(d.app_users || 0), 0);
                const webSignups = state.newUsers.reduce((sum, d) => sum + Number(d.web_users || 0), 0);
                return (
                  <>
                    <div className="flex items-baseline">
                      <div className="text-3xl font-bold text-slate-800 mr-2">
                        {formatNumber(totalSignups)}
                      </div>
                    </div>
                    {/* App/Web Breakdown */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                        <span>App: <span className="font-semibold text-slate-700">{formatNumber(appSignups)}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span>Web: <span className="font-semibold text-slate-700">{formatNumber(webSignups)}</span></span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="grow max-h-[128px] mt-auto">
              <div className="h-28 w-full">
                <NewUserTrendChart data={state.newUsers} />
              </div>
            </div>
          </div>

          {/* Streak Leaderboard */}
          <div className="col-span-full bg-white shadow-xs rounded-xl p-5">
            <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Streak Leaderboard
              </h2>
              <Segmented
                value={streakView}
                onChange={setStreakView}
                options={[
                  { label: "Current Streak", value: "current" },
                  { label: "Longest Streak", value: "longest" },
                ]}
              />
            </header>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5 mb-4">
              {[
                ["1+ Day", state.streaks.summary?.streak_1_plus],
                ["3+ Days", state.streaks.summary?.streak_3_plus],
                ["7+ Days", state.streaks.summary?.streak_7_plus],
                ["30+ Days", state.streaks.summary?.streak_30_plus],
                ["Longest", state.streaks.summary?.current_longest_streak],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-2.5 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
                  <p className="text-base font-black text-slate-700 mt-0.5">{formatNumber(value)}</p>
                </div>
              ))}
            </div>
            <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
              {state.streaks.current.length ? (
                <div className="divide-y divide-slate-100">
                  {[...state.streaks.current]
                    .sort((a, b) =>
                      streakView === "longest"
                        ? Number(b.longest_streak || 0) - Number(a.longest_streak || 0)
                        : Number(b.current_streak || 0) - Number(a.current_streak || 0),
                    )
                    .map((row, index) => {
                      const value = streakView === "longest" ? row.longest_streak : row.current_streak;
                      return (
                        <div
                          key={row.user_id}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-slate-50/50 ${
                            index < 3 ? "bg-gradient-to-r from-slate-50 to-transparent" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="flex w-6 shrink-0 justify-center">
                              {index === 0 ? (
                                <Trophy className="w-4 h-4 text-yellow-500" />
                              ) : index === 1 ? (
                                <Medal className="w-4 h-4 text-slate-400" />
                              ) : index === 2 ? (
                                <Medal className="w-4 h-4 text-amber-600" />
                              ) : (
                                <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-700">{row.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {row.level && (
                                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                                    {row.level}
                                  </span>
                                )}
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                    row.is_paid ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {row.is_paid ? "Paid" : "Free"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-orange-600 justify-end">
                              <Flame className="w-3.5 h-3.5" />
                              <span className="text-lg font-bold">{formatNumber(value)}</span>
                            </div>
                            {streakView === "current" && Number(row.longest_streak) > Number(row.current_streak) && (
                              <p className="text-[9px] text-slate-400 font-medium">Best: {formatNumber(row.longest_streak)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="px-3 py-8 text-center text-slate-400 text-sm font-medium">No active streaks</div>
              )}
            </div>
          </div>

        </div>
      )}

      {liveUsersOpen && (
        <LiveUsersModal
          users={state.activeNow?.activeUsersList || []}
          appUsers={state.activeNow?.appUsers}
          webUsers={state.activeNow?.webUsers}
          onClose={() => setLiveUsersOpen(false)}
        />
      )}

      {allUsersOpen && <AllUsersModal onClose={() => setAllUsersOpen(false)} />}
    </div>
  );
}
