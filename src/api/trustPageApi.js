import api from "./axios";

// Public: Get all content sections
export const fetchTrustPageContent = () =>
  api.get("/trust-page/content", {
    params: { _t: Date.now() },
  });

// Admin: Get S3 presigned URL for upload
export const getPresignedUploadUrl = (fileName, fileType, category) =>
  api.post("/admin/trust-page/upload", { fileName, fileType, category });

// Admin: Candidates CRUD
export const saveCandidate = (data, id = null) => {
  if (id) {
    return api.put(`/admin/trust-page/candidates/${id}`, data);
  }
  return api.post("/admin/trust-page/candidates", data);
};

export const deleteCandidate = (id) =>
  api.delete(`/admin/trust-page/candidates/${id}`);

// Admin: Learning Stack CRUD
export const saveLearningComponent = (data, id = null) => {
  if (id) {
    return api.put(`/admin/trust-page/learning/${id}`, data);
  }
  return api.post("/admin/trust-page/learning", data);
};

export const deleteLearningComponent = (id) =>
  api.delete(`/admin/trust-page/learning/${id}`);

// Admin: Videos CRUD (Student & Guest Lectures)
export const saveVideo = (data, id = null) => {
  if (id) {
    return api.put(`/admin/trust-page/videos/${id}`, data);
  }
  return api.post("/admin/trust-page/videos", data);
};

export const deleteVideo = (id) =>
  api.delete(`/admin/trust-page/videos/${id}`);

// Admin: Language Notes CRUD
export const saveLanguageNote = (data, id = null) => {
  if (id) {
    return api.put(`/admin/trust-page/notes/${id}`, data);
  }
  return api.post("/admin/trust-page/notes", data);
};

export const deleteLanguageNote = (id) =>
  api.delete(`/admin/trust-page/notes/${id}`);

// Admin: Curated Reviews CRUD
export const saveReview = (data, id = null) => {
  if (id) {
    return api.put(`/admin/trust-page/reviews/${id}`, data);
  }
  return api.post("/admin/trust-page/reviews", data);
};

export const deleteReview = (id) =>
  api.delete(`/admin/trust-page/reviews/${id}`);

// Admin: App Screenshots CRUD
export const saveScreenshot = (data) =>
  api.post("/admin/trust-page/screenshots", data);

export const deleteScreenshot = (id) =>
  api.delete(`/admin/trust-page/screenshots/${id}`);

// Admin: Hero Content CRUD
export const saveHeroContent = (data) =>
  api.post("/admin/trust-page/hero", data);

// Admin: FAQs CRUD
export const saveFaq = (data, id = null) => {
  if (id) {
    return api.put(`/admin/trust-page/faqs/${id}`, data);
  }
  return api.post("/admin/trust-page/faqs", data);
};

export const deleteFaq = (id) =>
  api.delete(`/admin/trust-page/faqs/${id}`);

// Admin: Service Cart Blocks CRUD
export const saveCartBlock = (data, id = null) => {
  if (id) {
    return api.put(`/admin/trust-page/cart-blocks/${id}`, data);
  }
  return api.post("/admin/trust-page/cart-blocks", data);
};

export const deleteCartBlock = (id) =>
  api.delete(`/admin/trust-page/cart-blocks/${id}`);

export const reorderCartBlocks = (orderedIds) =>
  api.put("/admin/trust-page/cart-blocks/reorder", { orderedIds });
