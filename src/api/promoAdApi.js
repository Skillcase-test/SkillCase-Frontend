import api from "./axios";

// Fresh fetch each time — a cache hit could resurrect a dismissed ad.
export const getEligibleAds = (surface) =>
  api.get("/promo-ads/eligible", { params: { surface } });

export const trackAdEvent = (adId, event, surface) =>
  api.post(`/promo-ads/${adId}/event`, { event, surface });
