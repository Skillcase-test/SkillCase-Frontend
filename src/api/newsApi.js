import api from "./axios";

export const getNewsFeed = ({ level = "ALL", lang = "de", limit = 10 } = {}) =>
  api.cachedGet("/news", { params: { level, lang, limit } }, "SHORT_PRIVATE");

export const getNewsById = (newsId, { lang = "de" } = {}) =>
  api.cachedGet(`/news/${newsId}`, { params: { lang } }, "SHORT_PRIVATE");

export const getNewsHintStatus = () =>
  api.cachedGet("/user/news-hint", {}, "SHORT_PRIVATE");

export const markNewsHintSeen = () => api.post("/user/news-hint/seen");
