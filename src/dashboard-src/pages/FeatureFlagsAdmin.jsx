import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Flag, Info, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import {
  adminGetFeatureFlags,
  adminGetFeatureUsers,
  adminUpdateFeatureConfig,
  adminSetUserFeatureOverride,
  adminResetUserFeatureOverride,
} from "../../api/featureFlagApi";
import StatsGrid from "./featureFlags/StatsGrid";
import RolloutRules from "./featureFlags/RolloutRules";
import StudentFilters from "./featureFlags/StudentFilters";
import StudentTable from "./featureFlags/StudentTable";
import { FEATURE_MODULES } from "./featureFlags/modules";

const EMPTY_FILTERS = {
  search: "",
  paymentFilter: "all",
  levelFilter: "all",
  statusFilter: "all",
};

export default function FeatureFlagsAdmin({ canEdit = true, canManageContent = false }) {
  const [features, setFeatures] = useState([]);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState("");

  const [activeConfig, setActiveConfig] = useState(null);
  const [stats, setStats] = useState({});

  const [cohortRules, setCohortRules] = useState({
    global_enabled: false,
    paid_enabled: false,
    unpaid_enabled: false,
    eligible_levels: ["A1", "A2", "B1", "B2"],
  });
  const [savingCohortRules, setSavingCohortRules] = useState(false);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  const selectedFeature =
    features.find((f) => f.feature_key === selectedFeatureKey) || activeConfig;
  const eligibleLevelsList = selectedFeature?.eligible_levels || ["A1", "A2", "B1", "B2"];
  const isGlobalOnly = Boolean(selectedFeature?.global_only);
  const FeatureModule = FEATURE_MODULES[selectedFeatureKey];

  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(handler);
  }, [filters.search]);

  const loadFeatures = async () => {
    try {
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
          eligible_levels: list[0].eligible_levels || ["A1", "A2", "B1", "B2"],
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load feature flags");
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatureUsers = async () => {
    if (!selectedFeatureKey) return;
    try {
      setLoadingUsers(true);
      const res = await adminGetFeatureUsers(selectedFeatureKey, {
        search: debouncedSearch,
        paymentFilter: filters.paymentFilter,
        levelFilter: filters.levelFilter,
        statusFilter: filters.statusFilter,
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
          eligible_levels: data.feature.eligible_levels || ["A1", "A2", "B1", "B2"],
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
  }, [
    selectedFeatureKey,
    debouncedSearch,
    filters.paymentFilter,
    filters.levelFilter,
    filters.statusFilter,
    page,
    pageSize,
  ]);

  const handleSaveCohortRules = async () => {
    if (!canEdit) {
      toast.error("You have view-only access. Contact a Super Admin to modify rollout rules.");
      return;
    }
    if (!selectedFeatureKey) return;
    try {
      setSavingCohortRules(true);
      // global_only flags reject cohort fields server-side.
      const payload = isGlobalOnly
        ? { global_enabled: cohortRules.global_enabled }
        : {
            global_enabled: cohortRules.global_enabled,
            paid_enabled: cohortRules.paid_enabled,
            unpaid_enabled: cohortRules.unpaid_enabled,
            eligible_levels: cohortRules.eligible_levels,
          };
      const res = await adminUpdateFeatureConfig(selectedFeatureKey, payload);
      toast.success(
        isGlobalOnly ? "Feature updated successfully!" : "Cohort rules updated successfully!"
      );
      setActiveConfig(res?.data?.feature || null);
      loadFeatureUsers();
      loadFeatures();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update cohort rules");
    } finally {
      setSavingCohortRules(false);
    }
  };

  const handleToggleUserOverride = async (user) => {
    if (!canEdit) {
      toast.error("You have view-only access. Contact a Super Admin to toggle student access.");
      return;
    }
    if (!selectedFeatureKey) return;
    const newOverrideValue = !user.effective_status;

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
        `Feature ${newOverrideValue ? "ENABLED" : "DISABLED"} for ${
          user.fullname || user.username
        }`
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to set user override");
    }
    loadFeatureUsers();
  };

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
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

      {!isGlobalOnly && <StatsGrid stats={stats} levels={eligibleLevelsList} />}

      <RolloutRules
        feature={selectedFeature}
        isGlobalOnly={isGlobalOnly}
        levels={eligibleLevelsList}
        rules={cohortRules}
        onChange={setCohortRules}
        onSave={handleSaveCohortRules}
        saving={savingCohortRules}
        canEdit={canEdit}
      />

      {FeatureModule && <FeatureModule canEdit={canManageContent} />}

      {!isGlobalOnly && (
        <>
          <StudentFilters
            filters={filters}
            onChange={updateFilters}
            levels={eligibleLevelsList}
            shownCount={users.length}
            total={pagination.total}
          />

          <StudentTable
            users={users}
            loading={loadingUsers}
            canEdit={canEdit}
            page={page}
            pageSize={pageSize}
            totalPages={pagination.total_pages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            onToggle={handleToggleUserOverride}
            onReset={handleResetUserOverride}
          />
        </>
      )}
    </div>
  );
}
