import { useState, useEffect, useRef } from "react";
import { ActionChip, ControlDropdown } from "../components/controls";
import { StatCard } from "../components/common";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Edit,
  Send,
  Copy,
  Check,
  ExternalLink,
  Link as LinkIcon,
  CheckCircle,
  Trash2,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";

export function RecruitmentViewTab({
  rows,
  mandateStatuses,
  setEditDraft,
  setNotice,
  handleFinalize,
  handleSendAgreement,
  handleGenerateDetailsLink,
  handleDeleteCandidate,
  savingEnrollmentId,
  sendingAgreementEnrollmentId,
  batches = [],
  handleChangeCandidateBatch,
  handleChangeCandidateStatus,
  updatingBatchEnrollmentId,
  allSummary,
  allStatusFilter,
  setAllStatusFilter,
  allBatchFilter,
  setAllBatchFilter,
  allSortBy,
  allSortOrder,
  setAllSortBy,
  setAllSortOrder,
}) {
  const [copiedEnrollmentId, setCopiedEnrollmentId] = useState("");
  const [receiptCandidate, setReceiptCandidate] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActiveActionMenuId(null);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setActiveActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleCopyLink = (enrollmentId, url, studentName) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedEnrollmentId(enrollmentId);
      setNotice?.(`Agreement link for ${studentName || "candidate"} copied to clipboard!`);
      setTimeout(() => setCopiedEnrollmentId(""), 2500);
      setTimeout(() => setActiveActionMenuId(null), 600);
    }).catch(() => {
      setCopiedEnrollmentId(enrollmentId);
      setTimeout(() => setCopiedEnrollmentId(""), 2000);
    });
  };

  const handleSort = (field) => {
    if (field === "created_at") {
      if (allSortBy === "created_at") {
        setAllSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setAllSortBy("created_at");
        setAllSortOrder("desc");
      }
    } else {
      if (allSortBy === field) {
        if (allSortOrder === "desc") {
          setAllSortOrder("asc");
        } else {
          setAllSortBy("created_at");
          setAllSortOrder("desc");
        }
      } else {
        setAllSortBy(field);
        setAllSortOrder("desc");
      }
    }
  };

  const batchOptions = [
    { value: "", label: "All Batches" },
    ...batches.map((b) => ({ value: b.batch_id, label: b.batch_name })),
  ];
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "dropped", label: "Dropped" },
    { value: "completed", label: "Completed" },
    { value: "pending", label: "Pending" },
    { value: "finalized", label: "Finalized" },
    { value: "refunded", label: "Refunded" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Total Recruits"
          value={allSummary?.total_enrollments || 0}
        />
        <StatCard
          label="Active Recruits"
          value={allSummary?.total_active || 0}
          tone="emerald"
        />
        <StatCard
          label="Dropped Recruits"
          value={allSummary?.total_dropped || 0}
          tone="amber"
        />
        <StatCard
          label="Hold Recruits"
          value={allSummary?.total_hold || 0}
          tone="blue"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <ControlDropdown
          value={allStatusFilter}
          onChange={setAllStatusFilter}
          options={statusOptions}
          placeholder="Filter by status"
        />
        <ControlDropdown
          value={allBatchFilter}
          onChange={setAllBatchFilter}
          options={batchOptions}
          placeholder="Filter by batch"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th
                onClick={() => handleSort("student_name")}
                className="px-3 py-3 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Name</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "student_name" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("candidate_id")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Candidate ID</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "candidate_id" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("student_phone")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Phone</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "student_phone" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("student_email")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Email</span>
                  <span className="text-slate-400 group-hover:text-slate-650 transition-colors">
                    {allSortBy === "student_email" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("batch_name")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Batch</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "batch_name" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th className="px-2 py-2">Status</th>
              <th
                onClick={() => handleSort("paid_total_paise")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Paid Total</span>
                  <span className="text-slate-400 group-hover:text-slate-650 transition-colors">
                    {allSortBy === "paid_total_paise" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("last_paid_at")}
                className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Last Paid</span>
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {allSortBy === "last_paid_at" ? (
                      allSortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No recruitment candidates found.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={r.enrollment_id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-800">{r.student_name || "-"}</span>
                      {mandateStatuses?.[r.enrollment_id]?.status === "activated" && (
                        <span
                          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
                          title="eMandate Active"
                        >
                          <Check size={11} strokeWidth={3.5} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span className="font-mono text-xs text-slate-700">
                      {r.notes?.candidate_id || "-"}
                    </span>
                  </td>
                  <td className="px-2 py-2">{r.student_phone || "-"}</td>
                  <td className="px-2 py-2">{r.student_email || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="w-40">
                      <ControlDropdown
                        value={r.batch_id || ""}
                        onChange={(val) =>
                          handleChangeCandidateBatch?.(r.enrollment_id, val)
                        }
                        options={[
                          { value: "", label: "Unassigned" },
                          ...batches.map((b) => ({
                            value: b.batch_id,
                            label: b.batch_name,
                          })),
                        ]}
                        placeholder="Select Batch"
                        compact
                        fixedMenu
                        disabled={updatingBatchEnrollmentId === r.enrollment_id}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {r.lifecycle_state === "dropped" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        Dropped
                      </span>
                    ) : r.status === "archived" ||
                      r.lifecycle_state === "archived" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        Rejected
                      </span>
                    ) : r.status === "refunded" ||
                      r.lifecycle_state === "refunded" ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        Refunded
                      </span>
                    ) : r.lifecycle_state === "on_hold" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        On Hold
                      </span>
                    ) : r.lifecycle_state === "completed" ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        Completed
                      </span>
                    ) : r.lifecycle_state === "active" ||
                      r.status === "finalized" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {formatInrFromPaise(r.paid_total_paise)}
                  </td>
                  <td className="px-2 py-2">
                    {r.last_paid_at ? formatIstDateTime(r.last_paid_at) : "-"}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Read-only status pills */}
                      {r.agreement_state === "sent" && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">
                          Sent
                        </span>
                      )}
                      {r.agreement_state === "viewed" && (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          Viewed
                        </span>
                      )}
                      {r.agreement_state === "signed" && (
                        <>
                          <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                            Signed
                          </span>
                          <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-700/10">
                            Pending Details
                          </span>
                        </>
                      )}
                      {r.agreement_state === "details_viewed" && (
                        <>
                          <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                            Signed
                          </span>
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                            Details Viewed
                          </span>
                        </>
                      )}
                      {r.agreement_state === "details_filled" && (
                        <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 animate-pulse">
                          Details Filled
                        </span>
                      )}

                      {/* Consolidated Actions Dropdown */}
                      <div
                        className="relative inline-block text-left"
                        ref={activeActionMenuId === r.enrollment_id ? actionMenuRef : null}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveActionMenuId(
                              activeActionMenuId === r.enrollment_id ? null : r.enrollment_id,
                            )
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
                            copiedEnrollmentId === r.enrollment_id
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {copiedEnrollmentId === r.enrollment_id ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <span>Actions</span>
                              <ChevronDown
                                size={13}
                                className={`transition-transform duration-150 ${
                                  activeActionMenuId === r.enrollment_id ? "rotate-180" : ""
                                }`}
                              />
                            </>
                          )}
                        </button>

                        {activeActionMenuId === r.enrollment_id && (
                          <div className="absolute right-0 top-full z-50 mt-1.5 w-52 origin-top-right rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5">
                            {/* 1. Edit Details */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setEditDraft({
                                  ...r,
                                  total_fee_inr: r?.notes?.total_fee_inr || 60000,
                                  monthly_fee_inr: r?.notes?.monthly_fee_inr || 6000,
                                  ...(r.notes || {}),
                                });
                              }}
                              className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
                            >
                              <Edit size={13} className="text-slate-400" />
                              <span>Edit Details</span>
                            </button>

                            {/* 2. Receipts Modal */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setReceiptCandidate(r);
                              }}
                              className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
                            >
                              <FileText size={13} className="text-slate-400" />
                              <span>Receipts</span>
                            </button>

                            {/* 3. Send / Resend Agreement */}
                            {r.status !== "archived" &&
                              r.lifecycle_state !== "archived" &&
                              r.status !== "refunded" &&
                              r.lifecycle_state !== "refunded" && (
                                <button
                                  type="button"
                                  disabled={sendingAgreementEnrollmentId === r.enrollment_id}
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleSendAgreement?.(r);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left disabled:opacity-50 cursor-pointer"
                                >
                                  <Send size={13} className="text-slate-400" />
                                  <span>
                                    {sendingAgreementEnrollmentId === r.enrollment_id
                                      ? "Sending..."
                                      : r.agreement_state &&
                                        !["not_sent", "expired", "cancelled"].includes(
                                          r.agreement_state,
                                        )
                                      ? "Resend Agreement"
                                      : "Send Agreement"}
                                  </span>
                                </button>
                              )}

                            {/* 4. Copy Signing Link (if available) */}
                            {r.agreement_signing_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleCopyLink(r.enrollment_id, r.agreement_signing_url, r.student_name);
                                }}
                                className={`flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors text-left cursor-pointer ${
                                  copiedEnrollmentId === r.enrollment_id
                                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                              >
                                {copiedEnrollmentId === r.enrollment_id ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} className="text-slate-400" />
                                )}
                                <span>
                                  {copiedEnrollmentId === r.enrollment_id
                                    ? "Copied to Clipboard!"
                                    : "Copy Signing Link"}
                                </span>
                              </button>
                            )}

                            {/* 5. Generate Details Link (if signed via job screening and no signing url) */}
                            {r.agreement_state &&
                              ["signed", "details_viewed"].includes(r.agreement_state) &&
                              !r.agreement_signing_url && (
                                <button
                                  type="button"
                                  disabled={sendingAgreementEnrollmentId === r.enrollment_id}
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleGenerateDetailsLink?.(r);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left disabled:opacity-50 cursor-pointer"
                                  title="Agreement was signed via job screening, so this link skips the document and opens the details form."
                                >
                                  <LinkIcon size={13} className="text-slate-400" />
                                  <span>
                                    {sendingAgreementEnrollmentId === r.enrollment_id
                                      ? "Generating..."
                                      : "Generate Details Link"}
                                  </span>
                                </button>
                              )}

                            {/* 6. View Signed Agreement (if signed) */}
                            {r.agreement_signed_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  window.open(r.agreement_signed_url, "_blank");
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
                              >
                                <ExternalLink size={13} className="text-slate-400" />
                                <span>View Signed Agreement</span>
                              </button>
                            )}

                            {/* 7. Finalize Candidate (if pending) */}
                            {r.status === "pending" && (
                              <button
                                type="button"
                                disabled={savingEnrollmentId === r.enrollment_id}
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  const confirmed = window.confirm(
                                    `Are you sure you want to finalize candidate "${
                                      r.student_name || "this candidate"
                                    }"?`,
                                  );
                                  if (confirmed) {
                                    handleFinalize(r);
                                  }
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left disabled:opacity-50 cursor-pointer"
                              >
                                <CheckCircle size={13} className="text-emerald-600" />
                                <span>
                                  {savingEnrollmentId === r.enrollment_id
                                    ? "Finalizing..."
                                    : "Finalize Candidate"}
                                </span>
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-100" />

                            {/* 8. Delete Candidate (Danger) */}
                            <button
                              type="button"
                              disabled={savingEnrollmentId === r.enrollment_id}
                              onClick={() => {
                                setActiveActionMenuId(null);
                                if (
                                  window.confirm(
                                    `Data for candidate "${
                                      r.student_name || "this candidate"
                                    }" will be permanently deleted. Are you sure?`,
                                  )
                                ) {
                                  handleDeleteCandidate?.(r.enrollment_id);
                                }
                              }}
                              className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors text-left disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 size={13} className="text-rose-600" />
                              <span>Delete Candidate</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {receiptCandidate && (
        <ReceiptPaymentsModal
          candidate={receiptCandidate}
          onClose={() => setReceiptCandidate(null)}
        />
      )}
    </div>
  );
}

