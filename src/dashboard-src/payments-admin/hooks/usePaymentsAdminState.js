import { useEffect, useRef, useState } from "react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { MONTH_NAMES } from "../utils/constants";

const SEARCH_DEBOUNCE_MS = 300;

// Ordered list of tab keys as they appear in the UI
const PAYMENTS_TAB_ORDER = [
  "overall", "month", "all", "batch", "fee",
  "discounts", "payments", "rawlogs", "invoice",
];

// Maps each UI tab key to its backend action_key stored in admin_user_permission
const PAYMENTS_ACTION_FOR_TAB = {
  overall:   "tab_overall",
  month:     "tab_month",
  all:       "tab_all",
  batch:     "tab_batch",
  fee:       "tab_fee",
  discounts: "tab_discounts",
  payments:  "tab_payments",
  rawlogs:   "tab_rawlogs",
  invoice:   "tab_invoice",
};

function derivePermittedTabs(role, paymentActions) {
  if (role === "super_admin") return new Set(PAYMENTS_TAB_ORDER);
  const permitted = new Set();
  for (const [tabKey, actionKey] of Object.entries(PAYMENTS_ACTION_FOR_TAB)) {
    if (tabKey === "discounts") {
      if (
        paymentActions.includes("tab_discounts") ||
        paymentActions.includes("tab_discounts_view") ||
        paymentActions.includes("manage")
      ) {
        permitted.add("discounts");
      }
    } else {
      if (paymentActions.includes(actionKey) || paymentActions.includes("manage")) {
        permitted.add(tabKey);
      }
    }
  }
  return permitted;
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function usePaymentsAdminState() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [tab, setTab] = useState("month");

  // Access control state — null means still loading
  const [permittedTabs, setPermittedTabs] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [adminRole, setAdminRole] = useState("");
  const [paymentActions, setPaymentActions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rows, setRows] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchFilter, setBatchFilter] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [savingEnrollmentId, setSavingEnrollmentId] = useState("");
  const [sendingAgreementEnrollmentId, setSendingAgreementEnrollmentId] = useState("");
  const [updatingBatchEnrollmentId, setUpdatingBatchEnrollmentId] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [batchForm, setBatchForm] = useState({ name: "", description: "" });
  const [discountForm, setDiscountForm] = useState({
    enrollment_id: "",
    student_name: "",
    student_phone: "",
    target_month_name: MONTH_NAMES[month],
    discount_type: "one_time",
    discount_value: "",
    discount_percent: "",
    reason: "",
  });
  const [rawEventTypeFilter, setRawEventTypeFilter] = useState("");
  const [rawStatusFilter, setRawStatusFilter] = useState("");
  const [rawEventTypes, setRawEventTypes] = useState([]);
  const [feeFilter, setFeeFilter] = useState("");
  const [rejectModal, setRejectModal] = useState({
    open: false,
    discountId: "",
    reason: "",
  });
  const [allSearch, setAllSearch] = useState("");
  const [monthSearch, setMonthSearch] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [activeBatchId, setActiveBatchId] = useState("");
  const [activeBatchName, setActiveBatchName] = useState("");
  const [batchSortBy, setBatchSortBy] = useState("created_at");
  const [batchSortOrder, setBatchSortOrder] = useState("desc");
  const [feeSearch, setFeeSearch] = useState("");
  const [discountSearch, setDiscountSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [rawSearch, setRawSearch] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("");
  const [allBatchFilter, setAllBatchFilter] = useState("");
  const [allSortBy, setAllSortBy] = useState("created_at");
  const [allSortOrder, setAllSortOrder] = useState("desc");
  const [paymentSortBy, setPaymentSortBy] = useState("paid_at");
  const [paymentSortOrder, setPaymentSortOrder] = useState("desc");
  const [paymentAllTime, setPaymentAllTime] = useState(false);
  const [monthSortBy, setMonthSortBy] = useState("created_at");
  const [monthSortOrder, setMonthSortOrder] = useState("desc");
  const [allSummary, setAllSummary] = useState({
    total_enrollments: 0,
    total_active: 0,
    total_dropped: 0,
    total_hold: 0,
  });
  const [cohortFilter, setCohortFilter] = useState("both");
  const [lifecycleModal, setLifecycleModal] = useState({
    open: false,
    action: "",
    enrollmentId: "",
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    studentName: "",
  });
  const [feeBreakdownModal, setFeeBreakdownModal] = useState({
    open: false,
    title: "",
    rows: [],
  });
  const [feeBreakdownLoading, setFeeBreakdownLoading] = useState(false);
  const [manualPaymentModal, setManualPaymentModal] = useState({ open: false, mode: "create", data: null });
  const [feeBreakdownCache, setFeeBreakdownCache] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });
  const [feeSummary, setFeeSummary] = useState({
    paid_this_month_paise: 0,
    unpaid_this_month_paise: 0,
  });
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState("");
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [invoicePaymentRows, setInvoicePaymentRows] = useState([]);
  const [selectedInvoicePaymentId, setSelectedInvoicePaymentId] = useState("");
  const [candidateOptions, setCandidateOptions] = useState([]);
  const [isImportingPayments, setIsImportingPayments] = useState(false);
  const [isImportingCandidates, setIsImportingCandidates] = useState(false);

  const abortControllerRef = useRef(null);

  const debouncedAllSearch = useDebounce(allSearch, SEARCH_DEBOUNCE_MS);
  const debouncedMonthSearch = useDebounce(monthSearch, SEARCH_DEBOUNCE_MS);
  const debouncedFeeSearch = useDebounce(feeSearch, SEARCH_DEBOUNCE_MS);
  const debouncedDiscountSearch = useDebounce(discountSearch, SEARCH_DEBOUNCE_MS);
  const debouncedPaymentSearch = useDebounce(paymentSearch, SEARCH_DEBOUNCE_MS);
  const debouncedRawSearch = useDebounce(rawSearch, SEARCH_DEBOUNCE_MS);
  const debouncedBatchSearch = useDebounce(batchSearch, SEARCH_DEBOUNCE_MS);
  const debouncedEnrollmentSearchTerm = useDebounce(enrollmentSearchTerm, SEARCH_DEBOUNCE_MS);

  async function refreshBatches() {
    try {
      const res = await paymentsAdminApi.getBatches();
      setBatches(res.data.batches || []);
    } catch {
      setBatches([]);
    }
  }

  async function refreshCandidateOptions() {
    try {
      const res = await paymentsAdminApi.getEnrollmentOptions({
        search: enrollmentSearchTerm || undefined,
      });
      setCandidateOptions(res.data.options || []);
    } catch {
      setCandidateOptions([]);
    }
  }

  async function loadTabData() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError("");
    try {
      if (tab === "all") {
        const res = await paymentsAdminApi.getAllView({
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedAllSearch || undefined,
          status: allStatusFilter || undefined,
          batch_id: allBatchFilter || undefined,
          sortBy: allSortBy,
          sortOrder: allSortOrder,
        });
        if (controller.signal.aborted) return;
        setRows(res.data.rows || []);
        setAllSummary(
          res.data.summary || {
            total_enrollments: 0,
            total_active: 0,
            total_dropped: 0,
            total_hold: 0,
          },
        );
        setPagination(res.data.pagination || { page: currentPage, limit: rowsPerPage, total: (res.data.rows || []).length, total_pages: 1 });
      } else if (tab === "month") {
        const res = await paymentsAdminApi.getMonthView(year, month, {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedMonthSearch || undefined,
          sortBy: monthSortBy,
          sortOrder: monthSortOrder,
        });
        if (controller.signal.aborted) return;
        setRows(res.data.rows || []);
        setPagination(res.data.pagination || { page: currentPage, limit: rowsPerPage, total: (res.data.rows || []).length, total_pages: 1 });
      } else if (tab === "invoice") {
        setRows(candidateOptions || []);
        setPagination({ page: 1, limit: rowsPerPage, total: candidateOptions.length, total_pages: 1 });
        if (selectedEnrollmentId) {
          const [invRes, payRes] = await Promise.all([
            paymentsAdminApi.getInvoices(year, month, {
              page: 1,
              limit: 200,
              enrollment_id: selectedEnrollmentId,
            }),
            paymentsAdminApi.getInvoicePaymentOptions(selectedEnrollmentId),
          ]);
          if (controller.signal.aborted) return;
          setInvoiceRows(invRes.data.rows || []);
          setInvoicePaymentRows(payRes.data.rows || []);
        } else {
          setInvoiceRows([]);
          setInvoicePaymentRows([]);
        }
      } else if (tab === "batch") {
        if (activeBatchId) {
          const res = await paymentsAdminApi.getBatchStudents(activeBatchId, {
            page: currentPage,
            limit: rowsPerPage,
            search: debouncedBatchSearch || undefined,
            sortBy: batchSortBy,
            sortOrder: batchSortOrder,
          });
          if (controller.signal.aborted) return;
          setRows(res.data.rows || []);
          setPagination(
            res.data.pagination || {
              page: currentPage,
              limit: rowsPerPage,
              total: (res.data.rows || []).length,
              total_pages: 1,
            },
          );
        } else {
          const res = await paymentsAdminApi.getBatches({
            page: currentPage,
            limit: rowsPerPage,
            search: debouncedBatchSearch || undefined,
          });
          if (controller.signal.aborted) return;
          setRows(res.data.batches || []);
          setPagination(
            res.data.pagination || {
              page: currentPage,
              limit: rowsPerPage,
              total: (res.data.batches || []).length,
              total_pages: 1,
            },
          );
        }
      } else if (tab === "fee") {
        const res = await paymentsAdminApi.getTotalFeeView(year, month, {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedFeeSearch || undefined,
          fee_filter: feeFilter || undefined,
          cohort_filter: cohortFilter || undefined,
        });
        if (controller.signal.aborted) return;
        setRows(res.data.rows || []);
        setFeeSummary(
          res.data.fee_summary || {
            paid_this_month_paise: 0,
            unpaid_this_month_paise: 0,
          },
        );
        setPagination(res.data.pagination || { page: currentPage, limit: rowsPerPage, total: (res.data.rows || []).length, total_pages: 1 });
      } else if (tab === "discounts") {
        const res = await paymentsAdminApi.getDiscounts(year, month, {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedDiscountSearch || undefined,
        });
        if (controller.signal.aborted) return;
        setRows(res.data.rows || []);
        setPagination(res.data.pagination || { page: currentPage, limit: rowsPerPage, total: (res.data.rows || []).length, total_pages: 1 });
      } else if (tab === "payments") {
        const res = await paymentsAdminApi.getPaymentView(year, month, {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedPaymentSearch || undefined,
          sortBy: paymentSortBy,
          sortOrder: paymentSortOrder,
          all: paymentAllTime || undefined,
        });
        if (controller.signal.aborted) return;
        setRows(res.data.rows || []);
        setPagination(res.data.pagination || { page: currentPage, limit: rowsPerPage, total: (res.data.rows || []).length, total_pages: 1 });
      } else if (tab === "rawlogs") {
        const res = await paymentsAdminApi.getRawLogs({
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedRawSearch || undefined,
          event_type: rawEventTypeFilter || undefined,
          status: rawStatusFilter || undefined,
        });
        if (controller.signal.aborted) return;
        setRows(res.data.rows || []);
        setRawEventTypes(res.data.event_types || []);
        setPagination(res.data.pagination || { page: currentPage, limit: rowsPerPage, total: (res.data.rows || []).length, total_pages: 1 });
      }
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return;
      }
      setError(err?.response?.data?.msg || "Failed to load data");
      setRows([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  // On mount: resolve which tabs this admin is permitted to see
  useEffect(() => {
    let mounted = true;
    async function loadAccess() {
      setAccessLoading(true);
      try {
        const res = await paymentsAdminApi.getMyAccess();
        if (!mounted) return;
        const role = res.data?.role || "";
        const actionsList = res.data?.permissions?.["payments"] || [];
        const permitted = derivePermittedTabs(role, actionsList);
        setAdminRole(role);
        setPaymentActions(actionsList);
        setPermittedTabs(permitted);
        if (permitted.size > 0) {
          const firstTab = PAYMENTS_TAB_ORDER.find((t) => permitted.has(t));
          if (firstTab) setTab(firstTab);
        }
      } catch {
        if (mounted) setPermittedTabs(new Set());
      } finally {
        if (mounted) setAccessLoading(false);
      }
    }
    loadAccess();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!permittedTabs || permittedTabs.size === 0) return;
    loadTabData();
    setFeeBreakdownCache({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    permittedTabs,
    tab,
    selectedEnrollmentId,
    year,
    month,
    currentPage,
    rowsPerPage,
    tab === "all" ? debouncedAllSearch : null,
    tab === "all" ? allStatusFilter : null,
    tab === "all" ? allBatchFilter : null,
    tab === "all" ? allSortBy : null,
    tab === "all" ? allSortOrder : null,
    tab === "month" ? debouncedMonthSearch : null,
    tab === "month" ? monthSortBy : null,
    tab === "month" ? monthSortOrder : null,
    tab === "fee" ? debouncedFeeSearch : null,
    tab === "fee" ? feeFilter : null,
    tab === "fee" ? cohortFilter : null,
    tab === "discounts" ? debouncedDiscountSearch : null,
    tab === "payments" ? debouncedPaymentSearch : null,
    tab === "payments" ? paymentSortBy : null,
    tab === "payments" ? paymentSortOrder : null,
    tab === "payments" ? paymentAllTime : null,
    tab === "rawlogs" ? debouncedRawSearch : null,
    tab === "rawlogs" ? rawEventTypeFilter : null,
    tab === "rawlogs" ? rawStatusFilter : null,
    tab === "invoice" ? debouncedEnrollmentSearchTerm : null,
    tab === "batch" ? debouncedBatchSearch : null,
    activeBatchId,
    tab === "batch" ? batchSortBy : null,
    tab === "batch" ? batchSortOrder : null,
  ]);

  useEffect(() => {
    if (!permittedTabs || permittedTabs.size === 0) return;
    refreshBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permittedTabs]);

  useEffect(() => {
    if (!permittedTabs || permittedTabs.size === 0) return;
    if (tab !== "discounts" && tab !== "invoice" && tab !== "payments") return;
    refreshCandidateOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permittedTabs, tab, debouncedEnrollmentSearchTerm]);

  useEffect(() => {
    setEditDraft(null);
    setCurrentPage(1);
    setPaymentAllTime(false);
    setActiveBatchId("");
    setActiveBatchName("");
    setBatchSortBy("created_at");
    setBatchSortOrder("desc");
  }, [tab]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    year,
    setYear,
    month,
    setMonth,
    tab,
    setTab,
    activeBatchId,
    setActiveBatchId,
    activeBatchName,
    setActiveBatchName,
    batchSortBy,
    setBatchSortBy,
    batchSortOrder,
    setBatchSortOrder,
    permittedTabs,
    accessLoading,
    adminRole,
    paymentActions,
    loading,
    setLoading,
    error,
    setError,
    notice,
    setNotice,
    rows,
    setRows,
    batches,
    setBatches,
    batchFilter,
    setBatchFilter,
    selectedEnrollmentId,
    setSelectedEnrollmentId,
    savingEnrollmentId,
    setSavingEnrollmentId,
    sendingAgreementEnrollmentId,
    setSendingAgreementEnrollmentId,
    updatingBatchEnrollmentId,
    setUpdatingBatchEnrollmentId,
    reconciling,
    setReconciling,
    editDraft,
    setEditDraft,
    batchForm,
    setBatchForm,
    discountForm,
    setDiscountForm,
    rawEventTypeFilter,
    setRawEventTypeFilter,
    rawStatusFilter,
    setRawStatusFilter,
    rawEventTypes,
    setRawEventTypes,
    feeFilter,
    setFeeFilter,
    rejectModal,
    setRejectModal,
    allSearch,
    setAllSearch,
    monthSearch,
    setMonthSearch,
    batchSearch,
    setBatchSearch,
    feeSearch,
    setFeeSearch,
    discountSearch,
    setDiscountSearch,
    paymentSearch,
    setPaymentSearch,
    rawSearch,
    setRawSearch,
    allStatusFilter,
    setAllStatusFilter,
    allBatchFilter,
    setAllBatchFilter,
    allSortBy,
    setAllSortBy,
    allSortOrder,
    setAllSortOrder,
    paymentSortBy,
    setPaymentSortBy,
    paymentSortOrder,
    setPaymentSortOrder,
    paymentAllTime,
    setPaymentAllTime,
    monthSortBy,
    setMonthSortBy,
    monthSortOrder,
    setMonthSortOrder,
    allSummary,
    setAllSummary,
    cohortFilter,
    setCohortFilter,
    lifecycleModal,
    setLifecycleModal,
    feeBreakdownModal,
    setFeeBreakdownModal,
    feeBreakdownLoading,
    setFeeBreakdownLoading,
    feeBreakdownCache,
    setFeeBreakdownCache,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
    pagination,
    setPagination,
    feeSummary,
    setFeeSummary,
    manualPaymentModal,
    setManualPaymentModal,
    enrollmentSearchTerm,
    setEnrollmentSearchTerm,
    invoiceRows,
    setInvoiceRows,
    invoicePaymentRows,
    setInvoicePaymentRows,
    selectedInvoicePaymentId,
    setSelectedInvoicePaymentId,
    candidateOptions,
    setCandidateOptions,
    isImportingPayments,
    setIsImportingPayments,
    isImportingCandidates,
    setIsImportingCandidates,
    refreshBatches,
    refreshCandidateOptions,
    loadTabData,
  };
}
