import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Search,
  Building2,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { exploreCandidatesAdminApi } from "../../../api/exploreCandidatesAdminApi";
import {
  PageCard,
  StatCard,
  TableWrapper,
  TableHead,
  TableBody,
  PaginationBar,
  Spinner,
} from "../components/common";
import {
  PrimaryButton,
  SecondaryButton,
  ActionButton,
  SearchInput,
} from "../components/controls";
import { ConfirmationModal } from "../components/ConfirmationModal";
import {
  ACCESS_REQUEST_STATUS_FILTERS,
  ACCESS_REQUEST_STATUS_STYLES,
} from "../utils/constants";
import { formatIstDateTime } from "../utils/formatters";

export function AccessRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    description: "",
    variant: "danger",
    input: false,
    inputLabel: "",
    inputPlaceholder: "",
    defaultValue: "",
    confirmText: "Confirm",
    onConfirm: null,
    loading: false,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await exploreCandidatesAdminApi.listAccessRequests({
        status: statusFilter,
        search: appliedSearch,
      });
      setRequests(res?.data?.data || []);
      setCounts(
        res?.data?.counts || { pending: 0, approved: 0, declined: 0 },
      );
    } catch (err) {
      setRequests([]);
      setError(
        err?.response?.data?.message || "Could not load access requests",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setPage(1);
  }, [statusFilter, appliedSearch]);

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, page, pageSize]);

  function review(request, action) {
    if (action === "decline") {
      setConfirmModal({
        open: true,
        title: "Decline Platform Access",
        description: `Decline platform access for "${request.email}"?${
          request.account_id
            ? "\n\nTheir linked recruiter account will be deactivated."
            : ""
        }`,
        variant: "danger",
        confirmText: "Decline Access",
        input: true,
        inputLabel: "Optional Review Note",
        inputPlaceholder: "e.g. Verification pending",
        defaultValue: "",
        onConfirm: async (note) => {
          setConfirmModal((v) => ({ ...v, loading: true }));
          try {
            await exploreCandidatesAdminApi.reviewAccessRequest(request.id, {
              action: "decline",
              note: (note || "").trim(),
            });
            await load();
            toast.success(`Access request for "${request.email}" declined`);
            setConfirmModal((v) => ({ ...v, open: false, loading: false }));
          } catch (err) {
            toast.error(
              err?.response?.data?.message || "Could not update access request",
            );
            setConfirmModal((v) => ({ ...v, loading: false }));
          }
        },
      });
    } else {
      const override = request.status === "declined";
      setConfirmModal({
        open: true,
        title: override ? "Override & Approve Access" : "Approve Access",
        description: `${override ? "Override the decline and approve" : "Approve"} access for "${request.email}"?\n\nTheir recruiter account will be ${
          override ? "re-activated" : "created"
        } and they can sign in with an email code.`,
        variant: "primary",
        confirmText: "Approve Access",
        input: false,
        onConfirm: async () => {
          setConfirmModal((v) => ({ ...v, loading: true }));
          try {
            await exploreCandidatesAdminApi.reviewAccessRequest(request.id, {
              action: "approve",
            });
            await load();
            toast.success(`Access granted for "${request.email}"`);
            setConfirmModal((v) => ({ ...v, open: false, loading: false }));
          } catch (err) {
            toast.error(
              err?.response?.data?.message || "Could not update access request",
            );
            setConfirmModal((v) => ({ ...v, loading: false }));
          }
        },
      });
    }
  }

  const busy = reviewing !== null;
  const totalRequests = counts.pending + counts.approved + counts.declined;

  return (
    <div className="space-y-8">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={totalRequests}
          subtext="Lifetime sign-in requests"
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="Awaiting Action"
          value={counts.pending || 0}
          subtext="Awaiting admin approval"
          icon={ShieldAlert}
          color="amber"
        />
        <StatCard
          label="Approved Accounts"
          value={counts.approved || 0}
          subtext="Access granted"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          label="Declined"
          value={counts.declined || 0}
          subtext="Access denied / revoked"
          icon={XCircle}
          color="rose"
        />
      </div>

      {/* Filter Toolbar */}
      <PageCard
        title="Recruiter Access Requests"
        description="Review sign-in access requests from recruiters. Approving creates or reactivates their corporate recruiter portal."
        actions={
          <Link to="/admin/explore-candidates">
            <SecondaryButton icon={Building2}>Recruiter Accounts</SecondaryButton>
          </Link>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {ACCESS_REQUEST_STATUS_FILTERS.map((filter) => {
              const count = filter.key
                ? counts[filter.key] ?? 0
                : totalRequests;
              const isActive = statusFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                    isActive
                      ? "bg-[#083262] text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="w-full sm:w-72">
            <SearchInput
              value={searchInput}
              onChange={(val) => {
                setSearchInput(val);
                setAppliedSearch(val.trim());
              }}
              placeholder="Search by recruiter email..."
              onClear={() => {
                setSearchInput("");
                setAppliedSearch("");
              }}
            />
          </div>
        </div>
      </PageCard>

      {/* Requests Table */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Spinner size="md" color="text-[#083262]" />
            <span className="text-xs font-bold">Loading access requests...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Recruiter Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Requests</th>
                <th className="px-6 py-4">Last Requested (IST)</th>
                <th className="px-6 py-4">Reviewed By</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {!requests.length ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={6}>
                    No access requests found matching this filter.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4.5 align-middle">
                      <div className="font-bold text-slate-900">
                        {request.email}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold capitalize ${
                          ACCESS_REQUEST_STATUS_STYLES[request.status] ||
                          "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 align-middle font-bold text-slate-700">
                      {request.request_count || 0}
                    </td>
                    <td className="px-6 py-4.5 align-middle text-slate-500 font-medium">
                      {formatIstDateTime(request.last_requested_at)}
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      {request.reviewed_by ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800">
                            {request.reviewed_by}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatIstDateTime(request.reviewed_at)}
                          </div>
                          {request.review_note && (
                            <div className="text-xs italic text-slate-500 mt-0.5">
                              &ldquo;{request.review_note}&rdquo;
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {request.status !== "approved" && (
                          <ActionButton
                            variant="success"
                            disabled={busy}
                            icon={Check}
                            onClick={() => review(request, "approve")}
                          >
                            {reviewing?.id === request.id &&
                            reviewing?.action === "approve" ? (
                              <Spinner size="sm" color="text-emerald-700" />
                            ) : null}
                            {request.status === "declined"
                              ? "Override & Approve"
                              : "Approve"}
                          </ActionButton>
                        )}
                        {request.status !== "declined" && (
                          <ActionButton
                            variant="danger"
                            disabled={busy}
                            icon={X}
                            onClick={() => review(request, "decline")}
                          >
                            {reviewing?.id === request.id &&
                            reviewing?.action === "decline" ? (
                              <Spinner size="sm" color="text-rose-700" />
                            ) : null}
                            {request.status === "approved"
                              ? "Revoke Access"
                              : "Decline"}
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </TableBody>
          </TableWrapper>
        )}

        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={requests.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      </div>

      <ConfirmationModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        input={confirmModal.input}
        inputLabel={confirmModal.inputLabel}
        inputPlaceholder={confirmModal.inputPlaceholder}
        defaultValue={confirmModal.defaultValue}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((v) => ({ ...v, open: false, loading: false }))}
      />
    </div>
  );
}
