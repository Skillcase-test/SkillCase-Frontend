import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyRoute } from "../telemetry/routeRegistry";

describe("telemetry route coverage", () => {
  it("classifies every application route", () => {
    const source = readFileSync(resolve(process.cwd(), "src/App.jsx"), "utf8");
    const routes = [...source.matchAll(/\bpath=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((route) => !route.includes("resume"));

    const uncovered = routes.filter((route) => {
      const examplePath = route
        .replace(/\*/g, "dashboard")
        .replace(/:[^/]+/g, "example");
      return classifyRoute(examplePath).surface === "unclassified";
    });

    expect(uncovered).toEqual([]);
  });
});
