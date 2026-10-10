import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  FileText,
  FilePlus2,
} from "lucide-react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { ControlButton } from "../components/controls";
import {
  formatInrFromPaise,
  formatIstDate,
  formatIstDateTime,
} from "../utils/formatters";

const AUTOPAY_STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  authenticated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  canceled: "bg-slate-100 text-slate-600 border-slate-200",
  refunded: "bg-amber-50 text-amber-700 border-amber-200",
  disputed: "bg-rose-50 text-rose-700 border-rose-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  halted: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status, enabled }) {
  const label = status || "none";
  const tone =
    AUTOPAY_STATUS_STYLE[label.toLowerCase()] ||
    "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}
      >
        {label}
      </span>
      {!enabled && label !== "none" ? (
        <span className="text-[10px] text-slate-400">(disabled)</span>
      ) : null}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const tone =
    AUTOPAY_STATUS_STYLE[String(status || "").toLowerCase()] ||
    "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}
    >
      {status || "-"}
    </span>
  );
}

export function SubscriptionViewTab({
  rows,
  subscriptionSortBy,
  subscriptionSortOrder,
  setSubscriptionSortBy,
  setSubscriptionSortOrder,
  subscriptionTotalPaise,
  pagination,
  setCurrentPage,
  setNotice,
  loadTabData,
}) {
  const [detailUserId, setDetailUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invoiceBusyId, setInvoiceBusyId] = useState("");
  const [pdfPreview, setPdfPreview] = useState(null);
  const [detailError, setDetailError] = useState("");

  const handleSort = (field) => {
    setCurrentPage(1);
    if (subscriptionSortBy === field) {
      setSubscriptionSortOrder(subscriptionSortOrder === "asc" ? "desc" : "asc");
    } else {
      setSubscriptionSortBy(field);
      setSubscriptionSortOrder(field === "subscriber_name" ? "asc" : "desc");
    }
  };

  const renderSortIcon = (field) => {
    if (subscriptionSortBy === field) {
      return subscriptionSortOrder === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
      );
    }
    return (
      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  };

  const openDetail = (row) => {
    if (!row?.user_id) return;
    setDetailUserId(row.user_id);
  };

  useEffect(() => {
    if (!detailUserId) {
      setDetail(null);
      return;
    }
    let mounted = true;
    setDetailLoading(true);
    setDetailError("");
    paymentsAdminApi
      .getSubscriptionUserDetail(detailUserId)
      .then((res) => {
        if (mounted) setDetail(res.data || null);
      })
      .catch((err) => {
        if (mounted)
          setDetailError(
            err?.response?.data?.msg || "Failed to load subscription details",
          );
      })
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [detailUserId]);

  const handleGenerateInvoice = async (paymentId) => {
    setInvoiceBusyId(paymentId);
    setDetailError("");
    try {
      await paymentsAdminApi.createSubscriptionInvoice(paymentId);
      const res = await paymentsAdminApi.getSubscriptionUserDetail(detailUserId);
      setDetail(res.data || null);
      setNotice?.("Invoice generated");
      loadTabData?.(true);
    } catch (err) {
      setDetailError(
        err?.response?.data?.msg || "Failed to generate invoice",
      );
    } finally {
      setInvoiceBusyId("");
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    setInvoiceBusyId(`view-${invoiceId}`);
    setDetailError("");
    try {
      const res = await paymentsAdminApi.getSubscriptionInvoicePdf(invoiceId);
      setPdfPreview({
        invoiceNumber: res.data.invoice_number,
        pdfBase64: res.data.pdf_base64,
      });
    } catch (err) {
      setDetailError(err?.response?.data?.msg || "Failed to load invoice PDF");
    } finally {
      setInvoiceBusyId("");
    }
  };

  const user = detail?.user || null;
  const payments = detail?.payments || [];
  const summary = detail?.summary || null;

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <span>
          {pagination?.total ?? (rows || []).length} subscriber
          {(pagination?.total ?? (rows || []).length) === 1 ? "" : "s"}
        </span>
        <span>·</span>
        <span className="font-semibold text-slate-700">
          {formatInrFromPaise(subscriptionTotalPaise || 0)} charged
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              {[
                ["subscriber_name", "Subscriber"],
                [null, "Phone"],
                [null, "Method"],
                ["charged_paise", "Charged"],
                ["autopay_status", "Autopay"],
                ["next_billing_at", "Next Billing"],
                ["last_charged_at", "Last Charged"],
                [null, "Invoice"],
              ].map(([field, label]) => (
                <th
                  key={label}
                  onClick={field ? () => handleSort(field) : undefined}
                  className={`px-4 py-2 ${field ? "cursor-pointer select-none hover:bg-slate-100/50 transition-colors group" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    {field ? (
                      <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                        {renderSortIcon(field)}
                      </span>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr
                key={r.user_id}
                onClick={() => openDetail(r)}
                className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer"
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-800">
                    {r.subscriber_name || "-"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.subscriber_email || ""}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {r.subscriber_phone || "-"}
                </td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">
                  {r.autopay_payment_method || "-"}
                </td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">
                  {formatInrFromPaise(r.charged_paise)}
                  {r.charge_count > 1 ? (
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      ×{r.charge_count}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    status={r.autopay_status}
                    enabled={r.autopay_enabled}
                  />
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {r.next_billing_at ? formatIstDate(r.next_billing_at) : "-"}
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {formatIstDateTime(r.last_charged_at)}
                </td>
                <td className="px-4 py-2.5">
                  {r.has_invoice ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                      <FileText size={11} /> Issued
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailUserId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {detailLoading
                    ? "Loading…"
                    : user?.subscriber_name || "Subscriber"}
                </h3>
                {user ? (
                  <div className="mt-0.5 text-xs text-slate-500">
                    {user.subscriber_email || "-"}
                    {user.subscriber_phone
                      ? ` · ${user.subscriber_phone}`
                      : ""}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setDetailUserId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {detailError ? (
              <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                {detailError}
              </div>
            ) : null}

            {detailLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Loading subscription details…
              </div>
            ) : user ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Autopay
                    </div>
                    <div className="mt-1">
                      <StatusBadge
                        status={user.autopay_status}
                        enabled={user.autopay_enabled}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Next Billing
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {user.next_billing_at
                        ? formatIstDate(user.next_billing_at)
                        : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Total Paid
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {formatInrFromPaise(summary?.total_paid_paise || 0)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Charges
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {summary?.charge_count || 0}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  Method:{" "}
                  <span className="capitalize text-slate-600">
                    {user.autopay_payment_method || "-"}
                  </span>
                  {user.razorpay_subscription_id ? (
                    <>
                      {" "}· Subscription:{" "}
                      <span className="text-slate-600">
                        {user.razorpay_subscription_id}
                      </span>
                    </>
                  ) : null}
                </div>

                <table className="mt-4 min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-3">Paid At</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Method</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.payment_id} className="border-b border-slate-100">
                        <td className="py-2.5 pr-3 text-slate-600">
                          {formatIstDateTime(p.created_at)}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-slate-800">
                          {formatInrFromPaise(p.amount_paise)}
                          {p.refund_amount_paise ? (
                            <span className="ml-1 text-[11px] font-medium text-amber-600">
                              −{formatInrFromPaise(p.refund_amount_paise)}{" "}
                              refund
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 capitalize text-slate-600">
                          {p.method || "-"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <PaymentStatusBadge status={p.status} />
                        </td>
                        <td className="py-2.5 pr-3">
                          {p.invoice_id ? (
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(p.invoice_id)}
                              disabled={invoiceBusyId === `view-${p.invoice_id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                            >
                              <FileText size={11} />
                              {invoiceBusyId === `view-${p.invoice_id}`
                                ? "…"
                                : p.invoice_number}
                            </button>
                          ) : p.status === "success" ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleGenerateInvoice(p.payment_id)
                              }
                              disabled={invoiceBusyId === p.payment_id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              <FilePlus2 size={11} />
                              {invoiceBusyId === p.payment_id
                                ? "Generating…"
                                : "Generate Invoice"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-xs text-slate-400"
                        >
                          No payments recorded for this subscriber.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {pdfPreview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">
                Invoice {pdfPreview.invoiceNumber}
              </div>
              <ControlButton
                variant="secondary"
                className="h-8 px-3 text-xs"
                onClick={() => setPdfPreview(null)}
              >
                Close
              </ControlButton>
            </div>
            <iframe
              title={`Invoice ${pdfPreview.invoiceNumber}`}
              src={`data:application/pdf;base64,${pdfPreview.pdfBase64}`}
              className="h-full w-full flex-1"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
