import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  Activity,
  BookOpen,
  TrendingUp,
  Calendar,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function makeApi(accessCode) {
  async function request(path, { method = "GET", params = {}, body } = {}) {
    const url = new URL(`${BACKEND_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined) url.searchParams.set(k, v);
    });

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "x-wise-access-code": accessCode,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API error");
    return data;
  }

  return {
    get: (path, params = {}) => request(path, { method: "GET", params }),
    patch: (path, body = {}) => request(path, { method: "PATCH", body }),
  };
}

function toDateString(date) {
  return date.toISOString().split("T")[0];
}

function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: toDateString(start),
    endDate: toDateString(now),
  };
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function scoreColor(score) {
  if (score === null || score === undefined)
    return { color: "#9ca3af", bg: "#f3f4f6" };
  if (score >= 70) return { color: "#15803d", bg: "#dcfce7" };
  if (score >= 40) return { color: "#92400e", bg: "#fef3c7" };
  return { color: "#b91c1c", bg: "#fee2e2" };
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIconWrap}>
        <Icon size={20} color="#163B72" />
      </div>
      <div>
        <p style={styles.statLabel}>{label}</p>
        <p style={styles.statValue}>{value ?? "-"}</p>
        {sub && <p style={styles.statSub}>{sub}</p>}
      </div>
    </div>
  );
}

function CandidateTable({ candidates }) {
  if (!candidates || candidates.length === 0) {
    return <p style={styles.emptyMsg}>No candidates found for this selection.</p>;
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={{ ...styles.th, textAlign: "left" }}>Name</th>
            <th style={styles.th}>Total Classes</th>
            <th style={styles.th}>Absent</th>
            <th style={styles.th}>Avg Interaction</th>
            <th style={styles.th}>Cumulated Score</th>
            <th style={styles.th}>MTD</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => {
            const cs = scoreColor(c.cumulatedScore);
            const ms = scoreColor(c.mtd);
            return (
              <tr
                key={c.id || i}
                style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
              >
                <td style={{ ...styles.td, fontWeight: 500, color: "#111827" }}>
                  {c.name}
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>{c.totalClasses}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <span
                    style={{
                      color: c.absent > 0 ? "#b91c1c" : "#15803d",
                      fontWeight: c.absent > 0 ? 600 : 400,
                    }}
                  >
                    {c.absent}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  {c.avgInteraction !== null ? (
                    `${c.avgInteraction}%`
                  ) : (
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>N/A</span>
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <span
                    style={{
                      ...styles.badge,
                      color: cs.color,
                      backgroundColor: cs.bg,
                    }}
                  >
                    {c.cumulatedScore ?? "N/A"}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  {c.mtd !== null ? (
                    <span
                      style={{
                        ...styles.badge,
                        color: ms.color,
                        backgroundColor: ms.bg,
                      }}
                    >
                      {c.mtd}
                    </span>
                  ) : (
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceGrid({ grid }) {
  if (!grid || !grid.dates || grid.dates.length === 0) return null;

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={{ ...styles.th, textAlign: "left", minWidth: 140 }}>Name</th>
            {grid.dates.map((d) => (
              <th key={d} style={{ ...styles.th, minWidth: 64, fontSize: 12 }}>
                {formatDate(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, i) => (
            <tr
              key={row.candidateId || i}
              style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
            >
              <td style={{ ...styles.td, fontWeight: 500, color: "#111827" }}>
                {row.candidateName}
              </td>
              {row.attendance.map((status, j) => (
                <td key={j} style={{ ...styles.td, textAlign: "center" }}>
                  {status === "present" && (
                    <span style={{ color: "#15803d", fontWeight: 700 }}>Yes</span>
                  )}
                  {status === "absent" && (
                    <span style={{ color: "#b91c1c", fontWeight: 700 }}>No</span>
                  )}
                  {status === "no_class" && (
                    <span style={{ color: "#d1d5db", fontSize: 16 }}>-</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardTable({ data, mode }) {
  const metrics = data?.metrics || {};
  const rows = [
    {
      key: "interactive",
      label: mode === "least" ? "Least Interactive" : "Most Interactive",
      unit: "score",
      items: metrics.interactive || [],
    },
    {
      key: "improved",
      label: mode === "least" ? "Least Improved" : "Most Improved",
      unit: "delta",
      items: metrics.improved || [],
    },
    {
      key: "attendance",
      label:
        mode === "least"
          ? "Lowest Attendance"
          : "Perfect Attendance (95%+) / Highest",
      unit: "attendance",
      items: metrics.attendance || [],
    },
  ];

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={{ ...styles.th, textAlign: "left" }}>Metric</th>
            <th style={styles.th}>Rank 1</th>
            <th style={styles.th}>Rank 2</th>
            <th style={styles.th}>Rank 3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
            >
              <td style={{ ...styles.td, fontWeight: 600, color: "#111827" }}>
                {row.label}
              </td>
              {[0, 1, 2].map((idx) => {
                const item = row.items[idx];
                return (
                  <td key={idx} style={{ ...styles.td, verticalAlign: "top" }}>
                    {!item ? (
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>N/A</span>
                    ) : (
                      <div style={{ display: "grid", gap: 2 }}>
                        <span style={{ fontWeight: 600, color: "#1f2937" }}>
                          {item.candidateName}
                        </span>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>
                          {item.batchName}
                        </span>
                        <span style={{ color: "#334155", fontSize: 12 }}>
                          {row.unit === "attendance"
                            ? `${item.metricValue}%`
                            : row.unit === "delta"
                              ? `${item.metricValue >= 0 ? "+" : ""}${item.metricValue}`
                              : `${item.metricValue}`}
                        </span>
                      </div>
                    )}
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

export default function WiseDashboard({ accessCode }) {
  const api = makeApi(accessCode);
  const def = getDefaultRange();

  const [batches, setBatches] = useState([]);
  const [totalActive, setTotalActive] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("active");
  const [startDate, setStartDate] = useState(def.startDate);
  const [endDate, setEndDate] = useState(def.endDate);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [batchLoading, setBatchLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [leaderboardMode, setLeaderboardMode] = useState("most");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const selectedBatchObj = batches.find((b) => b.id === selectedBatch) || null;

  const loadBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      const res = await api.get("/wise/batches", { status: batchStatusFilter });
      const nextBatches = res.batches || [];
      setBatches(nextBatches);
      setTotalActive(res.totalActive ?? null);

      setSelectedBatch((prev) => {
        if (prev && nextBatches.some((b) => b.id === prev)) return prev;
        return nextBatches[0]?.id || "";
      });
    } catch (e) {
      setError(e.message || "Failed to load batches");
      setBatches([]);
      setSelectedBatch("");
    } finally {
      setBatchLoading(false);
    }
  }, [accessCode, batchStatusFilter]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const fetchDashboard = useCallback(async () => {
    if (!selectedBatch || !startDate || !endDate) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/wise/dashboard-data", {
        batchId: selectedBatch,
        startDate,
        endDate,
      });
      setData(res);
    } catch (e) {
      setError(e.message || "Failed to load dashboard data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, startDate, endDate, accessCode]);

  const fetchLeaderboard = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLeaderboardLoading(true);
    try {
      const res = await api.get("/wise/leaderboard", {
        startDate,
        endDate,
        mode: leaderboardMode,
      });
      setLeaderboardData(res);
    } catch (e) {
      setError((prev) => prev || e.message || "Failed to load leaderboard");
      setLeaderboardData(null);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [startDate, endDate, leaderboardMode, accessCode]);

  useEffect(() => {
    if (selectedBatch) fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  async function handleBatchStatusToggle() {
    if (!selectedBatchObj) return;
    setStatusUpdating(true);
    setError("");
    try {
      const targetActive = !selectedBatchObj.isActive;
      await api.patch(`/wise/batches/${selectedBatchObj.id}/status`, {
        isActive: targetActive,
      });
      await loadBatches();
      await fetchLeaderboard();
    } catch (e) {
      setError(e.message || "Failed to update batch status");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleRefresh() {
    await Promise.all([fetchDashboard(), fetchLeaderboard(), loadBatches()]);
  }

  const summary = data?.summary || {};
  const candidates = data?.candidates || [];
  const grid = data?.attendanceGrid;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Wise Dashboard</h1>
          <p style={styles.pageSubtitle}>Batch performance and attendance analytics</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || batchLoading || leaderboardLoading}
          style={{
            ...styles.refreshBtn,
            opacity: loading || batchLoading || leaderboardLoading ? 0.5 : 1,
          }}
        >
          <RefreshCw
            size={15}
            style={
              loading || batchLoading || leaderboardLoading
                ? { animation: "spin 1s linear infinite" }
                : {}
            }
          />
          Refresh
        </button>
      </div>

      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Batch List Filter</label>
          <select
            value={batchStatusFilter}
            onChange={(e) => setBatchStatusFilter(e.target.value)}
            style={styles.select}
            disabled={batchLoading || statusUpdating}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Batch</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            style={styles.select}
            disabled={batchLoading}
          >
            {batchLoading && <option>Loading...</option>}
            {!batchLoading && batches.length === 0 && <option value="">No batches</option>}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.effectiveStatus})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Set Status</label>
          <button
            onClick={handleBatchStatusToggle}
            disabled={!selectedBatchObj || statusUpdating}
            style={{
              ...styles.statusBtn,
              backgroundColor: selectedBatchObj?.isActive ? "#b91c1c" : "#15803d",
              opacity: !selectedBatchObj || statusUpdating ? 0.5 : 1,
            }}
          >
            {statusUpdating ? "Updating..." : selectedBatchObj?.isActive ? "Mark Inactive" : "Mark Active"}
          </button>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>From</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>To</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={toDateString(new Date())}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {loading && (
        <div style={styles.loadingRow}>
          <Loader2
            size={22}
            color="#163B72"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span style={{ color: "#6b7280", fontSize: 14, marginLeft: 10 }}>
            Fetching data from Wise...
          </span>
        </div>
      )}

      {!loading && (
        <div style={styles.statGrid}>
          <StatCard
            icon={Activity}
            label="Overall Health"
            value={
              summary.overallHealth !== null && summary.overallHealth !== undefined
                ? `${summary.overallHealth}%`
                : "-"
            }
            sub="Avg cumulated score"
          />
          <StatCard
            icon={Calendar}
            label="Batch Start Date"
            value={selectedBatchObj?.createdAt ? formatDate(selectedBatchObj.createdAt) : "-"}
            sub={selectedBatchObj?.name || ""}
          />
          <StatCard
            icon={BookOpen}
            label="Classes in Range"
            value={summary.totalClassesInRange ?? "-"}
            sub={
              summary.dateRange
                ? `${formatDate(summary.dateRange.startDate)} - ${formatDate(summary.dateRange.endDate)}`
                : ""
            }
          />
          <StatCard
            icon={TrendingUp}
            label="Active Batches"
            value={totalActive ?? "-"}
            sub="Across Wise"
          />
        </div>
      )}

      {!loading && data && (
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendDot, background: "#dcfce7", color: "#15803d" }}>
            &gt;= 70 Good
          </span>
          <span style={{ ...styles.legendDot, background: "#fef3c7", color: "#92400e" }}>
            40 - 69 Fair
          </span>
          <span style={{ ...styles.legendDot, background: "#fee2e2", color: "#b91c1c" }}>
            &lt; 40 At Risk
          </span>
        </div>
      )}

      {!loading && data && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Candidate Performance</h2>
          <p style={styles.sectionNote}>
            Cumulated Score = Attendance (60%) + Avg Interaction (40%) � MTD = Previous full calendar month score (N/A if no sessions)
          </p>
          <CandidateTable candidates={candidates} />
        </section>
      )}

      <section style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <div>
            <h2 style={styles.sectionTitle}>Top/Bottom Students (All Active Batches)</h2>
            <p style={styles.sectionNote}>
              Interactive, Improved (vs previous month), and Attendance leaderboards (top/bottom 3)
            </p>
          </div>
          <select
            value={leaderboardMode}
            onChange={(e) => setLeaderboardMode(e.target.value)}
            style={styles.selectSmall}
            disabled={leaderboardLoading}
          >
            <option value="most">Most</option>
            <option value="least">Least</option>
          </select>
        </div>

        {leaderboardLoading ? (
          <div style={styles.loadingRow}>
            <Loader2
              size={20}
              color="#163B72"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span style={{ color: "#6b7280", fontSize: 14, marginLeft: 10 }}>
              Loading leaderboard...
            </span>
          </div>
        ) : (
          <LeaderboardTable data={leaderboardData} mode={leaderboardMode} />
        )}
      </section>

      {!loading && grid && grid.rows && grid.rows.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Last 7 Days Attendance</h2>
          <AttendanceGrid grid={grid} />
        </section>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select:focus, input[type=date]:focus { outline: 2px solid #163B72; }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "28px 24px",
    maxWidth: 1280,
    margin: "0 auto",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    margin: "4px 0 0",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    backgroundColor: "#163B72",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  filterRow: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  select: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    minWidth: 200,
    cursor: "pointer",
  },
  selectSmall: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    minWidth: 120,
    cursor: "pointer",
  },
  dateInput: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  statusBtn: {
    border: "none",
    color: "#fff",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 12px",
    cursor: "pointer",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "12px 16px",
    color: "#b91c1c",
    fontSize: 14,
    marginBottom: 20,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 0",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    margin: 0,
    fontWeight: 500,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "#163B72",
    margin: "2px 0 0",
    lineHeight: 1,
  },
  statSub: {
    fontSize: 11,
    color: "#9ca3af",
    margin: "4px 0 0",
  },
  legendRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  legendDot: {
    fontSize: 12,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: "20px 20px 4px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 4px",
  },
  sectionNote: {
    fontSize: 12,
    color: "#9ca3af",
    margin: "0 0 16px",
  },
  tableWrap: {
    overflowX: "auto",
    marginBottom: 16,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  thead: {
    backgroundColor: "#f1f5f9",
  },
  th: {
    padding: "10px 14px",
    fontWeight: 600,
    fontSize: 12,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "center",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "11px 14px",
    color: "#374151",
    borderBottom: "1px solid #f1f5f9",
    whiteSpace: "nowrap",
  },
  badge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontWeight: 600,
    fontSize: 13,
  },
  emptyMsg: {
    color: "#9ca3af",
    textAlign: "center",
    padding: "24px 0",
    fontSize: 14,
  },
};
