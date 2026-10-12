import { isPracticeSuiteLevel } from "./b1Progress";

export function isTopSwitcherTourActive(user) {
  const completed =
    !user?.user_id ||
    user?.top_switcher_tour_completed ||
    localStorage.getItem(`top_switcher_tour_completed_${user.user_id}`) === "true";
  return (
    !completed ||
    Boolean(window.__topSwitcherTourActive) ||
    sessionStorage.getItem("top_switcher_tour_active") === "true"
  );
}

/**
 * Which hub "/" really is for this user, or null for the practice hub itself.
 * lgMode is the locally cached lg_preferred_mode (it can hold "courses",
 * which the server can't store).
 */
export function resolveHomeRedirect(user, lgMode = "") {
  const mode = lgMode || user?.lg_preferred_mode;

  // Scholarship candidates live in their own locked funnel.
  if (mode === "scholarship") return "/scholarship";
  if (isTopSwitcherTourActive(user)) return null;

  // B1/B2 users own the mode switcher, so only non-B1 job candidates are
  // forced into the pipeline.
  const isJobScreening =
    !isPracticeSuiteLevel(user?.user_prof_level) &&
    lgMode !== "practice" &&
    lgMode !== "learn" &&
    (user?.german_preference === "3" || user?.lg_preferred_mode === "job_screening");
  if (isJobScreening) return "/job-screening";
  if (mode === "courses") return "/video-courses";

  const prefersLearn =
    mode === "learn" ||
    (!lgMode &&
      (user?.german_preference === "1" ||
        String(user?.german_preference || "").toLowerCase().includes("learn")));
  return prefersLearn ? "/learn-german" : null;
}