function ReceiptPaymentsModal({ candidate, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadCandidatePayments();
  }, [candidate.enrollment_id]);

  const loadCandidatePayments = async () => {
    setLoading(true);
    try {
      const res = await paymentsAdminApi.getCandidatePaymentsWithReceipts(
        candidate.enrollment_id,
      );
      setPayments(res.data.rows || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load candidate payments");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (paymentId) => {
    setActionLoading(paymentId);
    try {
      await paymentsAdminApi.generateReceipt({
        enrollment_id: candidate.enrollment_id,
        payment_id: paymentId,
        state: candidate.notes?.state || "Karnataka",
      });
      await loadCandidatePayments();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "Failed to generate receipt draft");
    } finally {
      setActionLoading(null);
    }
  };

  const handleView = async (receiptId) => {
    setActionLoading(receiptId);
    try {
      const res = await paymentsAdminApi.getReceiptPdf(receiptId);
      const base64 = res.data.pdf_base64;
      const binStr = window.atob(base64);
      const len = binStr.length;
      const arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
      }
      const blob = new Blob([arr], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error(err);
      alert("Failed to fetch receipt PDF preview");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async (receiptId) => {
    if (
      !window.confirm(
        `Are you sure you want to send this receipt email to ${candidate.student_email}?`,
      )
    ) {
      return;
    }
    setActionLoading(receiptId);
    try {
      await paymentsAdminApi.sendReceipt({ receipt_id: receiptId });
      await loadCandidatePayments();
      alert("Receipt sent successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "Failed to send receipt email");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDraft = async (receiptId) => {
    if (
      !window.confirm("Are you sure you want to delete this draft receipt?")
    ) {
      return;
    }
    setActionLoading(receiptId);
    try {
      await paymentsAdminApi.deleteReceiptDraft(receiptId);
      await loadCandidatePayments();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "Failed to delete receipt draft");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Receipt Generation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate:{" "}
              <span className="font-semibold text-slate-700">
                {candidate.student_name}
              </span>{" "}
              ({candidate.student_email || "No Email"})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <span className="text-sm text-slate-500 font-medium">
                Fetching transactions...
              </span>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No successful payments found for this candidate.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Paid Date</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-center">Receipt Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => {
                    const hasReceipt = !!p.receipt_id;
                    const isSent = p.receipt_status === "sent";
                    const isLoading =
                      !!actionLoading &&
                      (actionLoading === p.receipt_id ||
                        actionLoading === p.payment_id);

                    return (
                      <tr
                        key={p.payment_id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {p.paid_at ? formatIstDateTime(p.paid_at) : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {p.razorpay_payment_id || p.payment_id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {formatInrFromPaise(p.amount_paise)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.payment_method || "Online"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasReceipt ? (
                            isSent ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                                Draft
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-xs">
                              No Receipt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin mr-3" />
                            ) : !hasReceipt ? (
                              <ActionChip
                                onClick={() => handleGenerate(p.payment_id)}
                                variant="primary"
                              >
                                Generate
                              </ActionChip>
                            ) : (
                              <>
                                <ActionChip
                                  onClick={() => handleView(p.receipt_id)}
                                  variant="secondary"
                                >
                                  View
                                </ActionChip>
                                {!isSent && (
                                  <>
                                    <ActionChip
                                      onClick={() =>
                                        handleGenerate(p.payment_id)
                                      }
                                      variant="secondary"
                                    >
                                      Regenerate
                                    </ActionChip>
                                    <ActionChip
                                      onClick={() => handleSend(p.receipt_id)}
                                      variant="success"
                                    >
                                      Send
                                    </ActionChip>
                                    <button
                                      onClick={() =>
                                        handleDeleteDraft(p.receipt_id)
                                      }
                                      className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                      title="Delete Draft"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                {isSent && (
                                  <ActionChip
                                    onClick={() => handleSend(p.receipt_id)}
                                    variant="secondary"
                                  >
                                    Resend
                                  </ActionChip>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
