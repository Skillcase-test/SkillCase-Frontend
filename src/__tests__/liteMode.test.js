import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const load = async () => (await import("../utils/liteMode")).isLiteMode;

function setDevice({ memory, saveData = false, reducedMotion = false } = {}) {
  Object.defineProperty(navigator, "deviceMemory", { value: memory, configurable: true });
  Object.defineProperty(navigator, "connection", { value: { saveData }, configurable: true });
  window.matchMedia = vi.fn(() => ({ matches: reducedMotion }));
}

describe("lite mode", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });
  afterEach(() => setDevice());

  it("stays off on capable phones and when memory is unknown (iOS)", async () => {
    setDevice({ memory: 4 });
    expect(await load()).toBe(false);
    vi.resetModules();
    setDevice({ memory: undefined });
    expect(await load()).toBe(false);
  });

  it("turns on for phones under 4GB, Data Saver and reduced motion", async () => {
    setDevice({ memory: 2 });
    expect(await load()).toBe(true);
    vi.resetModules();
    setDevice({ memory: 8, saveData: true });
    expect(await load()).toBe(true);
    vi.resetModules();
    setDevice({ memory: 8, reducedMotion: true });
    expect(await load()).toBe(true);
  });

  it("can be forced either way", async () => {
    setDevice({ memory: 2 });
    localStorage.setItem("skillcase:lite", "0");
    expect(await load()).toBe(false);
    vi.resetModules();
    setDevice({ memory: 8 });
    localStorage.setItem("skillcase:lite", "1");
    expect(await load()).toBe(true);
  });

  it("marks the page so the lite styles apply", async () => {
    setDevice({ memory: 1 });
    const { applyLiteMode } = await import("../utils/liteMode");
    applyLiteMode();
    expect(document.documentElement.classList.contains("lite")).toBe(true);
  });
});
