import { useState } from "react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { formatIstDateTime } from "../utils/formatters";

export function RawLogsViewTab({ rows, loadTabData, setNotice, setError }) {
  const [reprocessingId, setReprocessingId] = useState(null);

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  async function handleReprocess(row) {
    if (!row?.raw_log_id || row?.gateway !== "jodo") return;
    const confirmed = window.confirm(
      `Reprocess Jodo event ${row.event_type || row.event_id || row.raw_log_id}?`,
    );
    if (!confirmed) return;
    setReprocessingId(row.raw_log_id);
    setError?.("");
    try {
      await paymentsAdminApi.reprocessJodoEvent(row.raw_log_id);
      setNotice?.(`Jodo event ${row.raw_log_id} queued. Watching for completion...`);
      // Refresh immediately to show "pending", then keep polling long enough to
      // surface either the processed or failed terminal state.
      for (const delay of [0, 400, 800, 1200, 2000, 3000]) {
        if (delay) await wait(delay);
        await loadTabData?.();
      }
      setNotice?.(`Jodo event ${row.raw_log_id} reprocessing status refreshed.`);
    } catch (err) {
      setError?.(err?.response?.data?.msg || "Failed to reprocess Jodo event");
    } finally {
      setReprocessingId(null);
    }
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No log entries found.
      </div>
    );
  }

  const getStatusStyle = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "processed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "failed":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ignored":
      case "duplicate":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  const keys = Object.keys(rows[0]).slice(0, 8);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            {keys.map((k) => (
              <th key={k} className="px-4 py-3 font-semibold">
                {k.replace(/_/g, " ")}
              </th>
            ))}
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.raw_log_id || r.event_id || i}
              className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${
                i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
              }`}
            >
              {keys.map((k) => (
                <td key={k} className="px-4 py-3 text-slate-700 max-w-[200px] truncate">
                  {k === "processing_status" ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusStyle(r[k])}`}>
                      {r[k]}
                    </span>
                  ) : typeof r[k] === "object" && r[k] !== null ? (
                    JSON.stringify(r[k])
                  ) : /_at$/i.test(String(k)) || /date/i.test(String(k)) ? (
                    formatIstDateTime(r[k])
                  ) : (
                    String(r[k] ?? "-")
                  )}
                </td>
              ))}
              <td className="px-4 py-3">
                {r.gateway === "jodo" && r.processing_status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => handleReprocess(r)}
                    disabled={reprocessingId === r.raw_log_id}
                    className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    {reprocessingId === r.raw_log_id ? "Reprocessing…" : "Reprocess"}
                  </button>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
