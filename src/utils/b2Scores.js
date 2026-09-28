// Learning guidance bands already used by the B2 assessment summary.
// These are not Goethe/telc pass marks or a CEFR certification.
export const B2_SCORE_BANDS = {
  good: { key: "good", label: "Good", color: "#17764f", background: "#eaf5ef", range: "62–100%" },
  developing: { key: "developing", label: "Developing", color: "#946200", chartColor: "#b17a00", background: "#fff5dd", range: "42–61%" },
  practice: { key: "practice", label: "Needs practice", color: "#b3483e", background: "#fcefeb", range: "0–41%" },
  pending: { key: "pending", label: "Not scored yet", color: "#59687a", background: "#f0f3f7" },
};

export function normalizeB2Score(score) {
  if ((typeof score !== "number" && typeof score !== "string") || String(score).trim() === "") return null;
  const value = Number(score);
  return Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : null;
}

export function getB2ScoreBand(score) {
  const value = normalizeB2Score(score);
  return value === null ? B2_SCORE_BANDS.pending
    : value >= 62 ? B2_SCORE_BANDS.good
      : value >= 42 ? B2_SCORE_BANDS.developing
        : B2_SCORE_BANDS.practice;
}
