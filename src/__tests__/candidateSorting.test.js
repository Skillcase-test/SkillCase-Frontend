import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  CANDIDATE_SORT_COLUMNS,
  DEFAULT_CANDIDATE_SORT,
  sortCandidates,
  useCandidateSort,
} from "../pages/interviewTools/shared/candidateSorting";

const makeRow = (overrides = {}) => ({
  submission_id: Math.random(),
  candidate_name: "Candidate",
  status: "completed",
  current_question_index: 0,
  total_questions: 5,
  started_at: "2026-01-01T10:00:00Z",
  completed_at: "2026-01-01T11:00:00Z",
  overall_review_status: "in_review",
  is_fully_reviewed: false,
  overall_score: null,
  calculated_score: null,
  ai_score: null,
  ...overrides,
});

describe("sortCandidates", () => {
  test("default sort puts the most recently completed submission first", () => {
    const rows = [
      makeRow({ completed_at: "2026-01-01T11:00:00Z" }),
      makeRow({ completed_at: "2026-01-03T11:00:00Z" }),
      makeRow({ completed_at: "2026-01-02T11:00:00Z" }),
    ];

    const sorted = sortCandidates(
      rows,
      DEFAULT_CANDIDATE_SORT.key,
      DEFAULT_CANDIDATE_SORT.direction,
    );

    expect(sorted.map((r) => r.completed_at)).toEqual([
      "2026-01-03T11:00:00Z",
      "2026-01-02T11:00:00Z",
      "2026-01-01T11:00:00Z",
    ]);
  });

  test("null completed_at sinks to the bottom in both directions", () => {
    const inProgress = makeRow({ completed_at: null, status: "started" });
    const done = makeRow({ completed_at: "2026-01-02T11:00:00Z" });

    for (const direction of ["asc", "desc"]) {
      const sorted = sortCandidates([inProgress, done], "completed_at", direction);
      expect(sorted[1]).toBe(inProgress);
    }
  });

  test("score sorts numerically on overall_score falling back to calculated_score", () => {
    const rows = [
      makeRow({ overall_score: null, calculated_score: "4.50" }),
      makeRow({ overall_score: "9.00", calculated_score: "4.50" }),
      makeRow({ overall_score: null, calculated_score: null }),
    ];

    const sorted = sortCandidates(rows, "score", "desc");

    expect(sorted[0].overall_score).toBe("9.00");
    expect(sorted[1].calculated_score).toBe("4.50");
    expect(sorted[2].calculated_score).toBe(null);
  });

  test("candidate_name sorts alphabetically and case-insensitively", () => {
    const rows = [
      makeRow({ candidate_name: "bob" }),
      makeRow({ candidate_name: "Alice" }),
      makeRow({ candidate_name: "charlie" }),
    ];

    const sorted = sortCandidates(rows, "candidate_name", "asc");
    expect(sorted.map((r) => r.candidate_name)).toEqual([
      "Alice",
      "bob",
      "charlie",
    ]);
  });

  test("reviewed sorts reviewed submissions first on desc", () => {
    const rows = [
      makeRow({ is_fully_reviewed: false }),
      makeRow({ is_fully_reviewed: true }),
    ];

    const sorted = sortCandidates(rows, "reviewed", "desc");
    expect(sorted[0].is_fully_reviewed).toBe(true);
  });

  test("current_question sorts by progress fraction", () => {
    const rows = [
      makeRow({ current_question_index: 4, total_questions: 5 }), // 80%
      makeRow({ current_question_index: 2, total_questions: 10 }), // 20%
    ];

    const sorted = sortCandidates(rows, "current_question", "desc");
    expect(sorted[0].total_questions).toBe(5);
  });

  test("unknown sort key returns the rows unchanged", () => {
    const rows = [makeRow(), makeRow()];
    expect(sortCandidates(rows, "nope", "asc")).toEqual(rows);
  });
});

describe("useCandidateSort", () => {
  test("defaults to recently completed first", () => {
    const rows = [
      makeRow({ completed_at: "2026-01-01T11:00:00Z" }),
      makeRow({ completed_at: "2026-01-02T11:00:00Z" }),
    ];
    const { result } = renderHook(() => useCandidateSort(rows));

    expect(result.current.sort).toEqual(DEFAULT_CANDIDATE_SORT);
    expect(result.current.sortedRows[0].completed_at).toBe(
      "2026-01-02T11:00:00Z",
    );
  });

  test("first click on a column uses its default direction, second click toggles", () => {
    const { result } = renderHook(() => useCandidateSort([]));

    act(() => result.current.toggleSort("candidate_name"));
    expect(result.current.sort).toEqual({
      key: "candidate_name",
      direction: CANDIDATE_SORT_COLUMNS.candidate_name.defaultDir,
    });

    act(() => result.current.toggleSort("candidate_name"));
    expect(result.current.sort.direction).toBe("desc");

    act(() => result.current.toggleSort("candidate_name"));
    expect(result.current.sort.direction).toBe("asc");
  });

  test("switching columns resets to that column's default direction", () => {
    const { result } = renderHook(() => useCandidateSort([]));

    act(() => result.current.toggleSort("candidate_name")); // asc
    act(() => result.current.toggleSort("candidate_name")); // desc
    act(() => result.current.toggleSort("score"));

    expect(result.current.sort).toEqual({ key: "score", direction: "desc" });
  });
});
