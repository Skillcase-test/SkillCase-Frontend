import { ControlButton } from "./controls";
import { MONTH_NAMES } from "../utils/constants";
import { formatInrFromPaise } from "../utils/formatters";

export function FeeBreakdownModal({ feeBreakdownModal, setFeeBreakdownModal, loading = false }) {
  if (!feeBreakdownModal?.open) return null;
  const rows = Array.isArray(feeBreakdownModal.rows) ? feeBreakdownModal.rows : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{feeBreakdownModal.title || "Breakdown"}</h3>
        <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={`${r.year}-${r.month}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-3 py-2">
                      {MONTH_NAMES[Number(r.month) || 0] || "-"} {Number(r.year) || ""}
                    </td>
                    <td className="px-3 py-2">{formatInrFromPaise(Number(r.amount_paise || 0))}</td>
                  </tr>
                ))
              ) : loading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={2}>
                    Loading breakdown...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={2}>
                    No breakdown entries available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <ControlButton
            variant="secondary"
            onClick={() => setFeeBreakdownModal({ open: false, title: "", rows: [] })}
          >
            Close
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
