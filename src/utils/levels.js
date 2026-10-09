// Pure proficiency-level predicates — kept dependency-free so paywall/premium
// surfaces can use them without pulling the API layer in transitively.

export function isB1PracticeLevel(level) {
  return String(level || "").toLowerCase() === "b1";
}

export function isB2PracticeLevel(level) {
  const normalized = String(level || "").toLowerCase();
  return normalized === "b2" || normalized === "c1" || normalized === "c2";
}

// The shared "practice suite" segment (top mode switcher, jobs tab, app
// shell). B1 and B2 users get identical chrome — only the content differs.
export function isPracticeSuiteLevel(level) {
  return isB1PracticeLevel(level) || isB2PracticeLevel(level);
}
