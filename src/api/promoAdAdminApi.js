import api from "./axios";

export const adminListPromoAds = () => api.get("/admin/promo-ads");

export const adminCreatePromoAd = (payload) =>
  api.post("/admin/promo-ads", payload);

export const adminUpdatePromoAd = (id, payload) =>
  api.put(`/admin/promo-ads/${id}`, payload);

export const adminReorderPromoAds = (ids) =>
  api.put("/admin/promo-ads/order", { ids });

export const adminDeletePromoAd = (id) => api.delete(`/admin/promo-ads/${id}`);

export const adminDuplicatePromoAd = (id) =>
  api.post(`/admin/promo-ads/${id}/duplicate`);

export const adminUploadPromoAdImage = (id, formData) =>
  api.post(`/admin/promo-ads/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// params: { q } to search, { ids: "a,b" } to resolve saved selections.
export const adminSearchUsers = (params) =>
  api.get("/admin/promo-ads/user-search", { params });
