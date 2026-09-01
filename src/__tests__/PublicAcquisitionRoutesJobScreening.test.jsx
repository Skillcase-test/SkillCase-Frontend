import { describe, expect, it } from "vitest";

// Extracted matching logic identical to App.jsx route guards
const publicAcquisitionRoutes = [
  "/start-now",
  "/register",
  "/events",
  "/thank-you",
  "/open-app",
  "/redirect",
  "/continue",
];

const isPublicAcquisitionRoute = (pathname) =>
  publicAcquisitionRoutes.some((route) => pathname.startsWith(route)) ||
  /^\/interview\/[^/]+$/.test(pathname);

const publicRoutes = [
  "/login",
  "/signup",
  "/terms/sign",
  "/onboarding",
  ...publicAcquisitionRoutes,
];

const isPublicRoute = (pathname) =>
  isPublicAcquisitionRoute(pathname) ||
  publicRoutes.some((route) => pathname.startsWith(route));

const isB1PracticeLevel = (level) =>
  typeof level === "string" && ["b1", "b2"].includes(level.trim().toLowerCase());

const isPaymentRoute = (pathname) =>
  pathname === "/profile/upgrade" ||
  pathname === "/profile/manage-plan" ||
  pathname === "/profile/transactions" ||
  pathname === "/trial-offer";

const evaluateJobScreeningGuard = ({ isAuthenticated, user, pathname }) => {
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return { redirect: "/onboarding" };
  }

  const isB1User =
    isAuthenticated && user && isB1PracticeLevel(user?.user_prof_level);

  const isJobScreeningUser =
    isAuthenticated &&
    user &&
    (String(user.german_preference) === "3" ||
      user.lg_preferred_mode === "job_screening");

  const isJobScreeningAllowedRoute =
    pathname.startsWith("/job-screening") ||
    pathname.startsWith("/terms/sign") ||
    pathname.startsWith("/exam") ||
    pathname.startsWith("/scholarship") ||
    pathname === "/profile" ||
    pathname.startsWith("/admin") ||
    isPaymentRoute(pathname) ||
    pathname === "/jobs" ||
    (isB1User && (pathname === "/" || pathname.startsWith("/b1"))) ||
    isPublicAcquisitionRoute(pathname);

  if (isJobScreeningUser && !isJobScreeningAllowedRoute) {
    return { redirect: "/job-screening" };
  }

  return { redirect: null };
};

describe("Job Screening Route Guard & Public Acquisition Routes", () => {
  const jobScreeningCandidate = {
    user_id: "candidate-123",
    german_preference: "3",
    lg_preferred_mode: "job_screening",
    user_prof_level: "A2",
  };

  it("permits Job Screening candidate to access /start-now and /start-now/cart without redirect", () => {
    expect(
      evaluateJobScreeningGuard({
        isAuthenticated: true,
        user: jobScreeningCandidate,
        pathname: "/start-now",
      }),
    ).toEqual({ redirect: null });

    expect(
      evaluateJobScreeningGuard({
        isAuthenticated: true,
        user: jobScreeningCandidate,
        pathname: "/start-now/cart",
      }),
    ).toEqual({ redirect: null });
  });

  it("permits Job Screening candidate to access other public acquisition & marketing routes", () => {
    const allowedPublicPaths = [
      "/register",
      "/events",
      "/events/german-healthcare-webinar",
      "/events/featured",
      "/thank-you",
      "/open-app",
      "/redirect",
      "/continue",
      "/interview/nurse-screening-101",
    ];

    for (const path of allowedPublicPaths) {
      const result = evaluateJobScreeningGuard({
        isAuthenticated: true,
        user: jobScreeningCandidate,
        pathname: path,
      });
      expect(result, `Expected path "${path}" to not be redirected`).toEqual({
        redirect: null,
      });
    }
  });

  it("redirects Job Screening candidate when trying to access non-whitelisted practice routes", () => {
    const disallowedPaths = [
      "/a1/grammar",
      "/a1/flashcard",
      "/a2/listening",
      "/learn-german",
      "/stories",
      "/story/der-arzt",
      "/pronounce/a1",
    ];

    for (const path of disallowedPaths) {
      const result = evaluateJobScreeningGuard({
        isAuthenticated: true,
        user: jobScreeningCandidate,
        pathname: path,
      });
      expect(
        result,
        `Expected path "${path}" to redirect to /job-screening`,
      ).toEqual({
        redirect: "/job-screening",
      });
    }
  });

  it("allows unauthenticated visitors on /start-now and other public routes", () => {
    expect(
      evaluateJobScreeningGuard({
        isAuthenticated: false,
        user: null,
        pathname: "/start-now",
      }),
    ).toEqual({ redirect: null });

    expect(
      evaluateJobScreeningGuard({
        isAuthenticated: false,
        user: null,
        pathname: "/start-now/cart",
      }),
    ).toEqual({ redirect: null });
  });

  it("redirects unauthenticated visitors attempting to access protected routes to /onboarding", () => {
    expect(
      evaluateJobScreeningGuard({
        isAuthenticated: false,
        user: null,
        pathname: "/a1/grammar",
      }),
    ).toEqual({ redirect: "/onboarding" });

    expect(
      evaluateJobScreeningGuard({
        isAuthenticated: false,
        user: null,
        pathname: "/job-screening",
      }),
    ).toEqual({ redirect: "/onboarding" });
  });
});
