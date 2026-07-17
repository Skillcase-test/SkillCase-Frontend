import { useEffect, useRef } from "react";
import { trackFeatureEvent } from "./events";

export function useFlowJourney({ domain, flowId, step, stepIndex, totalSteps, entityId, attributes = {} }) {
  const flowStartRef = useRef(performance.now());
  const initialAttributesRef = useRef(attributes);
  const latestAttributesRef = useRef(attributes);
  latestAttributesRef.current = attributes;

  useEffect(() => {
    const flowStartedAt = flowStartRef.current;
    const initialAttributes = initialAttributesRef.current;
    const key = `skillcase:flow:${domain}:${flowId}`;
    let resumed = false;
    try {
      resumed = sessionStorage.getItem(key) === "active";
      sessionStorage.setItem(key, "active");
    } catch {
      // Storage may be unavailable in private/restricted browser contexts.
    }
    trackFeatureEvent(domain, resumed ? "flow_resumed" : "flow_started", {
      feature: flowId, entityType: "flow", entityId: entityId || flowId,
      lifecycle: "started", attributes: { flow_id: flowId, ...initialAttributes },
    });
    return () => trackFeatureEvent(domain, "flow_left", {
      feature: flowId, entityType: "flow", entityId: entityId || flowId,
      activeMs: Math.round(performance.now() - flowStartedAt),
      attributes: { flow_id: flowId, ...initialAttributes },
    });
  }, [domain, flowId, entityId]); // attributes intentionally describe the initial flow

  useEffect(() => {
    if (step == null) return undefined;
    const stepStartedAt = performance.now();
    trackFeatureEvent(domain, "step_presented", {
      feature: flowId, entityType: "flow_step", entityId: String(step),
      index: Number.isInteger(stepIndex) ? stepIndex : null, total: totalSteps,
      attributes: {
        flow_id: flowId, step: String(step), step_index: stepIndex,
        total_steps: totalSteps, ...latestAttributesRef.current,
      },
    });
    return () => trackFeatureEvent(domain, "step_left", {
      feature: flowId, entityType: "flow_step", entityId: String(step),
      activeMs: Math.max(0, Math.round(performance.now() - stepStartedAt)),
      attributes: {
        flow_id: flowId, step: String(step), step_index: stepIndex,
        total_steps: totalSteps,
      },
    });
  }, [domain, flowId, step, stepIndex, totalSteps]);
}

const LEGACY_LIFECYCLE = {
  started: "started",
  success: "succeeded",
  failed: "failed",
  cancelled: "cancelled",
  presented: "observed",
  blocked: "failed",
};

export function normalizeFlowContext(context = {}, legacyContext = {}) {
  return (
    typeof context === "string"
      ? {
          ...legacyContext,
          entityId: legacyContext.entityId ?? legacyContext.entity_id,
          validationCode:
            legacyContext.validationCode ?? legacyContext.validation_code,
          pollType: legacyContext.pollType ?? legacyContext.poll_type,
          lifecycle: legacyContext.lifecycle || LEGACY_LIFECYCLE[context] || "observed",
          outcome:
            legacyContext.outcome ||
            (context === "blocked" ? "blocked" : context === "success" ? "success" : undefined),
          attributes: { ...legacyContext, ...legacyContext.attributes },
        }
      : context || {}
  );
}

export function trackFlowAction(
  domain,
  flowId,
  action,
  context = {},
  legacyContext = {},
) {
  const normalizedContext = normalizeFlowContext(context, legacyContext);
  return trackFeatureEvent(domain, action, {
    feature: flowId,
    entityType: normalizedContext.entityType || "flow_step",
    entityId: normalizedContext.entityId || String(normalizedContext.step ?? flowId),
    lifecycle: normalizedContext.lifecycle,
    outcome: normalizedContext.outcome,
    reasonCode: normalizedContext.reasonCode,
    elapsedMs: normalizedContext.elapsedMs,
    inputMethod: normalizedContext.inputMethod,
    attributes: {
      flow_id: flowId,
      step: normalizedContext.step == null ? undefined : String(normalizedContext.step),
      step_index: normalizedContext.stepIndex,
      total_steps: normalizedContext.totalSteps,
      direction: normalizedContext.direction,
      branch: normalizedContext.branch,
      selection_code: normalizedContext.selectionCode,
      validation_code: normalizedContext.validationCode,
      operation: normalizedContext.operation,
      state: normalizedContext.state,
      status: normalizedContext.status,
      trigger: normalizedContext.trigger,
      asset_type: normalizedContext.assetType,
      poll_type: normalizedContext.pollType,
      tour_version: normalizedContext.tourVersion,
      phase: normalizedContext.phase,
      ...normalizedContext.attributes,
    },
  });
}

export function useTourJourney({ enabled, tourId, phase, tourVersion = "1" }) {
  const phaseStartedAt = useRef(performance.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const key = `skillcase:tour:${tourId}`;
    let resumed = false;
    try {
      resumed = sessionStorage.getItem(key) === "active";
      sessionStorage.setItem(key, "active");
    } catch {
      // Storage may be unavailable in private/restricted browser contexts.
    }
    trackFlowAction("tour", tourId, resumed ? "tour_resumed" : "tour_started", { tourVersion, lifecycle: "started" });
    return () => trackFlowAction("tour", tourId, "tour_left", { tourVersion });
  }, [enabled, tourId, tourVersion]);

  useEffect(() => {
    if (!enabled || !phase) return undefined;
    phaseStartedAt.current = performance.now();
    trackFlowAction("tour", tourId, "phase_presented", { phase, tourVersion, entityId: phase });
    return () => trackFlowAction("tour", tourId, "phase_left", {
      phase, tourVersion, entityId: phase,
      elapsedMs: Math.round(performance.now() - phaseStartedAt.current),
    });
  }, [enabled, tourId, phase, tourVersion]);
}

export async function observeOperation(domain, flowId, operation, work, context = {}) {
  const startedAt = performance.now();
  trackFlowAction(domain, flowId, `${operation}_started`, { ...context, operation, lifecycle: "started" });
  try {
    const result = await work();
    trackFlowAction(domain, flowId, `${operation}_succeeded`, {
      ...context, operation, lifecycle: "succeeded", elapsedMs: Math.round(performance.now() - startedAt),
    });
    return result;
  } catch (error) {
    trackFlowAction(domain, flowId, `${operation}_failed`, {
      ...context, operation, lifecycle: "failed", elapsedMs: Math.round(performance.now() - startedAt),
      reasonCode: context.reasonCode || error?.code || error?.name || "operation_failed",
    });
    throw error;
  }
}
