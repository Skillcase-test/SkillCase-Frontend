import api from "./axios";

const VIDEO_COURSE_CACHE_TAG = "video-courses";

// STUDENT ENDPOINTS
export const getVideoCourses = (level) =>
  api.cachedGet(
    "/video-courses/courses",
    {
      ...(level ? { params: { level } } : {}),
      meta: { cacheTags: [VIDEO_COURSE_CACHE_TAG] },
    },
    "MEDIUM_PRIVATE",
  );
export const getVideoCourse = (courseId) =>
  api.cachedGet(
    `/video-courses/courses/${courseId}`,
    { meta: { cacheTags: [VIDEO_COURSE_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getVideoCourseVideos = (level) =>
  api.cachedGet(
    "/video-courses/list",
    {
      ...(level ? { params: { level } } : {}),
      meta: { cacheTags: [VIDEO_COURSE_CACHE_TAG] },
    },
    "MEDIUM_PRIVATE",
  );
// Debounced typing replays the same query often enough that a short cache
// meaningfully cuts requests; it is still far below the progress TTL.
export const searchVideoCourseVideos = (q) =>
  api.cachedGet(
    "/video-courses/search",
    { params: { q }, meta: { cacheTags: [VIDEO_COURSE_CACHE_TAG] } },
    "SHORT_PRIVATE",
  );
export const getVideoCourseVideo = (videoId) =>
  api.cachedGet(
    `/video-courses/${videoId}`,
    { meta: { cacheTags: [VIDEO_COURSE_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const updateVideoCourseProgress = (videoId, data) =>
  api.post(`/video-courses/${videoId}/progress`, data, {
    meta: {
      invalidateCacheTags: [VIDEO_COURSE_CACHE_TAG],
      // Only a completion consumes the "video_courses" quota server-side.
      ...(data?.completed === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });
export const getVideoCourseProgress = (videoId) =>
  api.get(`/video-courses/${videoId}/progress`);
export const chatWithVideo = (videoId, message, history = [], language = "en") =>
  api.post(
    `/video-courses/${videoId}/chat`,
    { message, history, language },
    { meta: { skipCacheInvalidation: true } },
  );

export const getSuggestedVideoQuestions = (videoId) =>
  api.cachedGet(
    `/video-courses/${videoId}/suggested-questions`,
    { meta: { cacheTags: [VIDEO_COURSE_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );

// ADMIN ENDPOINTS
export const getVideoCoursesAdmin = () => api.get("/admin/video-courses/courses");
export const createVideoCourse = (data) => api.post("/admin/video-courses/courses", data);
export const updateVideoCourseAdmin = (courseId, data) =>
  api.put(`/admin/video-courses/courses/${courseId}`, data);
export const deleteVideoCourse = (courseId) =>
  api.delete(`/admin/video-courses/courses/${courseId}`);
export const uploadVideoCourseThumbnail = (formData) =>
  api.post("/admin/video-courses/course-thumbnail", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getVideoCourseVideosAdmin = () => api.get("/admin/video-courses/all");
export const initVideoCourseUpload = (data) => api.post("/admin/video-courses/init", data);
export const completeVideoCourseUpload = (formData) =>
  api.post("/admin/video-courses/complete", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateVideoCourseVideo = (videoId, data) =>
  api.put(`/admin/video-courses/${videoId}`, data);
export const updateVideoCourseVideoThumbnail = (videoId, formData) =>
  api.patch(`/admin/video-courses/${videoId}/thumbnail`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteVideoCourseVideo = (videoId) =>
  api.delete(`/admin/video-courses/${videoId}`);
export const getVideoCourseProcessingStatus = (videoId) =>
  api.get(`/admin/video-courses/${videoId}/status`);


export const getVideoCourseTimestamps = (videoId) =>
  api.get(`/admin/video-courses/${videoId}/timestamps`);

export const addVideoCourseTimestamp = (videoId, data) =>
  api.post(`/admin/video-courses/${videoId}/timestamp`, data);
export const updateVideoCourseTimestamp = (videoId, timestampId, data) =>
  api.put(`/admin/video-courses/${videoId}/timestamp/${timestampId}`, data);
export const deleteVideoCourseTimestamp = (videoId, timestampId) =>
  api.delete(`/admin/video-courses/${videoId}/timestamp/${timestampId}`);
