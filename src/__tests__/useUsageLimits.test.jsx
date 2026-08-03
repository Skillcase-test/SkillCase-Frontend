import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMyUsageLimitState = vi.fn();
let authState = { isAuthenticated: true, user: { user_id: "u-1" } };

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: authState }),
}));
vi.mock("../api/usageLimitApi", () => ({
  getMyUsageLimitState: (...a) => mockGetMyUsageLimitState(...a),
}));

import { UsageLimitProvider, useUsageLimits } from "../hooks/useUsageLimits";

function Probe() {
  const { eligible, states } = useUsageLimits();
  return (
    <div>
      <span data-testid="eligible">{String(eligible)}</span>
      <span data-testid="count">{states.length}</span>
    </div>
  );
}

describe("UsageLimitProvider", () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) — clearAllMocks leaves a persistent
    // mockResolvedValue/mockImplementation from a previous test in place,
    // which then silently answers this test's calls once its own queued
    // mockResolvedValueOnce values run out.
    vi.resetAllMocks();
    authState = { isAuthenticated: true, user: { user_id: "u-1" } };
  });

  it("fetches /usage-limits/me once on mount and exposes eligible + states", async () => {
    mockGetMyUsageLimitState.mockResolvedValue({
      data: { eligible: true, states: [{ level: "A1", module_key: "flashcard", locked: false }] },
    });

    render(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("eligible").textContent).toBe("true"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1);
  });

  it("eligible:false results in empty states and the provider stays inert on the same user", async () => {
    mockGetMyUsageLimitState.mockResolvedValue({ data: { eligible: false, states: [] } });

    const { rerender } = render(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );

    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("eligible").textContent).toBe("false");
    expect(screen.getByTestId("count").textContent).toBe("0");

    // A re-render for the SAME user must not trigger another fetch.
    rerender(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );
    await Promise.resolve();
    expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1);
  });

  it("a fetch failure fails closed: eligible false, empty states, no throw", async () => {
    mockGetMyUsageLimitState.mockRejectedValue(new Error("network down"));

    render(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );

    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("eligible").textContent).toBe("false");
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("unauthenticated users never fetch at all", async () => {
    authState = { isAuthenticated: false, user: null };
    render(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );
    await Promise.resolve();
    expect(mockGetMyUsageLimitState).not.toHaveBeenCalled();
    expect(screen.getByTestId("eligible").textContent).toBe("false");
  });

  it("refetches when a different user_id logs in", async () => {
    mockGetMyUsageLimitState.mockResolvedValue({ data: { eligible: true, states: [] } });

    const { rerender } = render(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );
    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));

    authState = { isAuthenticated: true, user: { user_id: "u-2" } };
    rerender(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );
    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(2));
  });

  it("does NOT dispatch skillcase:usage-limit for a module that was already locked on the very first fetch — a page reload must never pop the subscribe modal out of nowhere", async () => {
    mockGetMyUsageLimitState.mockResolvedValue({
      data: {
        eligible: true,
        states: [
          {
            level: "ALL",
            module_key: "learn_german",
            locked: true,
            hard_locked: true,
            limit_value: 0,
            reset_at: null,
            periods: [],
          },
        ],
      },
    });

    const onUsageLimitHit = vi.fn();
    window.addEventListener("skillcase:usage-limit", onUsageLimitHit);

    render(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));

    expect(onUsageLimitHit).not.toHaveBeenCalled();
    window.removeEventListener("skillcase:usage-limit", onUsageLimitHit);
  });

  it("dispatches skillcase:usage-limit itself when a refresh finds a module newly locked — catches an admin lock landing mid-session, not just on the next mount", async () => {
    mockGetMyUsageLimitState
      .mockResolvedValueOnce({
        data: {
          eligible: true,
          states: [{ level: "A1", module_key: "flashcard", locked: false, periods: [] }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          eligible: true,
          states: [
            {
              level: "A1",
              module_key: "flashcard",
              locked: true,
              hard_locked: true,
              limit_value: 0,
              reset_at: null,
              periods: [],
            },
          ],
        },
      });

    let ctx;
    function Capture() {
      ctx = useUsageLimits();
      return null;
    }
    render(
      <UsageLimitProvider>
        <Capture />
      </UsageLimitProvider>,
    );
    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));

    const onUsageLimitHit = vi.fn();
    window.addEventListener("skillcase:usage-limit", onUsageLimitHit);

    await act(async () => {
      await ctx.refresh();
    });

    // The provider's own listener also re-triggers refresh() on this event —
    // the second call is a no-op diff (already reflected), so it must not
    // dispatch again and loop.
    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(3));
    expect(onUsageLimitHit).toHaveBeenCalledTimes(1);
    expect(onUsageLimitHit.mock.calls[0][0].detail).toMatchObject({
      module_key: "flashcard",
      level: "A1",
      reason: "usage_limit",
    });

    window.removeEventListener("skillcase:usage-limit", onUsageLimitHit);
  });

  it("refetches on a skillcase:usage-limit event", async () => {
    mockGetMyUsageLimitState.mockResolvedValue({ data: { eligible: true, states: [] } });

    render(
      <UsageLimitProvider>
        <Probe />
      </UsageLimitProvider>,
    );
    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new CustomEvent("skillcase:usage-limit", { detail: {} }));
    });

    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(2));
  });

  // Regression: guardUsage's blocked callers used to fire a second,
  // non-incrementing network call of their own purely to provoke a 402 and
  // pop the modal. That trick broke the moment passive saves became
  // lock-exempt (a separate fix for swipe position rolling backward) —
  // callers now do nothing on a block, so guardUsage itself must be the one
  // that fetches the real state and (via refresh()'s own diff) pops the modal.
  describe("guardUsage", () => {
    it("already-known-locked module -> returns false and calls refresh() itself", async () => {
      mockGetMyUsageLimitState.mockResolvedValue({
        data: {
          eligible: true,
          states: [
            {
              level: "A1",
              module_key: "flashcard",
              locked: true,
              hard_locked: false,
              limit_value: null,
              reset_at: new Date(Date.now() + 60_000).toISOString(),
              periods: [{ period: "day", limit_value: 2, used: 2, remaining: 0, locked: true }],
            },
          ],
        },
      });

      let ctx;
      function Capture() {
        ctx = useUsageLimits();
        return null;
      }
      render(
        <UsageLimitProvider>
          <Capture />
        </UsageLimitProvider>,
      );
      await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));

      let result;
      act(() => {
        result = ctx.guardUsage("A1", "flashcard");
      });

      expect(result).toBe(false);
      await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(2));
    });

    it("local prediction crosses the cap before the server has said so -> still returns false and calls refresh()", async () => {
      // The real increment that reached the cap already succeeded server-side
      // (that's why the local count is at the limit) — the server just hasn't
      // been re-read since. refresh() is what picks up the now-real lock.
      mockGetMyUsageLimitState.mockResolvedValue({
        data: {
          eligible: true,
          states: [
            {
              level: "A1",
              module_key: "flashcard",
              locked: false,
              periods: [{ period: "day", limit_value: 2, used: 1, remaining: 1 }],
            },
          ],
        },
      });

      let ctx;
      function Capture() {
        ctx = useUsageLimits();
        return null;
      }
      render(
        <UsageLimitProvider>
          <Capture />
        </UsageLimitProvider>,
      );
      await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));

      // First call: used(1) + local(0) = 1 < 2 -> allowed, local becomes 1.
      let first;
      act(() => {
        first = ctx.guardUsage("A1", "flashcard");
      });
      expect(first).toBe(true);
      expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1); // no refresh on the allowed path

      // Second call: used(1) + local(1) = 2 >= 2 -> blocked, and this is the
      // one that must trigger refresh() to learn the real reset_at.
      let second;
      act(() => {
        second = ctx.guardUsage("A1", "flashcard");
      });
      expect(second).toBe(false);
      await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(2));
    });

    it("under the cap -> returns true and never touches the network", async () => {
      mockGetMyUsageLimitState.mockResolvedValue({
        data: {
          eligible: true,
          states: [
            {
              level: "A1",
              module_key: "flashcard",
              locked: false,
              periods: [{ period: "day", limit_value: 20, used: 1, remaining: 19 }],
            },
          ],
        },
      });

      let ctx;
      function Capture() {
        ctx = useUsageLimits();
        return null;
      }
      render(
        <UsageLimitProvider>
          <Capture />
        </UsageLimitProvider>,
      );
      await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));

      let result;
      act(() => {
        result = ctx.guardUsage("A1", "flashcard");
      });

      expect(result).toBe(true);
      expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1);
    });
  });
});
