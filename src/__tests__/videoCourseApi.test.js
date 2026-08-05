/**
 * Frontend Tests — videoCourseApi.js
 *
 * Verifies every learner + admin endpoint hits the right method/path, that
 * reads go through api.cachedGet with a cache profile, and that mutations
 * do not cache.
 */
import { vi } from "vitest";
import * as videoCourseApi from "../api/videoCourseApi";
import axios from "../api/axios";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    cachedGet: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

describe("videoCourseApi", () => {
  let mockGet, mockPost, mockPut, mockPatch, mockDelete, mockCachedGet;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocked = vi.mocked(axios);
    mockGet = mocked.get;
    mockPost = mocked.post;
    mockPut = mocked.put;
    mockPatch = mocked.patch;
    mockDelete = mocked.delete;
    mockCachedGet = mocked.cachedGet;
    [mockGet, mockPost, mockPut, mockPatch, mockDelete, mockCachedGet].forEach(
      (fn) => fn.mockResolvedValue({ data: {} }),
    );
  });

  describe("Learner endpoints", () => {
    test("getVideoCourses calls cachedGet /video-courses/courses", async () => {
      await videoCourseApi.getVideoCourses();
      const [url, config, profile] = mockCachedGet.mock.calls[0];
      expect(url).toBe("/video-courses/courses");
      expect(config.params).toBeUndefined();
      expect(profile).toBe("MEDIUM_PRIVATE");
    });

    test("getVideoCourses passes the level filter as a query param", async () => {
      await videoCourseApi.getVideoCourses("B1");
      expect(mockCachedGet.mock.calls[0][1].params).toEqual({ level: "B1" });
    });

    test("getVideoCourse calls cachedGet /video-courses/courses/:id", async () => {
      await videoCourseApi.getVideoCourse(7);
      expect(mockCachedGet.mock.calls[0][0]).toBe("/video-courses/courses/7");
    });

    test("getVideoCourseVideos calls cachedGet /video-courses/list", async () => {
      await videoCourseApi.getVideoCourseVideos();
      expect(mockCachedGet.mock.calls[0][0]).toBe("/video-courses/list");
    });

    test("searchVideoCourseVideos passes q and uses a short cache", async () => {
      await videoCourseApi.searchVideoCourseVideos("essen");
      const [url, config, profile] = mockCachedGet.mock.calls[0];
      expect(url).toBe("/video-courses/search");
      expect(config.params).toEqual({ q: "essen" });
      expect(profile).toBe("SHORT_PRIVATE");
    });

    test("getVideoCourseVideo calls cachedGet /video-courses/:id", async () => {
      await videoCourseApi.getVideoCourseVideo("v1");
      expect(mockCachedGet.mock.calls[0][0]).toBe("/video-courses/v1");
    });

    test("updateVideoCourseProgress posts progress without a usage refresh", async () => {
      const body = { watch_time_seconds: 30, completed: false };
      await videoCourseApi.updateVideoCourseProgress("v1", body);
      const [url, data, config] = mockPost.mock.calls[0];
      expect(url).toBe("/video-courses/v1/progress");
      expect(data).toEqual(body);
      expect(config.meta.refreshUsageLimitsOnSuccess).toBeUndefined();
    });

    test("updateVideoCourseProgress refreshes usage limits on completion", async () => {
      await videoCourseApi.updateVideoCourseProgress("v1", {
        watch_time_seconds: 300,
        completed: true,
      });
      expect(mockPost.mock.calls[0][2].meta.refreshUsageLimitsOnSuccess).toBe(true);
    });

    test("getVideoCourseProgress calls GET /video-courses/:id/progress", async () => {
      await videoCourseApi.getVideoCourseProgress("v1");
      expect(mockGet).toHaveBeenCalledWith("/video-courses/v1/progress");
    });

    test("chatWithVideo posts message and history", async () => {
      await videoCourseApi.chatWithVideo("v1", "Was ist das?", [
        { role: "user", content: "hi" },
      ]);
      const [url, data] = mockPost.mock.calls[0];
      expect(url).toBe("/video-courses/v1/chat");
      expect(data).toEqual({
        message: "Was ist das?",
        history: [{ role: "user", content: "hi" }],
      });
    });

    test("chatWithVideo defaults history to an empty array", async () => {
      await videoCourseApi.chatWithVideo("v1", "hallo");
      expect(mockPost.mock.calls[0][1].history).toEqual([]);
    });

    test("getSuggestedVideoQuestions calls cachedGet suggested-questions", async () => {
      await videoCourseApi.getSuggestedVideoQuestions("v1");
      expect(mockCachedGet.mock.calls[0][0]).toBe(
        "/video-courses/v1/suggested-questions",
      );
    });
  });

  describe("Admin endpoints", () => {
    test("getVideoCoursesAdmin calls GET /admin/video-courses/courses", async () => {
      await videoCourseApi.getVideoCoursesAdmin();
      expect(mockGet).toHaveBeenCalledWith("/admin/video-courses/courses");
    });

    test("createVideoCourse posts to /admin/video-courses/courses", async () => {
      await videoCourseApi.createVideoCourse({ name: "Basics" });
      expect(mockPost).toHaveBeenCalledWith("/admin/video-courses/courses", {
        name: "Basics",
      });
    });

    test("updateVideoCourseAdmin puts to /admin/video-courses/courses/:id", async () => {
      await videoCourseApi.updateVideoCourseAdmin(3, { name: "Renamed" });
      expect(mockPut).toHaveBeenCalledWith("/admin/video-courses/courses/3", {
        name: "Renamed",
      });
    });

    test("deleteVideoCourse deletes /admin/video-courses/courses/:id", async () => {
      await videoCourseApi.deleteVideoCourse(3);
      expect(mockDelete).toHaveBeenCalledWith("/admin/video-courses/courses/3");
    });

    test("uploadVideoCourseThumbnail sends multipart form data", async () => {
      const formData = new FormData();
      await videoCourseApi.uploadVideoCourseThumbnail(formData);
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/video-courses/course-thumbnail",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    test("getVideoCourseVideosAdmin calls GET /admin/video-courses/all", async () => {
      await videoCourseApi.getVideoCourseVideosAdmin();
      expect(mockGet).toHaveBeenCalledWith("/admin/video-courses/all");
    });

    test("initVideoCourseUpload posts contentType to /init", async () => {
      await videoCourseApi.initVideoCourseUpload({ contentType: "video/mp4" });
      expect(mockPost).toHaveBeenCalledWith("/admin/video-courses/init", {
        contentType: "video/mp4",
      });
    });

    test("completeVideoCourseUpload sends multipart form data", async () => {
      const formData = new FormData();
      await videoCourseApi.completeVideoCourseUpload(formData);
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/video-courses/complete",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    test("updateVideoCourseVideo puts to /admin/video-courses/:id", async () => {
      await videoCourseApi.updateVideoCourseVideo("v1", { title: "New" });
      expect(mockPut).toHaveBeenCalledWith("/admin/video-courses/v1", {
        title: "New",
      });
    });

    test("updateVideoCourseVideoThumbnail patches the thumbnail", async () => {
      const formData = new FormData();
      await videoCourseApi.updateVideoCourseVideoThumbnail("v1", formData);
      expect(mockPatch).toHaveBeenCalledWith(
        "/admin/video-courses/v1/thumbnail",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    test("deleteVideoCourseVideo deletes /admin/video-courses/:id", async () => {
      await videoCourseApi.deleteVideoCourseVideo("v1");
      expect(mockDelete).toHaveBeenCalledWith("/admin/video-courses/v1");
    });

    test("getVideoCourseTimestamps reads the nested timestamp list", async () => {
      await videoCourseApi.getVideoCourseTimestamps("v1");
      expect(mockGet).toHaveBeenCalledWith("/admin/video-courses/v1/timestamps");
    });

    test("timestamp CRUD hits the nested timestamp paths", async () => {
      await videoCourseApi.addVideoCourseTimestamp("v1", { label: "Intro" });
      expect(mockPost).toHaveBeenCalledWith("/admin/video-courses/v1/timestamp", {
        label: "Intro",
      });

      await videoCourseApi.updateVideoCourseTimestamp("v1", "t1", { label: "X" });
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/video-courses/v1/timestamp/t1",
        { label: "X" },
      );

      await videoCourseApi.deleteVideoCourseTimestamp("v1", "t1");
      expect(mockDelete).toHaveBeenCalledWith(
        "/admin/video-courses/v1/timestamp/t1",
      );
    });
  });
});
