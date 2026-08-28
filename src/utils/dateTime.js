export function formatDateTimeIST(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Admin scheduling inputs (IST by contract) ──────────────────────────────
// Every admin label says IST, the backend reads a bare datetime-local as +05:30,
// and the candidate result screen renders in Asia/Kolkata. Pinning the offset
// here stops a non-IST admin from silently setting a deadline hours off from
// what the candidate is shown. India has no DST, so a fixed offset is exact.
const IST_OFFSET = "+05:30";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** datetime-local string (read as IST) → UTC ISO string. */
export function toUTC(datetimeLocal) {
  if (!datetimeLocal) return null;
  const raw = String(datetimeLocal).trim().replace(" ", "T");
  const d = new Date(`${raw}${IST_OFFSET}`);
  // Throw rather than return null: a caller that fell back to null would
  // silently clear the field instead of reporting the bad input.
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date/time");
  return d.toISOString();
}

/** UTC timestamp → the YYYY-MM-DDTHH:mm IST slice a datetime-local expects. */
export function toLocalInput(utcStr) {
  if (!utcStr) return "";
  const normalized = String(utcStr).trim().replace(" ", "T");
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(normalized);
  const d = new Date(hasTimezone ? normalized : `${normalized}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** Admin-table display. Same zone as formatDateTimeIST, em-dash placeholder. */
export function formatDateTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrentQuestion(currentIndex, totalQuestions) {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return "-";
  const safeIndex = Number.isFinite(currentIndex) ? Math.max(currentIndex, 0) : 0;
  const current = Math.min(safeIndex + 1, totalQuestions);
  return `Q${current} / ${totalQuestions}`;
}
