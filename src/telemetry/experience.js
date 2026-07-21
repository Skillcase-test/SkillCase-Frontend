import { classifyRoute } from "./routeRegistry";

const ACTION_SELECTOR =
  "button,a,[role='button'],input,select,textarea,[data-analytics-id]";
const clickHistory = new Map();
const formState = new Map();
const scrollDepths = new Set();
let routeStartedAt = performance.now();
let lastRoute = window.location.pathname;
let mutationVersion = 0;

function safeActionId(element) {
  if (!element) return "unknown";
  const explicit = element.dataset?.analyticsId || element.id;
  if (explicit) return String(explicit).slice(0, 100);
  const form = element.closest?.("form");
  const region = element.closest?.("[data-analytics-region],[id]");
  const index = [...(element.parentElement?.children || [])].indexOf(element);
  return [
    region?.dataset?.analyticsRegion || region?.id || "page",
    form?.id || "no_form",
    element.tagName?.toLowerCase() || "element",
    element.getAttribute?.("type") || element.getAttribute?.("role") || "action",
    Math.max(0, index),
  ].join(":").slice(0, 100);
}

function actionAttributes(element, actionId, extra = {}) {
  let targetRoute = null;
  if (element?.tagName?.toLowerCase() === "a" && element.href) {
    try {
      const target = new URL(element.href, window.location.href);
      targetRoute = target.origin === window.location.origin
        ? target.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").replace(/\/(\d+)(?=\/|$)/g, "/:id")
        : `external:${target.hostname}`;
    } catch {
      targetRoute = null;
    }
  }
  return {
    action_id: actionId,
    element_tag: element?.tagName?.toLowerCase(),
    element_role: element?.getAttribute?.("role"),
    element_type: element?.getAttribute?.("type"),
    is_disabled: Boolean(element?.disabled || element?.getAttribute?.("aria-disabled") === "true"),
    route: window.location.pathname,
    target_route: targetRoute,
    ...extra,
  };
}

function recordRouteLeft(recordEvent, reason = "route_change") {
  recordEvent("navigation.route_left", {
    domain: "navigation",
    feature: lastRoute,
    entity_type: "route",
    entity_id: lastRoute,
    lifecycle: "observed",
    active_ms: Math.max(0, Math.round(performance.now() - routeStartedAt)),
    reason_code: reason,
    attributes: { route: lastRoute, reason },
  });
}

function observePerformance(recordEvent) {
  if (!globalThis.PerformanceObserver) return;
  const emit = (metric, value, rating = null) =>
    recordEvent("performance.metric", {
      domain: "performance",
      feature: window.location.pathname,
      entity_type: "web_vital",
      entity_id: metric,
      lifecycle: "observed",
      elapsed_ms: Number.isFinite(value) ? Math.max(0, Math.round(value)) : null,
      outcome: rating,
      attributes: { metric, metric_value: Number(value.toFixed?.(2) ?? value), rating },
    });
  const observers = [];
  const create = (type, callback) => {
    try {
      const observer = new PerformanceObserver((list) => {
        try {
          callback(list.getEntries());
        } catch {
          // Metrics are best-effort and must never affect the application.
        }
      });
      observer.observe({ type, buffered: true });
      observers.push(observer);
    } catch {
      // Unsupported metrics fail open.
    }
  };
  create("largest-contentful-paint", (entries) => {
    const value = entries[entries.length - 1]?.startTime;
    if (Number.isFinite(value)) emit("lcp", value, value <= 2500 ? "good" : value <= 4000 ? "needs_improvement" : "poor");
  });
  let cls = 0;
  create("layout-shift", (entries) => {
    entries.forEach((entry) => { if (!entry.hadRecentInput) cls += entry.value; });
  });
  create("longtask", (entries) => entries.forEach((entry) => {
    if (entry.duration >= 100) emit("long_task", entry.duration, entry.duration < 250 ? "needs_improvement" : "poor");
  }));
  window.addEventListener("pagehide", () => {
    if (cls > 0) emit("cls", cls, cls <= 0.1 ? "good" : cls <= 0.25 ? "needs_improvement" : "poor");
    observers.forEach((observer) => observer.disconnect());
  }, { once: true });
}

