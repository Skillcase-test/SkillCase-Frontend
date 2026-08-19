import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  Info,
  Layers,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Users,
  UserX,
  XCircle,
} from "lucide-react";
import {
  adminGetFeatureFlags,
  adminGetFeatureUsers,
  adminUpdateFeatureConfig,
  adminSetUserFeatureOverride,
  adminResetUserFeatureOverride,
} from "../../api/featureFlagApi";

export default function FeatureFlagsAdmin({ canEdit = true }) {
  const [features, setFeatures] = useState([]);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState("");
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  // Active feature config state
  const [activeConfig, setActiveConfig] = useState(null);
  const [stats, setStats] = useState({
    total_eligible: 0,
    total_paid: 0,
    total_unpaid: 0,
    total_overrides: 0,
    total_enabled: 0,
    paid_enabled: 0,
    unpaid_enabled: 0,
  });

  // Cohort rules form state
  const [cohortRules, setCohortRules] = useState({
    global_enabled: false,
    paid_enabled: false,
    unpaid_enabled: false,
  });
  const [savingCohortRules, setSavingCohortRules] = useState(false);

  // Users table state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all"); // "all", "paid", "unpaid"
  const [levelFilter, setLevelFilter] = useState("all"); // "all", "A1", "A2"
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "enabled", "disabled", "override"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Load all features
  const loadFeatures = async () => {
    try {
      setLoadingFeatures(true);
      const res = await adminGetFeatureFlags();
      const list = res?.data?.features || [];
      setFeatures(list);
      if (list.length > 0 && !selectedFeatureKey) {
        setSelectedFeatureKey(list[0].feature_key);
        setActiveConfig(list[0]);
        setCohortRules({
          global_enabled: Boolean(list[0].global_enabled),
          paid_enabled: Boolean(list[0].paid_enabled),
          unpaid_enabled: Boolean(list[0].unpaid_enabled),
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load feature flags");
    } finally {
      setLoadingFeatures(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  // Load selected feature data & users
  const loadFeatureUsers = async () => {
    if (!selectedFeatureKey) return;
    try {
      setLoadingUsers(true);
      const res = await adminGetFeatureUsers(selectedFeatureKey, {
        search: debouncedSearch,
        paymentFilter,
        levelFilter,
        statusFilter,
        page,
        limit: pageSize,
      });

      const data = res?.data || {};
      setActiveConfig(data.feature || null);
      if (data.feature) {
        setCohortRules({
          global_enabled: Boolean(data.feature.global_enabled),
          paid_enabled: Boolean(data.feature.paid_enabled),
          unpaid_enabled: Boolean(data.feature.unpaid_enabled),
        });
      }
      setStats(data.stats || {});
      setUsers(data.users || []);
      setPagination(data.pagination || { total: 0, total_pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load students for feature");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadFeatureUsers();
  }, [selectedFeatureKey, debouncedSearch, paymentFilter, levelFilter, statusFilter, page, pageSize]);

  // Save Cohort & Global Rules
  const handleSaveCohortRules = async () => {
    if (!canEdit) {
      toast.error("You have view-only access. Contact a Super Admin to modify rollout rules.");
      return;
    }
    if (!selectedFeatureKey) return;
    try {
      setSavingCohortRules(true);
      const res = await adminUpdateFeatureConfig(selectedFeatureKey, cohortRules);
      toast.success("Cohort rules updated successfully!");
      setActiveConfig(res?.data?.feature || null);
      loadFeatureUsers();
      loadFeatures();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update cohort rules");
    } finally {
      setSavingCohortRules(false);
    }
  };

  // Toggle user override
  const handleToggleUserOverride = async (user) => {
    if (!canEdit) {
      toast.error("You have view-only access. Contact a Super Admin to toggle student access.");
      return;
    }
    if (!selectedFeatureKey) return;
    const newOverrideValue = user.effective_status ? false : true;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === user.user_id
          ? {
              ...u,
              effective_status: newOverrideValue,
              override_status: newOverrideValue,
              effective_reason: newOverrideValue ? "override_on" : "override_off",
            }
          : u
      )
    );

    try {
      await adminSetUserFeatureOverride(selectedFeatureKey, user.user_id, newOverrideValue);
      toast.success(
        `Feature ${newOverrideValue ? "ENABLED" : "DISABLED"} for ${user.fullname || user.username}`
      );
      loadFeatureUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to set user override");
      loadFeatureUsers();
    }
  };

  // Reset user override
  const handleResetUserOverride = async (user) => {
    if (!canEdit) {
      toast.error("You have view-only access. Contact a Super Admin to reset overrides.");
      return;
    }
    if (!selectedFeatureKey) return;
    try {
      await adminResetUserFeatureOverride(selectedFeatureKey, user.user_id);
      toast.success(`Reverted ${user.fullname || user.username} to cohort default`);
      loadFeatureUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reset user override");
    }
  };

  const selectedFeature = features.find((f) => f.feature_key === selectedFeatureKey) || activeConfig;
  const eligibleLevelsList = selectedFeature?.eligible_levels || ["A1", "A2"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header & Feature Selector */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shrink-0 shadow-xs">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Feature Flags Control Center
              </h1>
              {canEdit ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Full Access
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
                  <Lock className="w-3 h-3 text-slate-400" /> Read-Only Access
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Modular feature gating, cohort rollout rules, and individual student access controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Feature:
            </span>
            <select
              value={selectedFeatureKey}
              onChange={(e) => {
                setSelectedFeatureKey(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 transition-colors focus:ring-2 focus:ring-blue-950 focus:outline-none"
            >
              {features.map((feat) => (
                <option key={feat.feature_key} value={feat.feature_key}>
                  {feat.name} ({feat.eligible_levels?.join(", ") || "All"})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              loadFeatures();
              loadFeatureUsers();
            }}
            disabled={loadingUsers}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin text-blue-950" : ""}`} />
          </button>
        </div>
      </div>

      {/* Read-Only Notice banner if canEdit is false */}
      {!canEdit && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3 text-amber-900 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> You have permission to inspect feature rollout rules and
            student eligibility. To toggle cohort rules or override access for individual students,
            request <strong>Full Access</strong> from a Super Admin in Access Management.
          </span>
        </div>
      )}

      {/* Feature Details & Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Eligible Students
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats.total_eligible?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">
              ({eligibleLevelsList.join(", ")})
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Access
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {stats.total_enabled?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">
              ({stats.total_eligible ? Math.round((stats.total_enabled / stats.total_eligible) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paid Access
            </span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">
              {stats.paid_enabled?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">
              / {stats.total_paid || 0} paid
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Free/Unpaid Access
            </span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {stats.unpaid_enabled?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">
              / {stats.total_unpaid || 0} free
            </span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Custom Overrides
            </span>
            <Sliders className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600">
              {stats.total_overrides?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">exceptions</span>
          </div>
        </div>
      </div>

      {/* Cohort Rules Configuration Box */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3 h-3" /> Cohort & Global Release Rules
            </div>
            <h2 className="text-lg font-bold text-white">
              Rollout Rules for {selectedFeature?.name || "Feature"}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Rules apply automatically to all students in eligible levels ({eligibleLevelsList.join(", ")}).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveCohortRules}
            disabled={savingCohortRules || !canEdit}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 self-start md:self-auto ${
              !canEdit
                ? "bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600 opacity-60"
                : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white cursor-pointer hover:shadow"
            }`}
            title={!canEdit ? "Read-only mode: contact Super Admin to edit" : "Save changes to rollout rules"}
          >
            {savingCohortRules ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Rules...
              </>
            ) : !canEdit ? (
              <>
                <Lock className="w-3.5 h-3.5" /> Read-Only
              </>
            ) : (
              "Save Rollout Rules"
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          {/* Global Rule */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Global Feature Release</div>
              <p className="text-xs text-slate-400 mt-1">
                Enable for 100% of students in {eligibleLevelsList.join(", ")} regardless of payment tier.
              </p>
            </div>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return;
                setCohortRules((prev) => ({
                  ...prev,
                  global_enabled: !prev.global_enabled,
                }));
              }}
              className={`p-1 rounded-full transition-colors ${
                !canEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } ${cohortRules.global_enabled ? "text-emerald-400" : "text-slate-500"}`}
            >
              {cohortRules.global_enabled ? (
                <ToggleRight className="w-9 h-9 fill-current" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Paid Cohort Rule */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Paid Students Cohort</div>
              <p className="text-xs text-slate-400 mt-1">
                Enable for all current and future students with active paid / autopay status.
              </p>
            </div>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return;
                setCohortRules((prev) => ({
                  ...prev,
                  paid_enabled: !prev.paid_enabled,
                }));
              }}
              className={`p-1 rounded-full transition-colors ${
                !canEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } ${cohortRules.paid_enabled ? "text-emerald-400" : "text-slate-500"}`}
            >
              {cohortRules.paid_enabled ? (
                <ToggleRight className="w-9 h-9 fill-current" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Unpaid Cohort Rule */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Free / Unpaid Students Cohort</div>
              <p className="text-xs text-slate-400 mt-1">
                Enable for all free tier and trial users in {eligibleLevelsList.join(", ")}.
              </p>
            </div>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return;
                setCohortRules((prev) => ({
                  ...prev,
                  unpaid_enabled: !prev.unpaid_enabled,
                }));
              }}
              className={`p-1 rounded-full transition-colors ${
                !canEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } ${cohortRules.unpaid_enabled ? "text-emerald-400" : "text-slate-500"}`}
            >
              {cohortRules.unpaid_enabled ? (
                <ToggleRight className="w-9 h-9 fill-current" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, phone, email, or Zoho ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-950 focus:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Payment filter tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("all");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                paymentFilter === "all"
                  ? "bg-white text-blue-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Students
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("paid");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                paymentFilter === "paid"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Paid Only
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("unpaid");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                paymentFilter === "unpaid"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Free / Unpaid
            </button>
          </div>
        </div>

        {/* Level and Status Secondary Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-950"
            >
              <option value="all">All Eligible ({eligibleLevelsList.join(", ")})</option>
              {eligibleLevelsList.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl} Only
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-950"
            >
              <option value="all">All Statuses</option>
              <option value="enabled">Access Enabled</option>
              <option value="disabled">Access Disabled</option>
              <option value="override">Custom Overrides Only</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{users.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{pagination.total}</span> eligible students
          </div>
        </div>
      </div>

      {/* Eligible Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Payment Tier</th>
                <th className="py-3 px-4">Effective Access</th>
                <th className="py-3 px-4 text-center">Toggle Access</th>
                <th className="py-3 px-4 text-right">Override Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loadingUsers ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-950" />
                      Loading eligible students...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserX className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600">No students found matching your filters</p>
                      <p className="text-xs text-slate-400">
                        Try changing your search keywords or payment filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((student) => {
                  const hasOverride = student.override_status !== null;
                  return (
                    <tr
                      key={student.user_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasOverride ? "bg-purple-50/20" : ""
                      }`}
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                            {(student.fullname || student.username || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {student.fullname || student.username}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {student.user_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700 font-medium">{student.phone || "—"}</div>
                        <div className="text-[11px] text-slate-400">{student.email || "—"}</div>
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                          {student.level}
                        </span>
                      </td>

                      {/* Payment Tier */}
                      <td className="py-3.5 px-4">
                        {student.is_paid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : student.trial_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                            <Sparkles className="w-3 h-3" /> Trial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                            Free
                          </span>
                        )}
                      </td>

                      {/* Effective Access Status & Reason */}
                      <td className="py-3.5 px-4">
                        {student.effective_status ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Enabled
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {student.effective_reason === "override_on"
                                ? "User Override (ON)"
                                : student.effective_reason === "global_on"
                                ? "Global Rule"
                                : student.effective_reason === "cohort_paid_on"
                                ? "Paid Cohort Rule"
                                : student.effective_reason === "cohort_unpaid_on"
                                ? "Free Cohort Rule"
                                : "Enabled"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Disabled
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {student.effective_reason === "override_off"
                                ? "User Override (OFF)"
                                : student.effective_reason === "cohort_paid_off"
                                ? "Paid Cohort (Disabled)"
                                : student.effective_reason === "cohort_unpaid_off"
                                ? "Free Cohort (Disabled)"
                                : student.effective_reason === "level_ineligible"
                                ? "Level Ineligible"
                                : "Default Rule"}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Toggle Switch */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggleUserOverride(student)}
                          className={`p-1 rounded-full transition-colors ${
                            !canEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                          } ${
                            student.effective_status
                              ? "text-emerald-600 hover:text-emerald-700"
                              : "text-slate-400 hover:text-slate-500"
                          }`}
                          title={
                            !canEdit
                              ? "Read-only mode: contact Super Admin to edit"
                              : `Click to ${student.effective_status ? "DISABLE" : "ENABLE"} for this user`
                          }
                        >
                          {student.effective_status ? (
                            <ToggleRight className="w-8 h-8 fill-current" />
                          ) : (
                            <ToggleLeft className="w-8 h-8" />
                          )}
                        </button>
                      </td>

                      {/* Reset override button */}
                      <td className="py-3.5 px-4 text-right">
                        {hasOverride ? (
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleResetUserOverride(student)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              !canEdit
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 opacity-60"
                                : "bg-purple-100 hover:bg-purple-200 text-purple-700 cursor-pointer"
                            }`}
                            title={
                              !canEdit
                                ? "Read-only mode: contact Super Admin to reset"
                                : "Revert user to cohort default rule"
                            }
                          >
                            <RotateCcw className="w-3 h-3" /> Reset
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Cohort Rule</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-center sm:self-auto">
            <span>
              Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{pagination.total_pages}</span>
            </span>

            <div className="inline-flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loadingUsers}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages || loadingUsers}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
