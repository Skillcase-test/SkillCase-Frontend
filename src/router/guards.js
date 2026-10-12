import { isPracticeSuiteLevel } from "../utils/b1Progress";

/*
 * Route handle flags (set on route objects in ./routes):
 *   access:   "public"      — reachable logged out (auth entry, terms, onboarding)
 *             "acquisition" — public AND open to every locked funnel
 *   funnels:  { jobs: true | "b1" } — screens a locked job-screening
 *             user may still open ("b1" = B1/B2 only)
 *   footer:        true to show the marketing footer (off by default)
 *   pullToRefresh: false where a reload would wreck an attempt or lesson
 */

// Accepts useMatches() output or matchRoutes() output (handle on .route)
export function mergeRouteHandles(matches = []) {
  return matches.reduce((merged, match) => {
    const handle = match.handle ?? match.route?.handle;
    return handle ? { ...merged, ...handle } : merged;
  }, {});
}

// Funnel redirects keep only the support-push params (/?openSupport=true&ticketId=…).
function supportSearch(search) {
  const params = new URLSearchParams(search);
  if (params.get("openSupport") !== "true") return "";
  const kept = new URLSearchParams({ openSupport: "true" });
  if (params.get("ticketId")) kept.set("ticketId", params.get("ticketId"));
  return `?${kept}`;
}

/** Returns { to, state? } when the current screen is off-limits, else null. */
export function resolveRouteGuard({ isAuthenticated, user, handle, pathname, search = "" }) {
  const isAcquisition = handle.access === "acquisition";
  const isPublic = isAcquisition || handle.access === "public";

  if (!isAuthenticated && !isPublic) {
    const returnTo = pathname === "/" ? undefined : `${pathname}${search}`;
    return { to: "/onboarding", state: { returnTo } };
  }
  if (!isAuthenticated || !user) return null;

  const isB1User = isPracticeSuiteLevel(user.user_prof_level);
  const funnels = handle.funnels || {};

  const isJobScreeningUser =
    String(user.german_preference) === "3" ||
    user.lg_preferred_mode === "job_screening";
  const jobsAllowed =
    isAcquisition || funnels.jobs === true || (funnels.jobs === "b1" && isB1User);
  if (isJobScreeningUser && !jobsAllowed) {
    return { to: `/job-screening${supportSearch(search)}` };
  }

  return null;
}
