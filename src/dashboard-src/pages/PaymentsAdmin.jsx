import { RefreshCw, Search, ShieldOff } from "lucide-react";
import {
  EmptyState,
  StatCard,
  TableSkeleton,
} from "../payments-admin/components/common";
import {
  ActionChip,
  ControlButton,
  ControlInput,
  ControlSelect,
} from "../payments-admin/components/controls";
import { CandidateDetailsForm } from "../payments-admin/components/CandidateDetailsForm";
import { FeeBreakdownModal } from "../payments-admin/components/FeeBreakdownModal";
import { LifecycleActionModal } from "../payments-admin/components/LifecycleActionModal";
import { PaginationBar } from "../payments-admin/components/PaginationBar";
import { RejectDiscountModal } from "../payments-admin/components/RejectDiscountModal";
import { ManualPaymentModal } from "../payments-admin/components/ManualPaymentModal";
import { RelinkPaymentModal } from "../payments-admin/components/RelinkPaymentModal";
import { CopyAgreementModal } from "../payments-admin/components/CopyAgreementModal";
import { ImportPaymentsPage } from "../payments-admin/components/ImportPaymentsPage";
import { ImportCandidatesPage } from "../payments-admin/components/ImportCandidatesPage";
import { BookAmountModal } from "../payments-admin/components/BookAmountModal";
import { usePaymentsAdminActions } from "../payments-admin/hooks/usePaymentsAdminActions";
import { usePaymentsAdminSelectors } from "../payments-admin/hooks/usePaymentsAdminSelectors";
import { usePaymentsAdminState } from "../payments-admin/hooks/usePaymentsAdminState";
import { TabContent } from "../payments-admin/tabs/TabContent";
import { MONTH_NAMES, TABS } from "../payments-admin/utils/constants";
import { formatInrFromPaise } from "../payments-admin/utils/formatters";

