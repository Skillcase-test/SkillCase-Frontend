import { useState } from "react";
import { ActionChip, ControlDropdown } from "../components/controls";
import { StatCard } from "../components/common";
import { formatInrFromPaise, formatIstDateTime } from "../utils/formatters";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export function RecruitmentViewTab({
  rows,
  setEditDraft,
  handleFinalize,
  handleSendAgreement,
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

  const handleCopyLink = (enrollmentId, url) => {
    navigator.clipboard.writeText(url).then(() => {
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
                  <td className="px-3 py-3">{r.student_name || "-"}</td>
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
                    {r.status === "pending" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    ) : (
                      <div className="w-32">
                        <ControlDropdown
                          value={String(
                            r.lifecycle_state || r.status || "",
                          ).toLowerCase()}
                          onChange={(val) =>
                            handleChangeCandidateStatus?.(r, val)
                          }
                          placeholder="Status"
                          compact
                          fixedMenu
                          disabled={
                            updatingBatchEnrollmentId === r.enrollment_id ||
                            String(
                              r.lifecycle_state || r.status || "",
                            ).toLowerCase() === "refunded"
                          }
                          options={(() => {
                            const s = String(
                              r.lifecycle_state || r.status || "",
                            ).toLowerCase();
                            const opts = [
                              {
                                value: s,
                                label:
                                  s === "on_hold"
                                    ? "On Hold"
                                    : s === "archived"
                                      ? "Rejected"
                                      : s === "refunded"
                                        ? "Refunded"
                                        : s.charAt(0).toUpperCase() +
                                          s.slice(1),
                              },
                            ];

                            if (s === "dropped" || s === "archived") {
                              opts.push({ value: "active", label: "Active" });
                            } else if (s === "on_hold") {
                              opts.push({ value: "active", label: "Active" });
                              opts.push({ value: "dropped", label: "Dropped" });
                            } else if (
                              s === "active" ||
                              s === "pending" ||
                              s === "completed" ||
                              s === "finalized"
                            ) {
                              opts.push({ value: "on_hold", label: "On Hold" });
                              opts.push({ value: "dropped", label: "Dropped" });
                              if (s !== "completed") {
                                opts.push({
                                  value: "completed",
                                  label: "Completed",
                                });
                              }
                              if (s === "completed") {
                                opts.push({ value: "active", label: "Active" });
                              }
                            }
                            return opts;
                          })()}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {formatInrFromPaise(r.paid_total_paise)}
                  </td>
                  <td className="px-2 py-2">
                    {r.last_paid_at ? formatIstDateTime(r.last_paid_at) : "-"}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <ActionChip
                        onClick={() =>
                          setEditDraft({
                            ...r,
                            total_fee_inr: r?.notes?.total_fee_inr || 60000,
                            monthly_fee_inr: r?.notes?.monthly_fee_inr || 6000,
                            ...(r.notes || {}),
                          })
                        }
                      >
                        Details
                      </ActionChip>
                      {r.status !== "archived" &&
                        r.lifecycle_state !== "archived" &&
                        (() => {
                          const agreementState =
                            r.agreement_state || "not_sent";
                          const isSending =
                            sendingAgreementEnrollmentId === r.enrollment_id;

                          if (agreementState === "not_sent") {
                            return (
                              <ActionChip
                                onClick={() => handleSendAgreement?.(r)}
                                disabled={isSending}
                              >
                                {isSending ? "Sending..." : "Send Agreement"}
                              </ActionChip>
                            );
                          }

                          if (agreementState === "sent") {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                  Sent
                                </span>
                                {r.agreement_signing_url && (
                                  <ActionChip
                                    onClick={() =>
                                      handleCopyLink(
                                        r.enrollment_id,
                                        r.agreement_signing_url,
                                      )
                                    }
                                    variant={
                                      copiedEnrollmentId === r.enrollment_id
                                        ? "success"
                                        : "secondary"
                                    }
                                  >
                                    {copiedEnrollmentId === r.enrollment_id
                                      ? "Copied"
                                      : "Copy Link"}
                                  </ActionChip>
                                )}
                                <ActionChip
                                  onClick={() => handleSendAgreement?.(r)}
                                  disabled={isSending}
                                >
                                  {isSending ? "Sending..." : "Resend"}
                                </ActionChip>
                              </div>
                            );
                          }

                          if (agreementState === "viewed") {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  Viewed
                                </span>
                                {r.agreement_signing_url && (
                                  <ActionChip
                                    onClick={() =>
                                      handleCopyLink(
                                        r.enrollment_id,
                                        r.agreement_signing_url,
                                      )
                                    }
                                    variant={
                                      copiedEnrollmentId === r.enrollment_id
                                        ? "success"
                                        : "secondary"
                                    }
                                  >
                                    {copiedEnrollmentId === r.enrollment_id
                                      ? "Copied"
                                      : "Copy Link"}
                                  </ActionChip>
                                )}
                                <ActionChip
                                  onClick={() => handleSendAgreement?.(r)}
                                  disabled={isSending}
                                >
                                  {isSending ? "Sending..." : "Resend"}
                                </ActionChip>
                              </div>
                            );
                          }

                          if (agreementState === "signed") {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                  Signed
                                </span>
                                <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-700/10">
                                  Pending Details
                                </span>
                                {r.agreement_signed_url && (
                                  <ActionChip
                                    onClick={() =>
                                      window.open(
                                        r.agreement_signed_url,
                                        "_blank",
                                      )
                                    }
                                    variant="secondary"
                                  >
                                    View
                                  </ActionChip>
                                )}
                                {r.agreement_signing_url && (
                                  <ActionChip
                                    onClick={() =>
                                      handleCopyLink(
                                        r.enrollment_id,
                                        r.agreement_signing_url,
                                      )
                                    }
                                    variant={
                                      copiedEnrollmentId === r.enrollment_id
                                        ? "success"
                                        : "secondary"
                                    }
                                  >
                                    {copiedEnrollmentId === r.enrollment_id
                                      ? "Copied"
                                      : "Copy Link"}
                                  </ActionChip>
                                )}
                              </div>
                            );
                          }

                          if (agreementState === "details_viewed") {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                  Signed
                                </span>
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  Details Viewed
                                </span>
                                {r.agreement_signed_url && (
                                  <ActionChip
                                    onClick={() =>
                                      window.open(
                                        r.agreement_signed_url,
                                        "_blank",
                                      )
                                    }
                                    variant="secondary"
                                  >
                                    View
                                  </ActionChip>
                                )}
                                {r.agreement_signing_url && (
                                  <ActionChip
                                    onClick={() =>
                                      handleCopyLink(
                                        r.enrollment_id,
                                        r.agreement_signing_url,
                                      )
                                    }
                                    variant={
                                      copiedEnrollmentId === r.enrollment_id
                                        ? "success"
                                        : "secondary"
                                    }
                                  >
                                    {copiedEnrollmentId === r.enrollment_id
                                      ? "Copied"
                                      : "Copy Link"}
                                  </ActionChip>
                                )}
                              </div>
                            );
                          }

                          if (agreementState === "details_filled") {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 animate-pulse">
                                  Details Filled
                                </span>
                                {r.agreement_signed_url && (
                                  <ActionChip
                                    onClick={() =>
                                      window.open(
                                        r.agreement_signed_url,
                                        "_blank",
                                      )
                                    }
                                    variant="secondary"
                                  >
                                    View
                                  </ActionChip>
                                )}
                              </div>
                            );
                          }

                          return null;
                        })()}
                      {r.status === "pending" && (
                        <ActionChip
                          onClick={() => handleFinalize(r)}
                          disabled={savingEnrollmentId === r.enrollment_id}
                          variant="success"
                        >
                          Finalize
                        </ActionChip>
                      )}
                      <ActionChip
                        onClick={() => {
                          if (
                            window.confirm(
                              "Data for this candidate will be vanished. Are you sure?",
                            )
                          ) {
                            handleDeleteCandidate?.(r.enrollment_id);
                          }
                        }}
                        disabled={savingEnrollmentId === r.enrollment_id}
                        variant="danger"
                      >
                        Delete
                      </ActionChip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
