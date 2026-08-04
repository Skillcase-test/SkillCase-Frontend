import { beforeEach, describe, expect, test, vi } from "vitest";
import * as a1Api from "../api/a1Api";
import * as a2Api from "../api/a2Api";
import * as b1Api from "../api/b1Api";
import api from "../api/axios";

vi.mock("../api/axios", () => ({
  default: {
    cachedGet: vi.fn(),
    post: vi.fn(),
  },
}));

const levels = [
  {
    name: "A1",
    getCards: a1Api.getFlashcards,
    saveProgress: a1Api.saveFlashcardProgress,
    path: "/a1/flashcard/cards/chapter-1",
    progressPath: "/a1/flashcard/progress",
    tag: "a1:flashcard",
  },
  {
    name: "A2",
    getCards: a2Api.getFlashcards,
    saveProgress: a2Api.saveFlashcardProgress,
    path: "/a2/flashcard/cards/chapter-1",
    progressPath: "/a2/flashcard/progress",
    tag: "a2:flashcard",
  },
  {
    name: "B1",
    getCards: b1Api.getB1Flashcards,
    saveProgress: b1Api.saveB1FlashcardProgress,
    path: "/b1/flashcard/cards/chapter-1",
    progressPath: "/b1/flashcard/progress",
    tag: "b1:flashcard",
  },
];

const learningModules = [
  {
    name: "A1 grammar",
    get: a1Api.getGrammarQuestions,
    getArgs: ["topic-1"],
    path: "/a1/grammar/questions/topic-1",
    tag: "a1:grammar",
    save: a1Api.saveGrammarProgress,
    savePath: "/a1/grammar/progress",
  },
  {
    name: "A1 reading",
    get: a1Api.getReadingContent,
    getArgs: ["chapter-1"],
    path: "/a1/reading/content/chapter-1",
    tag: "a1:reading",
    save: a1Api.saveReadingProgress,
    savePath: "/a1/reading/progress",
  },
  {
    name: "A1 listening",
    get: a1Api.getListeningContent,
    getArgs: ["chapter-1"],
    path: "/a1/listening/content/chapter-1",
    tag: "a1:listening",
    save: a1Api.saveListeningProgress,
    savePath: "/a1/listening/progress",
  },
  {
    name: "A1 speaking",
    get: a1Api.getSpeakingContent,
    getArgs: ["chapter-1"],
    path: "/a1/speaking/content/chapter-1",
    tag: "a1:speaking",
    save: a1Api.saveSpeakingProgress,
    savePath: "/a1/speaking/progress",
  },
  {
    name: "A1 test",
    get: a1Api.getTestResults,
    getArgs: ["topic-1", "A1"],
    path: "/a1/test/topic-1/A1/results",
    tag: "a1:test",
    save: a1Api.submitTest,
    savePath: "/a1/test/submit",
  },
  {
    name: "A2 grammar",
    get: a2Api.getGrammarQuestions,
    getArgs: ["topic-1"],
    path: "/a2/grammar/questions/topic-1",
    tag: "a2:grammar",
    save: a2Api.saveGrammarProgress,
    savePath: "/a2/grammar/progress",
  },
  {
    name: "A2 reading",
    get: a2Api.getReadingContent,
    getArgs: ["chapter-1"],
    path: "/a2/reading/content/chapter-1",
    tag: "a2:reading",
    save: a2Api.saveReadingProgress,
    savePath: "/a2/reading/progress",
  },
  {
    name: "A2 listening",
    get: a2Api.getListeningContent,
    getArgs: ["chapter-1"],
    path: "/a2/listening/content/chapter-1",
    tag: "a2:listening",
    save: a2Api.saveListeningProgress,
    savePath: "/a2/listening/progress",
  },
  {
    name: "A2 speaking",
    get: a2Api.getSpeakingContent,
    getArgs: ["chapter-1"],
    path: "/a2/speaking/content/chapter-1",
    tag: "a2:speaking",
    save: a2Api.saveSpeakingProgress,
    savePath: "/a2/speaking/progress",
  },
  {
    name: "A2 test",
    get: a2Api.getTestResults,
    getArgs: ["topic-1", "A2"],
    path: "/a2/test/topic-1/A2/results",
    tag: "a2:test",
    save: a2Api.submitTest,
    savePath: "/a2/test/submit",
  },
  {
    name: "B1 read-listen",
    get: b1Api.getB1ReadingContent,
    getArgs: ["content-1"],
    path: "/b1/read-listen/content/content-1",
    tag: "b1:read-listen",
    save: b1Api.submitB1ReadingQuiz,
    savePath: "/b1/read-listen/submit",
  },
  {
    name: "B1 describe-speak",
    get: b1Api.getB1DescribeSpeakContent,
    getArgs: ["topic-1"],
    path: "/b1/describe-speak/content/topic-1",
    tag: "b1:describe-speak",
    save: b1Api.submitB1DescribeSpeakWriting,
    savePath: "/b1/describe-speak/submit-writing",
  },
  {
    name: "B1 video",
    get: b1Api.getB1VideoById,
    getArgs: ["video-1"],
    path: "/b1/video/video-1",
    tag: "b1:video",
    save: (payload) => b1Api.updateB1VideoProgress("video-1", payload),
    savePath: "/b1/video/video-1/progress",
    invalidatedTags: ["b1:read-listen", "b1:video"],
  },
];

