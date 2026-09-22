import { useMemo, useState } from "react";

// Column registry for the interview candidates table. `get` extracts the raw
// row value; `type` controls how it's normalized for comparison; `defaultDir`
// is the direction a first click on that header produces.
export const CANDIDATE_SORT_COLUMNS = {
  candidate_name: {
    type: "string",
    get: (row) => row.candidate_name,
    defaultDir: "asc",
  },
  status: {
    type: "string",
    get: (row) => row.status,
    defaultDir: "asc",
  },
  // Sorts by progress through the interview (fraction answered), matching the
  // "Q x / N" display rather than the raw index, which mixes unequal totals.
  current_question: {
    type: "number",
    get: (row) =>
      Number.isFinite(Number(row.total_questions)) &&
      Number(row.total_questions) > 0
        ? Number(row.current_question_index || 0) / Number(row.total_questions)
        : null,
    defaultDir: "desc",
  },
  started_at: {
    type: "date",
    get: (row) => row.started_at,
    defaultDir: "desc",
  },
  completed_at: {
    type: "date",
    get: (row) => row.completed_at,
    defaultDir: "desc",
  },
  review_status: {
    type: "string",
    get: (row) => row.overall_review_status,
    defaultDir: "asc",
  },
  reviewed: {
    type: "boolean",
    get: (row) => row.is_fully_reviewed,
    defaultDir: "desc",
  },
  evaluated_at: {
    type: "date",
    get: (row) => row.evaluated_at,
    defaultDir: "desc",
  },
  // Mirrors the displayed "overall_score || calculated_score" cell value.
  score: {
    type: "number",
    get: (row) => row.overall_score || row.calculated_score,
    defaultDir: "desc",
  },
  ai_score: {
    type: "number",
    get: (row) => row.ai_score,
    defaultDir: "desc",
  },
};

export const DEFAULT_CANDIDATE_SORT = {
  key: "completed_at",
  direction: "desc",
};

function normalizeValue(value, type) {
  if (value == null || value === "") return null;
  if (type === "date") {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (type === "number") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (type === "boolean") return value ? 1 : 0;
  return String(value).toLowerCase();
}

// Nulls always sort last regardless of direction — an empty Completed date or
// Score should sink, never leap to the top on a descending sort.
export function sortCandidates(rows, key, direction) {
  const column = CANDIDATE_SORT_COLUMNS[key];
  if (!column || !Array.isArray(rows)) return rows || [];

  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((rowA, rowB) => {
    const a = normalizeValue(column.get(rowA), column.type);
    const b = normalizeValue(column.get(rowB), column.type);

    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (a < b) return -dir;
    if (a > b) return dir;
    return 0;
  });
}

export function useCandidateSort(rows, defaultSort = DEFAULT_CANDIDATE_SORT) {
  const [sort, setSort] = useState(defaultSort);

  const sortedRows = useMemo(
    () => sortCandidates(rows, sort.key, sort.direction),
    [rows, sort],
  );

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: CANDIDATE_SORT_COLUMNS[key]?.defaultDir || "asc" },
    );
  };

  return { sort, sortedRows, toggleSort };
}
