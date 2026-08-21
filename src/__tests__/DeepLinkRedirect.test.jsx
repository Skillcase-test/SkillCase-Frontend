import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
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
    mockNavigate.mockClear();
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);

    delete window.location;
    window.location = {
      ...originalLocation,
      replace: vi.fn(),
      search: "",
    };
  });

  afterEach(() => {
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
    expect(window.location.replace).not.toHaveBeenCalled();
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
    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it("fires Android Intent with Play Store fallback when on Android browser", () => {
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

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(window.location.replace).toHaveBeenCalledTimes(1);

    const calledUrl = window.location.replace.mock.calls[0][0];
    expect(calledUrl).toContain("intent://app/continue#Intent");
    expect(calledUrl).toContain("scheme=skillcase");
    expect(calledUrl).toContain("package=com.skillcase.app");
    expect(calledUrl).toContain("S.browser_fallback_url=");
    expect(calledUrl).toContain("play.google.com");
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
    expect(window.location.replace).not.toHaveBeenCalled();
  });
});
