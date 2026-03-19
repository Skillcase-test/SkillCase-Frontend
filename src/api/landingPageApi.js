import api from "./axios";

export const fetchSectionsByLevel = (level) =>
  api.get(`/landing-page/sections/${level}`);

export const saveDemoClass = (level, fields) =>
  api.put(`/admin/landing-page/demo-class/${level}`, fields);

export const saveSalaryInfo = (level, fields) =>
  api.put(`/admin/landing-page/salary-info/${level}`, fields);

export const saveTalkToTeam = (level, fields) =>
  api.put(`/admin/landing-page/talk-to-team/${level}`, fields);

export const uploadSectionImage = (section, level, file) => {
  const form = new FormData();
  form.append("image", file);
  return api.post(`/admin/landing-page/upload/${section}/${level}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
