import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = { token: "token-1", user: { user_id: "u-1" } };
const storeListeners = new Set();
vi.mock("../redux/store", () => ({
  store: {
    getState: () => ({ auth }),
    dispatch: vi.fn(),
    subscribe: (fn) => {
      storeListeners.add(fn);
      return () => storeListeners.delete(fn);
    },
  },
}));
vi.mock("../redux/auth/authSlice", () => ({
  setUser: (user) => ({ type: "setUser", payload: user }),
}));
vi.mock("../utils/maintenanceSignal", () => ({
  isMaintenanceResponse: () => false,
  setMaintenanceStatus: vi.fn(),
}));
vi.mock("../observability/errors", () => ({ captureApiError: vi.fn() }));
vi.mock("../telemetry", () => ({
  getTelemetryHeaders: () => ({}),
  getTelemetryRequestContext: () => ({ interactionId: "i-1" }),
  recordEvent: vi.fn(),
}));

const CHAPTERS = ["/a1/flashcard/chapters", { meta: { cacheTags: ["a1:flashcard"], persist: true } }, "MEDIUM_PRIVATE"];

async function setup(respond = () => ({ data: [{ id: 1 }], status: 200 })) {
  const mod = await import("../api/axios");
  const { errors } = await import("../observability/errors").then((m) => ({ errors: m }));
  const api = mod.default;
  const adapter = vi.fn(async (config) => {
    const out = await respond(config, adapter.mock.calls.length);
    if (out instanceof Error) {
      out.config = config;
      throw out;
    }
    if (out.status >= 400) {
      const err = new Error(`status ${out.status}`);
      err.config = config;
      err.response = { ...out, config, headers: {} };
      throw err;
    }
    return { statusText: "OK", headers: {}, config, ...out };
  });
  api.defaults.adapter = adapter;
  const gets = () => adapter.mock.calls.filter(([c]) => c.method === "get").length;
  return { api, adapter, gets, errors };
}

// Simulates the app being killed and reopened with the same localStorage
async function relaunch(respond) {
  vi.resetModules();
  return setup(respond);
}

describe("peekGet", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    storeListeners.clear();
    auth.user = { user_id: "u-1" };
  });

  it("returns nothing before the first fetch", async () => {
    const { api } = await setup();
    expect(api.peekGet(...CHAPTERS)).toBeUndefined();
  });

  it("paints from memory and from storage after a relaunch, without a request", async () => {
    const { api } = await setup();
    await api.cachedGet(...CHAPTERS);
    expect(api.peekGet(...CHAPTERS)).toEqual({ data: [{ id: 1 }] });

    const next = await relaunch();
    expect(next.api.peekGet(...CHAPTERS)).toEqual({ data: [{ id: 1 }] });
    expect(next.gets()).toBe(0);
  });

  it("never treats a stored copy as fresh — the next read still hits the network", async () => {
    const { api } = await setup();
    await api.cachedGet(...CHAPTERS);
    const next = await relaunch(() => ({ data: [{ id: 2 }], status: 200 }));
    const res = await next.api.cachedGet(...CHAPTERS);
    expect(res.data).toEqual([{ id: 2 }]);
    expect(next.gets()).toBe(1);
    expect(next.api.peekGet(...CHAPTERS)).toEqual({ data: [{ id: 2 }] });
  });

  it("only persists reads that opt in", async () => {
    const { api } = await setup();
    await api.cachedGet("/a1/grammar/topics", {}, "MEDIUM_PRIVATE");
    const next = await relaunch();
    expect(next.api.peekGet("/a1/grammar/topics", {}, "MEDIUM_PRIVATE")).toBeUndefined();
  });

  it("drops the stored copy when its tag is invalidated by a write", async () => {
    const { api } = await setup();
    await api.cachedGet(...CHAPTERS);
    await api.post("/a1/flashcard/progress", {}, { meta: { invalidateCacheTags: ["a1:flashcard"] } });
    expect(api.peekGet(...CHAPTERS)).toBeUndefined();
    const next = await relaunch();
    expect(next.api.peekGet(...CHAPTERS)).toBeUndefined();
  });

  it("drops everything after an untagged write", async () => {
    const { api } = await setup();
    await api.cachedGet(...CHAPTERS);
    await api.put("/user/profile", {});
    const next = await relaunch();
    expect(next.api.peekGet(...CHAPTERS)).toBeUndefined();
  });

  it("never shows one user's data to another", async () => {
    const { api } = await setup();
    await api.cachedGet(...CHAPTERS);
    auth.user = { user_id: "u-2" };
    expect(api.peekGet(...CHAPTERS)).toBeUndefined();
    expect(Object.keys(localStorage).some((k) => k.startsWith("skillcase:peek:v1:u-1"))).toBe(false);
  });

  it("wipes stored snapshots as soon as the user logs out", async () => {
    const { api } = await setup();
    await api.cachedGet("/user/profile", { meta: { persist: true } }, "NO_CACHE");
    expect(Object.keys(localStorage).some((k) => k.startsWith("skillcase:peek:v1:u-1"))).toBe(true);
    auth.user = null;
    storeListeners.forEach((fn) => fn());
    expect(Object.keys(localStorage).some((k) => k.startsWith("skillcase:peek:"))).toBe(false);
  });

  it("persists NO_CACHE reads that opt in, but still fetches every time", async () => {
    const { api, gets } = await setup(() => ({ data: { profile: { fullname: "A" } }, status: 200 }));
    const profile = ["/user/profile", { meta: { persist: true } }, "NO_CACHE"];
    await api.cachedGet(...profile);
    await api.cachedGet(...profile);
    expect(gets()).toBe(2);
    expect(api.peekGet(...profile)).toEqual({ data: { profile: { fullname: "A" } } });
  });
});

