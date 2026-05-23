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
    all:      [state.allSearch,      state.setAllSearch,      "Search name/phone/email/batch"],
    month:    [state.monthSearch,    state.setMonthSearch,    "Search name/phone/email/batch/status"],
    batch:    [state.batchSearch,    state.setBatchSearch,    "Search batch/name/phone/status"],
    fee:      [state.feeSearch,      state.setFeeSearch,      "Search name/phone/due"],
    discounts:[state.discountSearch, state.setDiscountSearch, "Search candidate/type/status/reason"],
    payments: [state.paymentSearch,  state.setPaymentSearch,  "Search candidate/phone/payment/status"],
    rawlogs:  [state.rawSearch,      state.setRawSearch,      "Search event/type/status/ids"],
  };
  const [q, setQ, qph] = searchable[state.tab] || ["", () => {}, ""];
  const isDataTableTab = ["all", "month", "fee", "discounts", "payments", "rawlogs", "invoice"].includes(state.tab);

  const roleLabel =
    state.adminRole === "super_admin" ? "Super Admin" :
    state.adminRole === "admin" ? "Admin" : state.adminRole;

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
            <div className="rounded-xl bg-slate-900 px-4 py-2 text-white">
              <p className="text-[10px] uppercase opacity-70">Month</p>
              <p className="font-bold">
                {MONTH_NAMES[state.month]} {state.year}
              </p>
            </div>
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
            savingEnrollmentId={state.savingEnrollmentId}
          />
        ) : state.tab === "import" ? (
          <TabContent tab={state.tab} props={{}} />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              {qph && state.tab !== "batch" ? (
                <ControlInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={qph}
                  leftIcon={<Search size={14} />}
                  className="w-full max-w-sm"
                />
              ) : (
                <div />
              )}
              <div className="flex flex-wrap items-center gap-2">
                {state.tab === "all" || state.tab === "month" ? (
                  <ControlButton onClick={actions.handleStartManualCandidate} variant="primary">
                    Add Candidate
                  </ControlButton>
                ) : null}
                {state.tab !== "all" && state.tab !== "batch" ? (
                  <>
                    <ControlSelect
                      value={state.year}
                      onChange={(e) => state.setYear(Number(e.target.value))}
                      className="w-28"
                    >
                      {[2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </ControlSelect>
                    <ControlSelect
                      value={state.month}
                      onChange={(e) => state.setMonth(Number(e.target.value))}
                      className="w-40"
                    >
                      {MONTH_NAMES.slice(1).map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </ControlSelect>
                  </>
                ) : null}
                <ControlButton onClick={state.loadTabData} variant="secondary">
                  <RefreshCw size={14} className="mr-1" />
                  Refresh
                </ControlButton>
                <span className="text-xs text-slate-500">Rows</span>
                <ControlSelect
                  value={state.rowsPerPage}
                  onChange={(e) => state.setRowsPerPage(Number(e.target.value))}
                  className="w-20"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </ControlSelect>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                  {Number(state.pagination?.total || sel.baseRowsForTable.length)} results
                </span>
              </div>
            </div>

            {state.loading ? (
              <TableSkeleton />
            ) : !["fee", "discounts"].includes(state.tab) && isDataTableTab && sel.baseRowsForTable.length === 0 ? (
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
                  candidateOptions: state.candidateOptions,
                  handleCreateDiscountRequest: actions.handleCreateDiscountRequest,
                  rows: sel.paginatedRows,
                  feeFilter: state.feeFilter,
                  setFeeFilter: state.setFeeFilter,
                  cohortFilter: state.cohortFilter,
                  setCohortFilter: state.setCohortFilter,
                  openFeeBreakdown: actions.openFeeBreakdown,
                  openDiscountBreakdown: actions.openDiscountBreakdown,
                  setEditDraft: state.setEditDraft,
                  handleFinalize: actions.handleFinalize,
                  handleReject: actions.handleReject,
                  handleSendAgreement: actions.handleSendAgreement,
                  savingEnrollmentId: state.savingEnrollmentId,
                  sendingAgreementEnrollmentId: state.sendingAgreementEnrollmentId,
                  updatingBatchEnrollmentId: state.updatingBatchEnrollmentId,
                  handleChangeCandidateBatch: actions.handleChangeCandidateBatch,
                  handleChangeCandidateStatus: actions.handleChangeCandidateStatus,
                  batches: state.batches,
                  openLifecycleModal: actions.openLifecycleModal,
                  handleLifecycleSubmit: actions.handleLifecycleSubmit,
                  handleRefund: actions.handleRefund,
                  refundingPaymentId: state.refundingPaymentId,
                  handleDiscountDecision: actions.handleDiscountDecision,
                  setRejectModal: state.setRejectModal,
                  selectedEnrollmentId: state.selectedEnrollmentId,
                  setSelectedEnrollmentId: state.setSelectedEnrollmentId,
                  setSelectedInvoicePaymentId: state.setSelectedInvoicePaymentId,
                  filteredEnrollmentOptions: sel.filteredEnrollmentOptions,
                  selectedInvoicePaymentId: state.selectedInvoicePaymentId,
                  invoicePaymentOptions: sel.invoicePaymentOptions,
                  selectedEnrollment: sel.selectedEnrollment,
                  handleGenerateAndSendInvoice: actions.handleGenerateAndSendInvoice,
                  selectedEnrollmentInvoiceRows: sel.selectedEnrollmentInvoiceRows,
                }}
              />
            )}

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
                      onClick={actions.exportPaymentsCsv}
                      variant="primary"
                      className="h-9 px-3 text-xs"
                    >
                      Download CSV
                    </ControlButton>
                  </div>
                ) : null}
              </div>
            </div>
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
    </div>
  );
}
