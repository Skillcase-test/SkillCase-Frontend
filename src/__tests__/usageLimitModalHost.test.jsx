import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../components/UsageLimitModal", () => ({
  default: ({ initialEvent }) => (
    <div>modal for {initialEvent?.detail?.module_key}</div>
  ),
}));

const { default: UsageLimitModalHost } = await import("../components/UsageLimitModalHost");

describe("UsageLimitModalHost", () => {
  it("renders nothing until a usage limit is hit", () => {
    const { container } = render(<UsageLimitModalHost />);
    expect(container.innerHTML).toBe("");
  });

  it("opens the lazy modal with the event that triggered it", async () => {
    render(<UsageLimitModalHost />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent("skillcase:usage-limit", { detail: { module_key: "maya" } }),
      );
    });
    expect(await screen.findByText("modal for maya")).toBeTruthy();
  });
});
