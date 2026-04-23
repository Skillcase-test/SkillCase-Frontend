import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { adminAccessApi } from "../../api/adminAccessApi";
import api from "../../api/axios";

const MODULE_OPTIONS = [
  { key: "analytics", label: "Analytics" },
  { key: "content", label: "A1" },
  { key: "a2_content", label: "A2" },
  { key: "events", label: "Events" },
  { key: "interview_tools", label: "Interview Tools" },
  { key: "skillcase_interviews", label: "Skillcase Interviews" },
  { key: "exam", label: "Exam Manager" },
  { key: "batch", label: "Batch" },
  { key: "landing_page", label: "Landing Page" },
  { key: "notifications", label: "Notifications" },
  { key: "wise", label: "Wise Dashboard" },
  { key: "internal", label: "Internal Forms" },
  { key: "terms", label: "Terms & Signatures" },
];

const ACTION_OPTIONS = ["view", "create", "edit", "delete", "manage"];
const SKILLCASE_INTERVIEW_MODULE = "skillcase_interviews";

function normalizeBatch(batch) {
  const id = batch.id ?? batch.batch_id ?? batch.value;
  const name =
    batch.name ?? batch.batch_name ?? batch.title ?? String(id ?? "Untitled");
  return {
    id: id == null ? "" : String(id),
    name: String(name),
    studentCount: Number(batch.student_count || 0),
  };
}

