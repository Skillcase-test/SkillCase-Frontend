import api from "./axios";

export const LEARN_GERMAN_MODE_CACHE_TAG = "learn-german:mode";
export const LEARN_GERMAN_LESSONS_CACHE_TAG = "learn-german:dynamic-lessons";
export const LEARN_GERMAN_VOCAB_CACHE_TAG = "learn-german:vocab-progress";

const LEARN_GERMAN_PROGRESS_CACHE_TAGS = [
  LEARN_GERMAN_LESSONS_CACHE_TAG,
  LEARN_GERMAN_VOCAB_CACHE_TAG,
];

const taggedGetConfig = (cacheTags) => ({
  meta: { cacheTags },
});

export const invalidateLearnGermanProgressCache = () => {
  api.invalidateGetCacheTags?.(LEARN_GERMAN_PROGRESS_CACHE_TAGS);
};

export const getLGMode = () =>
  api.cachedGet(
    "/user/lg-mode",
    taggedGetConfig([LEARN_GERMAN_MODE_CACHE_TAG]),
    "SHORT_PRIVATE",
  );

export const setLGMode = (mode) =>
  api.post(
    "/user/lg-mode",
    { mode },
    { meta: { invalidateCacheTags: [LEARN_GERMAN_MODE_CACHE_TAG] } },
  );

export const getLessonById = (lessonId) =>
  api.cachedGet(
    `/dynamic-lesson/lesson/${lessonId}`,
    taggedGetConfig([LEARN_GERMAN_LESSONS_CACHE_TAG]),
    "SHORT_PRIVATE",
  );

export const getLessonByLevel = (level) =>
  api.cachedGet(
    `/dynamic-lesson/level/${level}`,
    taggedGetConfig([LEARN_GERMAN_LESSONS_CACHE_TAG]),
    "SHORT_PRIVATE",
  );

export const getLessonsList = () =>
  api.cachedGet(
    "/dynamic-lesson/list",
    taggedGetConfig([LEARN_GERMAN_LESSONS_CACHE_TAG]),
    "SHORT_PRIVATE",
  );

export const getVocabProgress = () =>
  api.cachedGet(
    "/dynamic-lesson/vocab-progress",
    taggedGetConfig([LEARN_GERMAN_VOCAB_CACHE_TAG]),
    "SHORT_PRIVATE",
  );

export const saveDynamicLessonProgress = (data) =>
  api.post("/dynamic-lesson/progress", data, {
    meta: { invalidateCacheTags: LEARN_GERMAN_PROGRESS_CACHE_TAGS },
  });

export const completeDynamicLesson = (lessonId) =>
  api.post(
    "/dynamic-lesson/complete",
    { lessonId },
    { meta: { invalidateCacheTags: LEARN_GERMAN_PROGRESS_CACHE_TAGS } },
  );

export const trackLearnGermanVisit = () =>
  api.post("/dynamic-lesson/track-visit", null, {
    meta: { skipCacheInvalidation: true },
  });

export const getLGCardTTS = (text, voiceName) =>
  api.post(
    "/dynamic-lesson/tts",
    { text, voiceName },
    { responseType: "blob", meta: { skipCacheInvalidation: true } },
  );
