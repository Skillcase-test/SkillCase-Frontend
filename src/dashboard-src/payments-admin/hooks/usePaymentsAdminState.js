import { useEffect, useState } from "react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { MONTH_NAMES } from "../utils/constants";

const SESSION_UNLOCK_KEY = "payments_admin_stepup_unlocked";

export function usePaymentsAdminState() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [tab, setTab] = useState("month");
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_UNLOCK_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchFilter, setBatchFilter] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [savingEnrollmentId, setSavingEnrollmentId] = useState("");
  const [updatingBatchEnrollmentId, setUpdatingBatchEnrollmentId] =
    useState("");
  const [refundingPaymentId, setRefundingPaymentId] = useState("");
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
  const [feeSearch, setFeeSearch] = useState("");
  const [discountSearch, setDiscountSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [rawSearch, setRawSearch] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState("");
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [invoicePaymentRows, setInvoicePaymentRows] = useState([]);
  const [selectedInvoicePaymentId, setSelectedInvoicePaymentId] = useState("");
  const [candidateOptions, setCandidateOptions] = useState([]);

  function resetStepUpSession() {
    try {
      sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    } catch {}
    setAuthorized(false);
    setPassword("");
  }

  async function refreshBatches() {
    try {
      const res = await paymentsAdminApi.getBatches();
      setBatches(res.data.batches || []);
      const allRes = await paymentsAdminApi.getAllView();
      setCandidateOptions(allRes.data.rows || []);
    } catch (err) {
      if (err?.response?.data?.code === "PAYMENTS_STEP_UP_REQUIRED") {
        resetStepUpSession();
        setError("Payments step-up expired. Please unlock again.");
      }
      setBatches([]);
      setCandidateOptions([]);
    }
  }

  async function loadTabData() {
    setLoading(true);
    setError("");
    try {
      if (tab === "all") {
        const res = await paymentsAdminApi.getAllView();
        setRows(res.data.rows || []);
      } else if (tab === "month" || tab === "invoice") {
        const res = await paymentsAdminApi.getMonthView(year, month);
        setRows(res.data.rows || []);
        if (tab === "invoice") {
          const inv = await paymentsAdminApi.getInvoices(year, month);
          setInvoiceRows(inv.data.rows || []);
          const pay = await paymentsAdminApi.getPaymentView(year, month);
          setInvoicePaymentRows(pay.data.rows || []);
        }
      } else if (tab === "batch") {
        const res = await paymentsAdminApi.getMonthView(year, month);
        setRows((res.data.rows || []).filter((x) => x.batch_name));
      } else if (tab === "fee") {
        const res = await paymentsAdminApi.getTotalFeeView(year, month);
        setRows(res.data.rows || []);
      } else if (tab === "discounts") {
        const res = await paymentsAdminApi.getDiscounts(year, month);
        setRows(res.data.rows || []);
      } else if (tab === "payments") {
        const res = await paymentsAdminApi.getPaymentView(year, month);
        setRows(res.data.rows || []);
      } else if (tab === "rawlogs") {
        const res = await paymentsAdminApi.getRawLogs({
          limit: 100,
          event_type: rawEventTypeFilter || undefined,
          status: rawStatusFilter || undefined,
        });
        setRows(res.data.rows || []);
        setRawEventTypes(res.data.event_types || []);
      }
    } catch (err) {
      if (err?.response?.data?.code === "PAYMENTS_STEP_UP_REQUIRED") {
        resetStepUpSession();
        setError("Payments step-up expired. Please unlock again.");
        setRows([]);
        return;
      }
      setError(err?.response?.data?.msg || "Failed to load data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function syncStepUpState() {
      if (!authorized) return;
      try {
        const res = await paymentsAdminApi.getStepUpStatus();
        if (!mounted) return;
        if (!res?.data?.active) resetStepUpSession();
      } catch {
        if (mounted) resetStepUpSession();
      }
    }
    syncStepUpState();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadTabData();
    refreshBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, tab, year, month, rawEventTypeFilter, rawStatusFilter]);

  return {
    SESSION_UNLOCK_KEY,
    year,
    setYear,
    month,
    setMonth,
    tab,
    setTab,
    password,
    setPassword,
    authorized,
    setAuthorized,
    loading,
    setLoading,
    error,
    setError,
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
    updatingBatchEnrollmentId,
    setUpdatingBatchEnrollmentId,
    refundingPaymentId,
    setRefundingPaymentId,
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
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
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
    resetStepUpSession,
    refreshBatches,
    loadTabData,
  };
}
