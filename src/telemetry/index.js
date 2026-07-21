import {
  getPlatformContext,
  getTelemetryHeaders,
  initializePlatformContext,
} from "./platform";
import { initializeExperienceTelemetry } from "./experience";
import { installFetchTelemetry } from "./fetch";

const MAX_QUEUE_EVENTS = 2000;
const MAX_BATCH_EVENTS = 50;
const MAX_BATCH_BYTES = 64 * 1024;
const FLUSH_INTERVAL_MS = 10_000;
const LOCAL_QUEUE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DB_NAME = "skillcase-operational-telemetry";
const STORE_NAME = "events";
const LIFECYCLE_VALUES = new Set([
  "observed", "started", "pending", "succeeded", "failed",
  "timed_out", "cancelled", "abandoned",
]);
const SENSITIVE_KEY =
  /token|authorization|cookie|password|otp|secret|email|phone|(^|_)(first_?name|last_?name|full_?name|name)($|_)|answer|text|transcript|audio|video|document|file|signature|body|url|(^|_)ip($|_)|user.?agent/i;
const SAFE_ATTRIBUTE_KEYS = new Set([
  "method",
  "route",
  "status_code",
  "duration_bucket",
  "request_id",
  "cache_profile",
  "network_state",
  "level",
  "module",
  "chapter_id",
  "chapter_order",
  "set_id",
  "content_id",
  "topic_id",
  "lesson_id",
  "screen_id",
  "screen_type",
  "question_id",
  "question_type",
  "submission_id",
  "position_id",
  "section_type",
  "step_id",
  "current_index",
  "question_index",
  "screen_index",
  "from_index",
  "to_index",
  "total_cards",
  "total_questions",
  "total_screens",
  "is_completed",
  "is_correct",
  "score",
  "accuracy_score",
  "fluency_score",
  "pronunciation_score",
  "attempt_number",
  "retry_count",
  "recording_duration_ms",
  "size_bucket",
  "mime_family",
  "provider",
  "error_code",
  "error_name",
  "message",
  "stack",
  "handled",
  "severity",
  "legacy_event_name",
  "action_id", "element_tag", "element_role", "element_type", "is_disabled",
  "pointer_type", "click_count", "form_id", "field_type", "dirty_fields",
  "scroll_depth", "metric", "metric_value", "rating", "reason", "direction",
  "media_state", "speed", "progress_bucket", "permission", "mode", "stage",
  "turn_index", "total_turns", "is_retry", "was_cached", "language",
  "flow_id", "flow_version", "phase", "step", "step_index", "total_steps",
  "selection_code", "branch", "source_route", "target_route", "operation",
  "component", "state", "status", "validation_code", "trigger", "poll_type",
  "asset_type", "tour_version", "sdk_state", "result_type", "surface",
  "native_event", "queue_depth", "drop_count",
]);

const state = {
  initialized: false,
  enabled: import.meta.env.VITE_TELEMETRY_ENABLED !== "false",
  token: null,
  userId: null,
  sequence: 0,
  queue: [],
  flushing: false,
  timer: null,
  dbPromise: null,
  restorePromise: null,
  identityReady: false,
  identityGeneration: 0,
  currentScope: null,
};

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] &
        (15 >> (Number(c) / 4)))
    ).toString(16),
  );
}

function sessionValue(key) {
  try {
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = randomId();
      sessionStorage.setItem(key, value);
    }
    return value;
  } catch {
    return randomId();
  }
}

const sessionId = sessionValue("skillcase_telemetry_session_id");
const journeyId = sessionValue("skillcase_telemetry_journey_id");

function safeString(value, max = 240) {
  if (value == null) return null;
  return String(value).replace(/[\r\n\t]+/g, " ").slice(0, max);
}

