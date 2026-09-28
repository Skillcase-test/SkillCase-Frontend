import api from "./axios";

// Guided German (v2) API. Mirrors learnGermanApi's cache-tag conventions so
// progress writes invalidate exactly the reads that render them and nothing
// else. The backend gates every route behind the learn_german_v2 flag, and
// its 402 responses flow through axios' global usage-limit modal handling.
export const LG2_CURRICULUM_CACHE_TAG = "learn-german-v2:curriculum";
export const LG2_STATE_CACHE_TAG = "learn-german-v2:state";
export const LG2_ART_CACHE_TAG = "learn-german-v2:art";

const LG2_PROGRESS_CACHE_TAGS = [LG2_STATE_CACHE_TAG];

const taggedGetConfig = (cacheTags) => ({
  meta: { cacheTags },
});

export const invalidateLg2ProgressCache = () => {
  api.invalidateGetCacheTags?.(LG2_PROGRESS_CACHE_TAGS);
};

export const getLg2Curriculum = () =>
  api.cachedGet(
    "/learn-german-v2/curriculum",
    taggedGetConfig([LG2_CURRICULUM_CACHE_TAG]),
    "MEDIUM_PRIVATE",
  );

export const getLg2Art = () =>
  api.cachedGet(
    "/learn-german-v2/art",
    taggedGetConfig([LG2_ART_CACHE_TAG]),
    "MEDIUM_PRIVATE",
  );

export const getLg2State = () =>
  api.cachedGet(
    "/learn-german-v2/state",
    taggedGetConfig([LG2_STATE_CACHE_TAG]),
    "NO_CACHE",
  );

// Gated on entry — a 402 here means today's learn_german allowance is spent.
// skipCacheInvalidation keeps the error response from clearing reads.
export const getLg2Sub = (topicId, subKey) =>
  api.get(`/learn-german-v2/topic/${topicId}/sub/${subKey}`, {
    meta: { skipCacheInvalidation: true },
  });

export const saveLg2Progress = (data) =>
  api.post("/learn-german-v2/progress", data, {
    meta: { skipCacheInvalidation: true },
  });

export const completeLg2Sub = ({ topicId, subKey, secs, accuracy, bestCombo }) =>
  api.post(
    "/learn-german-v2/complete",
    { topicId, subKey, secs, accuracy, bestCombo },
    {
      meta: {
        invalidateCacheTags: LG2_PROGRESS_CACHE_TAGS,
        refreshUsageLimitsOnSuccess: true,
      },
    },
  );

export const pushLg2Review = ({ de, en, icon }) =>
  api.post(
    "/learn-german-v2/review/push",
    { de, en, icon },
    { meta: { invalidateCacheTags: LG2_PROGRESS_CACHE_TAGS } },
  );

export const removeLg2Review = (de) =>
  api.post(
    "/learn-german-v2/review/remove",
    { de },
    { meta: { invalidateCacheTags: LG2_PROGRESS_CACHE_TAGS } },
  );

export const setLg2Cooldown = (kind) =>
  api.post(
    "/learn-german-v2/cooldown",
    { kind },
    { meta: { invalidateCacheTags: LG2_PROGRESS_CACHE_TAGS } },
  );

export const reportLg2Combo = (bestCombo) =>
  api.post(
    "/learn-german-v2/combo",
    { bestCombo },
    { meta: { invalidateCacheTags: LG2_PROGRESS_CACHE_TAGS } },
  );

export const trackLg2Visit = () =>
  api.post("/learn-german-v2/track-visit", null, {
    meta: { skipCacheInvalidation: true },
  });

// Azure-backed German TTS for v2 surfaces (word/listen/story audio). Returns
// a Blob — callers cache it client-side, same as v1's ttsCache.
export const getLg2TTS = (text, voiceName) =>
  api.post(
    "/learn-german-v2/tts",
    { text, voiceName },
    { responseType: "blob", meta: { skipCacheInvalidation: true } },
  );

// Maya's voice for narration (English lines in story/chat beats).
export const getLg2MayaTTS = (text) =>
  api.post(
    "/learn-german-v2/maya-tts",
    { text },
    { responseType: "blob", meta: { skipCacheInvalidation: true } },
  );
