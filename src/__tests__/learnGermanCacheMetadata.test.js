import { beforeEach, describe, expect, test, vi } from "vitest";
import * as learnGermanApi from "../api/learnGermanApi";
import api from "../api/axios";

vi.mock("../api/axios", () => ({
  default: {
    cachedGet: vi.fn(),
    post: vi.fn(),
    invalidateGetCacheTags: vi.fn(),
  },
}));

describe("Learn German cache metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.cachedGet.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
  });

  test.each([
    [
      "mode",
      learnGermanApi.getLGMode,
      "/user/lg-mode",
      [learnGermanApi.LEARN_GERMAN_MODE_CACHE_TAG],
    ],
    [
      "lesson by id",
      () => learnGermanApi.getLessonById("lesson-1"),
      "/dynamic-lesson/lesson/lesson-1",
      [learnGermanApi.LEARN_GERMAN_LESSONS_CACHE_TAG],
    ],
    [
      "lesson by level",
      () => learnGermanApi.getLessonByLevel("A1"),
      "/dynamic-lesson/level/A1",
      [learnGermanApi.LEARN_GERMAN_LESSONS_CACHE_TAG],
    ],
    [
      "lesson list",
      learnGermanApi.getLessonsList,
      "/dynamic-lesson/list",
      [learnGermanApi.LEARN_GERMAN_LESSONS_CACHE_TAG],
    ],
    [
      "vocabulary progress",
      learnGermanApi.getVocabProgress,
      "/dynamic-lesson/vocab-progress",
      [learnGermanApi.LEARN_GERMAN_VOCAB_CACHE_TAG],
    ],
  ])(
    "%s reads remain SHORT_PRIVATE and carry their cache tag",
    async (_name, read, path, cacheTags) => {
      await read();

      expect(api.cachedGet).toHaveBeenCalledWith(
        path,
        { meta: { cacheTags } },
        "SHORT_PRIVATE",
      );
    },
  );

  test("mode writes invalidate only the mode cache", async () => {
    await learnGermanApi.setLGMode("learn");

    expect(api.post).toHaveBeenCalledWith(
      "/user/lg-mode",
      { mode: "learn" },
      {
        meta: {
          invalidateCacheTags: [learnGermanApi.LEARN_GERMAN_MODE_CACHE_TAG],
        },
      },
    );
  });

  test.each([
    [
      "partial progress",
      () =>
        learnGermanApi.saveDynamicLessonProgress({
          lessonId: "lesson-1",
          screensCompleted: 3,
        }),
      "/dynamic-lesson/progress",
      { lessonId: "lesson-1", screensCompleted: 3 },
    ],
    [
      "completion",
      () => learnGermanApi.completeDynamicLesson("lesson-1"),
      "/dynamic-lesson/complete",
      { lessonId: "lesson-1" },
    ],
  ])(
    "%s writes invalidate lesson and vocabulary progress caches",
    async (_name, write, path, payload) => {
      await write();

      expect(api.post).toHaveBeenCalledWith(path, payload, {
        meta: {
          invalidateCacheTags: [
            learnGermanApi.LEARN_GERMAN_LESSONS_CACHE_TAG,
            learnGermanApi.LEARN_GERMAN_VOCAB_CACHE_TAG,
          ],
        },
      });
    },
  );

  test("visit tracking and TTS do not invalidate lesson caches", async () => {
    await learnGermanApi.trackLearnGermanVisit();
    await learnGermanApi.getLGCardTTS("Hallo", "de-DE-KatjaNeural");

    expect(api.post).toHaveBeenNthCalledWith(
      1,
      "/dynamic-lesson/track-visit",
      null,
      { meta: { skipCacheInvalidation: true } },
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      "/dynamic-lesson/tts",
      { text: "Hallo", voiceName: "de-DE-KatjaNeural" },
      { responseType: "blob", meta: { skipCacheInvalidation: true } },
    );
  });

  test("explicit refresh invalidates only Learn German progress tags", () => {
    learnGermanApi.invalidateLearnGermanProgressCache();

    expect(api.invalidateGetCacheTags).toHaveBeenCalledWith([
      learnGermanApi.LEARN_GERMAN_LESSONS_CACHE_TAG,
      learnGermanApi.LEARN_GERMAN_VOCAB_CACHE_TAG,
    ]);
  });
});
