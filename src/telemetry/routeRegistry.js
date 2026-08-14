const RULES = [
  [/^\/onboarding/, "onboarding", "onboarding"],
  [/^\/job-screening\/interview/, "job_screening", "interview"],
  [/^\/job-screening\/terms/, "terms", "terms_signing"],
  [/^\/job-screening/, "job_screening", "funnel"],
  // A1/A2 users land on the locked jobs teaser instead of the pipeline.
  [/^\/jobs/, "job_screening", "jobs_board"],
  // Subscription funnel — kept ahead of the generic /profile rule so checkout,
  // plan management and receipts don't disappear into profile analytics.
  [/^\/trial-offer/, "payments", "trial_offer"],
  [/^\/profile\/upgrade/, "payments", "checkout"],
  [/^\/profile\/manage-plan/, "payments", "manage_plan"],
  [/^\/profile\/transactions/, "payments", "transaction_history"],
  [/^\/profile/, "profile", "profile"],
  [/^\/learn-german\/(lesson|recap)/, "learning", "learn_german_lesson"],
  [/^\/learn-german/, "learning", "learn_german"],
  [/^\/(a1|a2)\/(flashcard|grammar|listening|speaking|reading|test)/, "learning", "level_practice"],
  [/^\/b1\/exams/, "learning", "b1_exam"],
  [/^\/b1\/read-listen/, "learning", "b1_read_listen"],
  [/^\/b1\/describe-speak/, "learning", "b1_describe_speak"],
  [/^\/b1\/flashcard/, "learning", "b1_flashcard"],
  [/^\/b1\/maya/, "maya", "maya"],
  [/^\/notes/, "learning", "notes"],
  [/^\/video-courses?(?:\/|$)/, "learning", "video_courses"],

  [/^\/exam/, "exam", "exam"],
  // Standalone scholarship exam funnel — hub, take and result screens.
  [/^\/scholarship/, "exam", "scholarship_exam"],

  [/^\/test/, "exam", "legacy_exam"],
  [/^\/news/, "news", "news"],
  [/^\/practice/, "learning", "legacy_flashcard"],
  [/^\/pronounce/, "learning", "pronunciation"],
  [/^\/conversation/, "learning", "conversation"],
  [/^\/stor(y|ies)/, "learning", "stories"],
  [/^\/terms/, "terms", "terms_signing"],
  [/^\/events/, "events", "events"],
  [/^\/manage-event/, "events", "event_management"],
  [/^\/interview/, "interview", "interview"],
  [/^\/signup|^\/login/, "auth", "authentication"],
  [/^\/admin|^\/b1admin|^\/internal/, "internal", "internal"],
  [/^\/start-now|^\/register|^\/thank-you|^\/open-app|^\/continue/, "acquisition", "acquisition"],
  [/^\/(a1|a2|b1)\/?$/, "learning", "level_home"],
  [/^\/$/, "home", "landing"],
];

export function classifyRoute(pathname = window.location.pathname) {
  const path = String(pathname || "/").split("?")[0];
  const match = RULES.find(([pattern]) => pattern.test(path.toLowerCase()));
  return { domain: match?.[1] || "navigation", surface: match?.[2] || "unclassified", path };
}

export { RULES as TELEMETRY_ROUTE_RULES };
