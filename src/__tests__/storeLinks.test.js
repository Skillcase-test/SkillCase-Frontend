import { describe, expect, it, vi } from "vitest";

const mockPlatform = vi.fn();
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => mockPlatform() },
}));

import { storeName, storeUrls } from "../config/storeLinks";

describe("storeLinks", () => {
  it("points Android at the Play Store", () => {
    mockPlatform.mockReturnValue("android");
    expect(storeName()).toBe("Play Store");
    expect(storeUrls()).toEqual({
      app: "market://details?id=com.skillcase.app",
      web: "https://play.google.com/store/apps/details?id=com.skillcase.app",
    });
  });

  it("has no store link on iOS until the App Store id is set", () => {
    mockPlatform.mockReturnValue("ios");
    expect(storeName()).toBe("App Store");
    expect(storeUrls()).toBeNull();
  });
});
