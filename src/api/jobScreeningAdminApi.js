import api from "./axios";

export const adminGetCandidates = (
  page = 1,
  limit = 10,
  search = "",
  status = "total",
  startDate = "",
  endDate = "",
  proficiencyLevel = "",
  sortBy = "activity_desc",
  extraFilters = {},
) =>
  api.get("/admin/job-screening/candidates", {
    params: {
      page,
      limit,
      search,
      status,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      proficiency_level: proficiencyLevel || undefined,
      sort_by: sortBy || undefined,
      payment_status: extraFilters.paymentStatus || undefined,
      score_op: extraFilters.scoreOp || undefined,
      score_value: extraFilters.scoreValue || undefined,
      experience: extraFilters.experience || undefined,
      qualification: extraFilters.qualification || undefined,
      departments:
        extraFilters.departments && extraFilters.departments.length
          ? JSON.stringify(extraFilters.departments)
          : undefined,
    },
  });

export const adminGetCandidateDetail = (userId) =>
  api.get(`/admin/job-screening/candidates/${userId}`);

export const adminUpdateCandidate = (userId, payload) =>
  api.put(`/admin/job-screening/candidates/${userId}`, payload);

export const adminReviewAdditionalDoc = (userId, docId, payload) =>
  api.patch(
    `/admin/job-screening/candidates/${userId}/additional-documents/${docId}`,
    payload,
  );

export const adminUploadProfileDocuments = (userId, formData) =>
  api.post(
    `/admin/job-screening/candidates/${userId}/profile-documents`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

export const adminUploadAdditionalDocForCandidate = (userId, docId, formData) =>
  api.post(
    `/admin/job-screening/candidates/${userId}/additional-documents/${docId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

export const adminUploadOfferLetter = (userId, formData, recruiterAccountId) =>
  api.post(`/admin/job-screening/candidates/${userId}/offer-letter`, formData, {
    params: recruiterAccountId ? { recruiterAccountId } : {},
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const adminUploadTrainingScheduleImage = (userId, formData) =>
  api.post(
    `/admin/job-screening/candidates/${userId}/training-schedule-image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

export const adminUploadRecruiterScheduleImage = (
  userId,
  formData,
  recruiterAccountId,
) =>
  api.post(
    `/admin/job-screening/candidates/${userId}/recruiter-schedule-image`,
    formData,
    {
      params: recruiterAccountId ? { recruiterAccountId } : {},
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

export const getAdminDropdownOptions = () =>
  api.get("/admin/job-screening/options");

export const adminGetSettings = () => api.get("/admin/job-screening/settings");

export const adminUpdateSettings = (payload) =>
  api.post("/admin/job-screening/settings", payload);

// Select Opportunity step — admin-authored opportunities (max 3 active).
export const adminListOpportunities = () =>
  api.get("/admin/job-screening/opportunities");

export const adminCreateOpportunity = (payload) =>
  api.post("/admin/job-screening/opportunities", payload);

export const adminUpdateOpportunity = (id, payload) =>
  api.put(`/admin/job-screening/opportunities/${id}`, payload);

export const adminReorderOpportunities = (ids) =>
  api.put("/admin/job-screening/opportunities/order", { ids });

export const adminDeleteOpportunity = (id) =>
  api.delete(`/admin/job-screening/opportunities/${id}`);

export const adminUploadOpportunityImage = (id, formData) =>
  api.post(`/admin/job-screening/opportunities/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const adminSetOpportunityDecision = (userId, opportunityId, status) =>
  api.put(
    `/admin/job-screening/candidates/${userId}/opportunities/${opportunityId}/decision`,
    { status },
  );

export const adminSetOpportunityVisibility = (userId, opportunityId, hidden) =>
  api.put(
    `/admin/job-screening/candidates/${userId}/opportunities/${opportunityId}/visibility`,
    { hidden },
  );