export function initializeExperienceTelemetry(recordEvent) {
  const mutationObserver = new MutationObserver(() => { mutationVersion += 1; });
  mutationObserver.observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener("skillcase:telemetry:activity", () => { mutationVersion += 1; });

  document.addEventListener("click", (event) => {
    const element = event.target?.closest?.(ACTION_SELECTOR);
    if (!element) return;
    const actionId = safeActionId(element);
    const pointerType = event.pointerType || (event.detail === 0 ? "keyboard" : "pointer");
    recordEvent("interaction.activated", {
      domain: "interaction",
      feature: window.location.pathname,
      entity_type: "control",
      entity_id: actionId,
      input_method: pointerType,
      lifecycle: "observed",
      attributes: actionAttributes(element, actionId, { pointer_type: pointerType }),
    });

    const now = performance.now();
    const recent = (clickHistory.get(actionId) || []).filter((time) => now - time <= 1200);
    recent.push(now);
    clickHistory.set(actionId, recent);
    if (recent.length === 3) {
      recordEvent("interaction.rage_click", {
        domain: "interaction",
        feature: window.location.pathname,
        entity_type: "control",
        entity_id: actionId,
        lifecycle: "observed",
        attributes: actionAttributes(element, actionId, { click_count: recent.length }),
      });
    }

    if (element.matches("button,[role='button']") && !element.disabled) {
      const versionAtClick = mutationVersion;
      const routeAtClick = window.location.pathname;
      window.setTimeout(() => {
        if (versionAtClick === mutationVersion && routeAtClick === window.location.pathname) {
          recordEvent("interaction.unresponsive_candidate", {
            domain: "interaction",
            feature: routeAtClick,
            entity_type: "control",
            entity_id: actionId,
            lifecycle: "observed",
            attributes: actionAttributes(element, actionId),
          });
        }
      }, 1500);
    }
  }, true);

  document.addEventListener("focusin", (event) => {
    const field = event.target;
    if (!field?.matches?.("input,select,textarea")) return;
    const formId = safeActionId(field.closest("form") || field);
    const state = formState.get(formId) || { dirty: new Set(), startedAt: performance.now(), submitted: false };
    formState.set(formId, state);
    recordEvent("form.field_focused", {
      domain: "form",
      feature: window.location.pathname,
      entity_type: "form",
      entity_id: formId,
      attributes: { form_id: formId, field_type: field.type || field.tagName?.toLowerCase() },
    });
  }, true);
  document.addEventListener("input", (event) => {
    const field = event.target;
    if (!field?.matches?.("input,select,textarea")) return;
    const formId = safeActionId(field.closest("form") || field);
    const state = formState.get(formId) || { dirty: new Set(), startedAt: performance.now(), submitted: false };
    state.dirty.add(safeActionId(field));
    formState.set(formId, state);
  }, true);
  document.addEventListener("submit", (event) => {
    const formId = safeActionId(event.target);
    const state = formState.get(formId);
    if (state) state.submitted = true;
    recordEvent("form.submitted", {
      domain: "form",
      feature: window.location.pathname,
      entity_type: "form",
      entity_id: formId,
      active_ms: state ? Math.round(performance.now() - state.startedAt) : null,
      attributes: { form_id: formId, dirty_fields: state?.dirty.size || 0 },
    });
  }, true);

  let scrollScheduled = false;
  window.addEventListener("scroll", () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      scrollScheduled = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percent = Math.round((window.scrollY / max) * 100);
      [25, 50, 75, 100].forEach((depth) => {
        const key = `${window.location.pathname}:${depth}`;
        if (percent >= depth && !scrollDepths.has(key)) {
          scrollDepths.add(key);
          recordEvent("content.scroll_depth", {
            domain: "content",
            feature: window.location.pathname,
            entity_type: "route",
            entity_id: window.location.pathname,
            attributes: { scroll_depth: depth, route: window.location.pathname },
          });
        }
      });
    });
  }, { passive: true });

  window.addEventListener("skillcase:route-changed", () => {
    recordRouteLeft(recordEvent);
    for (const [formId, form] of formState) {
      if (!form.submitted && form.dirty.size) {
        recordEvent("form.abandoned", {
          domain: "form", feature: lastRoute, entity_type: "form", entity_id: formId,
          active_ms: Math.round(performance.now() - form.startedAt),
          attributes: { form_id: formId, dirty_fields: form.dirty.size, reason: "route_change" },
        });
      }
    }
    formState.clear();
    lastRoute = window.location.pathname;
    routeStartedAt = performance.now();
    const route = classifyRoute();
    recordEvent("screen.presented", {
      domain: route.domain, feature: route.path, entity_type: "screen",
      entity_id: route.path, attributes: { route: route.path, surface: route.surface },
    });
  });
  window.addEventListener("pagehide", () => {
    recordRouteLeft(recordEvent, "pagehide");
    for (const [formId, form] of formState) {
      if (!form.submitted && form.dirty.size) {
        recordEvent("form.abandoned", {
          domain: "form",
          feature: window.location.pathname,
          entity_type: "form",
          entity_id: formId,
          active_ms: Math.round(performance.now() - form.startedAt),
          attributes: { form_id: formId, dirty_fields: form.dirty.size },
        });
      }
    }
  });
  observePerformance(recordEvent);
}
