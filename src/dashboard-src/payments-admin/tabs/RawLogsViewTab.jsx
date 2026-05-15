import { formatIstDateTime } from "../utils/formatters";

export function RawLogsViewTab({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-slate-500">
            {Object.keys(rows[0])
              .slice(0, 8)
              .map((k) => (
                <th key={k} className="px-2 py-2 font-semibold">
                  {k}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.enrollment_id || r.payment_id || r.raw_log_id || i}
              className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              {Object.keys(rows[0])
                .slice(0, 8)
                .map((k) => (
                  <td key={k} className="px-2 py-2 text-slate-700">
                    {typeof r[k] === "object" && r[k] !== null
                      ? JSON.stringify(r[k]).slice(0, 80)
                      : /_at$/i.test(String(k)) || /date/i.test(String(k))
                        ? formatIstDateTime(r[k])
                        : String(r[k] ?? "")}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
