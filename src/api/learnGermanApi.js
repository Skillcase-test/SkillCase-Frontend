import api from "./axios";

export const getLGMode = () => api.cachedGet("/user/lg-mode", {}, "SHORT_PRIVATE");

export const setLGMode = async (mode) => {
  api.clearGetCache?.();
  const response = await api.post("/user/lg-mode", { mode });
  api.clearGetCache?.();
  return response;
};

export const getLessonById = (lessonId) =>
  api.cachedGet(`/dynamic-lesson/lesson/${lessonId}`, {}, "SHORT_PRIVATE");

export const getLessonsList = () =>
  api.cachedGet("/dynamic-lesson/list", {}, "SHORT_PRIVATE");

export const getLGCardTTS = (text, voiceName) =>
  api.post(
    "/dynamic-lesson/tts",
    { text, voiceName },
    { responseType: "blob" },
  );
