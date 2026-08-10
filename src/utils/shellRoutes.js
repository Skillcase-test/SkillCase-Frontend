/**
 * The four "hub" pages that carry the full app shell — navy navbar, top mode
 * switcher and floating bottom tab bar. Every other screen (lessons, exams,
 * flashcards, interview, terms, video player, notes, profile steps, news,
 * stories …) has its own in-page header/back navigation and renders without
 * the shell chrome.
 */
export const SHELL_ROUTES = [
  "/", // Landing (Exam & Practice / Job Preparation)
  "/learn-german", // Guided Learning home
  "/video-courses", // German Classes select
  "/job-screening", // Job-screening lobby (B1/B2)
];

export function isShellRoute(pathname = "") {
  return SHELL_ROUTES.includes(pathname);
}

/**
 * Exact page-top background color of each shell page. The active switcher tab
 * (and its concave notch) is filled with this color so the tab melts into the
 * page below instead of leaving a harsh white crescent.
 *
 *   /               → white        (LandingPage root: bg-white)
 *   /video-courses  → white        (CourseSelectPage root: bg-white)
 *   /learn-german   → blue-100     (LearnGermanHome: bg-gradient-to-b from-blue-100)
 *   /job-screening  → #e0f2fe      (JobScreening lobby: from-[#e0f2fe])
 */
export function getSwitcherBlendColor(pathname = "") {
  if (pathname === "/learn-german") return "#dbeafe";
  if (pathname === "/job-screening") return "#e0f2fe";
  return "#ffffff";
}
