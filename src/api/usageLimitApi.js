import api from "./axios";

export const adminGetUsageLimitConfig = () => api.get("/admin/usage-limits/config");

export const adminUpdateUsageLimitConfig = (rows) =>
  api.put("/admin/usage-limits/config", { rows });

export const adminListUsageLimitUsers = (page = 1, limit = 10, search = "", level = "", hasOverride = "") =>
  api.get("/admin/usage-limits/users", {
    params: { page, limit, search, level: level || undefined, has_override: hasOverride || undefined },
  });

export const adminGetUserUsageOverrides = (userId) =>
  api.get(`/admin/usage-limits/users/${userId}`);

export const adminUpdateUserUsageOverrides = (userId, rows) =>
  api.put(`/admin/usage-limits/users/${userId}`, { rows });

export const adminResetUserUsage = (userId, level, moduleKey, period) =>
  api.post(`/admin/usage-limits/users/${userId}/reset`, {
    level: level || undefined,
    module_key: moduleKey || undefined,
    period: period || undefined,
  });

export const adminGetUsageLimitAuditLog = (page = 1, limit = 20) =>
  api.get("/admin/usage-limits/audit-log", { params: { page, limit } });

export const adminCreateUsageLimitGroup = (level, label, moduleKeys) =>
  api.post("/admin/usage-limits/groups", { level, label, module_keys: moduleKeys });

export const adminUpdateUsageLimitGroup = (groupId, label, moduleKeys) =>
  api.put(`/admin/usage-limits/groups/${groupId}`, { label, module_keys: moduleKeys });

export const adminDeleteUsageLimitGroup = (groupId) =>
  api.delete(`/admin/usage-limits/groups/${groupId}`);

export const adminSetUsageLimitGroupActive = (groupId, isActive) =>
  api.put(`/admin/usage-limits/groups/${groupId}/active`, { is_active: isActive });

export const adminSetUserGroupOverride = (userId, level, groupId) =>
  api.put(`/admin/usage-limits/users/${userId}/group-override`, { level, group_id: groupId });

export const getMyUsageLimitState = () => api.get("/usage-limits/me");
