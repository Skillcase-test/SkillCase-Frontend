import { describe, expect, it } from "vitest";
import { matchRoutes, Navigate } from "react-router-dom";
import { appRoutes } from "../router/routes";
import { mergeRouteHandles, resolveRouteGuard } from "../router/guards";

// Oracle: the pathname predicates App.jsx used before routes carried handles,
// copied verbatim. Route handles must reproduce them for every route.
const publicAcquisitionRoutes = [
  "/start-now",
  "/register",
  "/events",
  "/thank-you",
  "/open-app",
  "/redirect",
  "/continue",
];
const oracleIsAcquisition = (p) =>
  publicAcquisitionRoutes.some((route) => p.startsWith(route)) ||
  /^\/interview\/[^/]+$/.test(p) ||
  /^\/r\/[^/]+$/.test(p);
const oracleIsPublic = (p) =>
  oracleIsAcquisition(p) ||
  ["/login", "/signup", "/terms/sign", "/onboarding", ...publicAcquisitionRoutes].some(
    (route) => p.startsWith(route),
  );
const PAYMENT = ["/trial-offer", "/profile/upgrade", "/profile/manage-plan", "/profile/transactions"];
const oracleJobsAllowed = (p, isB1) =>
  p.startsWith("/job-screening") ||
  oracleIsAcquisition(p) ||
  p.startsWith("/terms/sign") ||
  p.startsWith("/exam") ||
  p.startsWith("/scholarship") ||
  p === "/profile" ||
  p.startsWith("/admin") ||
  PAYMENT.includes(p) ||
  p === "/jobs" ||
  (isB1 &&
    (p === "/" ||
      p.startsWith("/b1") ||
      p.startsWith("/b2") ||
      p.startsWith("/video-courses") ||
      p.startsWith("/video-course/")));
const oracleHideFooter = (p) =>
  p === "/register" ||
  p.startsWith("/start-now") ||
  p === "/thank-you" ||
  p === "/internal/lead-form" ||
  p.startsWith("/terms/sign") ||
  p.startsWith("/onboarding") ||
  p.startsWith("/learn-german") ||
  p.startsWith("/job-screening") ||
  p === "/jobs" ||
  p.startsWith("/interview") ||
  p.startsWith("/admin") ||
  p.startsWith("/exam") ||
  p.startsWith("/b1") ||
  p.startsWith("/b2") ||
  p.startsWith("/a1") ||
  p.startsWith("/a2") ||
  p === "/" ||
  p === "/profile/upgrade" ||
  p === "/profile/manage-plan" ||
  p.startsWith("/scholarship") ||
  p.startsWith("/video-courses");
const oracleNoPull = (p) =>
  /^\/exam\/[^/]+\/take$/.test(p) ||
  /^\/interview\/[^/]+$/.test(p) ||
  /^\/scholarship\/[^/]+\/take$/.test(p) ||
  p.startsWith("/learn-german/lesson") ||
  p.startsWith("/learn-german/v2/lesson") ||
  p.startsWith("/video-course/") ||
  p.startsWith("/video-courses/") ||
  p.startsWith("/onboarding");

const PERSONAS = {
  loggedOut: { isAuthenticated: false, user: null },
  learner: { isAuthenticated: true, user: { user_prof_level: "A1", german_preference: "1", lg_preferred_mode: "learn" } },
  screeningA2: { isAuthenticated: true, user: { user_prof_level: "A2", german_preference: "3", lg_preferred_mode: "job_screening" } },
  screeningB1: { isAuthenticated: true, user: { user_prof_level: "B1", german_preference: "3", lg_preferred_mode: "job_screening" } },
};

function oracleRedirect(pathname, { isAuthenticated, user }) {
  if (!isAuthenticated && !oracleIsPublic(pathname)) return "/onboarding";
  if (!isAuthenticated || !user) return null;
  const isB1 = ["B1", "B2"].includes(user.user_prof_level);
  const isScreening =
    String(user.german_preference) === "3" || user.lg_preferred_mode === "job_screening";
  if (isScreening && !oracleJobsAllowed(pathname, isB1)) return "/job-screening";
  return null;
}

const examplePath = (path) =>
  path.replace(/\*/g, "dashboard").replace(/:[^/]+/g, "example");

const screens = appRoutes.filter((route) => route.path !== "*");

describe("route handles match the old pathname rules", () => {
  it("covers the whole route table", () => {
    expect(screens.length).toBeGreaterThan(100);
  });

  for (const [persona, auth] of Object.entries(PERSONAS)) {
    it(`guards every route the same way for ${persona}`, () => {
      const mismatches = screens
        .map((route) => examplePath(route.path))
        .filter((pathname) => {
          const handle = mergeRouteHandles(matchRoutes(appRoutes, pathname));
          const next = resolveRouteGuard({ ...auth, handle, pathname })?.to ?? null;
          return next !== oracleRedirect(pathname, auth);
        });
      expect(mismatches).toEqual([]);
    });
  }

  it("shows the footer and pull-to-refresh on the same screens", () => {
    const mismatches = [];
    for (const route of screens) {
      // Redirect-only routes never render chrome
      if (route.element?.type === Navigate) continue;
      const pathname = examplePath(route.path);
      const handle = mergeRouteHandles(matchRoutes(appRoutes, pathname));
      if (Boolean(handle.footer) !== !oracleHideFooter(pathname)) {
        mismatches.push(`footer ${pathname}`);
      }
      if ((handle.pullToRefresh === false) !== oracleNoPull(pathname)) {
        mismatches.push(`pull ${pathname}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("sends logged-out deep links to onboarding with a returnTo", () => {
    const pathname = "/exam/abc";
    const handle = mergeRouteHandles(matchRoutes(appRoutes, pathname));
    expect(
      resolveRouteGuard({ isAuthenticated: false, user: null, handle, pathname, search: "?x=1" }),
    ).toEqual({ to: "/onboarding", state: { returnTo: "/exam/abc?x=1" } });
  });

  it("keeps the support-ticket params through a funnel redirect", () => {
    const handle = mergeRouteHandles(matchRoutes(appRoutes, "/"));
    expect(
      resolveRouteGuard({
        ...PERSONAS.screeningA2,
        handle,
        pathname: "/",
        search: "?openSupport=true&ticketId=7&utm=x",
      }),
    ).toEqual({ to: "/job-screening?openSupport=true&ticketId=7" });
  });
});
