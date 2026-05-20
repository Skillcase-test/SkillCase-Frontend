import { ControlButton } from "./controls";
import { MONTH_NAMES } from "../utils/constants";
import { formatInrFromPaise } from "../utils/formatters";

export function FeeBreakdownModal({ feeBreakdownModal, setFeeBreakdownModal, loading = false }) {
  if (!feeBreakdownModal?.open) return null;
  const rows = Array.isArray(feeBreakdownModal.rows) ? feeBreakdownModal.rows : [];
  const isDiscountMode = feeBreakdownModal.mode === "discount";
  const totals = rows.reduce(
    (acc, row) => ({
      expected: acc.expected + Number(row.expected_amount_paise || 0),
      paid: acc.paid + Number(row.actual_amount_paise || 0),
      discount: acc.discount + Number(row.discount_amount_paise || 0),
      newExpected: acc.newExpected + Number(row.new_expected_amount_paise || 0),
      extra: acc.extra + Number(row.extra_amount_paise || 0),
      due: acc.due + Number(row.due_paise || 0),
    }),
    { expected: 0, paid: 0, discount: 0, newExpected: 0, extra: 0, due: 0 },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{feeBreakdownModal.title || "Breakdown"}</h3>
        <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              {isDiscountMode ? (
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">New Expected</th>
                </tr>
              ) : (
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Expected Date</th>
                  <th className="px-3 py-2">Actual Date</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Extra</th>
                  <th className="px-3 py-2">Due</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.length ? rows.map((r, i) => (
                <tr
                  key={`${r.year}-${r.month}-${i}`}
                  className={r.is_on_hold ? "bg-slate-100 text-slate-400" : (i % 2 === 0 ? "bg-white" : "bg-slate-50/60")}
                >
                  {isDiscountMode ? (
                    <>
                      <td className="px-3 py-2">
                        {MONTH_NAMES[Number(r.month) || 0] || "-"} {Number(r.year) || ""}
                        {r.is_on_hold ? " (Hold)" : ""}
                      </td>
                      <td className="px-3 py-2">{formatInrFromPaise(Number(r.expected_amount_paise || 0))}</td>
                      <td className="px-3 py-2 text-emerald-700">{formatInrFromPaise(Number(r.discount_amount_paise || 0))}</td>
                      <td className="px-3 py-2 font-semibold">{formatInrFromPaise(Number(r.new_expected_amount_paise || 0))}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">
                        {MONTH_NAMES[Number(r.month) || 0] || "-"} {Number(r.year) || ""}
                        {r.is_on_hold ? " (Hold)" : ""}
                      </td>
                      <td className="px-3 py-2">{String(r.expected_date || r.date || "").slice(0, 10) || "-"}</td>
                      <td className="px-3 py-2">{String(r.actual_date || "").slice(0, 10) || "-"}</td>
                      <td className="px-3 py-2">{formatInrFromPaise(Number(r.expected_amount_paise || 0))}</td>
                      <td className="px-3 py-2 text-emerald-700">{formatInrFromPaise(Number(r.discount_amount_paise || 0))}</td>
                      <td className="px-3 py-2">{formatInrFromPaise(Number(r.actual_amount_paise || 0))}</td>
                      <td className="px-3 py-2 text-emerald-700">{formatInrFromPaise(Number(r.extra_amount_paise || 0))}</td>
                      <td className="px-3 py-2 font-semibold">{formatInrFromPaise(Number(r.due_paise || 0))}</td>
                    </>
                  )}
                </tr>
              )) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={isDiscountMode ? 4 : 8}>
                    {loading ? "Loading breakdown..." : "No breakdown entries available."}
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length ? (
              <tfoot>
                {isDiscountMode ? (
                  <tr className="border-t bg-slate-100 text-sm font-bold text-slate-900">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2">{formatInrFromPaise(totals.expected)}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatInrFromPaise(totals.discount)}</td>
                    <td className="px-3 py-2">{formatInrFromPaise(totals.newExpected)}</td>
                  </tr>
                ) : (
                  <tr className="border-t bg-slate-100 text-sm font-bold text-slate-900">
                    <td className="px-3 py-2" colSpan={3}>Total</td>
                    <td className="px-3 py-2">{formatInrFromPaise(totals.expected)}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatInrFromPaise(totals.discount)}</td>
                    <td className="px-3 py-2">{formatInrFromPaise(totals.paid)}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatInrFromPaise(totals.extra)}</td>
                    <td className="px-3 py-2">{formatInrFromPaise(totals.due)}</td>
                  </tr>
                )}
              </tfoot>
            ) : null}
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <ControlButton
            variant="secondary"
            onClick={() => setFeeBreakdownModal({ open: false, title: "", rows: [], mode: "due" })}
          >
            Close
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
