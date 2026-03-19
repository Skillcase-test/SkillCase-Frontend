import api from "./axios";

export const getNewsFeed = ({ level = "ALL", lang = "de", limit = 10 } = {}) =>
  api.get("/news", { params: { level, lang, limit } });

export const getNewsById = (newsId, { lang = "de" } = {}) =>
  api.get(`/news/${newsId}`, { params: { lang } });

export const getNewsHintStatus = () => api.get("/user/news-hint");

export const markNewsHintSeen = () => api.post("/user/news-hint/seen");
