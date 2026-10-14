import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const captureTelemetryError = vi.fn();
vi.mock("../telemetry", () => ({
  captureTelemetryError: (...a) => captureTelemetryError(...a),
}));

const { default: AppErrorBoundary } = await import("../components/AppErrorBoundary");

function Boom({ error }) {
  throw error;
}

describe("AppErrorBoundary", () => {
  it("shows the fallback and reports render crashes to telemetry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("render failed");
    render(
      <AppErrorBoundary>
        <Boom error={error} />
      </AppErrorBoundary>,
    );
    expect(screen.getByText("This page could not be loaded")).toBeTruthy();
    expect(captureTelemetryError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ reason_code: "render_error", severity: "fatal" }),
    );
  });

  it("offers a reload for stale chunks instead of a retry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <Boom error={new Error("Failed to fetch dynamically imported module")} />
      </AppErrorBoundary>,
    );
    expect(screen.getByText("A new version is available")).toBeTruthy();
    expect(screen.queryByText("Try again")).toBeNull();
  });
});
