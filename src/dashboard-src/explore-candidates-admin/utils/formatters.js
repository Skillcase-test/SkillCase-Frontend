export function formatIstDateTime(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";
}

export function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
      })
    : "-";
}

export function formatRecruitmentStageLabel(stage) {
  const map = {
    in_process: "In Process",
    viewed: "Viewed",
    rejected: "Rejected",
    shortlisted: "Shortlisted",
    scheduled_interview: "Scheduled Interview",
  };
  return map[stage] || "In Process";
}

export function normalizeDateForInput(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function calculateAgeFromDob(dob) {
  // dob is normalized to "YYYY-MM-DD"; parsing the parts directly avoids the
  // UTC-midnight pitfall of `new Date("YYYY-MM-DD")` behind-UTC timezones.
  const [year, month, day] = String(dob || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const now = new Date();
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 && age <= 120 ? String(age) : "";
}

export function getDisplayFileName(value) {
  if (!value) return "";
  if (typeof File !== "undefined" && value instanceof File) return value.name;
  const raw = String(value);
  try {
    const clean = raw.split("?")[0];
    const parts = clean.split("/");
    return decodeURIComponent(parts[parts.length - 1] || raw);
  } catch {
    return raw;
  }
}

export function getStoredAssetLabel(url, fallback = "Uploaded file") {
  if (!url) return fallback;
  const clean = String(url).split("?")[0];
  const candidate = decodeURIComponent(clean.split("/").pop() || "");
  if (!candidate) return fallback;
  const stem = candidate.replace(/\.[^.]+$/, "");
  if (/^[a-z0-9]{12,}$/i.test(stem)) return fallback;
  return candidate;
}

export function guessMimeFromUrl(url) {
  const ext = String(url).split("?")[0].split(".").pop()?.toLowerCase();
  const map = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
  };
  return map[ext] || "application/pdf";
}

export async function openAssetInline(url) {
  const expectedMime = guessMimeFromUrl(url);
  try {
    const res = await fetch(url);
    const rawBlob = await res.blob();
    const blob =
      rawBlob.type && rawBlob.type !== "application/octet-stream"
        ? rawBlob
        : rawBlob.slice(0, rawBlob.size, expectedMime);
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  } catch (err) {
    console.error("Failed to open asset inline, falling back to direct link", err);
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function pickPdfOrReset(file, inputEl) {
  if (!file) return null;
  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (!isPdf) {
    window.alert("Only PDF files are allowed.");
    if (inputEl) inputEl.value = "";
    return null;
  }
  return file;
}