function PermissionPicker({ value, onChange }) {
  const normalized = value || {};

  const applyToAll = (mode) => {
    if (mode === "view") {
      const next = {};
      MODULE_OPTIONS.forEach((moduleDef) => {
        next[moduleDef.key] = ["view"];
      });
      onChange(next);
      return;
    }
    if (mode === "all") {
      const next = {};
      MODULE_OPTIONS.forEach((moduleDef) => {
        next[moduleDef.key] = [...ACTION_OPTIONS];
      });
      onChange(next);
      return;
    }
    if (mode === "clear") onChange({});
  };

  const setModuleActions = (moduleKey, actions) => {
    const next = { ...normalized };
    if (!actions.length) {
      delete next[moduleKey];
      onChange(next);
      return;
    }
    next[moduleKey] = actions;
    onChange(next);
  };

  const toggleSkillcaseInterviewSuperAccess = () => {
    const existing = normalized[SKILLCASE_INTERVIEW_MODULE] || [];
    const actionSet = new Set(existing);
    if (actionSet.has("manage")) {
      actionSet.delete("manage");
    } else {
      actionSet.add("manage");
      actionSet.add("view");
    }
    setModuleActions(SKILLCASE_INTERVIEW_MODULE, [...actionSet]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyToAll("view")}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
        >
          Set View For All
        </button>
        <button
          type="button"
          onClick={() => applyToAll("all")}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
        >
          Set Full Access For All
        </button>
        <button
          type="button"
          onClick={() => applyToAll("clear")}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          Clear All
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MODULE_OPTIONS.map((moduleDef) => {
          const selected = normalized[moduleDef.key] || [];
          return (
            <div
              key={moduleDef.key}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {moduleDef.label}
                </p>
                <div className="flex gap-1">
                  {moduleDef.key === SKILLCASE_INTERVIEW_MODULE ? (
                    <button
                      type="button"
                      onClick={toggleSkillcaseInterviewSuperAccess}
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                        selected.includes("manage")
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {selected.includes("manage")
                        ? "super access on"
                        : "super access"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setModuleActions(moduleDef.key, ["view"])}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    view
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModuleActions(moduleDef.key, [...ACTION_OPTIONS])
                    }
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    all
                  </button>
                  <button
                    type="button"
                    onClick={() => setModuleActions(moduleDef.key, [])}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACTION_OPTIONS.map((actionKey) => {
                  const checked = selected.includes(actionKey);
                  return (
                    <label
                      key={actionKey}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        checked
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 bg-white text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={(e) => {
                          const next = { ...normalized };
                          const list = new Set(next[moduleDef.key] || []);
                          if (e.target.checked) list.add(actionKey);
                          else list.delete(actionKey);
                          next[moduleDef.key] = [...list];
                          if (!next[moduleDef.key].length)
                            delete next[moduleDef.key];
                          onChange(next);
                        }}
                      />
                      {actionKey}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingCard({ label }) {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-3">
      <div className="h-3 w-32 rounded bg-slate-200" />
      <div className="mt-2 h-2 w-48 rounded bg-slate-100" />
      <div className="mt-2 h-2 w-20 rounded bg-slate-100" />
      <p className="mt-2 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

export default function AdminAccessManagement() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [wisePayload, setWisePayload] = useState({
    has_full_access: false,
    batch_ids: [],
  });
  const [wiseBatches, setWiseBatches] = useState([]);
  const [batchToAdd, setBatchToAdd] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const canManage = true;

  async function loadUsers(showRefresh = false, searchText = query) {
    if (showRefresh) setRefreshing(true);
    setUsersLoading(true);
    try {
      const res = await adminAccessApi.listUsers(searchText);
      setUsers(res.data.users || []);
    } finally {
      setUsersLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  }

  async function loadWiseBatches() {
    setBatchesLoading(true);
    try {
      const res = await api.get("/wise/batches", { params: { status: "all" } });
      const normalized = (res.data?.batches || [])
        .map(normalizeBatch)
        .filter((batch) => batch.id);
      setWiseBatches(normalized);
    } catch (_err) {
      setWiseBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }

  async function selectUser(user) {
    setSelectedUser(user);
    setBatchToAdd("");
    setDetailLoading(true);
    try {
      const [permRes, wiseRes] = await Promise.all([
        adminAccessApi.getUserPermissions(user.user_id),
        adminAccessApi.getUserWiseAccess(user.user_id),
      ]);
      setPermissions(permRes.data.permissions || {});
      const wise = wiseRes.data.wise || {};
      setWisePayload({
        has_full_access: Boolean(wise.has_full_access),
        batch_ids: (wise.batch_ids || []).map((id) => String(id)),
      });
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(false, "");
    loadWiseBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(false, query);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filteredUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const rank = { super_admin: 1, admin: 2, user: 3 };
        const byRole = (rank[a.role] || 99) - (rank[b.role] || 99);
        if (byRole !== 0) return byRole;
        return String(a.fullname || a.username || "").localeCompare(
          String(b.fullname || b.username || ""),
        );
      }),
    [users],
  );

  const selectedBatchList = useMemo(() => {
    const allById = new Map(
      wiseBatches.map((batch) => [String(batch.id), batch]),
    );
    return wisePayload.batch_ids
      .map((id) => allById.get(String(id)))
      .filter(Boolean);
  }, [wiseBatches, wisePayload.batch_ids]);

  const availableBatchOptions = useMemo(() => {
    const selected = new Set(
      (wisePayload.batch_ids || []).map((id) => String(id)),
    );
    return wiseBatches.filter((batch) => !selected.has(String(batch.id)));
  }, [wiseBatches, wisePayload.batch_ids]);

  async function handleRoleChange(nextRole) {
    if (!selectedUser) return;
    setRoleSaving(true);
    try {
      await adminAccessApi.updateUserRole(selectedUser.user_id, nextRole);
      await loadUsers();
      await selectUser({ ...selectedUser, role: nextRole });
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleSave() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await Promise.all([
        adminAccessApi.putUserPermissions(selectedUser.user_id, permissions),
        adminAccessApi.putUserWiseAccess(selectedUser.user_id, wisePayload),
      ]);
      await loadUsers();
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        Super admin access required.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              Admin Access Management
            </h1>
            <p className="text-sm text-slate-500">
              Promote users, assign module access, and control Wise batch scope.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadUsers(true);
              loadWiseBatches();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          {usersLoading ? (
            <div className="space-y-2">
              <LoadingCard label="Loading users" />
              <LoadingCard label="Loading users" />
              <LoadingCard label="Loading users" />
            </div>
          ) : (
            <div className="max-h-[68vh] space-y-2 overflow-auto">
              {filteredUsers.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => selectUser(user)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedUser?.user_id === user.user_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {user.fullname || user.username}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {user.phone || user.number || "-"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {!selectedUser ? (
            <p className="text-sm text-slate-500">
              Select a user to manage access.
            </p>
          ) : detailLoading ? (
            <div className="space-y-2">
              <LoadingCard label="Loading user permissions" />
              <LoadingCard label="Loading wise access" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <UserCog className="h-5 w-5 text-blue-700" />
                    {selectedUser.fullname || selectedUser.username}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedUser.user_id}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </p>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={roleSaving}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                  {roleSaving ? (
                    <p className="text-[11px] font-semibold text-slate-500">
                      Updating role...
                    </p>
                  ) : null}
                </div>
              </div>

              {selectedUser.role === "admin" && (
                <>
                  <PermissionPicker
                    value={permissions}
                    onChange={setPermissions}
                  />

                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Wise Batch Scope
                    </p>
                    <label className="mb-3 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={wisePayload.has_full_access}
                        onChange={(e) =>
                          setWisePayload((prev) => ({
                            ...prev,
                            has_full_access: e.target.checked,
                          }))
                        }
                      />
                      Full Wise access
                    </label>

                    {!wisePayload.has_full_access && (
                      <div className="space-y-3">
                        {batchesLoading ? (
                          <p className="text-xs text-slate-500">
                            Loading batches...
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={batchToAdd}
                                onChange={(e) => setBatchToAdd(e.target.value)}
                                className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              >
                                <option value="">
                                  Select a batch to grant access
                                </option>
                                {availableBatchOptions.map((batch) => (
                                  <option key={batch.id} value={batch.id}>
                                    {batch.name}
                                    {batch.studentCount
                                      ? ` (${batch.studentCount} students)`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={!batchToAdd}
                                onClick={() => {
                                  if (!batchToAdd) return;
                                  setWisePayload((prev) => ({
                                    ...prev,
                                    batch_ids: [
                                      ...new Set([
                                        ...prev.batch_ids,
                                        batchToAdd,
                                      ]),
                                    ],
                                  }));
                                  setBatchToAdd("");
                                }}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50"
                              >
                                Add Batch
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {selectedBatchList.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                  No restricted batches selected yet.
                                </p>
                              ) : (
                                selectedBatchList.map((batch) => (
                                  <span
                                    key={batch.id}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    {batch.name}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setWisePayload((prev) => ({
                                          ...prev,
                                          batch_ids: prev.batch_ids.filter(
                                            (id) =>
                                              String(id) !== String(batch.id),
                                          ),
                                        }))
                                      }
                                      className="rounded-full border border-slate-200 px-1.5 text-[10px] text-slate-500 hover:bg-white"
                                    >
                                      x
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || selectedUser.role !== "admin"}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? "Saving Access..." : "Save Access"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
