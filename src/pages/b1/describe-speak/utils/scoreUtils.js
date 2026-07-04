export function getScoreColor(score) {
  const val = Number(score || 0);
  if (val >= 70) return "text-green-700 bg-green-600";
  if (val >= 40) return "text-orange-400 bg-amber-300";
  return "text-red-500 bg-red-500";
}

export function getScoreStrokeColor(score) {
  const val = Number(score || 0);
  if (val >= 70) return "#16A34A";
  if (val >= 40) return "#F59E0B";
  return "#EF4444";
}

export function getScoreGreeting(score) {
  const val = Number(score || 0);
  if (val >= 70) return "Good job 🚀";
  if (val >= 50) return "Well done! 👍";
  return "Keep practicing! 💪";
}
