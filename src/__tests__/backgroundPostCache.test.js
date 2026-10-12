import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../redux/store", () => ({
  store: {
    getState: () => ({ auth: { token: "token-1", user: { user_id: "u-1" } } }),
    dispatch: vi.fn(),
  },
}));
vi.mock("../redux/auth/authSlice", () => ({
  setUser: (user) => ({ type: "setUser", payload: user }),
}));
vi.mock("../utils/maintenanceSignal", () => ({
  isMaintenanceResponse: () => false,
  setMaintenanceStatus: vi.fn(),
}));
vi.mock("../observability/sentry", () => ({
  addSentryBreadcrumb: vi.fn(),
  captureApiError: vi.fn(),
}));
vi.mock("../telemetry", () => ({
  getTelemetryHeaders: () => ({}),
  getTelemetryRequestContext: () => ({ interactionId: "i-1" }),
  recordEvent: vi.fn(),
}));

async function setup() {
  const mod = await import("../api/axios");
  const api = mod.default;
  const adapter = vi.fn(async (config) => ({ data: { ok: true }, status: 200, statusText: "OK", headers: {}, config }));
  api.defaults.adapter = adapter;
  const getCalls = () => adapter.mock.calls.filter(([c]) => c.method === "get").length;
  const readChapters = () => api.cachedGet("/a1/grammar/topics", {}, "MEDIUM_PRIVATE");
  return { api, mod, getCalls, readChapters };
}

describe("background POSTs and the GET cache", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("keeps cached reads across profile syncs, heartbeats and analytics", async () => {
    const { api, getCalls, readChapters } = await setup();
    await readChapters();
    await api.post("/user/me");
    await api.post("/user/heartbeat");
    await api.post("/analytics/events", { events: [] });
    await readChapters();
    expect(getCalls()).toBe(1);
  });

  it("still clears the cache after a real write", async () => {
    const { api, getCalls, readChapters } = await setup();
    await readChapters();
    await api.post("/a1/grammar/progress", { topic_id: 1 });
    await readChapters();
    expect(getCalls()).toBe(2);
  });

  it("matches paths, not prefixes", async () => {
    const { mod } = await setup();
    expect(mod.isBackgroundPost("/user/me")).toBe(true);
    expect(mod.isBackgroundPost("/user/me?x=1")).toBe(true);
    expect(mod.isBackgroundPost("/user/me/delete")).toBe(false);
    expect(mod.isBackgroundPost("/user/lg-mode")).toBe(false);
  });
});
