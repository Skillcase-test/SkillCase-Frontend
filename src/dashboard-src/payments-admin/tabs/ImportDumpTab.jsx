import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { ControlButton } from "../components/controls";

export function ImportDumpTab() {
  const [enrollmentFile, setEnrollmentFile] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmSummary, setConfirmSummary] = useState(null);
  const [error, setError] = useState("");

  const canRun = !!enrollmentFile && !!paymentFile && !loading;
  const canConfirm = !!result?.can_confirm && !!result?.dry_run_token && !confirming;

  const missingText = useMemo(() => {
    const count = Number(result?.missing_batches_count || 0);
    if (!count) return "";
    return `${count} batches are missing. Create these first: ${(result?.missing_batches || []).join(", ")}`;
  }, [result]);

  async function runDry() {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setConfirmSummary(null);
    try {
      const fd = new FormData();
      fd.append("enrollment_file", enrollmentFile);
      fd.append("payment_file", paymentFile);
      const res = await paymentsAdminApi.importDumpDryRun(fd);
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.msg || "Dry run failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!canConfirm) return;
    setConfirming(true);
    setError("");
    try {
      const res = await paymentsAdminApi.importDumpConfirm({ dry_run_token: result.dry_run_token });
      setConfirmSummary(res.data?.summary || null);
    } catch (err) {
      setError(err?.response?.data?.msg || "Confirm import failed");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-base font-bold text-slate-800">Import Dump</h3>
        <p className="mt-1 text-sm text-slate-500">Upload enrollment and payment history files, run dry-run validation, then confirm import.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            Enrollment file (.xlsx)
            <input className="mt-2 block w-full text-xs" type="file" accept=".xlsx,.xls" onChange={(e) => setEnrollmentFile(e.target.files?.[0] || null)} />
          </label>
          <label className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            Payment file (.xlsx)
            <input className="mt-2 block w-full text-xs" type="file" accept=".xlsx,.xls" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ControlButton onClick={runDry} disabled={!canRun} variant="primary">
            <Upload size={14} className="mr-1" />
            {loading ? "Running Dry-Run..." : "Run Dry-Run"}
          </ControlButton>
          <ControlButton onClick={confirmImport} disabled={!canConfirm} variant="secondary">
            {confirming ? "Confirming..." : "Confirm Import"}
          </ControlButton>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      {missingText ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5" />
          <span>{missingText}</span>
        </div>
      ) : null}

      {result?.summary ? (
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="text-sm font-semibold text-slate-700">Dry-Run Summary</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3 text-sm text-slate-600">
            <div>Enrollment rows: {result.summary.enrollment_rows}</div>
            <div>Payment rows: {result.summary.payment_rows}</div>
            <div>Missing batches: {result.summary.missing_batches_count}</div>
            <div>Errors: {result.summary.errors_count}</div>
            <div>Warnings: {result.summary.warnings_count}</div>
            <div>Duplicates: {result.summary.duplicate_payments_count}</div>
          </div>
        </div>
      ) : null}

      {confirmSummary ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 flex items-start gap-2">
          <CheckCircle2 size={16} className="mt-0.5" />
          <span>
            Import completed. Enrollments created: {confirmSummary.enroll_created}, updated: {confirmSummary.enroll_updated}, payments inserted: {confirmSummary.payments_inserted}, skipped duplicates: {confirmSummary.payments_skipped}.
          </span>
        </div>
      ) : null}

      {result?.errors?.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Errors
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2">Sheet</th>
                <th className="px-3 py-2">Row</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.slice(0, 100).map((e, i) => (
                <tr key={`${e.sheet}-${e.row}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="px-3 py-2">{e.sheet || "-"}</td>
                  <td className="px-3 py-2">{e.row || "-"}</td>
                  <td className="px-3 py-2">{e.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {result?.warnings?.length ? (
        <div className="overflow-x-auto rounded-xl border border-amber-200">
          <div className="border-b bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Warnings
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-amber-50/60 text-left text-xs uppercase text-amber-700">
                <th className="px-3 py-2">Sheet</th>
                <th className="px-3 py-2">Row</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.warnings.slice(0, 200).map((w, i) => (
                <tr key={`${w.sheet}-${w.row}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-amber-50/30"}>
                  <td className="px-3 py-2">{w.sheet || "-"}</td>
                  <td className="px-3 py-2">{w.row || "-"}</td>
                  <td className="px-3 py-2">{w.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {result?.duplicate_payments?.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Duplicate Payments
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2">Row</th>
                <th className="px-3 py-2">Dedupe Key</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.duplicate_payments.slice(0, 200).map((d, i) => (
                <tr key={`${d.row}-${d.dedupe_key}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="px-3 py-2">{d.row || "-"}</td>
                  <td className="px-3 py-2 break-all">{d.dedupe_key || "-"}</td>
                  <td className="px-3 py-2">{d.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
