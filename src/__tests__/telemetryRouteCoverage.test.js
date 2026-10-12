import { describe, expect, it } from "vitest";
import { classifyRoute } from "../telemetry/routeRegistry";
import { appRoutes } from "../router/routes";

describe("telemetry route coverage", () => {
  it("classifies every application route", () => {
    // "*" is the catch-all redirect, not a screen
    const routes = appRoutes.map((route) => route.path).filter((path) => path !== "*");
    // Guards against the walk silently finding nothing
    expect(routes.length).toBeGreaterThan(100);

    const uncovered = routes.filter((route) => {
      const examplePath = route
        .replace(/\*/g, "dashboard")
        .replace(/:[^/]+/g, "example");
      return classifyRoute(examplePath).surface === "unclassified";
    });

    expect(uncovered).toEqual([]);
  });
});