function safeDiagnostic(value, max = 500) {
  return safeString(value, max * 2)
    ?.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/https?:\/\/([^/\s?#]+)[^\s]*/gi, "https://$1/[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi, "[secret]")
    .replace(
      /\b(?![0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b)[A-Za-z0-9._~+/=-]{24,}\b/gi,
      "[secret]",
    )
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[phone]")
    .slice(0, max);
}

function sanitizeCode(value, max = 80, fallback = null) {
  if (value == null || value === "") return fallback;
  const safe = safeDiagnostic(value, max * 2);
  if (!safe || /\[(?:email|phone|secret)\]/.test(safe)) return fallback;
  const normalized = safe
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max);
  return normalized || fallback;
}

export function sanitizePath(value) {
  if (!value) return "unknown";
  let path = String(value).split(/[?#]/)[0];
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    path = "/unknown";
  }
  return path
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ":redacted")
    .replace(
      /(\/(?:terms\/sign|invite|invitation|reset(?:-password)?|password\/reset|verify|verification|magic-link|signed)(?:\/))[^/]+/gi,
      "$1:token",
    )
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\/(\d+)(?=\/|$)/g, "/:id")
    .replace(/\/[A-Za-z0-9._~+=-]{24,}(?=\/|$)/g, "/:token")
    .slice(0, 240);
}

export function sanitizeIdentifier(value, max = 120) {
  if (value == null) return null;
  const raw = String(value);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.toLowerCase();
  }
  if (raw.includes("/")) return sanitizePath(raw).slice(0, max);
  const safe = safeDiagnostic(raw, max);
  if (!safe || /\[(?:email|phone|secret)\]/.test(safe)) return null;
  return safe;
}

export function sanitizeTelemetryAttributes(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output = {};
  for (const [rawKey, value] of Object.entries(input)) {
    const key = String(rawKey).toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const isSafeDiagnosticName = key === "error_name" || key === "legacy_event_name";
    if (
      !SAFE_ATTRIBUTE_KEYS.has(key) ||
      (SENSITIVE_KEY.test(key) && !isSafeDiagnosticName)
    ) {
      continue;
    }
    if (value == null || typeof value === "boolean") output[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    else if (typeof value === "string") {
      if (["route", "source_route", "target_route"].includes(key)) {
        output[key] = sanitizePath(value);
      } else {
        output[key] = safeDiagnostic(value, 300);
      }
    }
  }
  return output;
}

function openDb() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  if (state.dbPromise) return state.dbPromise;
  state.dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "event_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return state.dbPromise;
}

async function persistEvent(event) {
  const db = await openDb();
  if (!db) return;
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(event);
  } catch {
    // Persistence failure never affects the product flow.
  }
}

async function deletePersistedEvents(ids) {
  if (!ids?.length) return;
  const db = await openDb();
  if (!db) return;
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
  } catch {
    // Best effort; event IDs make replay idempotent.
  }
}

async function clearPersistedEvents() {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = resolve;
      transaction.onerror = resolve;
      transaction.onabort = resolve;
    } catch {
      resolve();
    }
  });
}

function queuedAtMs(event) {
  const value = Date.parse(event?.queued_at || event?.client_occurred_at || "");
  return Number.isFinite(value) ? value : 0;
}

