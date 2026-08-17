import { describe, expect, it } from "vitest";
import { isModuleVisibleForUser } from "../utils/usageLimitModules";

// Video Courses is an 'ALL'-level module (one shared counter pool) but the
// German Classes tab is only rendered for A1/A2 — see TopModeSwitcher. Showing
// a per-user Video Courses limit on a B1/B2 account is a control over a screen
// that user cannot open.
const videoCourses = {
  level: "ALL",
  module_key: "video_courses",
  available_levels: ["A1", "A2"],
};
const b1Maya = { level: "B1", module_key: "maya" };

describe("per-user override editor module visibility", () => {
  it("offers Video Courses to A1/A2 and hides it from B1/B2", () => {
    expect(isModuleVisibleForUser(videoCourses, "A1")).toBe(true);
    expect(isModuleVisibleForUser(videoCourses, "a2")).toBe(true);
    expect(isModuleVisibleForUser(videoCourses, "B1")).toBe(false);
    expect(isModuleVisibleForUser(videoCourses, "B2")).toBe(false);
  });

  it("still matches levelled modules on the user's own level only", () => {
    expect(isModuleVisibleForUser(b1Maya, "B1")).toBe(true);
    expect(isModuleVisibleForUser(b1Maya, "A1")).toBe(false);
  });

  it("keeps an ALL module with no reachability list visible to everyone", () => {
    const anyLevel = { level: "ALL", module_key: "future_module" };
    expect(isModuleVisibleForUser(anyLevel, "B1")).toBe(true);
  });

  it("hides everything when the user has no level rather than leaking ALL rows blindly", () => {
    expect(isModuleVisibleForUser(videoCourses, null)).toBe(false);
  });
});
