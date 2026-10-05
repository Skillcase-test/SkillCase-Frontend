import { trackFeatureEvent } from "../telemetry/events";
// Keep learning content, written answers and recordings out of analytics.
// The feature names the skill ("b2.reading", "b2.exam.reading") so analytics files it under that
// B2 feature; `module` carries the skill because "skill" isn't on the attribute allowlist.
export function trackB2Action(action, { skill, mode, entityId, source } = {}) {
  const exam = mode === "assessment";
  trackFeatureEvent("b2", action, {
    feature: ["b2", exam ? "exam" : null, skill].filter(Boolean).join("."),
    entityId,
    lifecycle: "succeeded",
    attributes: { level: "B2", module: skill || (exam ? "exams" : undefined), mode, selection_code: source },
  });
}
