import { useEffect, useState, useCallback } from "react";
import { History, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../../../../api/scholarshipExamApi";
import useDebounce from "../../../../hooks/useDebounce";
import { formatDateTime } from "../../../../utils/dateTime";
import { btn, inputCls, labelCls } from "./ui/buttons";

const ACTION_OPTIONS = [
  "", "tier_created", "tier_updated", "tier_deleted",
  "user_award_created", "user_award_updated", "user_award_revoked",
  "results_released", "results_hidden", "redemption_window_changed",
  "submission_score_overridden", "submission_reopened", "submission_reset",
  "exam_created", "exam_updated", "exam_deleted",
];

/**
 * Renders the before → after diff the backend already stores. Only keys that
 * appear in either side are listed, so the cell stays readable.
 *
 * Without this the log answers "who touched what" but never "what changed",
 * which is the only question an audit trail exists to answer.
 */
function DiffCell({ before, after }) {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  if (keys.length === 0) return <span className="text-xs text-slate-300">—</span>;
  const show = (v) => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "object") return JSON.stringify(v);
    // Timestamps read far better in IST than as a raw ISO string.
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTime(v);
    return String(v);
  };
  return (
    <details data-testid="audit-diff" className="text-xs">
      <summary className="cursor-pointer text-[#002856] font-semibold select-none">
        {keys.length} field{keys.length > 1 ? "s" : ""}
      </summary>
      <dl className="mt-1 space-y-0.5">
        {keys.map((k) => (
          <div key={k} className="flex flex-wrap gap-1">
            <dt className="text-slate-500">{k}:</dt>
            <dd className="text-slate-400 line-through break-all">{show(before?.[k])}</dd>
            <dd className="text-slate-800 font-medium break-all">→ {show(after?.[k])}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export default function ActivityLogTab() {
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const dActor = useDebounce(actor);
  const dTargetType = useDebounce(targetType);
  const dTargetId = useDebounce(targetId);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 25 };
      if (action) params.action = action;
      if (dActor.trim()) params.actor_user_id = dActor.trim();
      if (dTargetType.trim()) params.target_type = dTargetType.trim();
      if (dTargetId.trim()) params.target_id = dTargetId.trim();
      const res = await api.getAuditLog(params);
      setLogs(res.data?.logs || []);
      setCount(res.data?.count || 0);
      setPage(res.data?.page || p);
    } catch {
      toast.error("Failed to load activity log");
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [action, dActor, dTargetType, dTargetId]);

  // Debounced text filters: typing an actor id shouldn't fire a query per character.
  useEffect(() => { fetchLogs(1); }, [fetchLogs]);


  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#002856]"><History className="w-4 h-4" /></span>
          <h3 className="text-sm font-bold text-slate-700">Activity log</h3>
          <span className="text-xs text-slate-400">— who did what, when (scholarship module)</span>
          {!firstLoad && loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          <span className="ml-auto text-xs text-slate-400">{count} entries</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className={labelCls}>Action</label>
            <select data-testid="audit-filter-action" value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
              <option value="">All actions</option>
              {ACTION_OPTIONS.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Actor user_id</label>
            <input data-testid="audit-filter-actor" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="e.g. admin_123" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Target type</label>
            <input data-testid="audit-filter-target-type" value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="tier, user_award, exam, submission" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Target id</label>
            <input data-testid="audit-filter-target-id" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="e.g. 12" className={inputCls} />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button data-testid="audit-filter-btn" onClick={() => fetchLogs(1)} className={btn.primary}><Search className="w-3.5 h-3.5" /> Filter</button>
          <button onClick={() => { setAction(""); setActor(""); setTargetType(""); setTargetId(""); }} className={btn.secondary}>Clear</button>
        </div>

        {firstLoad && loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#002856]" /></div>
        ) : logs.length === 0 ? (
          <p data-testid="audit-empty" className="text-sm text-slate-400 text-center py-8">No entries for this filter.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">When (IST)</th>
                  <th className="text-left px-3 py-2">Actor</th>
                  <th className="text-left px-3 py-2">Action</th>
                  <th className="text-left px-3 py-2">Target</th>
                  <th className="text-left px-3 py-2">Changed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} data-testid="audit-row" className="hover:bg-slate-50/50 align-top">
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-800">{l.actor_fullname || l.actor_username || l.actor_user_id || "—"}</span>
                      {l.actor_user_id && <span className="text-xs text-slate-400 ml-1">({l.actor_user_id})</span>}
                    </td>
                    <td className="px-3 py-2"><span className="inline-flex px-2 py-0.5 rounded-full bg-[#eef2f6] text-[#002856] text-xs font-semibold">{l.action}</span></td>
                    <td className="px-3 py-2 text-xs"><span className="text-slate-600">{l.target_type}</span><span className="text-slate-400 ml-1">#{l.target_id || "—"}</span></td>
                    <td className="px-3 py-2 max-w-[22rem]"><DiffCell before={l.before_json} after={l.after_json} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {count > 25 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-slate-400">Page {page} — {count} total</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)} className={`${btn.secondary} ${page <= 1 ? "opacity-40 cursor-not-allowed" : ""}`}>Prev</button>
              <button disabled={page * 25 >= count} onClick={() => fetchLogs(page + 1)} className={`${btn.secondary} ${page * 25 >= count ? "opacity-40 cursor-not-allowed" : ""}`}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
