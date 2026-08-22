import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DeepLinkRedirect from "../pages/deepLink/DeepLinkRedirect";
import { Capacitor } from "@capacitor/core";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("DeepLinkRedirect", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);

    delete window.location;
    window.location = {
      ...originalLocation,
      href: "",
      search: "",
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it("navigates directly on Desktop for ?route=/continue", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={["/redirect?route=/continue"]}>
        <DeepLinkRedirect />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/continue", { replace: true });
    expect(window.location.href).toBe("");
  });

  it("navigates directly on iOS for ?route=/a1", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={["/redirect?route=/a1"]}>
        <DeepLinkRedirect />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/a1", { replace: true });
    expect(window.location.href).toBe("");
  });

  it("attempts custom scheme first on Android, and falls back to market:// if app not installed", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={["/redirect?route=/continue"]}>
        <DeepLinkRedirect />
      </MemoryRouter>,
    );

    // 1. Immediately tries custom scheme
    expect(window.location.href).toBe("skillcase://app/continue");

    // 2. Fast-forward timer by 1500ms -> falls back to Play Store market://
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(window.location.href).toBe("market://details?id=com.skillcase.app");
  });

  it("triggers app/market redirect when clicking button", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={["/redirect?route=/events"]}>
        <DeepLinkRedirect />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", {
      name: /open in app \/ play store/i,
    });

    window.location.href = "";
    fireEvent.click(button);

    expect(window.location.href).toBe("skillcase://app/events");
  });

  it("sanitizes open-redirect attempts to safe root route", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={["/redirect?route=https://evil.com/phish"]}>
        <DeepLinkRedirect />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("routes internally if already in native Capacitor app", () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/redirect?route=/events"]}>
        <DeepLinkRedirect />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/events", { replace: true });
  });
});
