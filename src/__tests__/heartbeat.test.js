import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();

vi.mock("../api/axios", () => ({ default: { post: (...args) => post(...args) } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));

let startHeartbeat;
let stopHeartbeat;

function setEnvironment({ online = true, visibility = "visible" } = {}) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
}

// The loop reschedules itself only after the in-flight request settles, so
// advancing timers alone is not enough -- pending promises must drain too.
async function advance(ms) {
  await vi.advanceTimersByTimeAsync(ms);
}

describe("heartbeat scheduling", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    post.mockReset();
    post.mockResolvedValue({ data: {} });
    setEnvironment();
    ({ startHeartbeat, stopHeartbeat } = await import("../utils/heartbeat"));
  });

  afterEach(() => {
    stopHeartbeat();
    vi.useRealTimers();
  });

  it("sends immediately and then on a ten second cadence", async () => {
    startHeartbeat();
    await advance(0);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/user/heartbeat");

    await advance(10000);
    expect(post).toHaveBeenCalledTimes(2);

    await advance(10000);
    expect(post).toHaveBeenCalledTimes(3);
  });

  it("stops sending once stopped", async () => {
    startHeartbeat();
    await advance(0);
    expect(post).toHaveBeenCalledTimes(1);

    stopHeartbeat();
    await advance(60000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("survives a stop and restart cycle, as happens when auth changes", async () => {
    startHeartbeat();
    await advance(0);
    stopHeartbeat();
    startHeartbeat();
    await advance(0);
    expect(post).toHaveBeenCalledTimes(2);

    // Exactly one loop must be live: a leaked timer would double this.
    await advance(10000);
    expect(post).toHaveBeenCalledTimes(3);
  });

  it("skips sending while offline or hidden, without stopping the loop", async () => {
    setEnvironment({ online: false });
    startHeartbeat();
    await advance(25000);
    expect(post).not.toHaveBeenCalled();

    setEnvironment({ online: true, visibility: "hidden" });
    await advance(25000);
    expect(post).not.toHaveBeenCalled();

    setEnvironment({ online: true, visibility: "visible" });
    await advance(10000);
    expect(post).toHaveBeenCalled();
  });

  it("backs off exponentially on transport failure and caps at five minutes", async () => {
    post.mockRejectedValue(Object.assign(new Error("Network Error"), {}));
    startHeartbeat();
    await advance(0);
    expect(post).toHaveBeenCalledTimes(1);

    // 10s, then 20s, then 40s: three more attempts across 70s. The old fixed
    // interval would have fired seven times in the same window.
    await advance(10000);
    expect(post).toHaveBeenCalledTimes(2);
    await advance(20000);
    expect(post).toHaveBeenCalledTimes(3);
    await advance(40000);
    expect(post).toHaveBeenCalledTimes(4);

    // Well past the cap the loop is still alive but slow.
    const before = post.mock.calls.length;
    await advance(15 * 60 * 1000);
    const attempts = post.mock.calls.length - before;
    expect(attempts).toBeGreaterThan(0);
    expect(attempts).toBeLessThan(10);
  });

  it("returns to the normal cadence after a successful send", async () => {
    post.mockRejectedValue(new Error("Network Error"));
    startHeartbeat();
    await advance(0);
    await advance(10000);
    await advance(20000);
    const afterFailures = post.mock.calls.length;

    post.mockResolvedValue({ data: {} });
    await advance(40000);
    expect(post.mock.calls.length).toBe(afterFailures + 1);

    await advance(10000);
    expect(post.mock.calls.length).toBe(afterFailures + 2);
  });

  it("keeps the normal cadence when the server answers with an error status", async () => {
    post.mockRejectedValue({ response: { status: 403 } });
    startHeartbeat();
    await advance(0);
    expect(post).toHaveBeenCalledTimes(1);

    // A 403 is a completed round trip, so it must not trigger backoff.
    await advance(10000);
    expect(post).toHaveBeenCalledTimes(2);
    await advance(10000);
    expect(post).toHaveBeenCalledTimes(3);
  });
});
