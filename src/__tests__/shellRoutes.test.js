import { describe, expect, it } from "vitest";
import { isShellRoute, getSwitcherBlendColor } from "../utils/shellRoutes";

describe("shellRoutes — isShellRoute", () => {
  it("returns true for the four hub screens", () => {
    expect(isShellRoute("/")).toBe(true);
    expect(isShellRoute("/learn-german")).toBe(true);
    expect(isShellRoute("/video-courses")).toBe(true);
    expect(isShellRoute("/job-screening")).toBe(true);
  });

  it("returns false for learning / applying / focused-flow screens", () => {
    // Learning sub-screens (no app shell)
    expect(isShellRoute("/a1/flashcard")).toBe(false);
    expect(isShellRoute("/learn-german/lesson/1")).toBe(false);
    expect(isShellRoute("/b1/exams/exam-id/take")).toBe(false);
    // Applying / pipeline sub-pages keep their own chrome
    expect(isShellRoute("/job-screening/interview/my-slug")).toBe(false);
    expect(isShellRoute("/job-screening/terms/sign/token")).toBe(false);
    // Standalone pages
    expect(isShellRoute("/jobs")).toBe(false);
    expect(isShellRoute("/profile")).toBe(false);
    expect(isShellRoute("/news")).toBe(false);
    expect(isShellRoute("/admin")).toBe(false);
  });

  it("defaults to false for empty input", () => {
    expect(isShellRoute()).toBe(false);
  });
});

describe("shellRoutes — getSwitcherBlendColor", () => {
  it("returns white for the white-background hub pages", () => {
    expect(getSwitcherBlendColor("/")).toBe("#ffffff");
    expect(getSwitcherBlendColor("/video-courses")).toBe("#ffffff");
  });

  it("returns the exact page-top color for the sky-blue hub pages", () => {
    // LearnGermanHome root: bg-gradient-to-b from-blue-100
    expect(getSwitcherBlendColor("/learn-german")).toBe("#dbeafe");
    // JobScreening lobby: from-[#e0f2fe]
    expect(getSwitcherBlendColor("/job-screening")).toBe("#e0f2fe");
  });

  it("defaults to white for non-hub routes", () => {
    expect(getSwitcherBlendColor("/a1/flashcard")).toBe("#ffffff");
    expect(getSwitcherBlendColor()).toBe("#ffffff");
  });
});
