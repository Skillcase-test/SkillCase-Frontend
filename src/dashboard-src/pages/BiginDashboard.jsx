import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Clock3,
  Download,
  Search,
  X,
} from "lucide-react";

import { biginDashboardApi } from "../../api/biginDashboardApi";
import {
  ControlInput,
  ControlDropdown,
} from "../payments-admin/components/controls";
import { TableSkeleton, EmptyState } from "../payments-admin/components/common";
import { PaginationBar } from "../payments-admin/components/PaginationBar";
import DoughnutChart from "../charts/DoughnutChart";
import FunnelChart from "../charts/FunnelChart";
import SourceBarList from "../charts/SourceBarList";
import DailyTrendChart from "../charts/DailyTrendChart";
import { adjustColorOpacity } from "../utils/Utils";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function MultiSelectOwner({
  owners = [],
  selectedOwners = [],
  onChange,
  loading = false,
}) {
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

  const filteredOwners = useMemo(() => {
    return owners.filter((o) => {
      const name = (o.owner_name || "").toLowerCase();
      const id = (o.owner_zoho_id || "").toLowerCase();
      return (
        name.includes(searchQuery.toLowerCase()) ||
        id.includes(searchQuery.toLowerCase())
      );
    });
  }, [owners, searchQuery]);

  const handleToggle = (value) => {
    if (selectedOwners.includes(value)) {
      onChange(selectedOwners.filter((v) => v !== value));
    } else {
      onChange([...selectedOwners, value]);
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
    if (selectedOwners.length === 0) return "All Owners";
    if (selectedOwners.length === 1) {
      const match = owners.find((o) => o.owner_zoho_id === selectedOwners[0]);
      return match ? match.owner_name : selectedOwners[0];
    }
    return `${selectedOwners.length} owners selected`;
  }, [selectedOwners, owners]);

  return (
    <div className="relative w-44" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cx(
          "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs outline-none transition duration-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
          isOpen && "border-slate-400 ring-2 ring-slate-100",
        )}
      >
        <span className="truncate text-left">{selectedLabels}</span>
        <ChevronRight
          className={cx(
            "h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-1",
            isOpen ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg max-h-72 flex flex-col">
          <div className="relative mb-2 flex-none">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reps..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="flex justify-between items-center px-1 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-none">
            <button
              type="button"
              onClick={handleSelectAll}
              className="hover:text-slate-800 transition cursor-pointer"
            >
              All Owners
            </button>
            {selectedOwners.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-rose-600 transition cursor-pointer text-rose-500"
              >
                Clear
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 space-y-1 pr-0.5">
            <div className="border-b border-slate-100 pb-1 mb-1">
              <div
                onClick={handleSelectAll}
                className={cx(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition",
                  selectedOwners.length === 0
                    ? "bg-slate-50 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedOwners.length === 0}
                  readOnly
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 focus:ring-offset-0 pointer-events-none cursor-pointer"
                />
                <span className="truncate">All Owners</span>
              </div>
            </div>

            {filteredOwners.map((o) => {
              const value = o.owner_zoho_id;
              const label = o.owner_name;
              const isChecked = selectedOwners.includes(value);

              return (
                <div
                  key={value}
                  onClick={() => handleToggle(value)}
                  className={cx(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition",
                    isChecked
                      ? "bg-slate-50 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 focus:ring-offset-0 pointer-events-none cursor-pointer"
                  />
                  <span className="truncate text-left">{label}</span>
                </div>
              );
            })}
            {filteredOwners.length === 0 && (
              <div className="py-2 text-center text-xs text-slate-400">
                No reps found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const PIPELINE_OPTIONS = [
  { value: "all", label: "Both pipelines" },
  { value: "b2c", label: "B2C Sales" },
  { value: "b1b2", label: "B1/B2 Sales" },
];

const VIEW_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
  { value: "running", label: "Running" },
  { value: "movement", label: "Weekly Snapshot" },
];

const DONUT_COLORS = [
  "#2563eb",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#94a3b8",
];

function number(val, digits = 0) {
  return Number(val || 0).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function formatDaysToHoursMins(daysValue, short = false) {
  if (daysValue == null || Number.isNaN(Number(daysValue))) return "—";
  const totalMinutes = Math.round(Number(daysValue) * 24 * 60);
  if (totalMinutes < 0) return "—";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (short) {
    return `${hours}h ${mins}m`;
  }
  return `${hours} hrs ${mins} mins`;
}

function toIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDMY(iso) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
}

// "2026-07" -> "Jul 2026"
function monthLabel(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
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

function istDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  return { from: toIso(from), to: toIso(to) };
}

function shiftIsoDate(iso, days) {
  const date = new Date(`${iso}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Last 7 days ending today - the Weekly Snapshot default window.
function defaultWeeklyRange(today) {
  return { from: shiftIsoDate(today, -6), to: today };
}

// Same-length window immediately before date_from, for the "vs previous
// period" trend badges on the KPI tiles.
function previousPeriod(dateFrom, dateTo) {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  const spanDays = Math.max(1, Math.round((to - from) / 86400000) + 1);
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (spanDays - 1));
  return { date_from: toIso(prevFrom), date_to: toIso(prevTo) };
}

function sliceGradient(context, color) {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return color;
  const centerX = (chartArea.left + chartArea.right) / 2;
  const centerY = (chartArea.top + chartArea.bottom) / 2;
  const radius =
    Math.min(
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top,
    ) / 2;
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.35,
    centerX,
    centerY,
    radius,
  );
  gradient.addColorStop(0, adjustColorOpacity(color, 0.45));
  gradient.addColorStop(1, color);
  return gradient;
}

function toDonutData(rows, labelKey, valueKey) {
  return {
    labels: rows.map((r) => r[labelKey]),
    datasets: [
      {
        data: rows.map((r) => r[valueKey]),
        backgroundColor: (context) =>
          context.dataIndex == null
            ? DONUT_COLORS[0]
            : sliceGradient(
                context,
                DONUT_COLORS[context.dataIndex % DONUT_COLORS.length],
              ),
        borderWidth: 0,
      },
    ],
  };
}

function sumBy(rows, valueKey) {
  return rows.reduce((sum, r) => sum + (r[valueKey] || 0), 0);
}

function DonutCenterLabel({ total, label, height }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center"
      style={{ height }}
    >
      <span className="text-xl font-bold text-slate-900">{number(total)}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
    </div>
  );
}

// The shared DoughnutChart's own HTML legend doesn't populate reliably
function DonutLegend({ rows, labelKey, valueKey }) {
  const total = sumBy(rows, valueKey);
  return (
    <ul className="space-y-2">
      {rows.map((row, i) => (
        <li
          key={row[labelKey]}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="flex items-center gap-2 truncate font-medium text-slate-600">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            {row[labelKey]}
          </span>
          <span className="shrink-0 tabular-nums text-slate-500">
            {number(row[valueKey])} (
            {total > 0 ? Math.round(((row[valueKey] || 0) / total) * 100) : 0}%)
          </span>
        </li>
      ))}
    </ul>
  );
}

// Matches OverallViewTab's renderTrend badge exactly.
function TrendBadge({ current, previous, invert = false }) {
  if (previous == null || current == null) return null;
  if (previous === 0) {
    if (!current) return null;
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        New
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  const isGood = invert ? !isUp : isUp;
  const color = isGood
    ? "text-emerald-700 bg-emerald-50"
    : "text-rose-700 bg-rose-50";
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// Small per-pipeline breakdown row shown under a total, when "Both pipelines" is selected - e.g. 482 total -> B2C Sales 380 / B1/B2 Sales 102.
function BreakdownNotch({ b2c, b1b2, format = (v) => number(v) }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
      <span className="text-[10px] font-semibold text-slate-500">
        B2C <span className="font-bold text-slate-700">{format(b2c)}</span>
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-[10px] font-semibold text-slate-500">
        B1/B2 <span className="font-bold text-slate-700">{format(b1b2)}</span>
      </span>
    </div>
  );
}

function KpiTile({
  label,
  value,
  previousValue,
  current,
  previous,
  invert,
  footNote,
  breakdown,
  breakdownFormat,
  onClick,
  valueClassName = "text-2xl",
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cx(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-xs",
        onClick &&
          "cursor-pointer transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <h3 className={cx("font-bold text-slate-900", valueClassName)}>
          {value}
        </h3>
        <TrendBadge current={current} previous={previous} invert={invert} />
      </div>
      {previous != null && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="text-[10px] font-semibold text-slate-400">
            {footNote || "Previous period"}
          </span>
          <span className="text-xs font-bold text-slate-600">
            {previousValue}
          </span>
        </div>
      )}
      {breakdown && (
        <BreakdownNotch
          b2c={breakdown.b2c}
          b1b2={breakdown.b1b2}
          format={breakdownFormat}
        />
      )}
    </div>
  );
}

const CANDIDATE_PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 500;

// Loops a paginated candidates endpoint until every matching row is fetched
// (not just whatever page the table happens to be showing), for full-table
// CSV export. `params` should already include the current filters/search.
async function fetchAllCandidates(apiFn, params) {
  let all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const { data } = await apiFn({
      ...params,
      limit: EXPORT_PAGE_SIZE,
      offset,
    });
    all = all.concat(data.candidates || []);
    total = data.total || 0;
    offset += EXPORT_PAGE_SIZE;
  }
  return all;
}

function CandidatesModal({
  bucket,
  label,
  apiFilters,
  onClose,
  isSuperAdmin = false,
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [state, setState] = useState({
    rows: [],
    total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    biginDashboardApi
      .candidates({
        ...apiFilters,
        bucket,
        search: debouncedSearch || undefined,
        limit: CANDIDATE_PAGE_SIZE,
        offset: (page - 1) * CANDIDATE_PAGE_SIZE,
      })
      .then(({ data }) => {
        if (!live) return;
        setState({
          rows: data.candidates || [],
          total: data.total || 0,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (!live) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err.response?.data?.msg || "Could not load candidates.",
        }));
      });
    return () => {
      live = false;
    };
  }, [bucket, apiFilters, debouncedSearch, page]);

  const totalPages = Math.max(1, Math.ceil(state.total / CANDIDATE_PAGE_SIZE));

  const handleExport = async () => {
    if (!isSuperAdmin || exporting) return;
    setExporting(true);
    try {
      const all = await fetchAllCandidates(biginDashboardApi.candidates, {
        ...apiFilters,
        bucket,
        search: debouncedSearch || undefined,
      });
      const headers = [
        "Name",
        "Phone",
        "Pipeline",
        "Stage",
        "Owner",
        "Created",
      ];
      const rows = all.map((r) => [
        r.deal_name || "",
        r.phone || "",
        r.pipeline_name || "",
        r.stage || "",
        r.owner_name || "",
        r.created_time ? istDate(r.created_time) : "",
      ]);
      const csv = [headers, ...rows]
        .map((r) =>
          r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bigin_${bucket}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{label}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {number(state.total)} candidate{state.total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleExport}
                disabled={!state.rows.length || exporting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exporting…" : "Export all"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="border-b border-slate-100 px-6 py-3">
          <ControlInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            leftIcon={<Search className="h-4 w-4" />}
            className="w-full"
          />
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {state.error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {state.error}
            </div>
          ) : state.loading ? (
            <TableSkeleton rows={6} />
          ) : state.rows.length === 0 ? (
            <EmptyState message="No candidates match this filter." />
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pr-3">Name</th>
                  {isSuperAdmin && <th className="pb-2 pr-3">Phone</th>}
                  <th className="pb-2 pr-3">Stage</th>
                  <th className="pb-2 pr-3">Owner</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row) => (
                  <tr
                    key={row.zoho_id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-2 pr-3 font-semibold text-slate-800">
                      {row.deal_name || "—"}{" "}
                      <span className="ml-1 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        {row.pipeline_name}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-2 pr-3 tabular-nums text-slate-600">
                        {row.phone ? (
                          <a
                            href={`tel:${row.phone}`}
                            className="hover:text-indigo-600"
                          >
                            {row.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    <td className="py-2 pr-3 text-slate-600">{row.stage}</td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.owner_name || "—"}
                    </td>
                    <td className="py-2 tabular-nums text-slate-500">
                      {istDate(row.created_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-3">
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              setCurrentPage={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, panel = false, children }) {
  const chrome = panel
    ? "rounded-xl bg-white shadow-xs p-5 border border-slate-100"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-xs";
  return (
    <div className={chrome}>
      <div className="mb-5">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function useBiginData(apiFilters, { enabled = true, fetchPrev = false } = {}) {
  const [state, setState] = useState({
    summary: null,
    prevSummary: null,
    funnel: [],
    ageing: [],
    performance: [],
    bySource: [],
    conversionBySource: [],
    trend: [],
    breakdown: null,
    loading: enabled,
    error: "",
  });

  const key = enabled ? JSON.stringify(apiFilters) : null;

  useEffect(() => {
    if (!enabled || !apiFilters) return undefined;
    let live = true;
    setState((s) => ({ ...s, loading: true, error: "" }));

    const prevSummaryPromise =
      fetchPrev && apiFilters.date_from && apiFilters.date_to
        ? biginDashboardApi.summary({
            ...previousPeriod(apiFilters.date_from, apiFilters.date_to),
            pipeline: apiFilters.pipeline,
            owner: apiFilters.owner,
          })
        : Promise.resolve(null);

    const bothSelected = apiFilters.pipeline === "all";
    const breakdownPromise = bothSelected
      ? Promise.all([
          biginDashboardApi.summary({ ...apiFilters, pipeline: "b2c" }),
          biginDashboardApi.summary({ ...apiFilters, pipeline: "b1b2" }),
          biginDashboardApi.leadAgeing({ ...apiFilters, pipeline: "b2c" }),
          biginDashboardApi.leadAgeing({ ...apiFilters, pipeline: "b1b2" }),
          biginDashboardApi.leadsBySource({ ...apiFilters, pipeline: "b2c" }),
          biginDashboardApi.leadsBySource({ ...apiFilters, pipeline: "b1b2" }),
          biginDashboardApi.dailyTrend({ ...apiFilters, pipeline: "b2c" }),
          biginDashboardApi.dailyTrend({ ...apiFilters, pipeline: "b1b2" }),
        ])
      : Promise.resolve(null);

    Promise.all([
      biginDashboardApi.summary(apiFilters),
      prevSummaryPromise,
      biginDashboardApi.funnel(apiFilters),
      biginDashboardApi.leadAgeing(apiFilters),
      biginDashboardApi.salesPerformance(apiFilters),
      biginDashboardApi.leadsBySource(apiFilters),
      biginDashboardApi.conversionBySource(apiFilters),
      biginDashboardApi.dailyTrend(apiFilters),
      breakdownPromise,
    ])
      .then(([s, prevS, f, a, p, src, convSrc, tr, bd]) => {
        if (!live) return;
        let breakdown = null;
        if (bd) {
          const [sB2C, sB1B2, aB2C, aB1B2, srcB2C, srcB1B2, trB2C, trB1B2] = bd;
          breakdown = {
            summary: { b2c: sB2C.data, b1b2: sB1B2.data },
            ageingTotal: {
              b2c: sumBy(aB2C.data, "leads"),
              b1b2: sumBy(aB1B2.data, "leads"),
            },
            bySourceTotal: {
              b2c: sumBy(srcB2C.data, "leads"),
              b1b2: sumBy(srcB1B2.data, "leads"),
            },
            trendTotal: {
              b2c: sumBy(trB2C.data, "new_leads"),
              b1b2: sumBy(trB1B2.data, "new_leads"),
            },
          };
        }
        setState({
          summary: s.data,
          prevSummary: prevS?.data || null,
          funnel: f.data,
          ageing: a.data,
          performance: p.data,
          bySource: src.data,
          conversionBySource: convSrc.data,
          trend: tr.data,
          breakdown,
          loading: false,
          error: "",
        });
      })
      .catch((err) => {
        if (!live) return;
        setState((s) => ({
          ...s,
          loading: false,
          error:
            err.response?.data?.msg || "Could not load the bigin dashboard.",
        }));
      });
    return () => {
      live = false;
    };
  }, [enabled, key, fetchPrev]);

  return state;
}

function DashboardBody({
  data,
  apiFilters,
  periodLabel,
  compact = false,
  isSuperAdmin = false,
  showAvgDaysToFirstMove = false,
}) {
  const {
    summary,
    prevSummary,
    funnel,
    ageing,
    performance,
    bySource,
    conversionBySource,
    trend,
    breakdown,
    loading,
    error,
  } = data;
  const [perfPage, setPerfPage] = useState(1);
  const perfPageSize = 8;
  // Which KPI tile's candidate list is open, if any.
  const [drilldown, setDrilldown] = useState(null);
  const openDrilldown = apiFilters
    ? (bucket, label) => () =>
        setDrilldown({
          bucket,
          label: periodLabel ? `${label} · ${periodLabel}` : label,
        })
    : () => undefined;

  useEffect(() => {
    setPerfPage(1);
  }, [performance]);

  const perfTotalPages = Math.max(
    1,
    Math.ceil(performance.length / perfPageSize),
  );
  const perfRows = performance.slice(
    (perfPage - 1) * perfPageSize,
    perfPage * perfPageSize,
  );

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700"
      >
        {error}
      </div>
    );
  }

  if (loading) return <TableSkeleton rows={8} />;
  if (!summary) return <EmptyState message="No data for this window." />;

  return (
    <div className="space-y-6">
      {periodLabel && (
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          {periodLabel}
        </h2>
      )}

      <div
        className={`grid gap-4 ${
          compact
            ? "grid-cols-3"
            : showAvgDaysToFirstMove
              ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"
              : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
        }`}
      >
        <KpiTile
          label="New Leads"
          value={number(summary.new_leads)}
          current={summary.new_leads}
          previous={prevSummary?.new_leads}
          previousValue={number(prevSummary?.new_leads)}
          breakdown={
            breakdown && {
              b2c: breakdown.summary.b2c.new_leads,
              b1b2: breakdown.summary.b1b2.new_leads,
            }
          }
          onClick={openDrilldown("new", "New Leads")}
        />
        <KpiTile
          label="Active Leads"
          value={number(summary.active_leads)}
          current={summary.active_leads}
          previous={prevSummary?.active_leads}
          previousValue={number(prevSummary?.active_leads)}
          breakdown={
            breakdown && {
              b2c: breakdown.summary.b2c.active_leads,
              b1b2: breakdown.summary.b1b2.active_leads,
            }
          }
          onClick={openDrilldown("active", "Active Leads")}
        />
        <KpiTile
          label="Qualified Leads"
          value={number(summary.qualified_leads)}
          current={summary.qualified_leads}
          previous={prevSummary?.qualified_leads}
          previousValue={number(prevSummary?.qualified_leads)}
          breakdown={
            breakdown && {
              b2c: breakdown.summary.b2c.qualified_leads,
              b1b2: breakdown.summary.b1b2.qualified_leads,
            }
          }
          onClick={openDrilldown("qualified", "Qualified Leads")}
        />
        <KpiTile
          label="Won"
          value={number(summary.won)}
          current={summary.won}
          previous={prevSummary?.won}
          previousValue={number(prevSummary?.won)}
          breakdown={
            breakdown && {
              b2c: breakdown.summary.b2c.won,
              b1b2: breakdown.summary.b1b2.won,
            }
          }
          onClick={openDrilldown("won", "Won")}
        />
        <KpiTile
          label="Lost"
          value={number(summary.lost)}
          current={summary.lost}
          previous={prevSummary?.lost}
          previousValue={number(prevSummary?.lost)}
          invert
          breakdown={
            breakdown && {
              b2c: breakdown.summary.b2c.lost,
              b1b2: breakdown.summary.b1b2.lost,
            }
          }
          onClick={openDrilldown("lost", "Lost")}
        />
        <KpiTile
          label="Conversion Rate"
          value={`${number(summary.conversion_rate_pct, 1)}%`}
          current={summary.conversion_rate_pct}
          previous={prevSummary?.conversion_rate_pct}
          previousValue={`${number(prevSummary?.conversion_rate_pct, 1)}%`}
          breakdown={
            breakdown && {
              b2c: breakdown.summary.b2c.conversion_rate_pct,
              b1b2: breakdown.summary.b1b2.conversion_rate_pct,
            }
          }
          breakdownFormat={(v) => `${number(v, 1)}%`}
        />
        <KpiTile
          label="Avg. Days to Close"
          value={
            summary.avg_days_to_close != null
              ? number(summary.avg_days_to_close, 1)
              : "—"
          }
          current={summary.avg_days_to_close}
          previous={prevSummary?.avg_days_to_close}
          previousValue={
            prevSummary?.avg_days_to_close != null
              ? number(prevSummary.avg_days_to_close, 1)
              : "—"
          }
          invert
          footNote="Won leads only · Previous"
          breakdown={
            breakdown && {
              b2c: breakdown.summary.b2c.avg_days_to_close,
              b1b2: breakdown.summary.b1b2.avg_days_to_close,
            }
          }
          breakdownFormat={(v) => (v != null ? number(v, 1) : "—")}
        />
        {showAvgDaysToFirstMove && (
          <KpiTile
            label="Avg Time to First Movement"
            valueClassName="text-lg"
            value={
              summary.avg_days_to_first_move != null
                ? formatDaysToHoursMins(summary.avg_days_to_first_move)
                : "—"
            }
            current={summary.avg_days_to_first_move}
            previous={prevSummary?.avg_days_to_first_move}
            previousValue={
              prevSummary?.avg_days_to_first_move != null
                ? formatDaysToHoursMins(prevSummary.avg_days_to_first_move)
                : "—"
            }
            invert
            footNote="From creation to first stage change · Previous"
            breakdown={
              breakdown && {
                b2c: breakdown.summary.b2c.avg_days_to_first_move,
                b1b2: breakdown.summary.b1b2.avg_days_to_first_move,
              }
            }
            breakdownFormat={(v) =>
              v != null ? formatDaysToHoursMins(v, true) : "—"
            }
          />
        )}
      </div>

      <SectionCard
        panel
        title="Pipeline Funnel"
        subtitle="Stage-wise counts for the selected window"
      >
        <div
          className={`grid grid-cols-1 gap-6 ${funnel.length > 1 && !compact ? "lg:grid-cols-2" : ""}`}
        >
          {funnel.map((group) => (
            <div
              key={group.pipeline_name}
              className="rounded-xl border border-slate-200 p-5"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                {group.pipeline_name}
              </p>
              <FunnelChart stages={group.stages} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Sales Team Performance"
        subtitle="Same KPI set as above, grouped by current owner"
      >
        {apiFilters?.as_of && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Reflects current owner assignment, not who owned each lead on{" "}
            {formatDMY(apiFilters.as_of)} — leads reassigned since then won't
            attribute correctly.
          </div>
        )}
        {perfRows.length ? (
          <>
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rep
                  </th>
                  <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    New
                  </th>
                  <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active
                  </th>
                  <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Qualified
                  </th>
                  <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Won
                  </th>
                  <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Lost
                  </th>
                  <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Conv %
                  </th>
                  <th className="py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Avg Days
                  </th>
                </tr>
              </thead>
              <tbody>
                {perfRows.map((row) => (
                  <tr
                    key={row.owner_zoho_id || row.owner_name}
                    className="border-b border-slate-50"
                  >
                    <td className="truncate py-2 pr-2 font-medium text-slate-700">
                      {row.owner_name}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-slate-600">
                      {number(row.new_leads)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-slate-600">
                      {number(row.active_leads)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-slate-600">
                      {number(row.qualified_leads)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-slate-600">
                      {number(row.won)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-slate-600">
                      {number(row.lost)}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-slate-600">
                      {row.conversion_rate_pct}%
                    </td>
                    <td className="py-2 tabular-nums text-slate-600">
                      {row.avg_days_to_close != null
                        ? number(row.avg_days_to_close, 1)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar
              currentPage={perfPage}
              totalPages={perfTotalPages}
              setCurrentPage={setPerfPage}
            />
          </>
        ) : (
          <EmptyState message="No sales activity in this window." />
        )}
      </SectionCard>

      {/* Three comparably-sized panels grouped together so their heights
          stay close. */}
      <div
        className={`grid grid-cols-1 items-start gap-6 ${compact ? "" : "lg:grid-cols-3"}`}
      >
        <SectionCard
          title="Lead Ageing"
          subtitle="From created date · active leads only"
        >
          {ageing.length ? (
            <>
              <div className="relative">
                <DoughnutChart
                  data={toDonutData(ageing, "label", "leads")}
                  height={200}
                />
                <DonutCenterLabel
                  total={sumBy(ageing, "leads")}
                  label="Active Leads"
                  height={200}
                />
              </div>
              <DonutLegend rows={ageing} labelKey="label" valueKey="leads" />
              {breakdown && (
                <BreakdownNotch
                  b2c={breakdown.ageingTotal.b2c}
                  b1b2={breakdown.ageingTotal.b1b2}
                />
              )}
            </>
          ) : (
            <EmptyState message="No leads in this window." />
          )}
        </SectionCard>

        <SectionCard title="Leads by Source">
          {bySource.length ? (
            <>
              <div className="relative">
                <DoughnutChart
                  data={toDonutData(bySource, "source", "leads")}
                  height={200}
                />
                <DonutCenterLabel
                  total={sumBy(bySource, "leads")}
                  label="Total Leads"
                  height={200}
                />
              </div>
              <DonutLegend rows={bySource} labelKey="source" valueKey="leads" />
              {breakdown && (
                <BreakdownNotch
                  b2c={breakdown.bySourceTotal.b2c}
                  b1b2={breakdown.bySourceTotal.b1b2}
                />
              )}
            </>
          ) : (
            <EmptyState message="No source data for this window." />
          )}
        </SectionCard>

        <SectionCard title="Conversion by Source">
          {conversionBySource.length ? (
            <SourceBarList rows={conversionBySource} />
          ) : (
            <EmptyState message="No source data for this window." />
          )}
        </SectionCard>
      </div>

      {trend.length ? (
        <DailyTrendChart rows={trend} breakdown={breakdown?.trendTotal} />
      ) : (
        <SectionCard title="Daily Trend">
          <EmptyState message="No activity in this window." />
        </SectionCard>
      )}

      {drilldown && (
        <CandidatesModal
          bucket={drilldown.bucket}
          label={drilldown.label}
          apiFilters={apiFilters}
          onClose={() => setDrilldown(null)}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}

// Cohort view: leads created in the selected range, compared from each lead's
// creation-day stage to its own day-six/latest stage.
function WeeklySnapshotView({
  apiFilters,
  createdFrom,
  createdTo,
  isSuperAdmin = false,
}) {
  const createdFromLabel = formatDMY(createdFrom);
  const createdToLabel = formatDMY(createdTo);
  const [summary, setSummary] = useState({
    rows: [],
    loading: true,
    error: "",
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [list, setList] = useState({
    rows: [],
    total: 0,
    loading: true,
    error: "",
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtersKey = JSON.stringify(apiFilters);

  useEffect(() => {
    let live = true;
    setSummary((s) => ({ ...s, loading: true, error: "" }));
    biginDashboardApi
      .weeklySnapshotSummary(apiFilters)
      .then(({ data }) => {
        if (live) setSummary({ rows: data, loading: false, error: "" });
      })
      .catch((err) => {
        if (!live) return;
        setSummary({
          rows: [],
          loading: false,
          error:
            err.response?.data?.msg ||
            "Could not load the weekly snapshot summary.",
        });
      });
    return () => {
      live = false;
    };
  }, [apiFilters, filtersKey]);

  useEffect(() => {
    let live = true;
    setList((s) => ({ ...s, loading: true, error: "" }));
    biginDashboardApi
      .weeklySnapshotCandidates({
        ...apiFilters,
        search: debouncedSearch || undefined,
        limit: CANDIDATE_PAGE_SIZE,
        offset: (page - 1) * CANDIDATE_PAGE_SIZE,
      })
      .then(({ data }) => {
        if (!live) return;
        setList({
          rows: data.candidates || [],
          total: data.total || 0,
          loading: false,
          error: "",
        });
      })
      .catch((err) => {
        if (!live) return;
        setList((s) => ({
          ...s,
          loading: false,
          error:
            err.response?.data?.msg || "Could not load the candidate list.",
        }));
      });
    return () => {
      live = false;
    };
  }, [apiFilters, filtersKey, debouncedSearch, page]);

  const byPipeline = useMemo(() => {
    const groups = {};
    for (const row of summary.rows) {
      groups[row.pipeline_name] = groups[row.pipeline_name] || [];
      groups[row.pipeline_name].push(row);
    }
    return groups;
  }, [summary.rows]);

  const totalPages = Math.max(1, Math.ceil(list.total / CANDIDATE_PAGE_SIZE));

  const handleExport = async () => {
    if (!isSuperAdmin || exporting) return;
    setExporting(true);
    try {
      const all = await fetchAllCandidates(
        biginDashboardApi.weeklySnapshotCandidates,
        { ...apiFilters, search: debouncedSearch || undefined },
      );
      const headers = [
        "Name",
        "Phone",
        "Pipeline",
        "Owner",
        "Created date",
        "Comparison date",
        "Stage on comparison date",
      ];
      const rows = all.map((r) => [
        r.deal_name || "",
        r.phone || "",
        r.pipeline_name || "",
        r.owner_name || "",
        r.created_date ? formatDMY(r.created_date) : "",
        r.comparison_date
          ? `${formatDMY(r.comparison_date)}${r.comparison_is_current ? " (latest)" : ""}`
          : "",
        r.stage_at_comparison || "",
      ]);
      const csv = [headers, ...rows]
        .map((r) =>
          r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bigin_weekly_snapshot_${createdFrom}_to_${createdTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Weekly Snapshot"
        subtitle={`Leads created from ${createdFromLabel} to ${createdToLabel} - comparison stage on day 6 or latest current stage (end-of-day IST snapshots)`}
      >
        {summary.error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {summary.error}
          </div>
        ) : summary.loading ? (
          <TableSkeleton rows={4} />
        ) : summary.rows.length === 0 ? (
          <EmptyState message="No leads were created in this date range." />
        ) : (
          <div
            className={`grid grid-cols-1 gap-6 ${Object.keys(byPipeline).length > 1 ? "lg:grid-cols-2" : ""}`}
          >
            {Object.entries(byPipeline).map(([pipelineName, rows]) => {
              const pipelineTotal = sumBy(rows, "leads");
              return (
                <div
                  key={pipelineName}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {pipelineName}
                  </p>
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-2 pr-3">Stage on day 6 / latest</th>
                        <th className="pb-2 text-right">Leads</th>
                        <th className="pb-2 pl-3 text-right">% of Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="py-2 pr-3 font-medium text-slate-800">
                            {row.stage_at_comparison}
                          </td>
                          <td className="py-2 text-right tabular-nums text-slate-600">
                            {number(row.leads)}
                          </td>
                          <td className="py-2 pl-3 text-right tabular-nums text-slate-500">
                            {pipelineTotal > 0
                              ? Math.round((row.leads / pipelineTotal) * 100)
                              : 0}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Candidates"
        subtitle="Every lead in this cohort, individually - each comparison date is shown below; today uses the latest live stage"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <ControlInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            leftIcon={<Search className="h-4 w-4" />}
            className="w-full max-w-lg cursor-text"
          />
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleExport}
              disabled={!list.rows.length || exporting}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Exporting…" : "Export all"}
            </button>
          )}
        </div>

        {list.error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {list.error}
          </div>
        ) : list.loading ? (
          <TableSkeleton rows={6} />
        ) : list.rows.length === 0 ? (
          <EmptyState message="No candidates match this filter." />
        ) : (
          <>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Owner</th>
                  <th className="pb-2 pr-3">Created</th>
                  <th className="pb-2 pr-3">Comparison date</th>
                  <th className="pb-2 pr-3">Stage on day 6 / latest</th>
                  {isSuperAdmin && <th className="pb-2">Phone</th>}
                </tr>
              </thead>
              <tbody>
                {list.rows.map((row) => (
                  <tr
                    key={row.zoho_id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-2 pr-3 font-semibold text-slate-800">
                      {row.deal_name || "—"}{" "}
                      <span className="ml-1 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        {row.pipeline_name}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.owner_name || "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.created_date ? formatDMY(row.created_date) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.comparison_date ? (
                        <>
                          {formatDMY(row.comparison_date)}
                          {row.comparison_is_current && (
                            <span className="ml-1 whitespace-nowrap rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Latest
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {row.stage_at_comparison}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-2 tabular-nums text-slate-600">
                        {row.phone ? (
                          <a
                            href={`tel:${row.phone}`}
                            className="hover:text-indigo-600"
                          >
                            {row.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pt-3">
                <PaginationBar
                  currentPage={page}
                  totalPages={totalPages}
                  setCurrentPage={setPage}
                />
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}

export default function BiginDashboard({ isSuperAdmin = false }) {
  const [params, setParams] = useSearchParams();
  const [syncStatus, setSyncStatus] = useState(null);
  const [owners, setOwners] = useState([]);

  const defaults = useMemo(() => defaultDateRange(), []);
  const today = useMemo(() => istDate(new Date().toISOString()), []);
  const createdLeadDefaults = useMemo(() => defaultWeeklyRange(today), [today]);
  const currentMonthStr = today.slice(0, 7);
  const asOfMonth = params.get("running_as_of_month") || currentMonthStr;
  const isPastAsOf = asOfMonth !== currentMonthStr;

  const startOfMonth = useMemo(() => `${asOfMonth}-01`, [asOfMonth]);
  const dayBeforeMonth = useMemo(() => {
    const d = new Date(`${startOfMonth}T00:00:00`);
    d.setDate(d.getDate() - 1);
    return toIso(d);
  }, [startOfMonth]);
  // Last calendar day of asOfMonth, or today if it's the current month.
  const asOfPeriodEnd = useMemo(() => {
    if (!isPastAsOf) return today;
    const [y, m] = asOfMonth.split("-").map(Number);
    return toIso(new Date(y, m, 0));
  }, [asOfMonth, isPastAsOf, today]);

  // Only offer months the snapshot backfill actually covers, so picking a
  // month never silently falls back to live/today data - see biginDashboardService.js
  // comment on stageAsOfSql for why an ungated past date would be unsafe.
  const monthDropdownOptions = useMemo(() => {
    const earliest = syncStatus?.earliest_snapshot_date?.slice(0, 10);
    const options = [];
    const cursor = new Date(`${currentMonthStr}-01T00:00:00`);
    for (let i = 0; i < 12; i++) {
      const monthStr = toIso(cursor).slice(0, 7);
      if (i > 0 && earliest && `${monthStr}-01` < earliest.slice(0, 7) + "-01")
        break;
      options.push({ value: monthStr, label: monthLabel(monthStr) });
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return options;
  }, [currentMonthStr, syncStatus?.earliest_snapshot_date]);

  const view = ["active", "complete", "running", "movement"].includes(
    params.get("view"),
  )
    ? params.get("view")
    : "active";
  const runningMode =
    params.get("running_mode") === "today" ? "today" : "month";
  const pipeline = ["b2c", "b1b2", "all"].includes(params.get("pipeline"))
    ? params.get("pipeline")
    : "all";
  const dateFrom = params.get("date_from") || defaults.from;
  const dateTo = params.get("date_to") || defaults.to;
  const createdFrom = params.get("created_from") || createdLeadDefaults.from;
  const createdTo = params.get("created_to") || createdLeadDefaults.to;

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const handleCreatedDateChange = (field, value) => {
    if (!value) return;
    const next = new URLSearchParams(params);
    const nextValue = value > today ? today : value;
    let nextFrom = createdFrom;
    let nextTo = createdTo;

    if (field === "created_from") {
      nextFrom = nextValue;
      if (nextTo < nextFrom) nextTo = nextFrom;
    } else {
      nextTo = nextValue;
      if (nextTo < nextFrom) nextFrom = nextTo;
    }

    next.set("created_from", nextFrom);
    next.set("created_to", nextTo);
    setParams(next, { replace: true });
  };

  const ownerParam = params.get("owner");
  const selectedOwners = useMemo(() => {
    if (!ownerParam || ownerParam === "all") return [];
    return ownerParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [ownerParam]);
  const owner = ownerParam || "all";

  const handleOwnerChange = (newSelected) => {
    const val = newSelected.length === 0 ? "all" : newSelected.join(",");
    update("owner", val);
  };

  useEffect(() => {
    biginDashboardApi
      .owners()
      .then(({ data }) => setOwners(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    const load = () => {
      biginDashboardApi
        .syncStatus()
        .then(({ data }) => {
          if (live) setSyncStatus(data);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      live = false;
      clearInterval(interval);
    };
  }, []);

  const activeApiFilters = useMemo(
    () => ({
      pipeline,
      owner,
      scope: "active",
      date_from: dateFrom,
      date_to: dateTo,
    }),
    [pipeline, owner, dateFrom, dateTo],
  );
  const completeApiFilters = useMemo(
    () => ({ pipeline, owner, scope: "active", all_time: "true" }),
    [pipeline, owner],
  );
  const todayApiFilters = useMemo(
    () => ({
      pipeline,
      owner,
      scope: "active",
      date_from: today,
      date_to: today,
    }),
    [pipeline, owner, today],
  );
  const thisMonthApiFilters = useMemo(
    () => ({
      pipeline,
      owner,
      scope: "active",
      date_from: startOfMonth,
      date_to: asOfPeriodEnd,
      ...(isPastAsOf && { as_of: asOfPeriodEnd }),
    }),
    [pipeline, owner, startOfMonth, asOfPeriodEnd, isPastAsOf],
  );

  const beforeMonthApiFilters = useMemo(
    () => ({
      pipeline,
      owner,
      scope: "active",
      date_from: "1970-01-01",
      date_to: dayBeforeMonth,
      closed_since: startOfMonth,
      ...(isPastAsOf && { as_of: asOfPeriodEnd }),
    }),
    [pipeline, owner, dayBeforeMonth, startOfMonth, asOfPeriodEnd, isPastAsOf],
  );
  const weeklySnapshotApiFilters = useMemo(
    () => ({
      pipeline,
      owner,
      created_from: createdFrom,
      created_to: createdTo,
    }),
    [pipeline, owner, createdFrom, createdTo],
  );

  const primaryFilters =
    view === "active"
      ? activeApiFilters
      : view === "complete"
        ? completeApiFilters
        : view === "running"
          ? runningMode === "today"
            ? todayApiFilters
            : thisMonthApiFilters
          : activeApiFilters;

  const monthMode = view === "running" && runningMode === "month";

  const primary = useBiginData(primaryFilters, {
    enabled: view !== "movement",
    fetchPrev: view === "active",
  });
  const secondary = useBiginData(monthMode ? beforeMonthApiFilters : null, {
    enabled: monthMode,
    fetchPrev: false,
  });

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-7 py-4.5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <BarChart3 className="h-4.5 w-4.5 text-indigo-500" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-none text-slate-900">
                Bigin Performance Dashboard
              </h1>
              <p className="mt-1 text-[11px] text-slate-400">
                Real-time overview of your sales pipeline and team performance
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <Clock3 className="h-3 w-3" />
                Last synced: {formatSyncedAt(syncStatus?.synced_to)}
                {syncStatus?.status === "error" && (
                  <span className="font-semibold text-rose-500">
                    (last attempt failed)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Two fixed rows: the core controls (row 1) never move regardless
              of view; contextual controls (row 2) append into their own
              reserved-height slot instead of shifting row 1 around. */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {VIEW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("view", opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      view === opt.value
                        ? "bg-slate-900 text-white cursor-not-allowed"
                        : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <MultiSelectOwner
                owners={owners}
                selectedOwners={selectedOwners}
                onChange={handleOwnerChange}
              />
              <ControlDropdown
                value={pipeline}
                options={PIPELINE_OPTIONS}
                onChange={(v) => update("pipeline", v)}
                className="w-44"
              />
            </div>

            <div className="flex min-h-9 flex-wrap items-center gap-3">
              {view === "active" && (
                <>
                  <ControlInput
                    type="date"
                    aria-label="From date"
                    max={dateTo}
                    value={dateFrom}
                    onChange={(e) => update("date_from", e.target.value)}
                    className="h-9 text-sm"
                  />
                  <span className="text-slate-400">to</span>
                  <ControlInput
                    type="date"
                    aria-label="To date"
                    min={dateFrom}
                    value={dateTo}
                    onChange={(e) => update("date_to", e.target.value)}
                    className="h-9 text-sm"
                  />
                </>
              )}

              {view === "movement" && (
                <>
                  <ControlInput
                    type="date"
                    aria-label="Created from"
                    max={today}
                    value={createdFrom}
                    onChange={(e) =>
                      handleCreatedDateChange("created_from", e.target.value)
                    }
                    className="h-9 text-sm"
                  />
                  <span className="text-slate-400">to</span>
                  <ControlInput
                    type="date"
                    aria-label="Created to"
                    min={createdFrom}
                    max={today}
                    value={createdTo}
                    onChange={(e) =>
                      handleCreatedDateChange("created_to", e.target.value)
                    }
                    className="h-9 text-sm"
                  />
                </>
              )}

              {view === "running" && (
                <>
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => update("running_mode", "today")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        runningMode === "today"
                          ? "bg-slate-900 text-white cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      As of Today
                    </button>
                    <button
                      type="button"
                      onClick={() => update("running_mode", "month")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        runningMode === "month"
                          ? "bg-slate-900 text-white cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      {isPastAsOf
                        ? `As of ${monthLabel(asOfMonth)}`
                        : "As of Month"}
                    </button>
                  </div>
                  {runningMode === "month" && (
                    <ControlDropdown
                      value={asOfMonth}
                      options={monthDropdownOptions}
                      onChange={(v) => update("running_as_of_month", v)}
                      className="w-40"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {view === "movement" ? (
          <WeeklySnapshotView
            apiFilters={weeklySnapshotApiFilters}
            createdFrom={createdFrom}
            createdTo={createdTo}
            isSuperAdmin={isSuperAdmin}
          />
        ) : monthMode ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DashboardBody
              data={primary}
              apiFilters={primaryFilters}
              periodLabel={isPastAsOf ? monthLabel(asOfMonth) : "This month"}
              compact
              isSuperAdmin={isSuperAdmin}
              showAvgDaysToFirstMove
            />
            <DashboardBody
              data={secondary}
              apiFilters={beforeMonthApiFilters}
              periodLabel={
                isPastAsOf
                  ? `Before ${monthLabel(asOfMonth)} (won/lost that month, rest as of month-end)`
                  : "Before this month (won/lost this month, rest live)"
              }
              compact
              isSuperAdmin={isSuperAdmin}
              showAvgDaysToFirstMove
            />
          </div>
        ) : (
          <DashboardBody
            data={primary}
            apiFilters={primaryFilters}
            isSuperAdmin={isSuperAdmin}
            showAvgDaysToFirstMove={view === "running"}
          />
        )}
      </div>
    </div>
  );
}
