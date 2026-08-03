import React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMyUsageLimitState = vi.fn();
let authState = { isAuthenticated: true, user: { user_id: "u-1" } };

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: authState }),
}));
vi.mock("../api/usageLimitApi", () => ({
  getMyUsageLimitState: (...a) => mockGetMyUsageLimitState(...a),
}));

import { UsageLimitProvider, useUsageLimitGate } from "../hooks/useUsageLimits";

function GatedScreen({ level, moduleKey }) {
  useUsageLimitGate(level, moduleKey);
  return <div>gated screen content</div>;
}

describe("useUsageLimitGate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authState = { isAuthenticated: true, user: { user_id: "u-1" } };
  });

  it("pops the lock modal in place without navigating away — forcing a route change here fights LandingPage's own redirect and flickers", async () => {
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

    const { getByText } = render(
      <UsageLimitProvider>
        <GatedScreen level="ALL" moduleKey="learn_german" />
      </UsageLimitProvider>,
    );

    await waitFor(() => expect(onUsageLimitHit).toHaveBeenCalledTimes(1));
    expect(onUsageLimitHit.mock.calls[0][0].detail).toMatchObject({
      module_key: "learn_german",
      level: "ALL",
      reason: "usage_limit",
    });
    // The gated screen stays mounted — no navigation was triggered.
    expect(getByText("gated screen content")).toBeInTheDocument();

    window.removeEventListener("skillcase:usage-limit", onUsageLimitHit);
  });

  it("stays quiet when the module isn't locked", async () => {
    mockGetMyUsageLimitState.mockResolvedValue({
      data: {
        eligible: true,
        states: [{ level: "ALL", module_key: "learn_german", locked: false, periods: [] }],
      },
    });

    const onUsageLimitHit = vi.fn();
    window.addEventListener("skillcase:usage-limit", onUsageLimitHit);

    render(
      <UsageLimitProvider>
        <GatedScreen level="ALL" moduleKey="learn_german" />
      </UsageLimitProvider>,
    );
    await waitFor(() => expect(mockGetMyUsageLimitState).toHaveBeenCalledTimes(1));

    expect(onUsageLimitHit).not.toHaveBeenCalled();
    window.removeEventListener("skillcase:usage-limit", onUsageLimitHit);
  });
});
