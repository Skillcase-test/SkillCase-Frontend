import axios from "axios";
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
  getCloudinaryVideoUploadSignature: () =>
    api.post("/admin/explore-candidates/cloudinary/video-upload-signature"),

  uploadVideoDirect: async (file) => {
    if (!(file instanceof File)) return "";
    const signatureResponse = await api.post(
      "/admin/explore-candidates/cloudinary/video-upload-signature",
    );
    const uploadConfig = signatureResponse.data || {};
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("api_key", uploadConfig.api_key);
    uploadData.append("timestamp", String(uploadConfig.timestamp));
    uploadData.append("folder", uploadConfig.folder);
    uploadData.append("signature", uploadConfig.signature);

    const uploadResponse = await axios.post(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(uploadConfig.cloud_name)}/video/upload`,
      uploadData,
    );
    return uploadResponse.data?.secure_url || "";
  },

  listLibraryProfilesV2: (params = {}) =>
    api.get("/admin/explore-candidates/library-profiles", { params }),
  getLibraryProfileRecruitmentStatus: (profileUid) =>
    api.get(
      `/admin/explore-candidates/library-profiles/${encodeURIComponent(profileUid)}/recruitment-status`,
    ),
  enableLibraryProfileRecruitmentStatus: (profileUid) =>
    api.post(
      `/admin/explore-candidates/library-profiles/${encodeURIComponent(profileUid)}/recruitment-status/enable`,
    ),
  disableLibraryProfileRecruitmentStatus: (profileUid) =>
    api.post(
      `/admin/explore-candidates/library-profiles/${encodeURIComponent(profileUid)}/recruitment-status/disable`,
    ),
  getProfileRecruitmentStatus: (profileId) =>
    api.get(`/admin/explore-candidates/profiles/${profileId}/recruitment-status`),
  enableProfileRecruitmentStatus: (profileId) =>
    api.post(`/admin/explore-candidates/profiles/${profileId}/recruitment-status/enable`),
  disableProfileRecruitmentStatus: (profileId) =>
    api.post(`/admin/explore-candidates/profiles/${profileId}/recruitment-status/disable`),
  getLibraryProfileByUid: (profileUid) =>
    api.get(`/admin/explore-candidates/library-profiles/${encodeURIComponent(profileUid)}`),
  updateLibraryProfileByUid: (profileUid, payload) =>
    api.put(
      `/admin/explore-candidates/library-profiles/${encodeURIComponent(profileUid)}`,
      profileToFormData(payload),
    ),
  deleteLibraryProfileByUid: (profileUid) =>
    api.delete(`/admin/explore-candidates/library-profiles/${encodeURIComponent(profileUid)}`),

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
  updateAccountIdentity: (accountId, payload = {}) => {
    const formData = new FormData();
    if (payload.email) formData.append("email", payload.email);
    if (payload.partner_logo_file instanceof File) {
      formData.append("partner_logo_file", payload.partner_logo_file);
    }
    return api.patch(`/admin/explore-candidates/accounts/${accountId}/email`, formData);
  },

  listLibraryProfiles: () => api.get("/admin/explore-candidates/profiles/library"),
  getProfileById: (profileId) => {
    const val = String(profileId || "");
    if (val.includes(":")) {
      return api.get(`/admin/explore-candidates/library-profiles/${encodeURIComponent(val)}`);
    }
    return api.get(`/admin/explore-candidates/profiles/${profileId}`);
  },
  createProfile: (payload) =>
    api.post("/admin/explore-candidates/profiles", profileToFormData(payload)),
  updateProfile: (profileId, payload) => {
    const val = String(profileId || "");
    if (val.includes(":")) {
      return api.put(
        `/admin/explore-candidates/library-profiles/${encodeURIComponent(val)}`,
        profileToFormData(payload),
      );
    }
    return api.put(`/admin/explore-candidates/profiles/${profileId}`, profileToFormData(payload));
  },
  deleteProfile: (profileId) => {
    const val = String(profileId || "");
    if (val.includes(":")) {
      return api.delete(`/admin/explore-candidates/library-profiles/${encodeURIComponent(val)}`);
    }
    return api.delete(`/admin/explore-candidates/profiles/${profileId}`);
  },

  getAccountProfiles: (accountId) =>
    api.get(`/admin/explore-candidates/accounts/${accountId}/profiles`),
  assignProfile: (accountId, profileId, display_order = 0) =>
    api.post(`/admin/explore-candidates/accounts/${accountId}/assign`, {
      profile_id: profileId,
      display_order,
    }),
  assignBridgeProfile: (accountId, source_profile_id, source = "explore_php") =>
    api.post(`/admin/explore-candidates/accounts/${accountId}/assign-bridge`, {
      source,
      source_profile_id,
    }),
  addBridgeProfileToLocal: (source_profile_id, source = "explore_php") =>
    api.post(`/admin/explore-candidates/library-profiles/add-to-local`, {
      source,
      source_profile_id,
    }),
  unassignProfile: (accountId, profileId) =>
    api.delete(`/admin/explore-candidates/accounts/${accountId}/assign/${profileId}`),
  unassignBridgeProfile: (accountId, sourceProfileId) =>
    api.delete(`/admin/explore-candidates/accounts/${accountId}/assign-bridge/${sourceProfileId}`),
  updateAssignmentOrder: (accountId, profileId, displayOrder) =>
    api.patch(`/admin/explore-candidates/accounts/${accountId}/assign/${profileId}/order`, {
      display_order: displayOrder,
    }),

  addProfileVideo: async (profileId, payload) => {
    const nextPayload = { ...(payload || {}) };
    if (nextPayload.video_file_upload instanceof File) {
      nextPayload.video_file = await exploreCandidatesAdminApi.uploadVideoDirect(
        nextPayload.video_file_upload,
      );
    }
    delete nextPayload.video_file_upload;
    const val = String(profileId || "");
    if (val.includes(":")) {
      return api.post(
        `/admin/explore-candidates/library-profiles/${encodeURIComponent(val)}/videos`,
        nextPayload,
      );
    }
    return api.post(`/admin/explore-candidates/profiles/${profileId}/videos`, nextPayload);
  },
  updateProfileVideo: async (videoId, payload) => {
    const nextPayload = { ...(payload || {}) };
    if (nextPayload.video_file_upload instanceof File) {
      nextPayload.video_file = await exploreCandidatesAdminApi.uploadVideoDirect(
        nextPayload.video_file_upload,
      );
    }
    delete nextPayload.video_file_upload;
    const val = String(videoId || "");
    if (val.includes(":")) {
      return api.patch(
        `/admin/explore-candidates/library-videos/${encodeURIComponent(val)}`,
        nextPayload,
      );
    }
    return api.patch(`/admin/explore-candidates/videos/${videoId}`, nextPayload);
  },
  deleteProfileVideo: (videoId) => {
    const val = String(videoId || "");
    if (val.includes(":")) {
      return api.delete(`/admin/explore-candidates/library-videos/${encodeURIComponent(val)}`);
    }
    return api.delete(`/admin/explore-candidates/videos/${videoId}`);
  },

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
    const val = String(profileId || "");
    if (val.includes(":")) {
      return api.post(
        `/admin/explore-candidates/library-profiles/${encodeURIComponent(val)}/documents`,
        formData,
      );
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
    const val = String(documentId || "");
    if (val.includes(":")) {
      return api.patch(
        `/admin/explore-candidates/library-documents/${encodeURIComponent(val)}`,
        formData,
      );
    }
    return api.patch(`/admin/explore-candidates/documents/${documentId}`, formData);
  },
  deleteProfileDocument: (documentId) => {
    const val = String(documentId || "");
    if (val.includes(":")) {
      return api.delete(`/admin/explore-candidates/library-documents/${encodeURIComponent(val)}`);
    }
    return api.delete(`/admin/explore-candidates/documents/${documentId}`);
  },

  fetchLegacyProfiles: (email) =>
    api.get("/admin/explore-candidates/sync/legacy-profiles", { params: { email } }),

  listRecruiterLoginEvents: (params = {}) =>
    api.get("/admin/explore-candidates/recruiter-login-events", { params }),
};
