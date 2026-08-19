import api from "./axios";

/**
 * Learner API: Get resolved feature flags for the logged-in user.
 */
export const getMyFeatureFlags = () => api.get("/features/my-flags");

/**
 * Admin API: List all feature flag configurations and summary stats.
 */
export const adminGetFeatureFlags = () => api.get("/admin/feature-flags");

/**
 * Admin API: List eligible users for a feature flag with search/filter/pagination.
 */
export const adminGetFeatureUsers = (featureKey, params = {}) =>
  api.get(`/admin/feature-flags/${featureKey}/users`, { params });

/**
 * Admin API: Update global and cohort rules for a feature.
 */
export const adminUpdateFeatureConfig = (featureKey, config = {}) =>
  api.patch(`/admin/feature-flags/${featureKey}/config`, config);

/**
 * Admin API: Set a user-specific override (enabled: true/false).
 */
export const adminSetUserFeatureOverride = (featureKey, userId, enabled) =>
  api.post(`/admin/feature-flags/${featureKey}/users/${userId}/override`, { enabled });

/**
 * Admin API: Remove a user-specific override (revert to cohort/global rule).
 */
export const adminResetUserFeatureOverride = (featureKey, userId) =>
  api.delete(`/admin/feature-flags/${featureKey}/users/${userId}/override`);

/**
 * Admin API: Bulk set or reset overrides for multiple users.
 */
export const adminBulkFeatureOverride = (featureKey, payload) =>
  api.post(`/admin/feature-flags/${featureKey}/bulk-override`, payload);
