import { describe, expect, it } from "vitest";
import { matchRoutes } from "react-router-dom";
import { appRoutes } from "../router/routes";
import { mergeRouteHandles, resolveRouteGuard } from "../router/guards";

// Runs the real route config + guard (this used to test a copy of the logic)
const evaluateJobScreeningGuard = ({ isAuthenticated, user, pathname }) => {
  const handle = mergeRouteHandles(matchRoutes(appRoutes, pathname) || []);
  const result = resolveRouteGuard({ isAuthenticated, user, handle, pathname });
  return { redirect: result?.to ?? null };
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