export default function PaymentsAdmin() {
  const state = usePaymentsAdminState();
  const actions = usePaymentsAdminActions(state);
  const sel = usePaymentsAdminSelectors(state);

  // While access is being resolved, show a minimal loading state
  if (state.accessLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
        Loading payments panel...
      </div>
    );
  }

  // No permitted tabs — admin has not been granted payments access
  if (!state.permittedTabs || state.permittedTabs.size === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldOff className="h-10 w-10 text-slate-300" />
          <h1 className="text-lg font-bold text-slate-800">Access Denied</h1>
          <p className="max-w-sm text-sm text-slate-500">
            You do not have access to the Payments panel. Ask a super admin to
            grant you the required tab permissions.
          </p>
        </div>
      </div>
    );
  }

  // Only show tabs this admin is permitted to see
  const visibleTabs = TABS.filter((t) => state.permittedTabs.has(t.key));

  const searchable = {
    all: [
      state.allSearch,
      state.setAllSearch,
      "Search name/phone/email/ID/batch",
    ],
    month: [
      state.monthSearch,
      state.setMonthSearch,
      "Search name/phone/email/batch/status",
    ],
    batch: [
      state.batchSearch,
      state.setBatchSearch,
      state.activeBatchId
        ? "Search name/phone/status"
        : "Search batch/name/phone/status",
    ],
    fee: [state.feeSearch, state.setFeeSearch, "Search name/phone/due"],
    discounts: [
      state.discountSearch,
      state.setDiscountSearch,
      "Search candidate/type/status/reason",
    ],
    payments: [
      state.paymentSearch,
      state.setPaymentSearch,
      "Search name/phone/ID/payment/status",
    ],
    rawlogs: [
      state.rawSearch,
      state.setRawSearch,
      "Search event/type/status/ids",
    ],
    invoice: [
      state.allSearch,
      state.setAllSearch,
      "Search candidate name/phone/email",
    ],
  };
  const [q, setQ, qph] = searchable[state.tab] || ["", () => {}, ""];
  const isDataTableTab = [
    "all",
    "month",
    "fee",
    "discounts",
    "payments",
    "rawlogs",
    "invoice",
  ].includes(state.tab);

  const roleLabel =
    state.adminRole === "super_admin"
      ? "Super Admin"
      : state.adminRole === "admin"
        ? "Admin"
        : state.adminRole;

  if (state.isImportingPayments) {
    return (
      <ImportPaymentsPage
        onBack={() => state.setIsImportingPayments(false)}
        candidateOptions={state.candidateOptions}
        onImportSuccess={(msg) => {
          state.setNotice(msg);
          state.loadTabData();
          state.setIsImportingPayments(false);
        }}
      />
    );
  }

  if (state.isImportingCandidates) {
    return (
      <ImportCandidatesPage
        onBack={() => state.setIsImportingCandidates(false)}
        batches={state.batches}
        onImportSuccess={(msg) => {
          state.setNotice(msg);
          state.loadTabData();
          state.setIsImportingCandidates(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Skillcase Payments Admin
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Secure billing, reconciliation and invoice operations
            </p>
          </div>
          <div className="flex gap-2">
            {state.tab !== "overall" && (
              <div className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                <p className="text-[10px] uppercase opacity-70">Month</p>
                <p className="font-bold">
                  {state.tab === "payments" && state.paymentAllTime
                    ? "All Time"
                    : `${MONTH_NAMES[state.month]} ${state.year}`}
                </p>
              </div>
            )}
            <div className="rounded-xl bg-slate-900 px-4 py-2 text-white">
              <p className="text-[10px] uppercase opacity-70">Role</p>
              <p className="font-bold">{roleLabel}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTabs.map((t) => (
            <ActionChip
              key={t.key}
              onClick={() => state.setTab(t.key)}
              active={state.tab === t.key}
              className="h-10 rounded-full px-4 text-sm"
            >
              {t.label}
            </ActionChip>
          ))}
        </div>
      </div>

      {state.tab === "fee" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label="Paid This Month"
            value={formatInrFromPaise(sel.feeSummary.paidSoFar)}
            tone="emerald"
          />
          <StatCard
            label="Unpaid This Month"
            value={formatInrFromPaise(sel.feeSummary.unpaidSoFar)}
            tone="amber"
          />
          <StatCard
            label="Selected Month"
            value={`${MONTH_NAMES[state.month]} ${state.year}`}
            tone="blue"
          />
        </div>
      ) : null}

      {state.notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {state.notice}
        </div>
      ) : null}
      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {state.editDraft ? (
          <CandidateDetailsForm
            editDraft={state.editDraft}
            setEditDraft={state.setEditDraft}
            batches={state.batches}
            handleSaveEnrollmentEdit={actions.handleSaveEnrollmentEdit}
            handleDeleteCandidate={actions.handleDeleteCandidate}
            savingEnrollmentId={state.savingEnrollmentId}
          />
        ) : state.tab === "import" ? (
          <TabContent tab={state.tab} props={{}} />
        ) : (
          <>
            {state.tab !== "overall" && (
              <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-4">
                {/* Row 1: Search & Operations */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {qph ? (
                    <ControlInput
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={qph}
                      leftIcon={<Search size={14} />}
                      className="w-full max-w-md"
                    />
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    {state.tab === "all" || state.tab === "month" ? (
                      <>
                        <ControlButton
                          onClick={() => state.setIsImportingCandidates(true)}
                          variant="secondary"
                        >
                          Import Candidates
                        </ControlButton>
                        <ControlButton
                          onClick={actions.handleStartManualCandidate}
                          variant="primary"
                        >
                          Add Candidate
                        </ControlButton>
                      </>
                    ) : null}
                    {state.tab === "payments" ? (
                      <>
                        <ControlButton
                          onClick={() =>
                            state.setManualPaymentModal({
                              open: true,
                              mode: "create",
                              data: null,
                            })
                          }
                          variant="secondary"
                        >
                          Add Payment
                        </ControlButton>
                        <ControlButton
                          onClick={() => state.setIsImportingPayments(true)}
                          variant="primary"
                        >
                          Import Payments
                        </ControlButton>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Row 2: Filters & Pagination Utilities */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  {/* Left: Tab Checkbox Filters */}
                  <div className="flex flex-wrap items-center gap-4">
                    {state.tab === "payments" && (
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.paymentAllTime}
                            onChange={(e) => {
                              state.setCurrentPage(1);
                              state.setPaymentAllTime(e.target.checked);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="font-semibold text-slate-700">
                            All Time
                          </span>
                        </label>
                        <div className="h-4 w-px bg-slate-200" />
                        <label className="flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.paymentBookedOnly}
                            onChange={(e) => {
                              state.setCurrentPage(1);
                              state.setPaymentBookedOnly(e.target.checked);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="font-semibold text-slate-700">
                            Booked Only
                          </span>
                        </label>
                        <div className="h-4 w-px bg-slate-200" />
                        <label className="flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.paymentRecruitmentOnly}
                            onChange={(e) => {
                              state.setCurrentPage(1);
                              state.setPaymentRecruitmentOnly(e.target.checked);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="font-semibold text-slate-700">
                            Recruitment Only
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Right: Date Selectors, Refresh & Rows Per Page */}
                  <div className="flex flex-wrap items-center gap-3 ml-auto">
                    {state.tab !== "all" &&
                    state.tab !== "batch" &&
                    state.tab !== "overall" ? (
                      <div className="flex items-center gap-2">
                        <ControlSelect
                          value={state.year}
                          onChange={(e) =>
                            state.setYear(Number(e.target.value))
                          }
                          disabled={
                            state.tab === "payments" && state.paymentAllTime
                          }
                          className="w-24 h-9 text-xs"
                        >
                          {[2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </ControlSelect>
                        <ControlSelect
                          value={state.month}
                          onChange={(e) =>
                            state.setMonth(Number(e.target.value))
                          }
                          disabled={
                            state.tab === "payments" && state.paymentAllTime
                          }
                          className="w-32 h-9 text-xs"
                        >
                          {MONTH_NAMES.slice(1).map((m, i) => (
                            <option key={m} value={i + 1}>
                              {m}
                            </option>
                          ))}
                        </ControlSelect>
                      </div>
                    ) : null}

                    <ControlButton
                      onClick={state.loadTabData}
                      variant="secondary"
                      className="h-9 px-3 text-xs"
                    >
                      <RefreshCw size={12} className="mr-1.5" />
                      Refresh
                    </ControlButton>

                    <div className="h-4 w-px bg-slate-200" />

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">
                        Rows
                      </span>
                      <ControlSelect
                        value={state.rowsPerPage}
                        onChange={(e) =>
                          state.setRowsPerPage(Number(e.target.value))
                        }
                        className="w-20 h-9 text-xs"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </ControlSelect>
                    </div>

                    <span className="rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {Number(
                        state.pagination?.total || sel.baseRowsForTable.length,
                      )}{" "}
                      results
                    </span>
                  </div>
                </div>
              </div>
            )}

            {state.loading ? (
              <TableSkeleton />
            ) : !["fee", "discounts", "all", "month", "invoice"].includes(
                state.tab,
              ) &&
              isDataTableTab &&
              sel.baseRowsForTable.length === 0 ? (
              <EmptyState />
            ) : (
              <TabContent
                tab={state.tab}
                props={{
                  batchForm: state.batchForm,
                  setBatchForm: state.setBatchForm,
                  handleCreateBatch: actions.handleCreateBatch,
                  handleUpdateBatch: actions.handleUpdateBatch,
                  handleDeleteBatch: actions.handleDeleteBatch,
                  batchFilter: state.batchFilter,
                  setBatchFilter: state.setBatchFilter,
                  allSummary: state.allSummary,
                  allStatusFilter: state.allStatusFilter,
                  setAllStatusFilter: state.setAllStatusFilter,
                  allBatchFilter: state.allBatchFilter,
                  setAllBatchFilter: state.setAllBatchFilter,
                  discountForm: state.discountForm,
                  setDiscountForm: state.setDiscountForm,
                  canApproveDiscounts:
                    state.adminRole === "super_admin" ||
                    state.paymentActions.includes("tab_discounts") ||
                    state.paymentActions.includes("manage"),
                  candidateOptions: state.candidateOptions,
                  handleCreateDiscountRequest:
                    actions.handleCreateDiscountRequest,
                  rows: sel.paginatedRows,
                  feeFilter: state.feeFilter,
                  setFeeFilter: state.setFeeFilter,
                  cohortFilter: state.cohortFilter,
                  setCohortFilter: state.setCohortFilter,
                  openFeeBreakdown: actions.openFeeBreakdown,
                  openDiscountBreakdown: actions.openDiscountBreakdown,
                  setEditDraft: state.setEditDraft,
                  handleFinalize: actions.handleFinalize,
                  handleSendAgreement: actions.handleSendAgreement,
                  handleDeleteCandidate: actions.handleDeleteCandidate,
                  handleTagRecruitment: actions.handleTagRecruitment,
                  allSortBy: state.allSortBy,
                  allSortOrder: state.allSortOrder,
                  setAllSortBy: state.setAllSortBy,
                  setAllSortOrder: state.setAllSortOrder,
                  paymentSortBy: state.paymentSortBy,
                  paymentSortOrder: state.paymentSortOrder,
                  setPaymentSortBy: state.setPaymentSortBy,
                  setPaymentSortOrder: state.setPaymentSortOrder,
                  totalAmountPaise: state.paymentTotalAmountPaise,
                  monthSortBy: state.monthSortBy,
                  monthSortOrder: state.monthSortOrder,
                  setMonthSortBy: state.setMonthSortBy,
                  setMonthSortOrder: state.setMonthSortOrder,
                  savingEnrollmentId: state.savingEnrollmentId,
                  sendingAgreementEnrollmentId:
                    state.sendingAgreementEnrollmentId,
                  updatingBatchEnrollmentId: state.updatingBatchEnrollmentId,
                  handleChangeCandidateBatch:
                    actions.handleChangeCandidateBatch,
                  handleChangeCandidateStatus:
                    actions.handleChangeCandidateStatus,
                  batches: state.batches,
                  activeBatchId: state.activeBatchId,
                  setActiveBatchId: state.setActiveBatchId,
                  activeBatchName: state.activeBatchName,
                  setActiveBatchName: state.setActiveBatchName,
                  batchSortBy: state.batchSortBy,
                  setBatchSortBy: state.setBatchSortBy,
                  batchSortOrder: state.batchSortOrder,
                  setBatchSortOrder: state.setBatchSortOrder,
                  manualPaymentModal: state.manualPaymentModal,
                  setManualPaymentModal: state.setManualPaymentModal,
                  setRelinkModal: state.setRelinkModal,
                  bookAmountModal: state.bookAmountModal,
                  setBookAmountModal: state.setBookAmountModal,
                  handleCreateManualTransaction:
                    actions.handleCreateManualTransaction,
                  handleUpdateManualTransaction:
                    actions.handleUpdateManualTransaction,
                  handleDeleteManualTransaction:
                    actions.handleDeleteManualTransaction,
                  openLifecycleModal: actions.openLifecycleModal,
                  handleLifecycleSubmit: actions.handleLifecycleSubmit,
                  handleDiscountDecision: actions.handleDiscountDecision,
                  setRejectModal: state.setRejectModal,
                  selectedEnrollmentId: state.selectedEnrollmentId,
                  setSelectedEnrollmentId: state.setSelectedEnrollmentId,
                  setSelectedInvoicePaymentId:
                    state.setSelectedInvoicePaymentId,
                  filteredEnrollmentOptions: sel.filteredEnrollmentOptions,
                  selectedInvoicePaymentId: state.selectedInvoicePaymentId,
                  invoicePaymentRows: state.invoicePaymentRows,
                  selectedEnrollment: sel.selectedEnrollment,
                  handleGenerateInvoice: actions.handleGenerateInvoice,
                  handleSendInvoice: actions.handleSendInvoice,
                  handleCancelInvoice: actions.handleCancelInvoice,
                  invoiceRows: state.invoiceRows,
                  allSearch: state.allSearch,
                  bookedSummaryRows: state.bookedSummaryRows,
                  summaryMonthsLimit: state.summaryMonthsLimit,
                  setSummaryMonthsLimit: state.setSummaryMonthsLimit,
                  summaryMonthDetail: state.summaryMonthDetail,
                  setSummaryMonthDetail: state.setSummaryMonthDetail,
                  summaryCandidatesRows: state.summaryCandidatesRows,
                  summaryCandidatesLoading: state.summaryCandidatesLoading,
                  handleViewSummaryMonthCandidates: state.handleViewSummaryMonthCandidates,
                }}
              />
            )}

            {state.tab !== "overall" && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <PaginationBar
                  currentPage={state.currentPage}
                  totalPages={sel.totalPages}
                  setCurrentPage={state.setCurrentPage}
                />
                <div>
                  {state.tab === "payments" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={actions.handleReconcile}
                        disabled={state.reconciling}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-50"
                      >
                        {state.reconciling ? "Reconciling..." : "Reconcile"}
                      </button>
                      <ControlButton
                        onClick={actions.exportPaymentsExcel}
                        variant="primary"
                        className="h-9 px-3 text-xs"
                      >
                        Download Excel
                      </ControlButton>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RejectDiscountModal
        rejectModal={state.rejectModal}
        setRejectModal={state.setRejectModal}
        handleDiscountDecision={actions.handleDiscountDecision}
      />
      <LifecycleActionModal
        lifecycleModal={state.lifecycleModal}
        setLifecycleModal={state.setLifecycleModal}
        handleLifecycleSubmit={actions.handleLifecycleSubmit}
      />
      <FeeBreakdownModal
        feeBreakdownModal={state.feeBreakdownModal}
        setFeeBreakdownModal={state.setFeeBreakdownModal}
        loading={state.feeBreakdownLoading}
      />
      <ManualPaymentModal
        modal={state.manualPaymentModal}
        setModal={state.setManualPaymentModal}
        onCreate={actions.handleCreateManualTransaction}
        onUpdate={actions.handleUpdateManualTransaction}
        onDelete={actions.handleDeleteManualTransaction}
        candidateOptions={state.candidateOptions}
        refreshCandidateOptions={state.refreshCandidateOptions}
      />
      <RelinkPaymentModal
        modal={state.relinkModal}
        setModal={state.setRelinkModal}
        onConfirm={actions.handleRelinkTransactionByPhone}
      />
      <CopyAgreementModal
        modal={state.copyLinkModal}
        setModal={state.setCopyLinkModal}
      />
      <BookAmountModal
        modal={state.bookAmountModal}
        setModal={state.setBookAmountModal}
        onConfirm={actions.handleBookAmount}
      />
    </div>
  );
}
