import { useState, useEffect, useRef } from "react";
import { ControlDropdown } from "../components/controls";
import { formatInrFromPaise, formatIstDate } from "../utils/formatters";
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
  CheckCircle,
  Trash2,
  Briefcase,
} from "lucide-react";
import { LEAD_OWNER_OPTIONS } from "../utils/constants";

export function MonthViewTab({
  rows,
  mandateStatuses,
  setEditDraft,
  setNotice,
  handleFinalize,
  handleSendAgreement,
  handleDeleteCandidate,
  handleTagRecruitment,
  savingEnrollmentId,
  sendingAgreementEnrollmentId,
  batches = [],
  handleChangeCandidateBatch,
  updatingBatchEnrollmentId,
  monthSortBy,
  monthSortOrder,
  setMonthSortBy,
  setMonthSortOrder,
  monthLeadOwnerFilter,
  setMonthLeadOwnerFilter,
}) {
  const [copiedEnrollmentId, setCopiedEnrollmentId] = useState("");
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
      if (monthSortBy === "created_at") {
        setMonthSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setMonthSortBy("created_at");
        setMonthSortOrder("desc");
      }
    } else {
      if (monthSortBy === field) {
        if (monthSortOrder === "desc") {
          setMonthSortOrder("asc");
        } else {
          setMonthSortBy("created_at");
          setMonthSortOrder("desc");
        }
      } else {
        setMonthSortBy(field);
        setMonthSortOrder("desc");
      }
    }
  };

  const renderSortIcon = (field) => {
    if (monthSortBy === field) {
      return monthSortOrder === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-slate-800" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-slate-800" />
      );
    }
    return (
      <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        <ControlDropdown
          value={monthLeadOwnerFilter}
          onChange={setMonthLeadOwnerFilter}
          options={[{ value: "", label: "All Lead Owners" }, ...LEAD_OWNER_OPTIONS]}
          placeholder="Filter by lead owner"
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
                  {renderSortIcon("student_name")}
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
                  {renderSortIcon("candidate_id")}
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
                  {renderSortIcon("student_phone")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("student_email")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Email</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("student_email")}
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
                  {renderSortIcon("batch_name")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("created_at")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Enrollment Date</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("created_at")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("paid_paise")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Month Paid</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("paid_paise")}
                </span>
              </div>
            </th>
            <th
              onClick={() => handleSort("status")}
              className="px-2 py-2 cursor-pointer select-none hover:bg-slate-100/50 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Status</span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {renderSortIcon("status")}
                </span>
              </div>
            </th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                No candidates found for this month.
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
                      onChange={(val) => handleChangeCandidateBatch?.(r.enrollment_id, val)}
                      options={[
                        { value: "", label: "Unassigned" },
                        ...batches.map((b) => ({ value: b.batch_id, label: b.batch_name })),
                      ]}
                      placeholder="Select Batch"
                      compact
                      fixedMenu
                      disabled={updatingBatchEnrollmentId === r.enrollment_id}
                    />
                  </div>
                </td>
                <td className="px-2 py-2">{formatIstDate(r.created_at)}</td>
                <td className="px-2 py-2">{formatInrFromPaise(r.paid_paise)}</td>
                <td className="px-2 py-2">
                  {r.lifecycle_state === "dropped" ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      Dropped
                    </span>
                  ) : r.status === "archived" || r.lifecycle_state === "archived" ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      Rejected
                    </span>
                  ) : r.status === "refunded" || r.lifecycle_state === "refunded" ? (
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
                  ) : r.status === "finalized" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Finalized
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  )}
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

                    {r.notes?.candidate_type === "recruitment" && (
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                        Recruitment
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

                          {/* 2. Send / Resend Agreement */}
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

                          {/* 3. Copy Signing Link (if available) */}
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

                          {/* 4. View Signed Agreement (if signed) */}
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

                          {/* 5. Finalize Candidate (if pending) */}
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

                          {/* 6. Tag as Recruitment (if not yet recruitment) */}
                          {r.notes?.candidate_type !== "recruitment" &&
                            r.status !== "archived" &&
                            r.lifecycle_state !== "archived" && (
                              <button
                                type="button"
                                disabled={savingEnrollmentId === r.enrollment_id}
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleTagRecruitment?.(r.enrollment_id, r.student_name);
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors text-left disabled:opacity-50 cursor-pointer"
                              >
                                <Briefcase size={13} className="text-indigo-600" />
                                <span>Tag as Recruitment</span>
                              </button>
                            )}

                          <div className="my-1 border-t border-slate-100" />

                          {/* 7. Delete Candidate (Danger) */}
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
    </div>
  );
}
