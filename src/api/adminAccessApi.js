import api from "./axios";

export const adminAccessApi = {
  getMyAccess: () => api.get("/admin/access/me"),
  listUsers: (q = "") => api.get("/admin/access/users", { params: { q } }),
  updateUserRole: (userId, role) =>
    api.patch(`/admin/access/users/${userId}/role`, { role }),
  getUserPermissions: (userId) =>
    api.get(`/admin/access/users/${userId}/permissions`),
  putUserPermissions: (userId, permissions) =>
    api.put(`/admin/access/users/${userId}/permissions`, { permissions }),
  getUserWiseAccess: (userId) =>
    api.get(`/admin/access/users/${userId}/wise-access`),
  putUserWiseAccess: (userId, wisePayload) =>
    api.put(`/admin/access/users/${userId}/wise-access`, wisePayload),
};
