import { beforeEach, describe, expect, it, vi } from "vitest";

let authState = { token: "token-1", user: { user_id: "u-1" } };

vi.mock("../redux/store", () => ({
  store: {
    getState: () => ({ auth: authState }),
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

const CACHE_TAG = "a1:flashcard";
const CACHE_VERSION_PARAM = "__skillcase_cache_version";

function flashcardRequestConfig() {
  return { meta: { cacheTags: [CACHE_TAG] } };
}

describe("GET cache epoch persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    authState = { token: "token-1", user: { user_id: "u-1" } };
  });

  it("keeps a post-write cache URL generation across a page reload", async () => {
    const api = (await import("../api/axios")).default;
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { current_index: 14 } });

    await api.cachedGet("/a1/flashcard/cards/5", flashcardRequestConfig(), "MEDIUM_PRIVATE");
    const beforeWrite = get.mock.calls[0][1].params[CACHE_VERSION_PARAM];

    api.invalidateGetCacheTags([CACHE_TAG]);
    await api.cachedGet("/a1/flashcard/cards/5", flashcardRequestConfig(), "MEDIUM_PRIVATE");
    const afterWrite = get.mock.calls[1][1].params[CACHE_VERSION_PARAM];

    expect(afterWrite).not.toBe(beforeWrite);
    expect(JSON.parse(localStorage.getItem("skillcase:get-cache-epochs:v1"))).toEqual(
      expect.objectContaining({
        "u-1": expect.objectContaining({
          tags: { [CACHE_TAG]: 1 },
        }),
      }),
    );

    // A fresh module instance represents F5/reopening the tab. It must restore
    // the generation written above instead of falling back to tag epoch 0.
    vi.resetModules();
    const reloadedApi = (await import("../api/axios")).default;
    const reloadedGet = vi.spyOn(reloadedApi, "get").mockResolvedValue({
      data: { current_index: 14 },
    });

    await reloadedApi.cachedGet(
      "/a1/flashcard/cards/5",
      flashcardRequestConfig(),
      "MEDIUM_PRIVATE",
    );

    expect(reloadedGet.mock.calls[0][1].params[CACHE_VERSION_PARAM]).toBe(afterWrite);
  });

  it("invalidates again when the tagged write response arrives", async () => {
    const api = (await import("../api/axios")).default;
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: {} });
    const requestFulfilled = api.interceptors.request.handlers[0].fulfilled;
    const responseFulfilled = api.interceptors.response.handlers[0].fulfilled;

    const postConfig = requestFulfilled({
      method: "post",
      url: "/a1/flashcard/progress",
      meta: { invalidateCacheTags: [CACHE_TAG] },
    });
    await responseFulfilled({ config: postConfig, status: 200, headers: {} });

    await api.cachedGet(
      "/a1/flashcard/cards/5",
      flashcardRequestConfig(),
      "MEDIUM_PRIVATE",
    );

    expect(get.mock.calls[0][1].params[CACHE_VERSION_PARAM]).toBe(
      `global:0|${CACHE_TAG}:2`,
    );
  });

  it("adopts a higher epoch received from another tab", async () => {
    const api = (await import("../api/axios")).default;
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: {} });

    const externalEpochs = {
      "u-1": { global: 0, tags: { [CACHE_TAG]: 7 } },
    };
    window.localStorage.setItem(
      "skillcase:get-cache-epochs:v1",
      JSON.stringify(externalEpochs),
    );
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "skillcase:get-cache-epochs:v1",
        newValue: JSON.stringify(externalEpochs),
      }),
    );

    await api.cachedGet(
      "/a1/flashcard/cards/5",
      flashcardRequestConfig(),
      "MEDIUM_PRIVATE",
    );

    expect(get.mock.calls[0][1].params[CACHE_VERSION_PARAM]).toBe(
      `global:0|${CACHE_TAG}:7`,
    );
  });

  it("migrates legacy token-suffixed scopes without writing token residue back", async () => {
    localStorage.setItem(
      "skillcase:get-cache-epochs:v1",
      JSON.stringify({
        "u-1::secret-token-suffix": {
          global: 0,
          tags: { [CACHE_TAG]: 4 },
        },
      }),
    );

    const api = (await import("../api/axios")).default;
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: {} });
    await api.cachedGet(
      "/a1/flashcard/cards/5",
      flashcardRequestConfig(),
      "MEDIUM_PRIVATE",
    );

    expect(get.mock.calls[0][1].params[CACHE_VERSION_PARAM]).toBe(
      `global:0|${CACHE_TAG}:4`,
    );

    api.invalidateGetCacheTags([CACHE_TAG]);
    const persisted = JSON.parse(
      localStorage.getItem("skillcase:get-cache-epochs:v1"),
    );
    expect(persisted["u-1"]).toBeDefined();
    expect(Object.keys(persisted).some((scope) => scope.includes("::"))).toBe(false);
  });

  it("keeps persisted auth scopes bounded", async () => {
    const scopes = Object.fromEntries(
      Array.from({ length: 40 }, (_, index) => [
        `u-${index}`,
        { global: 0, tags: {} },
      ]),
    );
    localStorage.setItem(
      "skillcase:get-cache-epochs:v1",
      JSON.stringify(scopes),
    );

    const api = (await import("../api/axios")).default;
    api.invalidateGetCacheTags([CACHE_TAG]);

    const persisted = JSON.parse(
      localStorage.getItem("skillcase:get-cache-epochs:v1"),
    );
    expect(Object.keys(persisted).length).toBeLessThanOrEqual(32);
    expect(persisted["u-1"]).toBeDefined();
  });
});
