const RULES = [
  [/^\/onboarding/, "onboarding", "onboarding"],
  [/^\/job-screening\/interview/, "job_screening", "interview"],
  [/^\/job-screening\/terms/, "terms", "terms_signing"],
  [/^\/job-screening/, "job_screening", "funnel"],
  [/^\/profile/, "profile", "profile"],
  [/^\/learn-german\/(lesson|recap)/, "learning", "learn_german_lesson"],
  [/^\/learn-german/, "learning", "learn_german"],
  [/^\/(a1|a2)\/(flashcard|grammar|listening|speaking|reading|test)/, "learning", "level_practice"],
  [/^\/b1\/exams/, "learning", "b1_exam"],
  [/^\/b1\/read-listen/, "learning", "b1_read_listen"],
  [/^\/b1\/describe-speak/, "learning", "b1_describe_speak"],
  [/^\/b1\/flashcard/, "learning", "b1_flashcard"],
  [/^\/b1\/maya/, "maya", "maya"],
  [/^\/exam/, "exam", "exam"],
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
