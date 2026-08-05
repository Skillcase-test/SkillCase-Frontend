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
  return { ...actual, setMaintenanceStatus: (...a) => setMaintenanceStatus(...a) };
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

function failure({ status, data = {}, code } = {}) {
  return {
    config: { url: "/a1/flashcard/progress", method: "post", meta: {} },
    code,
    response: status ? { status, data, headers: {} } : undefined,
  };
}

describe("axios usage-limit 402 handling", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    authState = { token: "token-1", user: { user_id: "u-1" } };
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    api = (await import("../api/axios")).default;
    onRejected = api.interceptors.response.handlers[0].rejected;
  });

  it("dispatches skillcase:usage-limit and skips the /user/me refresh", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { user: {} } });
    const listener = vi.fn();
    window.addEventListener("skillcase:usage-limit", listener);

    const body = {
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      limit_value: 20,
      used: 20,
      remaining: 0,
      reset_at: "2026-08-01T00:00:00.000Z",
      msg: "Daily limit reached for Flashcards.",
    };

    await expect(onRejected(failure({ status: 402, data: body }))).rejects.toBeDefined();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual(body);
    // The unrelated blanket-paywall refresh path must NOT fire for this branch.
    expect(post).not.toHaveBeenCalledWith("/user/me", null, expect.anything());

    window.removeEventListener("skillcase:usage-limit", listener);
  });

  it("still refreshes /user/me for the pre-existing blanket paywall 402 (no reason field)", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({
      data: { user: { user_id: "u-1", paywall_active: true } },
    });
    const listener = vi.fn();
    window.addEventListener("skillcase:usage-limit", listener);

    await expect(
      onRejected(failure({ status: 402, data: { locked: true } })),
    ).rejects.toBeDefined();
    await Promise.resolve();

    expect(post).toHaveBeenCalledWith("/user/me", null, { meta: { skipPaywallRefresh: true } });
    // The two 402 flows must never cross-wire.
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener("skillcase:usage-limit", listener);
  });

  it("does not file a Sentry error report for a usage-limit 402 (still an expected status)", async () => {
    vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    await expect(
      onRejected(failure({ status: 402, data: { reason: "usage_limit" } })),
    ).rejects.toBeDefined();
    expect(captureApiError).not.toHaveBeenCalled();
  });
});
