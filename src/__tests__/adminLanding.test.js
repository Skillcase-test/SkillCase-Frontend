import { describe, expect, it } from "vitest";
import { adminLandingPath } from "../dashboard-src/utils/adminLanding";

const sections = (overrides = {}) => ({
  overview: [],
  core: [],
  a1Modules: [],
  a2Modules: [],
  b1Modules: [],
  b2Modules: [],
  videoCoursesModules: [],
  extraContentItems: [],
  superAdmin: [],
  ...overrides,
});
const analytics = { key: "analytics", path: "/admin/analytics" };
const appAnalytics = { key: "app-analytics", path: "/admin/app-analytics" };

describe("adminLandingPath", () => {
  it("prefers App Analytics even when it isn't first", () => {
    expect(
      adminLandingPath(
        sections({
          overview: [{ key: "high-level-dashboard", path: "/admin/high-level-dashboard" }],
          core: [analytics, appAnalytics],
        }),
      ),
    ).toBe("/admin/app-analytics");
  });

  it("otherwise lands on the top sidebar item", () => {
    expect(adminLandingPath(sections({ core: [analytics] }))).toBe("/admin/analytics");
  });

  it("follows the sidebar order: A1 before extra content items", () => {
    expect(
      adminLandingPath(
        sections({
          a1Modules: [{ basePath: "/admin/a1/flashcard" }],
          extraContentItems: [{ path: "/admin/dynamic-lesson" }],
        }),
      ),
    ).toBe("/admin/a1/flashcard/add");
  });

  it("falls back to the no-access page", () => {
    expect(adminLandingPath(sections())).toBe("/admin/no-access");
  });
});
