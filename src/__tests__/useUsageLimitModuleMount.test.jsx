import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: { isAuthenticated: true, user: { user_id: "u-1" } } }),
}));
vi.mock("../api/usageLimitApi", () => ({ getMyUsageLimitState: (...a) => mockGet(...a) }));

import { UsageLimitProvider, useUsageLimitModule } from "../hooks/useUsageLimits";

function Screen({ mk }) {
  useUsageLimitModule("A2", mk);
  return null;
}
const ok = { data: { eligible: true, states: [] } };

describe("useUsageLimitModule mount refresh", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGet.mockResolvedValue(ok);
  });

  it("shares the provider's fetch instead of firing a second one on mount", async () => {
    render(<UsageLimitProvider><Screen mk="grammar" /></UsageLimitProvider>);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("skips a module mount within 10s, but fetches again after", async () => {
    const now = vi.spyOn(Date, "now");
    let t = 1_000_000;
    now.mockImplementation(() => t);
    const { rerender } = render(<UsageLimitProvider><Screen mk="grammar" /></UsageLimitProvider>);
    await act(async () => {});
    const base = mockGet.mock.calls.length;
    t += 5_000;
    rerender(<UsageLimitProvider><Screen mk="reading" /></UsageLimitProvider>);
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledTimes(base);
    t += 6_000;
    rerender(<UsageLimitProvider><Screen mk="listening" /></UsageLimitProvider>);
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledTimes(base + 1);
    now.mockRestore();
  });

  it("lock and refresh events always fetch, even right after a fetch", async () => {
    render(<UsageLimitProvider><Screen mk="grammar" /></UsageLimitProvider>);
    await act(async () => {});
    const base = mockGet.mock.calls.length;
    await act(async () => {
      window.dispatchEvent(new CustomEvent("skillcase:usage-limit-refresh"));
    });
    expect(mockGet).toHaveBeenCalledTimes(base + 1);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("skillcase:usage-limit", { detail: { locked: true } }));
    });
    expect(mockGet).toHaveBeenCalledTimes(base + 2);
  });
});
