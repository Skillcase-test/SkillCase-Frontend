/**
 * The four "hub" pages that carry the full app shell — navy navbar, top mode
 * switcher and floating bottom tab bar. Every other screen (lessons, exams,
 * flashcards, interview, terms, video player, notes, profile steps …)
 * has its own in-page header/back navigation and renders without
 * the shell chrome.
 *
 * "/scholarship" is the standalone scholarship-exam hub: it reuses the same
 * shell but with exam-only chrome (single-tab switcher, exam progress ring).
 */
export const SHELL_ROUTES = [
  "/", // Landing (Exam & Practice / Job Preparation)
  "/learn-german", // Guided Learning home
  "/video-courses", // German Classes select
  "/job-screening", // Job-screening lobby (B1/B2)
  "/scholarship", // Scholarship exam hub
];

/** True on the scholarship hub or any of its child routes (take/result). */
export function isScholarshipRoute(pathname = "") {
  return pathname === "/scholarship" || pathname.startsWith("/scholarship/");
}

export function isShellRoute(pathname = "") {
  return SHELL_ROUTES.includes(pathname);
}

/**
 * The subscription / trial funnel. These screens are the way *out* of a paywall
 * lock, so nothing may cover or redirect them: the paywall blocker skips them,
 * and the job-screening mode redirect lets them through. Without this a locked
 * user taps "Upgrade", gets sent to the trial offer, and stares at the blocker
 * overlay still painted on top of it.
 */
export const PAYMENT_ROUTES = [
  "/trial-offer",
  "/profile/upgrade",
  "/profile/manage-plan",
  "/profile/transactions",
];

export function isPaymentRoute(pathname = "") {
  return PAYMENT_ROUTES.includes(pathname);
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
