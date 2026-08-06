import api from "./axios";

const NOTES_CACHE_TAG = "notes";

// LEARNER ENDPOINTS
export const getNotes = ({ language, level, q } = {}) => {
  const params = {};
  if (language) params.language = language;
  if (level) params.level = level;
  if (q) params.q = q;

  const profile = q ? "SHORT_PRIVATE" : "MEDIUM_PRIVATE";

  return api.cachedGet(
    "/notes",
    {
      params,
      meta: { cacheTags: [NOTES_CACHE_TAG] },
    },
    profile,
  );
};

export const getNote = (noteId) =>
  api.cachedGet(
    `/notes/${noteId}`,
    {
      meta: {
        cacheTags: [NOTES_CACHE_TAG],
      },
    },
    "MEDIUM_PRIVATE",
  );


// ADMIN ENDPOINTS
export const getNotesAdmin = () => api.get("/admin/notes/all");

export const uploadNoteAdmin = (formData) =>
  api.post("/admin/notes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    meta: { invalidateCacheTags: [NOTES_CACHE_TAG] },
  });

export const updateNoteAdmin = (noteId, data) =>
  api.put(`/admin/notes/${noteId}`, data, {
    meta: { invalidateCacheTags: [NOTES_CACHE_TAG] },
  });

export const deleteNoteAdmin = (noteId) =>
  api.delete(`/admin/notes/${noteId}`, {
    meta: { invalidateCacheTags: [NOTES_CACHE_TAG] },
  });

export const getStudentList = ({ search, page, limit } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  return api.get("/admin/notes/students", { params });
};

export const toggleStudentNotesAccess = (userId, enabled) =>
  api.put(`/user/${userId}/notes-enabled`, { enabled });
