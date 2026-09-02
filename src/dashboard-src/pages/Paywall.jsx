import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  Search,
  RefreshCw,
  History,
  Ban,
  X,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Activity,
  Calendar,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { ControlDropdown } from "../payments-admin/components/controls";
import { StatCard } from "../payments-admin/components/common";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Paywall Active" },
  { value: "inactive", label: "Paywall Inactive" },
];

const TIER_TABS = [
  {
    value: "all",
    label: "All Users",
    tone: "slate",
    infoText: "Every student registered in the selected created-at date range.",
  },
  {
    value: "paywall_active",
    label: "Paywall Active",
    tone: "purple",
    infoText: "Students whose paywall restriction is currently toggled active.",
  },
  {
    value: "v125_plus",
    label: "Trial Eligible (v1.2.5+)",
    tone: "blue",
    infoText:
      "Students on app version 1.2.5 or above who have access to the free trial feature.",
  },
  {
    value: "paid",
    label: "Paid Tier",
    tone: "emerald",
    infoText: "Students with an active autopay mandate.",
  },
  {
    value: "trial",
    label: "On Trial",
    tone: "amber",
    infoText:
      "Students currently on an active 7-day free trial without an active autopay mandate.",
  },
  {
    value: "maybe_later",
    label: "Maybe Later Tier",
    tone: "indigo",
    infoText:
      "Students on v1.2.5+ who skipped or haven't claimed trial and have not subscribed.",
  },
  {
    value: "trial_expired_unpaid",
    label: "Trial Expired (Unpaid)",
    tone: "rose",
    infoText:
      "Students who claimed a free trial, whose trial expired, and who did not convert to a paid subscription.",
  },
];

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Paywall Active" },
  { value: "inactive", label: "Paywall Inactive" },
];

const TRIAL_STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Trial Active" },
  { value: "expired", label: "Trial Expired" },
  { value: "maybe_later", label: "Maybe Later" },
];

