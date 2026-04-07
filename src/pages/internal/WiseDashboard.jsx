import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  Users,
  Activity,
  BookOpen,
  TrendingUp,
  Calendar,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function makeApi(accessCode) {
  return async function apiFetch(path, params = {}) {
    const url = new URL(`${BACKEND_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined) url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), {
      headers: { "x-wise-access-code": accessCode },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API error");
    return data;
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

// Stat Card
function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIconWrap}>
        <Icon size={20} color="#163B72" />
      </div>
      <div>
        <p style={styles.statLabel}>{label}</p>
        <p style={styles.statValue}>{value ?? "—"}</p>
        {sub && <p style={styles.statSub}>{sub}</p>}
      </div>
    </div>
  );
}

// Candidate Table 
function CandidateTable({ candidates }) {
  if (!candidates || candidates.length === 0) {
    return (
      <p style={styles.emptyMsg}>No candidates found for this selection.</p>
    );
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
                <td style={{ ...styles.td, textAlign: "center" }}>
                  {c.totalClasses}
                </td>
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
                    {c.cumulatedScore}
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

// Attendance Grid
function AttendanceGrid({ grid }) {
  if (!grid || !grid.dates || grid.dates.length === 0) return null;

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={{ ...styles.th, textAlign: "left", minWidth: 140 }}>
              Name
            </th>
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
                    <span
                      style={{
                        color: "#15803d",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      ✓
                    </span>
                  )}
                  {status === "absent" && (
                    <span
                      style={{
                        color: "#b91c1c",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      ✗
                    </span>
                  )}
                  {status === "no_class" && (
                    <span style={{ color: "#d1d5db", fontSize: 16 }}>—</span>
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

// Main Dashboard 
export default function WiseDashboard({ accessCode }) {
  const api = makeApi(accessCode);
  const def = getDefaultRange();

  const [batches, setBatches] = useState([]);
  const [totalActive, setTotalActive] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [startDate, setStartDate] = useState(def.startDate);
  const [endDate, setEndDate] = useState(def.endDate);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [batchLoading, setBatchLoading] = useState(true);

  // Load batches on mount
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await api("/wise/batches");
        setBatches(res.batches || []);
        setTotalActive(res.totalActive ?? null);
        if (res.batches && res.batches.length > 0) {
          setSelectedBatch(res.batches[0].id);
        }
      } catch (e) {
        setError(e.message || "Failed to load batches");
      } finally {
        setBatchLoading(false);
      }
    }
    loadBatches();
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!selectedBatch || !startDate || !endDate) return;
    setLoading(true);
    setError("");
    try {
      const res = await api("/wise/dashboard-data", {
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

  // Auto-fetch when batch or date changes
  useEffect(() => {
    if (selectedBatch) fetchDashboard();
  }, [fetchDashboard]);

  const summary = data?.summary || {};
  const candidates = data?.candidates || [];
  const grid = data?.attendanceGrid;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Wise Dashboard</h1>
          <p style={styles.pageSubtitle}>
            Batch performance and attendance analytics
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading || batchLoading}
          style={{
            ...styles.refreshBtn,
            opacity: loading || batchLoading ? 0.5 : 1,
          }}
        >
          <RefreshCw
            size={15}
            style={loading ? { animation: "spin 1s linear infinite" } : {}}
          />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Batch</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            style={styles.select}
            disabled={batchLoading}
          >
            {batchLoading && <option>Loading...</option>}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
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

      {/* Error */}
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Loading overlay */}
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

      {/* Stat Cards */}
      {!loading && (
        <div style={styles.statGrid}>
          <StatCard
            icon={Activity}
            label="Overall Health"
            value={
              summary.overallHealth !== null &&
              summary.overallHealth !== undefined
                ? `${summary.overallHealth}%`
                : "—"
            }
            sub="Avg cumulated score"
          />
          <StatCard
            icon={Calendar}
            label="Batch Start Date"
            value={
              selectedBatch && batches.find((b) => b.id === selectedBatch)?.createdAt
                ? formatDate(batches.find((b) => b.id === selectedBatch).createdAt)
                : "—"
            }
            sub={
              selectedBatch
                ? batches.find((b) => b.id === selectedBatch)?.name || ""
                : ""
            }
          />
          <StatCard
            icon={BookOpen}
            label="Classes in Range"
            value={summary.totalClassesInRange ?? "—"}
            sub={
              summary.dateRange
                ? `${formatDate(summary.dateRange.startDate)} – ${formatDate(summary.dateRange.endDate)}`
                : ""
            }
          />
          <StatCard
            icon={TrendingUp}
            label="Candidates"
            value={candidates.length || "—"}
            sub={
              selectedBatch
                ? batches.find((b) => b.id === selectedBatch)?.name || ""
                : ""
            }
          />
        </div>
      )}

      {/* Score legend */}
      {!loading && data && (
        <div style={styles.legendRow}>
          <span
            style={{
              ...styles.legendDot,
              background: "#dcfce7",
              color: "#15803d",
            }}
          >
            ≥ 70 Good
          </span>
          <span
            style={{
              ...styles.legendDot,
              background: "#fef3c7",
              color: "#92400e",
            }}
          >
            40 - 69 Fair
          </span>
          <span
            style={{
              ...styles.legendDot,
              background: "#fee2e2",
              color: "#b91c1c",
            }}
          >
            &lt; 40 At Risk
          </span>
        </div>
      )}

      {/* Candidate Performance Table */}
      {!loading && data && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Candidate Performance</h2>
          <p style={styles.sectionNote}>
            Cumulated Score = Attendance (60%) + Avg Interaction (40%)
            &nbsp;·&nbsp; MTD = Previous full calendar month score
          </p>
          <CandidateTable candidates={candidates} />
        </section>
      )}

      {/* Attendance Grid */}
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

// Styles
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "28px 24px",
    maxWidth: 1200,
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
  dateInput: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
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
    padding: "40px 0",
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
