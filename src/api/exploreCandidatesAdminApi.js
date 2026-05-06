import api from "./axios";

function profileToFormData(payload = {}) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (value instanceof File) {
      formData.append(key, value);
      return;
    }
    formData.append(key, value);
  });
  return formData;
}

export const exploreCandidatesAdminApi = {
  listAccounts: () => api.get("/admin/explore-candidates/accounts"),
  upsertAccount: (payload) => {
    const formData = new FormData();
    formData.append("email", payload.email || "");
    formData.append("password", payload.password || "");
    formData.append("status", String(payload.status ?? 1));
    if (payload.partner_logo_file instanceof File) {
      formData.append("partner_logo_file", payload.partner_logo_file);
    }
    if (payload.partner_logo) {
      formData.append("partner_logo", payload.partner_logo);
    }
    return api.post("/admin/explore-candidates/accounts", formData);
  },
  deleteAccount: (accountId) => api.delete(`/admin/explore-candidates/accounts/${accountId}`),
  resetAccountPassword: (accountId) =>
    api.post(`/admin/explore-candidates/accounts/${accountId}/reset-password`),
  updateAccountSettings: (accountId, payload) =>
    api.patch(`/admin/explore-candidates/accounts/${accountId}/settings`, payload),

  listLibraryProfiles: () => api.get("/admin/explore-candidates/profiles/library"),
  getProfileById: (profileId) => api.get(`/admin/explore-candidates/profiles/${profileId}`),
  createProfile: (payload) =>
    api.post("/admin/explore-candidates/profiles", profileToFormData(payload)),
  updateProfile: (profileId, payload) =>
    api.put(`/admin/explore-candidates/profiles/${profileId}`, profileToFormData(payload)),
  deleteProfile: (profileId) => api.delete(`/admin/explore-candidates/profiles/${profileId}`),

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
    api.patch(`/admin/explore-candidates/accounts/${accountId}/assign/${profileId}/order`, {
      display_order: displayOrder,
    }),

  addProfileVideo: (profileId, payload) => {
    const formData = new FormData();
    formData.append("title", payload.title || "");
    formData.append("display_order", String(payload.display_order ?? 0));
    if (payload.video_file_upload instanceof File) {
      formData.append("video_file_upload", payload.video_file_upload);
    }
    if (payload.video_file) {
      formData.append("video_file", payload.video_file);
    }
    return api.post(`/admin/explore-candidates/profiles/${profileId}/videos`, formData);
  },
  updateProfileVideo: (videoId, payload) => {
    const formData = new FormData();
    if (payload.title !== undefined) formData.append("title", payload.title);
    if (payload.display_order !== undefined) {
      formData.append("display_order", String(payload.display_order));
    }
    if (payload.video_file_upload instanceof File) {
      formData.append("video_file_upload", payload.video_file_upload);
    }
    if (payload.video_file) {
      formData.append("video_file", payload.video_file);
    }
    return api.patch(`/admin/explore-candidates/videos/${videoId}`, formData);
  },
  deleteProfileVideo: (videoId) => api.delete(`/admin/explore-candidates/videos/${videoId}`),

  addProfileDocument: (profileId, payload) => {
    const formData = new FormData();
    formData.append("title", payload.title || "");
    formData.append("display_order", String(payload.display_order ?? 0));
    if (payload.document_file_upload instanceof File) {
      formData.append("document_file_upload", payload.document_file_upload);
    }
    if (payload.document_file) {
      formData.append("document_file", payload.document_file);
    }
    return api.post(`/admin/explore-candidates/profiles/${profileId}/documents`, formData);
  },
  updateProfileDocument: (documentId, payload) => {
    const formData = new FormData();
    if (payload.title !== undefined) formData.append("title", payload.title);
    if (payload.display_order !== undefined) {
      formData.append("display_order", String(payload.display_order));
    }
    if (payload.document_file_upload instanceof File) {
      formData.append("document_file_upload", payload.document_file_upload);
    }
    if (payload.document_file) {
      formData.append("document_file", payload.document_file);
    }
    return api.patch(`/admin/explore-candidates/documents/${documentId}`, formData);
  },
  deleteProfileDocument: (documentId) =>
    api.delete(`/admin/explore-candidates/documents/${documentId}`),

  fetchLegacyProfiles: (email) =>
    api.get("/admin/explore-candidates/sync/legacy-profiles", { params: { email } }),
};