const AUTOPAY_STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Autopay Active" },
  { value: "inactive", label: "Autopay Inactive" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTrialEnd(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseSemver(versionStr) {
  if (!versionStr || typeof versionStr !== "string") return null;
  const clean = versionStr.trim().replace(/^v/i, "");
  const match = clean.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [
    parseInt(match[1] || "0", 10),
    parseInt(match[2] || "0", 10),
    parseInt(match[3] || "0", 10),
  ];
}

function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (!p1 && !p2) return 0;
  if (!p1) return -1;
  if (!p2) return 1;

  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

function getTrialStatusInfo(student) {
  const version = student.app_version;
  const trialEnd = student.trial_end_at ? new Date(student.trial_end_at) : null;
  const trialSkipped = student.trial_offer_skipped_at
    ? new Date(student.trial_offer_skipped_at)
    : null;
  const now = new Date();

  // 1. If user has an explicit trial end date (started a trial)
  if (trialEnd) {
    const isActive = trialEnd > now;
    if (isActive) {
      return {
        type: "trial_active",
        badgeLabel: "Trial Active",
        subtext: `Ends ${formatTrialEnd(student.trial_end_at)}`,
        tooltip: `Free trial active until ${formatDateTime(student.trial_end_at)}.`,
        badgeClass:
          "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
        versionTag: version ? `v${version.replace(/^v/i, "")}` : null,
      };
    }
    return {
      type: "trial_expired",
      badgeLabel: "Trial Expired",
      subtext: `Ended ${formatTrialEnd(student.trial_end_at)}`,
      tooltip: `Free trial ended on ${formatDateTime(student.trial_end_at)}.`,
      badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
      versionTag: version ? `v${version.replace(/^v/i, "")}` : null,
    };
  }

  // 2. No trial end date: classify by app version
  const isV125OrAbove = compareSemver(version, "1.2.5") >= 0;
  const isV127OrAbove = compareSemver(version, "1.2.7") >= 0;

  // Case: Version < 1.2.5 or unversioned/web user
  if (!isV125OrAbove) {
    return {
      type: "legacy_version",
      badgeLabel: version ? `Version < 1.2.5` : "Version < 1.2.5",
      subtext: "No trial support",
      tooltip:
        "Student is on an older app version (< 1.2.5) where the trial feature did not exist.",
      badgeClass: "bg-slate-50 text-slate-500 border border-slate-200/60",
      versionTag: version ? `v${version.replace(/^v/i, "")}` : "< 1.2.5",
    };
  }

  // Case: Version >= 1.2.7 (Maybe Later was explicitly tracked)
  if (isV127OrAbove) {
    if (trialSkipped) {
      return {
        type: "maybe_later",
        badgeLabel: "Maybe Later",
        subtext: `Clicked ${formatTrialEnd(student.trial_offer_skipped_at)}`,
        tooltip: `Student clicked 'Maybe Later' on ${formatDateTime(student.trial_offer_skipped_at)}.`,
        badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
        versionTag: `v${version.replace(/^v/i, "")}`,
      };
    }
    return {
      type: "not_started_or_legacy_skip",
      badgeLabel: "Unclaimed / Skipped < 1.2.7",
      subtext: "Unclaimed or skipped on < 1.2.7",
      tooltip:
        "Student is on v1.2.7+ without a trial end date or skip record. They may have not started trial, or they clicked 'Maybe Later' previously while on v1.2.5–1.2.6 before tracking was added.",
      badgeClass: "bg-slate-50 text-slate-500 border border-slate-200/60",
      versionTag: `v${version.replace(/^v/i, "")}`,
    };
  }

  // Case: Version 1.2.5 <= V < 1.2.7 (Trial existed, but Maybe Later was not recorded in DB)
  return {
    type: "untracked_maybe_later",
    badgeLabel: "Possibly Maybe Later",
    subtext: "Untracked (< 1.2.7)",
    tooltip:
      "Student is on v1.2.5–1.2.6 without a trial end date. On these versions, clicking 'Maybe Later' was not recorded in the database.",
    badgeClass:
      "bg-amber-50 text-amber-700 border border-amber-200/80 border-dashed",
    versionTag: `v${version.replace(/^v/i, "")}`,
  };
}

function Paywall() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierCounts, setTierCounts] = useState({
    all: 0,
    v125_plus: 0,
    paywall_active: 0,
    paid: 0,
    trial: 0,
    maybe_later: 0,
    free: 0,
    total_trial_takers: 0,
    trial_expired_unpaid: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [trialStatusFilter, setTrialStatusFilter] = useState("all");
  const [autopayStatusFilter, setAutopayStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(10);

  // Master system logs states
  const [masterLogs, setMasterLogs] = useState([]);
  const [loadingMasterLogs, setLoadingMasterLogs] = useState(false);
  const [masterPage, setMasterPage] = useState(1);
  const [masterTotalPages, setMasterTotalPages] = useState(1);
  const [masterLimit] = useState(10);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [cancellingAutopay, setCancellingAutopay] = useState(false);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Fetch lists
  useEffect(() => {
    fetchStudents();
  }, [
    page,
    limit,
    searchQuery,
    statusFilter,
    trialStatusFilter,
    autopayStatusFilter,
    startDate,
    endDate,
    sortOption,
  ]);

  useEffect(() => {
    fetchMasterLogs();
  }, [masterPage]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get("/admin/paywall/students", {
        params: {
          page,
          limit,
          search: searchQuery,
          status: statusFilter,
          trialStatus:
            trialStatusFilter !== "all" ? trialStatusFilter : undefined,
          autopayStatus:
            autopayStatusFilter !== "all" ? autopayStatusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sort: sortOption !== "default" ? sortOption : undefined,
        },
      });
      setStudents(response.data.students || []);
      setTierCounts(
        response.data.tiers || { all: 0, paid: 0, trial: 0, free: 0 },
      );
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalCount(response.data.pagination?.total || 0);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleLimitChange = (newLimit) => {
    setLimit(Number(newLimit));
    setPage(1);
  };

  const fetchMasterLogs = async () => {
    setLoadingMasterLogs(true);
    try {
      const response = await api.get("/admin/paywall/audit-log", {
        params: { page: masterPage, limit: masterLimit },
      });
      setMasterLogs(response.data.logs || []);
      setMasterTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching master logs:", err);
    } finally {
      setLoadingMasterLogs(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTrialStatusFilterChange = (value) => {
    setTrialStatusFilter(value);
    setPage(1);
  };

  const handleAutopayStatusFilterChange = (value) => {
    setAutopayStatusFilter(value);
    setPage(1);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setPage(1);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setPage(1);
  };

  const handleColumnSort = (column) => {
    // Cycles: DESC -> ASC -> default
    if (column === "score") {
      if (sortOption === "score_desc") setSortOption("score_asc");
      else if (sortOption === "score_asc") setSortOption("default");
      else setSortOption("score_desc");
    } else if (column === "created") {
      if (sortOption === "created_desc") setSortOption("created_asc");
      else if (sortOption === "created_asc") setSortOption("default");
      else setSortOption("created_desc");
    } else if (column === "activity") {
      if (sortOption === "activity_desc") setSortOption("activity_asc");
      else if (sortOption === "activity_asc") setSortOption("default");
      else setSortOption("activity_desc");
    } else if (column === "trial") {
      if (sortOption === "trial_expiry_desc") setSortOption("trial_expiry_asc");
      else if (sortOption === "trial_expiry_asc") setSortOption("default");
      else setSortOption("trial_expiry_desc");
    }
    setPage(1);
  };

  const renderSortIcon = (column) => {
    let active = false;
    let isAsc = false;
    if (column === "score") {
      active = sortOption === "score_desc" || sortOption === "score_asc";
      isAsc = sortOption === "score_asc";
    } else if (column === "created") {
      active = sortOption === "created_desc" || sortOption === "created_asc";
      isAsc = sortOption === "created_asc";
    } else if (column === "activity") {
      active = sortOption === "activity_desc" || sortOption === "activity_asc";
      isAsc = sortOption === "activity_asc";
    } else if (column === "trial") {
      active =
        sortOption === "trial_expiry_desc" || sortOption === "trial_expiry_asc";
      isAsc = sortOption === "trial_expiry_asc";
    }

    if (!active) {
      return (
        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
      );
    }
    return isAsc ? (
      <ArrowUp className="w-3 h-3 text-indigo-600 font-bold ml-1 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-600 font-bold ml-1 shrink-0" />
    );
  };

  const handleResetDates = () => {
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Toggle Paywall Active
  const handleTogglePaywall = async (studentId, currentStatus) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) =>
        s.user_id === studentId ? { ...s, paywall_active: nextStatus } : s,
      ),
    );

    try {
      await api.post("/admin/paywall/toggle", {
        userId: studentId,
        paywallActive: nextStatus,
      });
      fetchMasterLogs(); // Refresh general log feed
    } catch (err) {
      console.error("Error toggling paywall status:", err);
      // Revert optimistic update
      setStudents((prev) =>
        prev.map((s) =>
          s.user_id === studentId ? { ...s, paywall_active: currentStatus } : s,
        ),
      );
    }
  };

  // Cancel Autopay Flow
  const openCancelModal = (student) => {
    setSelectedStudent(student);
    setShowCancelModal(true);
  };

  const handleCancelAutopay = async () => {
    if (!selectedStudent) return;
    setCancellingAutopay(true);
    try {
      await api.post("/admin/paywall/cancel-autopay", {
        userId: selectedStudent.user_id,
      });
      setShowCancelModal(false);
      setSelectedStudent(null);
      fetchStudents();
      fetchMasterLogs(); // Refresh feed
    } catch (err) {
      console.error("Error cancelling autopay:", err);
      alert(err.response?.data?.msg || "Failed to cancel autopay subscription");
    } finally {
      setCancellingAutopay(false);
    }
  };

  // View Audit Logs Flow for Single Student
  const openAuditModal = async (student) => {
    setSelectedStudent(student);
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const response = await api.get(
        `/admin/paywall/students/${student.user_id}/audit-log`,
      );
      setAuditLogs(response.data.logs || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Utility badge styling for Action Keys
  const getActionBadge = (key) => {
    let classes = "bg-slate-100 text-slate-600";
    if (key.includes("enabled") || key === "trial_started") {
      classes = "bg-purple-50 text-purple-700 border border-purple-200";
    } else if (key.includes("disabled") || key === "trial_ended_dismissed") {
      classes = "bg-slate-100 text-slate-600 border border-slate-200";
    } else if (key.includes("verified") || key.includes("charged")) {
      classes = "bg-emerald-50 text-emerald-700 border border-emerald-200";
    } else if (key.includes("cancelled") || key.includes("failed")) {
      classes = "bg-rose-50 text-rose-700 border border-rose-200";
    } else if (key.includes("session") || key === "trial_offer_skipped") {
      classes = "bg-blue-50 text-blue-700 border border-blue-200";
    }
    return (
      <span
        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${classes}`}
      >
        {key}
      </span>
    );
  };

  // Utility badge formatter
  const getAutopayBadge = (status, enabled, isPaid) => {
    if (enabled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <CheckCircle className="w-3 h-3" />
          Paid
        </span>
      );
    }
    switch (status) {
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3 h-3" />
            Cancelled
          </span>
        );
      case "halted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            <Ban className="w-3 h-3" />
            Halted
          </span>
        );
      case "created":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            <HelpCircle className="w-3 h-3" />
            Checkout Started
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-9xl mx-auto space-y-5">
      {/* Flat Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Paywall Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Student access directories, autopay subscriptions, activity scores,
            and system audit logs.
          </p>
        </div>
      </div>

      {/* Main Student Directory */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {/* Heading */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-slate-800">
            Students Directory
          </h2>
          {totalCount > 0 && (
            <span className="text-xs font-medium text-slate-400">
              ({totalCount})
            </span>
          )}
        </div>

        {/* Tier Summary Cards */}
        {(() => {
          const allTotal = Number(tierCounts.all || 0);
          const v125Total = Number(tierCounts.v125_plus || 0);
          const paywallActiveTotal = Number(tierCounts.paywall_active || 0);
          const paidCount = Number(tierCounts.paid || 0);
          const trialCount = Number(tierCounts.trial || 0);
          const maybeLaterCount = Number(tierCounts.maybe_later || 0);
          const totalTrialTakers = Number(tierCounts.total_trial_takers || 0);
          const trialExpiredUnpaid = Number(
            tierCounts.trial_expired_unpaid || 0,
          );

          const getTierSubtext = (tabValue) => {
            switch (tabValue) {
              case "all":
                return allTotal > 0
                  ? `${((v125Total / allTotal) * 100).toFixed(1)}% on v1.2.5+ (${v125Total.toLocaleString("en-IN")})`
                  : "All registered students";
              case "v125_plus":
                return allTotal > 0
                  ? `${((v125Total / allTotal) * 100).toFixed(1)}% of all users`
                  : "App v1.2.5 or above";
              case "paywall_active":
                return allTotal > 0
                  ? `${((paywallActiveTotal / allTotal) * 100).toFixed(1)}% of all users`
                  : "Toggle restriction ON";
              case "paid":
                return v125Total > 0
                  ? `${((paidCount / v125Total) * 100).toFixed(1)}% of v1.2.5+ users`
                  : "Active autopay";
              case "trial":
                return v125Total > 0
                  ? `${((trialCount / v125Total) * 100).toFixed(1)}% of v1.2.5+ users`
                  : "Running free trial";
              case "maybe_later":
                return v125Total > 0
                  ? `${((maybeLaterCount / v125Total) * 100).toFixed(1)}% of v1.2.5+ users`
                  : "Skipped / Unclaimed";
              case "trial_expired_unpaid":
                return totalTrialTakers > 0
                  ? `${((trialExpiredUnpaid / totalTrialTakers) * 100).toFixed(1)}% did not pay (${trialExpiredUnpaid}/${totalTrialTakers} trial users)`
                  : "Expired without paying";
              default:
                return null;
            }
          };

          return (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {TIER_TABS.map((tab) => (
                <StatCard
                  key={tab.value}
                  label={tab.label}
                  value={Number(tierCounts[tab.value] || 0).toLocaleString(
                    "en-IN",
                  )}
                  subText={getTierSubtext(tab.value)}
                  tone={tab.tone}
                  infoText={tab.infoText}
                />
              ))}
            </div>
          );
        })()}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search student or phone..."
              className="w-full h-9 pl-8 pr-3 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
            />
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          </div>

          {/* Paywall Status Toggle Tabs */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 h-9 items-center">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusFilterChange(tab.value)}
                className={`h-7 px-1.5 rounded-md text-[11px] transition-all cursor-pointer ${
                  statusFilter === tab.value
                    ? "bg-white shadow-2xs text-slate-900 font-semibold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Trial Status Toggle Tabs */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 h-9 items-center">
            {TRIAL_STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTrialStatusFilterChange(tab.value)}
                className={`h-7 px-1.5 rounded-md text-[11px] transition-all cursor-pointer ${
                  trialStatusFilter === tab.value
                    ? "bg-white shadow-2xs text-slate-900 font-semibold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Autopay Status Toggle Tabs */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 h-9 items-center">
            {AUTOPAY_STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleAutopayStatusFilterChange(tab.value)}
                className={`h-7 px-1.5 rounded-md text-[11px] transition-all cursor-pointer ${
                  autopayStatusFilter === tab.value
                    ? "bg-white shadow-2xs text-slate-900 font-semibold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-slate-700 text-xs cursor-pointer p-0"
              title="Created from (12:00 AM IST)"
            />
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-slate-700 text-xs cursor-pointer p-0"
              title="Created to (11:59 PM IST)"
            />
            {(startDate || endDate) && (
              <button
                onClick={handleResetDates}
                title="Clear dates"
                className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors ml-0.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px] border border-slate-200 rounded-lg">
          <table className="table-auto w-full text-left">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Student</th>
                <th className="px-3.5 py-2.5">Phone</th>
                <th className="px-3.5 py-2.5 text-center">Level</th>
                <th
                  onClick={() => handleColumnSort("score")}
                  className="px-3.5 py-2.5 text-center cursor-pointer select-none hover:bg-slate-100/80 transition-colors group"
                  title="Click to sort by Score"
                >
                  <div className="inline-flex items-center justify-center">
                    <span>Score</span>
                    {renderSortIcon("score")}
                  </div>
                </th>
                <th
                  onClick={() => handleColumnSort("created")}
                  className="px-3.5 py-2.5 text-center whitespace-nowrap cursor-pointer select-none hover:bg-slate-100/80 transition-colors group"
                  title="Click to sort by Created At"
                >
                  <div className="inline-flex items-center justify-center">
                    <span>Created At</span>
                    {renderSortIcon("created")}
                  </div>
                </th>
                <th
                  onClick={() => handleColumnSort("activity")}
                  className="px-3.5 py-2.5 text-center whitespace-nowrap cursor-pointer select-none hover:bg-slate-100/80 transition-colors group"
                  title="Click to sort by Last Activity"
                >
                  <div className="inline-flex items-center justify-center">
                    <span>Last Activity</span>
                    {renderSortIcon("activity")}
                  </div>
                </th>
                <th
                  onClick={() => handleColumnSort("trial")}
                  className="px-3.5 py-2.5 text-center whitespace-nowrap cursor-pointer select-none hover:bg-slate-100/80 transition-colors group"
                  title="Click to sort by Trial Status"
                >
                  <div className="inline-flex items-center justify-center">
                    <span>Trial Status</span>
                    {renderSortIcon("trial")}
                  </div>
                </th>
                <th className="px-3.5 py-2.5 text-center">Autopay Status</th>
                <th className="px-3.5 py-2.5 text-center">Paywall Active</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
              {loadingStudents ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.user_id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {student.fullname || student.username}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {student.phone || student.number || "—"}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {student.current_profeciency_level || "A1"}
                        {String(
                          student.current_profeciency_level || "",
                        ).toUpperCase() === "B1" &&
                          (student.is_job_screening ? " · Job" : " · Practice")}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        {student.prospect_score != null
                          ? student.prospect_score
                          : 0}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center text-slate-500 font-mono text-[11px]">
                      {formatDateTime(student.created_at)}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center text-slate-500 text-[11px]">
                      {student.last_activity ? (
                        <span className="font-medium text-slate-700">
                          {formatDateTime(student.last_activity)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      {(() => {
                        const info = getTrialStatusInfo(student);
                        return (
                          <div
                            className="inline-flex flex-col items-center gap-0.5 cursor-default"
                            title={info.tooltip || ""}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${info.badgeClass}`}
                              >
                                {info.badgeLabel}
                              </span>
                              {info.versionTag && (
                                <span className="text-[10px] text-slate-400 font-mono font-medium">
                                  {info.versionTag}
                                </span>
                              )}
                            </div>
                            {info.subtext && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {info.subtext}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      {getAutopayBadge(
                        student.autopay_status,
                        student.autopay_enabled,
                        student.is_paid,
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleTogglePaywall(
                            student.user_id,
                            student.paywall_active,
                          )
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                          student.paywall_active
                            ? "bg-indigo-600"
                            : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            student.paywall_active
                              ? "translate-x-4.5"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openAuditModal(student)}
                          title="User audit log"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {student.autopay_enabled &&
                          student.razorpay_subscription_id && (
                            <button
                              type="button"
                              onClick={() => openCancelModal(student)}
                              className="px-2 py-0.5 text-[11px] font-medium text-rose-600 border border-rose-200 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loadingStudents && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Show per page:</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-200/80">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleLimitChange(size)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      limit === size
                        ? "bg-white shadow-2xs text-slate-900 font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {totalCount > 0 && (
                <span className="text-slate-400 font-normal ml-1">
                  (Showing {Math.min(totalCount, (page - 1) * limit + 1)}–
                  {Math.min(totalCount, page * limit)} of {totalCount})
                </span>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="text-slate-400 font-medium px-1">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Master Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              System Audit Logs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live log of paywall toggles, checkout registrations, and gateway
              updates.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchMasterLogs}
            disabled={loadingMasterLogs}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${loadingMasterLogs ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto min-h-[220px] border border-slate-200 rounded-lg">
          <table className="table-auto w-full text-left text-xs">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Timestamp (IST)</th>
                <th className="px-3.5 py-2.5">Student</th>
                <th className="px-3.5 py-2.5">Action Key</th>
                <th className="px-3.5 py-2.5">Changes (Old → New)</th>
                <th className="px-3.5 py-2.5">Actor</th>
                <th className="px-3.5 py-2.5 text-center">Subscription ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loadingMasterLogs ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : masterLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    No system logs recorded.
                  </td>
                </tr>
              ) : (
                masterLogs.map((log) => (
                  <tr
                    key={log.log_id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {log.created_at_ist}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {log.student_name || "System"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.student_phone || "—"}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {getActionBadge(log.action_key)}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-sm font-mono text-[10px] break-all">
                      <div className="flex flex-col gap-0.5">
                        <div>
                          <span className="text-slate-400 mr-1">Old:</span>
                          {JSON.stringify(log.old_value)}
                        </div>
                        <div>
                          <span className="text-slate-400 mr-1">New:</span>
                          {JSON.stringify(log.new_value)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {log.actor_name ? (
                        <div>
                          <div className="font-semibold text-slate-800">
                            {log.actor_name}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {log.actor_role}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 capitalize">
                          {log.actor_role || "system"}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center font-mono text-[11px] text-slate-700">
                      {log.razorpay_subscription_id || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Master Log Pagination */}
        {!loadingMasterLogs && masterTotalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              disabled={masterPage <= 1}
              onClick={() => setMasterPage((p) => p - 1)}
              className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="text-slate-400 font-medium">
              Page {masterPage} of {masterTotalPages}
            </span>
            <button
              disabled={masterPage >= masterTotalPages}
              onClick={() => setMasterPage((p) => p + 1)}
              className="px-2.5 py-1 font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal - Cancel Autopay */}
      {showCancelModal && selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cancel Autopay Subscription
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to cancel recurring autopay for{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedStudent.fullname || selectedStudent.username}
                    </span>
                    ?
                  </p>
                  <p className="text-[11px] text-rose-600 mt-2 bg-rose-50 p-2 rounded border border-rose-100">
                    This calls Razorpay to cancel future billing cycles
                    immediately.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                disabled={cancellingAutopay}
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedStudent(null);
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors text-slate-700 cursor-pointer"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={cancellingAutopay}
                onClick={handleCancelAutopay}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancellingAutopay ? "Cancelling..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal for Single Student */}
      {showAuditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-slate-200 overflow-hidden">
            <header className="flex justify-between items-center px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Audit History:{" "}
                  {selectedStudent.fullname || selectedStudent.username}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Database record of paywall events, changes, and
                  authorizations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedStudent(null);
                  setAuditLogs([]);
                }}
                className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 overflow-y-auto max-h-[450px]">
              {loadingAudit ? (
                <div className="text-center py-10 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading audit logs...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No logs found for this user.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="table-auto w-full text-left text-xs">
                    <thead className="text-[11px] font-semibold uppercase text-slate-600 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Action Key</th>
                        <th className="px-3 py-2">Actor</th>
                        <th className="px-3 py-2">Changes (Old → New)</th>
                        <th className="px-3 py-2 text-center">
                          Subscription ID
                        </th>
                        <th className="px-3 py-2 text-right">
                          Timestamp (IST)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {auditLogs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">
                              {log.action_key}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {log.actor_name ? (
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {log.actor_name}
                                </div>
                                <div className="text-[10px] text-slate-400 capitalize">
                                  {log.actor_role}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 capitalize">
                                {log.actor_role || "system"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 max-w-xs font-mono text-[10px] break-all">
                            <div className="flex flex-col gap-0.5">
                              <div>
                                <span className="text-slate-400 mr-1">
                                  Old:
                                </span>
                                {JSON.stringify(log.old_value)}
                              </div>
                              <div>
                                <span className="text-slate-400 mr-1">
                                  New:
                                </span>
                                {JSON.stringify(log.new_value)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center font-mono text-[11px]">
                            {log.razorpay_subscription_id || "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-slate-400 font-mono text-[11px]">
                            {log.created_at_ist}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedStudent(null);
                  setAuditLogs([]);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Paywall;
