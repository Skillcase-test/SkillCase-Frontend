import { recordEvent } from "../telemetry";

// Named funnel events (onboarding, lessons, mode switches) for first-party telemetry.
// Keep payloads non-PII: mode, level, step, lesson id/title, etc.
export function trackJourneyEvent(eventName, tags = {}) {
  const normalizedName = String(eventName || "event").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const domain = normalizedName.includes("onboarding")
    ? "onboarding"
    : normalizedName.includes("lesson")
      ? "learning"
      : normalizedName.includes("mode")
        ? "navigation"
        : "clarity_mirror";
  recordEvent(`first_party.${normalizedName}`, {
    domain,
    feature: window.location.pathname,
    entity_type: domain === "onboarding" ? "flow_step" : "feature_event",
    entity_id: tags.lg_onboarding_step || tags.lesson_id || tags.chapter_id || null,
    attributes: {
      flow_id: domain === "onboarding" ? "learner_onboarding" : undefined,
      step: tags.lg_onboarding_step,
      step_index: Number.isInteger(tags.lg_onboarding_step) ? tags.lg_onboarding_step - 1 : undefined,
      level: tags.level || tags.prof_level,
      module: tags.module,
      chapter_id: tags.chapter_id,
      lesson_id: tags.lesson_id,
      mode: tags.mode || tags.lg_mode,
      selection_code: tags.selection_code || tags.value,
      branch: tags.branch,
      legacy_event_name: normalizedName,
    },
  });
}
