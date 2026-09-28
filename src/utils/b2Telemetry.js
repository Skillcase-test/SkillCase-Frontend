import { trackFeatureEvent } from "../telemetry/events";
// Keep learning content, written answers and recordings out of analytics.
export function trackB2Action(action, { skill, mode, entityId, source } = {}) {
  trackFeatureEvent("b2", action, {
    feature: "b2.learning",
    entityId,
    lifecycle: "succeeded",
    attributes: { skill, mode, source },
  });
}
