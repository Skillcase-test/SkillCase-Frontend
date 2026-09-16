import api from "./axios";

// Public endpoints backing the /r/:code smart redirect — no auth required.
export const getReferralLanding = (code) =>
  api.get(`/referrals/r/${encodeURIComponent(code)}`);

export const trackReferralClick = (code) =>
  api.post(`/referrals/r/${encodeURIComponent(code)}/click`);
