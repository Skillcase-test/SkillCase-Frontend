import { useRef, useLayoutEffect } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";
import { chartAreaGradient } from "./ChartjsConfig";
import { adjustColorOpacity } from "../utils/Utils";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
);

const SERIES = [
  { key: "new_leads", label: "Leads Created", color: "#3b82f6" },
  { key: "qualified_leads", label: "Qualified", color: "#22c55e" },
  { key: "won", label: "Won", color: "#8b5cf6" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

function formatDayLabel(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function number(val) {
  return Number(val || 0).toLocaleString("en-IN");
}

// Card chrome matches DashboardCard*/ComparativeBarChart: bg-white shadow-xs
// rounded-xl, legend in the header, big total number, chart below.
export function DailyTrendChart({ rows = [], breakdown }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const labels = rows.map((r) => formatDayLabel(r.date));
  const totalNewLeads = rows.reduce((sum, r) => sum + (r.new_leads || 0), 0);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.isConnected || !canvas.parentElement || rows.length === 0)
      return undefined;

    if (chartRef.current) {
      chartRef.current.stop();
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const newChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: SERIES.map((s) => ({
          label: s.label,
          data: rows.map((r) => r[s.key]),
          borderColor: s.color,
          backgroundColor: (context) => {
            const { ctx, chartArea } = context.chart;
            if (!chartArea) return adjustColorOpacity(s.color, 0.1);
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(s.color, 0) },
              { stop: 1, color: adjustColorOpacity(s.color, 0.15) },
            ]);
          },
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: s.color,
          fill: true,
          tension: 0.3,
          clip: 20,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, right: 10, left: 0, bottom: 0 } },
        interaction: { intersect: false, mode: "index" },
        animation: { duration: 500 },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#9ca3af",
              font: { size: 11 },
              maxRotation: 0,
              maxTicksLimit: 8,
              padding: 8,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#f3f4f6", borderDash: [4, 4], drawTicks: false },
            ticks: {
              color: "#9ca3af",
              font: { size: 11 },
              precision: 0,
              padding: 8,
            },
          },
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
            caretPadding: 12,
          },
        },
      },
    });

    chartRef.current = newChart;
    return () => {
      if (chartRef.current === newChart) chartRef.current = null;
      newChart.stop();
      newChart.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <div className="col-span-full rounded-xl bg-white shadow-xs border border-slate-200 p-2">
      <div className="px-1 pb-2">
        <header className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Daily Trend</h2>
          <div className="flex flex-wrap items-center gap-3">
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </header>
        <div className="mb-1 text-xs font-semibold uppercase text-gray-400">
          Daily movement
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-gray-800">
            {number(totalNewLeads)}
          </div>
          <div className="text-sm text-gray-500">leads created in period</div>
        </div>
        {breakdown && (
          <div className="mt-2 flex max-w-xs items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
            <span className="text-[10px] font-semibold text-slate-500">
              B2C <span className="font-bold text-slate-700">{number(breakdown.b2c)}</span>
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="text-[10px] font-semibold text-slate-500">
              B1/B2 <span className="font-bold text-slate-700">{number(breakdown.b1b2)}</span>
            </span>
          </div>
        )}
      </div>
      <div className="relative h-[260px] w-full pb-2 pt-2">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}

export default DailyTrendChart;
