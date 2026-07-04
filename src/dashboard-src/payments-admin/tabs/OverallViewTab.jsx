import { useEffect, useState, useRef } from "react";
import {
  Chart,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  BarController,
  BarElement,
} from "chart.js";
import { Loader2, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { ControlButton, ControlSelect } from "../components/controls";
import { chartAreaGradient } from "../../charts/ChartjsConfig";
import { adjustColorOpacity } from "../../utils/Utils";

Chart.register(
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  BarController,
  BarElement,
);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDayOffsetDate(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function getCurrentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthsOffsetStr(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(val) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function renderTrend(current, previous) {
  const diff = current - previous;
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        New
      </span>
    );
  }
  const pct = (diff / previous) * 100;
  const isUp = pct > 0;
  const color = isUp ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50";
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function ComparativeBarChart({
  title,
  currentData,
  previousData,
  labels,
  prevLabels,
  color,
  isRevenue,
  interval,
  valueOverride,
  subLabel = "total in period"
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const displayValue = valueOverride !== undefined
    ? valueOverride
    : (currentData ? currentData.reduce((s, val) => s + Number(val || 0), 0) : 0);

  useEffect(() => {
    if (!canvasRef.current || !currentData || currentData.length === 0) return undefined;
    if (chartRef.current) chartRef.current.destroy();

    const formattedLabels = labels.map((l) => l);
    const datasetColor = color;
    const prevColor = "#64748b"; // slate-500 for better visibility

    const chartType = "bar";

    const newChart = new Chart(canvasRef.current, {
      type: chartType,
      data: {
        labels: formattedLabels,
        datasets: [
          {
            label: "Current Period",
            data: currentData,
            backgroundColor: function (context) {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return adjustColorOpacity(datasetColor, 0.85);
              return chartAreaGradient(ctx, chartArea, [
                { stop: 0, color: adjustColorOpacity(datasetColor, 0.2) },
                { stop: 1, color: adjustColorOpacity(datasetColor, 0.85) },
              ]);
            },
            borderColor: datasetColor,
            borderWidth: 1.5,
            borderRadius: 4,
            borderSkipped: "bottom",
            barPercentage: 0.8,
            categoryPercentage: 0.8,
            hoverBackgroundColor: adjustColorOpacity(datasetColor, 0.95),
            hoverBorderColor: datasetColor,
            hoverBorderWidth: 2,
          },
          {
            label: "Previous Period",
            data: previousData,
            backgroundColor: function (context) {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return adjustColorOpacity(prevColor, 0.4);
              return chartAreaGradient(ctx, chartArea, [
                { stop: 0, color: adjustColorOpacity(prevColor, 0.1) },
                { stop: 1, color: adjustColorOpacity(prevColor, 0.4) },
              ]);
            },
            borderColor: prevColor,
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: "bottom",
            barPercentage: 0.8,
            categoryPercentage: 0.8,
            hoverBackgroundColor: adjustColorOpacity(prevColor, 0.6),
            hoverBorderColor: prevColor,
            hoverBorderWidth: 1.5,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 200,
        layout: { padding: 20 },
        interaction: { intersect: false, mode: "index" },
        animation: {
          duration: 1000,
          easing: "easeInOutQuart",
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#9ca3af",
              font: { size: 11 },
              maxRotation: 0,
              maxTicksLimit: 10,
              padding: 8,
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "#f3f4f6",
              borderDash: [4, 4],
              drawTicks: false,
            },
            ticks: {
              color: "#9ca3af",
              font: { size: 11 },
              precision: 0,
              padding: 8,
              callback: (val) => {
                if (isRevenue) {
                  if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                }
                return val;
              }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            usePointStyle: true,
            boxPadding: 6,
            bodyColor: "#6b7280",
            backgroundColor: "#ffffff",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            titleColor: "#1f2937",
            titleFont: { weight: "bold" },
            cornerRadius: 8,
            padding: 10,
            caretSize: 0,
            caretPadding: 20,
            callbacks: {
              title: (ctx) => interval === "month" ? `Month ${ctx[0].dataIndex + 1}` : `Day ${ctx[0].dataIndex + 1}`,
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const dsLabel = ctx.dataset.label;
                const dateLabel = dsLabel === "Current Period" ? labels[idx] : prevLabels[idx];
                let val = ctx.parsed.y;
                if (isRevenue) {
                  val = formatCurrency(val);
                }
                return `${dsLabel} (${dateLabel}): ${val}`;
              }
            }
          }
        }
      }
    });

    chartRef.current = newChart;
    return () => newChart.destroy();
  }, [currentData, previousData, labels, prevLabels, color, isRevenue, interval]);

  return (
    <div className="col-span-full bg-white shadow-xs rounded-xl relative overflow-hidden">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500">Current Period</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-xs text-gray-500">Previous Period</span>
            </div>
          </div>
        </header>
        <div className="text-xs font-semibold text-gray-400 uppercase mb-1">
          {interval === "month" ? "Monthly movement" : "Daily movement"}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-gray-800">
            {isRevenue ? formatCurrency(displayValue) : Number(displayValue)}
          </div>
          <div className="text-sm text-gray-500 ml-2">{subLabel}</div>
        </div>
      </div>
      <div className="relative grow max-sm:max-h-[220px] xl:max-h-[220px] min-h-[220px] pb-5">
        <div className="w-full h-[220px]">
          <canvas ref={canvasRef} width={800} height={220} />
        </div>
      </div>
    </div>
  );
}

export function OverallViewTab() {
  const [interval, setInterval] = useState("day");
  
  const [fromDate, setFromDate] = useState(() => getDayOffsetDate(-30));
  const [toDate, setToDate] = useState(() => getDayOffsetDate(0));

  const [fromMonth, setFromMonth] = useState(() => getMonthsOffsetStr(-5));
  const [toMonth, setToMonth] = useState(() => getCurrentMonthStr());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [cohortFilter, setCohortFilter] = useState("both");

  async function fetchOverallStats() {
    setLoading(true);
    setError("");
    try {
      const params = {
        interval,
        fromDate: interval === "month" ? fromMonth : fromDate,
        toDate: interval === "month" ? toMonth : toDate,
        cohort_filter: cohortFilter,
      };
      const res = await paymentsAdminApi.getOverallStats(params);
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.msg || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOverallStats();
  }, [interval, fromDate, toDate, fromMonth, toMonth, cohortFilter]);

  const summary = stats?.summary || { current: {}, previous: {} };
  const currentTrend = stats?.current || [];
  const previousTrend = stats?.previous || [];

  const labels = currentTrend.map(d => d.label);
  const prevLabels = previousTrend.map(d => d.label);

  const getMonthOptions = () => {
    const list = [];
    const years = [2025, 2026, 2027];
    for (const y of years) {
      for (let m = 1; m <= 12; m++) {
        const val = `${y}-${String(m).padStart(2, "0")}`;
        const label = `${MONTH_NAMES[m - 1]} ${y}`;
        list.push({ val, label });
      }
    }
    return list;
  };

  const monthOptions = getMonthOptions();

  return (
    <div className="space-y-6">
      {/* Controls Container */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setInterval("day")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              interval === "day"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Day on Day
          </button>
          <button
            onClick={() => setInterval("month")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              interval === "month"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Month on Month
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {interval === "day" ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ControlSelect
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
                className="w-44 text-xs"
              >
                {monthOptions.map(opt => (
                  <option key={opt.val} value={opt.val}>
                    {opt.label}
                  </option>
                ))}
              </ControlSelect>
              <span className="text-xs text-slate-400 font-bold">to</span>
              <ControlSelect
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
                className="w-44 text-xs"
              >
                {monthOptions.map(opt => (
                  <option key={opt.val} value={opt.val}>
                    {opt.label}
                  </option>
                ))}
              </ControlSelect>
            </div>
          )}

          <ControlSelect
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="w-40 text-xs"
          >
            <option value="both">All Candidates</option>
            <option value="new">New Joined</option>
            <option value="old">Old Joined</option>
          </ControlSelect>

          <ControlButton variant="secondary" onClick={fetchOverallStats} disabled={loading}>
            <RefreshCw size={12} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ControlButton>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Metrics Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Enrollments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Enrollments
          </p>
          <div className="mt-2.5 flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-slate-900">
              {loading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-100" />
              ) : (
                Number(summary.current.enrollments || 0)
              )}
            </h3>
            {!loading && renderTrend(summary.current.enrollments || 0, summary.previous.enrollments || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[10px] font-semibold text-slate-400">Previous window</span>
            <span className="text-xs font-bold text-slate-600">
              {Number(summary.previous.enrollments || 0)}
            </span>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Revenue Collected
          </p>
          <div className="mt-2.5 flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-slate-900">
              {loading ? (
                <span className="inline-block h-8 w-24 animate-pulse rounded bg-slate-100" />
              ) : (
                formatCurrency(summary.current.revenue || 0)
              )}
            </h3>
            {!loading && renderTrend(summary.current.revenue || 0, summary.previous.revenue || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[10px] font-semibold text-slate-400">Previous window</span>
            <span className="text-xs font-bold text-slate-600">
              {formatCurrency(summary.previous.revenue || 0)}
            </span>
          </div>
        </div>

        {/* Card 3: Active Students */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Active Students
          </p>
          <div className="mt-2.5 flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-slate-900">
              {loading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-100" />
              ) : (
                Number(summary.current.activeStudents || 0)
              )}
            </h3>
            {!loading && renderTrend(summary.current.activeStudents || 0, summary.previous.activeStudents || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[10px] font-semibold text-slate-400">Previous window</span>
            <span className="text-xs font-bold text-slate-600">
              {Number(summary.previous.activeStudents || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Comparative Charts Grid */}
      {loading && !stats ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 bg-slate-50/50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <span className="text-sm font-semibold">Loading comparative charts...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1">
          <ComparativeBarChart
            title="Enrollments Comparative Graph"
            currentData={currentTrend.map(d => d.enrollments)}
            previousData={previousTrend.map(d => d.enrollments)}
            labels={labels}
            prevLabels={prevLabels}
            color="#3b82f6"
            isRevenue={false}
            interval={interval}
            subLabel="total enrollments"
          />

          <ComparativeBarChart
            title="Revenue Comparative Graph"
            currentData={currentTrend.map(d => d.revenue)}
            previousData={previousTrend.map(d => d.revenue)}
            labels={labels}
            prevLabels={prevLabels}
            color="#10b981"
            isRevenue={true}
            interval={interval}
            subLabel="total revenue"
          />

          <ComparativeBarChart
            title="Active Students Comparative Graph"
            currentData={currentTrend.map(d => d.activeStudents)}
            previousData={previousTrend.map(d => d.activeStudents)}
            labels={labels}
            prevLabels={prevLabels}
            color="#8b5cf6"
            isRevenue={false}
            interval={interval}
            valueOverride={summary.current.activeStudents || 0}
            subLabel="active students"
          />
        </div>
      )}
    </div>
  );
}
