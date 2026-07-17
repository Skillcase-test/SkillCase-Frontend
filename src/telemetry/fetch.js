function safeTarget(input) {
  try {
    const raw = typeof input === "string" ? input : input?.url;
    const url = new URL(raw, window.location.origin);
    if (url.pathname.includes("/telemetry/")) return null;
    const sameOrigin = url.origin === window.location.origin;
    return {
      feature: sameOrigin
        ? url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").replace(/\/(\d+)(?=\/|$)/g, "/:id")
        : "external_fetch",
      provider: sameOrigin ? "same_origin" : url.hostname.slice(0, 100),
    };
  } catch {
    return { feature: "unknown_fetch", provider: "unknown" };
  }
}

export function installFetchTelemetry(recordEvent, captureError) {
  if (!globalThis.fetch || globalThis.fetch.__skillcaseObserved) return;
  const originalFetch = globalThis.fetch.bind(globalThis);
  const observedFetch = async (input, init = {}) => {
    const target = safeTarget(input);
    if (!target) return originalFetch(input, init);
    const startedAt = performance.now();
    const method = String(init?.method || input?.method || "GET").toUpperCase();
    const firstParty = target.provider === "same_origin";
    if (firstParty) {
      recordEvent("fetch.request", {
        domain: "network", feature: target.feature, entity_type: "http_request", lifecycle: "started",
        attributes: { method, provider: target.provider, network_state: navigator.onLine ? "online" : "offline" },
      });
    }
    try {
      const response = await originalFetch(input, init);
      if (firstParty || !response.ok) {
        recordEvent("fetch.request", {
          domain: "network", feature: target.feature, entity_type: "http_request",
          lifecycle: response.ok ? "succeeded" : "failed", elapsed_ms: Math.round(performance.now() - startedAt),
          outcome: String(response.status), reason_code: response.ok ? null : `http_${response.status}`,
          attributes: { method, provider: target.provider, status_code: response.status },
        });
      }
      return response;
    } catch (error) {
      recordEvent("fetch.request", {
        domain: "network", feature: target.feature, entity_type: "http_request", lifecycle: "failed",
        elapsed_ms: Math.round(performance.now() - startedAt), reason_code: "network_error",
        attributes: { method, provider: target.provider, network_state: navigator.onLine ? "online" : "offline" },
      });
      // External SDK/network failures remain queryable as fetch.request failures.
      // Grouping them again as application errors created duplicate/noisy issues.
      if (firstParty) {
        captureError?.(error, { feature: target.feature, domain: "network", handled: true });
      }
      throw error;
    }
  };
  observedFetch.__skillcaseObserved = true;
  globalThis.fetch = observedFetch;
}