describe("GET timeout and retry", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    auth.user = { user_id: "u-1" };
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  const networkError = () => Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });

  it("gives plain reads a 30s timeout but leaves writes, admin and AI calls alone", async () => {
    const { api, adapter } = await setup(() => ({ data: {}, status: 200 }));
    await api.get("/streak");
    await api.post("/a1/flashcard/progress", {});
    await api.get("/admin/users");
    await api.get("/b1-maya/session");
    await api.get("/learn-german/tts", { responseType: "blob" });
    const timeouts = adapter.mock.calls.map(([c]) => [c.url, c.timeout]);
    expect(timeouts).toEqual([
      ["/streak", 30000],
      ["/a1/flashcard/progress", 0],
      ["/admin/users", 0],
      ["/b1-maya/session", 0],
      ["/learn-german/tts", 0],
    ]);
  });

  it("retries a dropped read and returns the recovered response", async () => {
    const { api, gets, errors } = await setup((_c, n) =>
      n < 3 ? networkError() : { data: { ok: true }, status: 200 },
    );
    const res = await api.get("/streak");
    expect(res.data).toEqual({ ok: true });
    expect(gets()).toBe(3);
    expect(errors.captureApiError).not.toHaveBeenCalled();
  });

  it("gives up after two retries", async () => {
    const { api, gets } = await setup(() => networkError());
    await expect(api.get("/streak")).rejects.toThrow("Network Error");
    expect(gets()).toBe(3);
  });

  it("retries 502-504 but not 4xx or 500", async () => {
    const statuses = [503, 200];
    const first = await setup((_c, n) => ({ data: {}, status: statuses[n - 1] }));
    await first.api.get("/streak");
    expect(first.gets()).toBe(2);

    vi.resetModules();
    const second = await setup(() => ({ data: { reason: "usage_limit" }, status: 402 }));
    await expect(second.api.get("/streak")).rejects.toThrow();
    expect(second.gets()).toBe(1);

    vi.resetModules();
    const third = await setup(() => ({ data: {}, status: 500 }));
    await expect(third.api.get("/streak")).rejects.toThrow();
    expect(third.gets()).toBe(1);
  });

  it("never retries writes", async () => {
    const { api, adapter } = await setup(() => networkError());
    await expect(api.post("/a1/flashcard/progress", {})).rejects.toThrow();
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("does not retry a timeout", async () => {
    const timeout = () => Object.assign(new Error("timeout"), { code: "ECONNABORTED" });
    const { api, gets } = await setup(() => timeout());
    await expect(api.get("/streak")).rejects.toThrow("timeout");
    expect(gets()).toBe(1);
  });

  it("stops retrying once the caller aborts", async () => {
    const controller = new AbortController();
    // The screen unmounts while the first attempt is failing
    const { api, gets } = await setup(() => {
      controller.abort();
      return networkError();
    });
    await expect(api.get("/streak", { signal: controller.signal })).rejects.toThrow();
    expect(gets()).toBe(1);
  });
});
