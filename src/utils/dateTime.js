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

export function formatCurrentQuestion(currentIndex, totalQuestions) {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return "-";
  const safeIndex = Number.isFinite(currentIndex) ? Math.max(currentIndex, 0) : 0;
  const current = Math.min(safeIndex + 1, totalQuestions);
  return `Q${current} / ${totalQuestions}`;
}
