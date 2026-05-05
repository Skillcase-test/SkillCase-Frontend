import api from "./axios";

export const exploreCandidatesAdminApi = {
  listAccounts: () => api.get("/admin/explore-candidates/accounts"),
  upsertAccount: (payload) => api.post("/admin/explore-candidates/accounts", payload),
  deleteAccount: (accountId) =>
    api.delete(`/admin/explore-candidates/accounts/${accountId}`),

  listLibraryProfiles: () => api.get("/admin/explore-candidates/profiles/library"),
  createProfile: (payload) => api.post("/admin/explore-candidates/profiles", payload),
  updateProfile: (profileId, payload) =>
    api.put(`/admin/explore-candidates/profiles/${profileId}`, payload),
  deleteProfile: (profileId) =>
    api.delete(`/admin/explore-candidates/profiles/${profileId}`),

  getAccountProfiles: (accountId) =>
    api.get(`/admin/explore-candidates/accounts/${accountId}/profiles`),
  assignProfile: (accountId, profileId, display_order = 0) =>
    api.post(`/admin/explore-candidates/accounts/${accountId}/assign`, {
      profile_id: profileId,
      display_order,
    }),
  unassignProfile: (accountId, profileId) =>
    api.delete(`/admin/explore-candidates/accounts/${accountId}/assign/${profileId}`),
  updateAssignmentOrder: (accountId, profileId, displayOrder) =>
    api.patch(
      `/admin/explore-candidates/accounts/${accountId}/assign/${profileId}/order`,
      { display_order: displayOrder },
    ),

  fetchLegacyProfiles: (email) =>
    api.get("/admin/explore-candidates/sync/legacy-profiles", {
      params: { email },
    }),
};