const readOnlyChecks = [
  {
    name: "A1 grammar check",
    check: a1Api.checkGrammarAnswer,
    path: "/a1/grammar/check",
  },
  {
    name: "A1 reading check",
    check: a1Api.checkReadingAnswers,
    path: "/a1/reading/check",
  },
  {
    name: "A1 listening check",
    check: a1Api.checkListeningAnswers,
    path: "/a1/listening/check",
  },
  {
    name: "A2 grammar check",
    check: a2Api.checkGrammarAnswer,
    path: "/a2/grammar/check",
  },
  {
    name: "A2 reading check",
    check: a2Api.checkReadingAnswers,
    path: "/a2/reading/check",
  },
  {
    name: "A2 listening check",
    check: a2Api.checkListeningAnswers,
    path: "/a2/listening/check",
  },
];

describe("flashcard cache metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.cachedGet.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
  });

  test.each(levels)(
    "$name card reads use MEDIUM_PRIVATE and a flashcard cache tag",
    async ({ getCards, path, tag }) => {
      await getCards("chapter-1");

      expect(api.cachedGet).toHaveBeenCalledWith(
        path,
        { meta: { cacheTags: [tag] } },
        "MEDIUM_PRIVATE",
      );
    },
  );

  test.each(learningModules)(
    "$name reads use MEDIUM_PRIVATE and the module cache tag",
    async ({ get, getArgs, path, tag }) => {
      await get(...getArgs);

      expect(api.cachedGet).toHaveBeenCalledWith(
        path,
        { meta: { cacheTags: [tag] } },
        "MEDIUM_PRIVATE",
      );
    },
  );

  test.each(learningModules)(
    "$name progress/submit writes invalidate the module tag",
    async ({ save, savePath, tag, invalidatedTags = [tag] }) => {
      const payload = { currentIndex: 4, isCompleted: false };

      await save(payload);

      expect(api.post).toHaveBeenCalledWith(
        savePath,
        payload,
        expect.objectContaining({
          meta: expect.objectContaining({ invalidateCacheTags: invalidatedTags }),
        }),
      );
    },
  );

  test.each(readOnlyChecks)(
    "$name does not clear unrelated caches",
    async ({ check, path }) => {
      const payload = { questionId: "question-1", answer: "answer" };

      await check(payload);

      expect(api.post).toHaveBeenCalledWith(path, payload, {
        meta: { skipCacheInvalidation: true },
      });
    },
  );

  test.each(levels)(
    "$name progress writes invalidate the matching flashcard tag",
    async ({ saveProgress, progressPath, tag }) => {
      const payload = { setId: "set-1", currentIndex: 4 };

      await saveProgress(payload);

      expect(api.post).toHaveBeenCalledWith(
        progressPath,
        payload,
        expect.objectContaining({
          meta: expect.objectContaining({ invalidateCacheTags: [tag] }),
        }),
      );
    },
  );
});