async function restorePersistedEvents() {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const request = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .getAll();
      request.onsuccess = async () => {
        const now = Date.now();
        const expiredIds = [];
        const retained = (request.result || [])
          .filter((event) => {
            const queuedAt = queuedAtMs(event);
            const expired = queuedAt > 0 && now - queuedAt > LOCAL_QUEUE_RETENTION_MS;
            if (expired) expiredIds.push(event.event_id);
            return !expired;
          })
          .sort((a, b) => queuedAtMs(a) - queuedAtMs(b));
        const overflow = retained.slice(0, Math.max(0, retained.length - MAX_QUEUE_EVENTS));
        const selected = retained.slice(-MAX_QUEUE_EVENTS);
        const known = new Set(state.queue.map((event) => event.event_id));
        for (const event of selected) {
          if (!known.has(event.event_id)) state.queue.push(event);
        }
        state.queue.sort((a, b) => queuedAtMs(a) - queuedAtMs(b));
        const memoryOverflow = state.queue.slice(
          0,
          Math.max(0, state.queue.length - MAX_QUEUE_EVENTS),
        );
        state.queue = state.queue.slice(-MAX_QUEUE_EVENTS);
        await deletePersistedEvents([
          ...expiredIds,
          ...overflow.map((event) => event.event_id),
          ...memoryOverflow.map((event) => event.event_id),
        ]);
        resolve();
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function endpoint() {
  const base = String(import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
  return `${base}/telemetry/v1/batch`;
}

function buildBatch() {
  const selected = [];
  let size = 20;
  const eligible = state.queue.filter(
    (event) => event.identity_scope === state.currentScope,
  );
  for (const event of eligible.slice(0, MAX_BATCH_EVENTS)) {
    const eventSize = new TextEncoder().encode(
      JSON.stringify(stripLocalQueueFields(event)),
    ).length + 1;
    if (selected.length && size + eventSize > MAX_BATCH_BYTES) break;
    selected.push(event);
    size += eventSize;
  }
  return selected;
}

async function syncTelemetryConfig() {
  try {
    const response = await fetch(`${endpoint().replace(/\/v1\/batch$/, "")}/v1/config`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const config = await response.json();
    if (config?.enabled === false) {
      state.enabled = false;
      state.queue = [];
      await clearPersistedEvents();
    }
  } catch {
    // Offline/config failures retain the local queue for a later retry.
  }
}

function stripLocalQueueFields(event) {
  const { identity_scope: _identityScope, queued_at: _queuedAt, ...payload } = event;
  return payload;
}

export function acknowledgedEventIds(result, batchEventIds) {
  const batchIds = new Set(batchEventIds || []);
  return Array.isArray(result?.accepted_event_ids)
    ? result.accepted_event_ids.filter((id) => batchIds.has(id))
    : [];
}

export async function flushTelemetry({ keepalive = false } = {}) {
  if (
    !state.enabled ||
    !state.identityReady ||
    state.flushing ||
    !state.queue.length ||
    !endpoint()
  ) return;
  if (state.restorePromise) await state.restorePromise;
  const batch = buildBatch();
  if (!batch.length) return;
  state.flushing = true;
  try {
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...getTelemetryHeaders({ sessionId, journeyId }),
      },
      body: JSON.stringify({ events: batch.map(stripLocalQueueFields) }),
      keepalive,
      credentials: "include",
    });
    if (!response.ok) return;
    const result = await response.json().catch(() => null);
    const acceptedIds = acknowledgedEventIds(
      result,
      batch.map((event) => event.event_id),
    );
    if (!acceptedIds.length) return;
    const sentIds = new Set(acceptedIds);
    state.queue = state.queue.filter((event) => !sentIds.has(event.event_id));
    void deletePersistedEvents([...sentIds]);
  } catch {
    // Offline and backend failures are retried later without touching UX.
  } finally {
    state.flushing = false;
  }
}

export function recordEvent(eventName, options = {}) {
  if (!state.enabled) return null;
  const platform = getPlatformContext();
  const occurredAt = new Date().toISOString();
  const event = {
    event_id: randomId(),
    schema_version: 1,
    session_id: sessionId,
    journey_id: options.journey_id || journeyId,
    operation_id: options.operation_id || null,
    parent_operation_id: options.parent_operation_id || null,
    trace_id: options.trace_id || null,
    sequence_no: ++state.sequence,
    event_name: sanitizeCode(eventName, 160, "unknown.event"),
    lifecycle: LIFECYCLE_VALUES.has(options.lifecycle) ? options.lifecycle : "observed",
    domain: sanitizeCode(options.domain, 80),
    feature: sanitizePath(options.feature || window.location?.pathname),
    entity_type: sanitizeCode(options.entity_type, 80),
    entity_id: sanitizeIdentifier(options.entity_id, 120),
    item_index: Number.isInteger(options.item_index) ? options.item_index : null,
    display_position: Number.isInteger(options.display_position)
      ? options.display_position
      : null,
    total_items: Number.isInteger(options.total_items) ? options.total_items : null,
    input_method: sanitizeCode(options.input_method, 40),
    platform: platform.platform,
    runtime: platform.runtime,
    app_version: platform.app_version,
    app_build: platform.app_build,
    release: platform.release,
    active_ms: Number.isInteger(options.active_ms) ? options.active_ms : null,
    elapsed_ms: Number.isInteger(options.elapsed_ms) ? options.elapsed_ms : null,
    outcome: sanitizeCode(options.outcome, 40),
    reason_code: sanitizeCode(options.reason_code, 80),
    attributes: sanitizeTelemetryAttributes(options.attributes),
    client_occurred_at: occurredAt,
    source: "client",
    identity_scope:
      state.identityReady && state.currentScope
        ? state.currentScope
        : `pending:${sessionId}`,
    queued_at: occurredAt,
  };
  if (state.queue.length >= MAX_QUEUE_EVENTS) {
    const dropped = state.queue.shift();
    if (dropped?.event_id) void deletePersistedEvents([dropped.event_id]);
  }
  state.queue.push(event);
  void persistEvent(event);
  if (state.queue.length >= MAX_BATCH_EVENTS) void flushTelemetry();
  return event.event_id;
}

export function startOperation(eventName, options = {}) {
  const operationId = randomId();
  const startedAt = performance.now();
  recordEvent(eventName, { ...options, operation_id: operationId, lifecycle: "started" });
  return {
    id: operationId,
    succeed(extra = {}) {
      recordEvent(eventName, {
        ...options,
        ...extra,
        operation_id: operationId,
        lifecycle: "succeeded",
        elapsed_ms: Math.max(0, Math.round(performance.now() - startedAt)),
      });
    },
    fail(error, extra = {}) {
      recordEvent(eventName, {
        ...options,
        ...extra,
        operation_id: operationId,
        lifecycle: "failed",
        reason_code: extra.reason_code || error?.code || "operation_failed",
        elapsed_ms: Math.max(0, Math.round(performance.now() - startedAt)),
      });
      captureTelemetryError(error, { ...options, ...extra, handled: true });
    },
    cancel(reasonCode = "cancelled") {
      recordEvent(eventName, {
        ...options,
        operation_id: operationId,
        lifecycle: "cancelled",
        reason_code: reasonCode,
        elapsed_ms: Math.max(0, Math.round(performance.now() - startedAt)),
      });
    },
  };
}

export function captureTelemetryError(error, context = {}) {
  const normalized = error instanceof Error ? error : new Error(String(error || "Unknown error"));
  return recordEvent("error.occurred", {
    domain: context.domain || "app",
    feature: context.feature || window.location?.pathname,
    trace_id: context.trace_id,
    lifecycle: "failed",
    reason_code: context.reason_code || normalized.name || "client_error",
    attributes: {
      error_name: normalized.name || "Error",
      message: safeDiagnostic(normalized.message, 500),
      stack: safeDiagnostic(normalized.stack, 4000),
      handled: Boolean(context.handled),
      severity: context.severity || "error",
      error_code: context.reason_code || normalized.name,
      request_id: context.request_id,
      route: sanitizePath(context.feature || window.location?.pathname),
    },
  });
}

export function mirrorLegacyEvent(name, properties = {}) {
  const level = properties.level || properties.proficiency_level;
  const moduleName = properties.module || properties.feature_key;
  return recordEvent(`legacy.${String(name || "event").replace(/[^a-zA-Z0-9_.-]/g, "_")}`, {
    domain: level ? "learning" : "legacy",
    feature: moduleName || "legacy",
    entity_type: properties.content_type || "legacy_event",
    entity_id:
      properties.exam_id ||
      properties.test_id ||
      properties.chapter_id ||
      properties.content_id ||
      properties.lesson_id ||
      null,
    item_index:
      Number.isInteger(properties.current_index) ? properties.current_index : null,
    display_position:
      Number.isInteger(properties.current_index) ? properties.current_index + 1 : null,
    total_items:
      properties.total_cards || properties.total_questions || properties.total_screens,
    outcome: properties.status || null,
    attributes: {
      legacy_event_name: name,
      level,
      module: moduleName,
      chapter_id: properties.chapter_id,
      content_id: properties.content_id,
      lesson_id: properties.lesson_id,
      question_id: properties.question_id,
      question_index: properties.question_index,
      screen_index: properties.screen_index,
      total_cards: properties.total_cards,
      total_questions: properties.total_questions,
      total_screens: properties.total_screens,
      is_correct: properties.is_correct,
      score: properties.score,
    },
  });
}

export function getTelemetryRequestContext() {
  return { sessionId, journeyId, interactionId: randomId() };
}

export function isOpaqueScriptErrorEvent(event) {
  return (
    !event?.error &&
    String(event?.message || "").trim().toLowerCase() === "script error."
  );
}

async function reconcileIdentityScope(generation) {
  if (state.restorePromise) await state.restorePromise;
  if (generation !== state.identityGeneration) return;

  const staleIds = [];
  state.queue = state.queue.flatMap((event) => {
    const resolved = resolvePersistedEventScope(
      event,
      sessionId,
      state.currentScope,
    );
    if (!resolved) {
      staleIds.push(event.event_id);
      return [];
    }
    if (resolved !== event || resolved.identity_scope !== event.identity_scope) {
      void persistEvent(resolved);
    }
    return [resolved];
  });
  if (staleIds.length) {
    await deletePersistedEvents(staleIds);
  }
  if (generation !== state.identityGeneration) return;
  state.identityReady = true;
  void flushTelemetry();
}

export function resolvePersistedEventScope(event, currentSessionId, currentScope) {
  const pending =
    !event?.identity_scope || String(event.identity_scope).startsWith("pending:");
  if (!pending) return event;
  if (event.session_id !== currentSessionId) return null;
  return {
    ...event,
    identity_scope: currentScope,
    queued_at: event.queued_at || event.client_occurred_at || new Date().toISOString(),
  };
}

export function setTelemetryIdentity(user, token) {
  const nextUserId = user?.user_id || null;
  if (
    state.identityReady &&
    nextUserId === state.userId &&
    (token || null) === state.token
  ) {
    return;
  }
  state.userId = nextUserId;
  state.token = token || null;
  state.currentScope = nextUserId ? `user:${String(nextUserId)}` : "anonymous";
  state.identityReady = false;
  state.identityGeneration += 1;
  void reconcileIdentityScope(state.identityGeneration);
}

export function initializeTelemetry() {
  if (state.initialized) return;
  state.initialized = true;
  if (!state.enabled) return;
  initializeExperienceTelemetry(recordEvent);
  installFetchTelemetry(recordEvent, captureTelemetryError);
  void initializePlatformContext();
  state.restorePromise = restorePersistedEvents();
  void syncTelemetryConfig();
  state.timer = window.setInterval(() => void flushTelemetry(), FLUSH_INTERVAL_MS);
  window.addEventListener("online", () => {
    recordEvent("network.state_changed", { domain: "network", outcome: "online", attributes: { network_state: "online" } });
    void flushTelemetry();
  });
  window.addEventListener("offline", () =>
    recordEvent("network.state_changed", { domain: "network", outcome: "offline", attributes: { network_state: "offline" } }),
  );
  window.addEventListener("pagehide", () => void flushTelemetry({ keepalive: true }));
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target && target !== window && target.tagName) {
        captureTelemetryError(new Error(`${target.tagName} resource failed`), {
          domain: "resource",
          reason_code: "resource_load_failed",
          handled: false,
        });
        return;
      }
      const opaqueScriptError = isOpaqueScriptErrorEvent(event);
      captureTelemetryError(event.error || new Error(event.message || "Window error"), {
        domain: "runtime",
        reason_code: opaqueScriptError ? "opaque_cross_origin_script_error" : undefined,
        handled: false,
        severity: opaqueScriptError ? "warning" : "fatal",
      });
    },
    true,
  );
  window.addEventListener("unhandledrejection", (event) =>
    captureTelemetryError(event.reason || new Error("Unhandled promise rejection"), {
      domain: "runtime",
      reason_code: "unhandled_rejection",
      handled: false,
      severity: "fatal",
    }),
  );
  recordEvent("app.session_started", {
    domain: "app",
    entity_type: "session",
    entity_id: sessionId,
    lifecycle: "started",
  });
}

export { getPlatformContext, getTelemetryHeaders };
