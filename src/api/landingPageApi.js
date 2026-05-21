import api from "./axios";

export const fetchSectionsByLevel = (level) =>
  api.get(`/landing-page/sections/${level}`, {
    params: { _t: Date.now() },
    meta: { cacheProfile: "NO_CACHE" },
  });

export const fetchAdminSectionsByLevel = (level) =>
  api.get(`/admin/landing-page/sections/${level}`, {
    params: { _t: Date.now() },
    meta: { cacheProfile: "NO_CACHE" },
  });

export const saveDemoClass = (level, fields) =>
  api.put(`/admin/landing-page/demo-class/${level}`, fields).then((res) => {
    api.clearGetCache?.();
    return res;
  });

export const saveSalaryInfo = (level, fields) =>
  api.put(`/admin/landing-page/salary-info/${level}`, fields).then((res) => {
    api.clearGetCache?.();
    return res;
  });

export const saveTalkToTeam = (level, fields) =>
  api.put(`/admin/landing-page/talk-to-team/${level}`, fields).then((res) => {
    api.clearGetCache?.();
    return res;
  });

export const uploadSectionImage = (section, level, file) => {
  const form = new FormData();
  form.append("image", file);
  return api.post(`/admin/landing-page/upload/${section}/${level}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
