import { beforeEach, describe, expect, it, vi } from "vitest";

const captureApiError = vi.fn();
const addSentryBreadcrumb = vi.fn();
const recordEvent = vi.fn();
const dispatch = vi.fn();
const setMaintenanceStatus = vi.fn();
let authState = { token: "token-1", user: { user_id: "u-1" } };

vi.mock("../redux/store", () => ({
  store: {
    getState: () => ({ auth: authState }),
    dispatch: (...args) => dispatch(...args),
  },
}));
vi.mock("../redux/auth/authSlice", () => ({ setUser: (u) => ({ type: "setUser", payload: u }) }));
vi.mock("../utils/maintenanceSignal", async () => {
  const actual = await vi.importActual("../utils/maintenanceSignal");
  return {
    ...actual,
    setMaintenanceStatus: (...a) => setMaintenanceStatus(...a),
  };
});
vi.mock("../observability/sentry", () => ({
  captureApiError: (...a) => captureApiError(...a),
  addSentryBreadcrumb: (...a) => addSentryBreadcrumb(...a),
}));
vi.mock("../telemetry", () => ({
  getTelemetryHeaders: () => ({}),
  getTelemetryRequestContext: () => ({ interactionId: "i-1" }),
  recordEvent: (...a) => recordEvent(...a),
}));

let api;
let onRejected;
let onFulfilled;

function failure({ status, data = {}, code } = {}) {
  return {
    config: { url: "/b1/flashcard/chapters", method: "get", meta: {} },
    code,
    response: status ? { status, data, headers: {} } : undefined,
  };
}

describe("api error reporting", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    authState = { token: "token-1", user: { user_id: "u-1" } };
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    api = (await import("../api/axios")).default;
    onFulfilled = api.interceptors.response.handlers[0].fulfilled;
    onRejected = api.interceptors.response.handlers[0].rejected;
  });

  it("still refreshes the user when the paywall returns 402 locked", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({
      data: { user: { user_id: "u-1", paywall_active: true } },
    });

    await expect(
      onRejected(failure({ status: 402, data: { locked: true } })),
    ).rejects.toBeDefined();
    await Promise.resolve();

    // The lock must still be synced into redux -- this is what flips the app
    // over to the paywall screen. Suppressing the error report must not touch it.
    expect(post).toHaveBeenCalledWith("/user/me", null, {
      meta: { skipPaywallRefresh: true },
    });
  });

  it("does not file an error report for expected business or auth states", async () => {
    for (const status of [401, 402, 403, 404, 409, 422, 429]) {
      vi.clearAllMocks();
      vi.spyOn(api, "post").mockResolvedValue({ data: {} });
      await expect(onRejected(failure({ status }))).rejects.toBeDefined();
      expect(captureApiError, `status ${status}`).not.toHaveBeenCalled();
      // The outcome is still recorded as telemetry, so nothing is lost.
      expect(recordEvent).toHaveBeenCalledWith("api.request", expect.anything());
    }
  });

  it("does not file an error report for a transport failure while offline", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    await expect(onRejected(failure({ code: "ERR_NETWORK" }))).rejects.toBeDefined();
    expect(captureApiError).not.toHaveBeenCalled();
  });

  it("only marks explicitly confirmed maintenance as maintenance", async () => {
    await expect(onRejected(failure({ status: 500 }))).rejects.toBeDefined();
    expect(captureApiError).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    await expect(onRejected(failure({ code: "ERR_NETWORK" }))).rejects.toBeDefined();
    expect(captureApiError).toHaveBeenCalledTimes(1);
    expect(setMaintenanceStatus).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await expect(
      onRejected(failure({ status: 503, data: { code: "backend_unhealthy" } })),
    ).rejects.toBeDefined();
    expect(captureApiError).toHaveBeenCalledTimes(1);
    expect(setMaintenanceStatus).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await expect(
      onRejected(failure({ status: 503, data: { code: "maintenance_mode" } })),
    ).rejects.toBeDefined();
    expect(captureApiError).toHaveBeenCalledTimes(1);
    expect(setMaintenanceStatus).toHaveBeenCalledWith(true);

    vi.clearAllMocks();
    await expect(
      onRejected(failure({ status: 503, data: { message: "System under maintenance" } })),
    ).rejects.toBeDefined();
    expect(setMaintenanceStatus).toHaveBeenCalledWith(true);
  });

  it("does not clear maintenance because an unrelated request succeeds", async () => {
    await expect(
      onRejected(failure({ status: 503, data: { code: "maintenance_mode" } })),
    ).rejects.toBeDefined();

    vi.clearAllMocks();
    await onFulfilled({
      status: 200,
      config: { url: "/health", method: "get", meta: {} },
      headers: {},
    });

    expect(setMaintenanceStatus).not.toHaveBeenCalled();
  });
});
