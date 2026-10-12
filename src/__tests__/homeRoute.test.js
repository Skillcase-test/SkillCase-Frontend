import { beforeEach, describe, expect, it } from "vitest";
import { resolveHomeRedirect } from "../utils/homeRoute";

const user = (overrides = {}) => ({
  user_id: 7,
  user_prof_level: "A1",
  top_switcher_tour_completed: true,
  ...overrides,
});

describe("resolveHomeRedirect", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete window.__topSwitcherTourActive;
  });

  it("sends scholarship users to their locked hub even mid-tour", () => {
    expect(resolveHomeRedirect(user({ lg_preferred_mode: "scholarship", top_switcher_tour_completed: false }))).toBe("/scholarship");
  });

  it("holds learners on the practice hub while the switcher tour runs", () => {
    expect(resolveHomeRedirect(user({ lg_preferred_mode: "learn", top_switcher_tour_completed: false }))).toBeNull();
  });

  it("sends non-B1 job candidates to the pipeline, but not B1/B2", () => {
    expect(resolveHomeRedirect(user({ german_preference: "3" }))).toBe("/job-screening");
    expect(resolveHomeRedirect(user({ german_preference: "3", user_prof_level: "B1" }))).toBeNull();
    // A local practice/learn choice overrides a stale job preference
    expect(resolveHomeRedirect(user({ german_preference: "3" }), "practice")).toBeNull();
  });

  it("honours the client-only courses mode and learn mode", () => {
    expect(resolveHomeRedirect(user(), "courses")).toBe("/video-courses");
    expect(resolveHomeRedirect(user({ lg_preferred_mode: "learn" }))).toBe("/learn-german");
    expect(resolveHomeRedirect(user({ german_preference: "1" }))).toBe("/learn-german");
  });

  it("keeps practice users on /", () => {
    expect(resolveHomeRedirect(user({ lg_preferred_mode: "practice" }))).toBeNull();
  });
});
