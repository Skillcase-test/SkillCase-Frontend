import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeatureStatusChip from "../components/ui/FeatureStatusChip";

describe("FeatureStatusChip", () => {
  it("renders the green 'Unlimited usage' pill when no limit is configured (state null)", () => {
    render(<FeatureStatusChip state={null} />);
    expect(screen.getByText("Unlimited usage")).toBeInTheDocument();
    expect(screen.queryByText("Premium")).not.toBeInTheDocument();
    expect(screen.queryByText(/Free Plan/i)).not.toBeInTheDocument();
  });

  it("renders 'Unlimited usage' for an explicit unlimited grant", () => {
    render(
      <FeatureStatusChip
        state={{ hard_locked: false, unlimited: true, locked: false, periods: [] }}
      />,
    );
    expect(screen.getByText("Unlimited usage")).toBeInTheDocument();
  });

  it("renders the yellow 'Premium' pill for a hard-locked (subscriber-only) module", () => {
    render(
      <FeatureStatusChip
        state={{
          hard_locked: true,
          locked: true,
          limit_value: 0,
          periods: [],
        }}
      />
    );
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.queryByText("Unlimited usage")).not.toBeInTheDocument();
  });

  it("renders 'Premium' for a locked module with no periods (bundle exclusion shape)", () => {
    render(
      <FeatureStatusChip
        state={{ hard_locked: false, locked: true, limit_value: 0, periods: [] }}
      />
    );
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("renders the daily-limit chip with the used/limit readout when a day period exists", () => {
    render(
      <FeatureStatusChip
        state={{
          hard_locked: false,
          locked: false,
          periods: [
            { period: "day", limit_value: 6, used: 3, remaining: 3, locked: false },
            { period: "week", limit_value: 30, used: 9, remaining: 21, locked: false },
          ],
        }}
      />
    );
    expect(screen.getByText("Free Plan - Daily limit")).toBeInTheDocument();
    expect(screen.getByText("3/6")).toBeInTheDocument();
  });

  it("falls back to the first configured period when a module has no daily cap", () => {
    render(
      <FeatureStatusChip
        state={{
          hard_locked: false,
          locked: false,
          periods: [{ period: "week", limit_value: 10, used: 4, remaining: 6, locked: false }],
        }}
      />
    );
    expect(screen.getByText("Free Plan - Daily limit")).toBeInTheDocument();
    expect(screen.getByText("4/10")).toBeInTheDocument();
  });

  it("shows a full bar (used clamped to limit) when the cap is reached", () => {
    render(
      <FeatureStatusChip
        state={{
          hard_locked: false,
          locked: true,
          periods: [{ period: "day", limit_value: 6, used: 6, remaining: 0, locked: true }],
        }}
      />
    );
    expect(screen.getByText("Free Plan - Daily limit")).toBeInTheDocument();
    expect(screen.getByText("6/6")).toBeInTheDocument();
  });

  it("does not overflow the readout when used somehow exceeds the limit", () => {
    render(
      <FeatureStatusChip
        state={{
          hard_locked: false,
          locked: false,
          periods: [{ period: "day", limit_value: 5, used: 9, remaining: 0, locked: false }],
        }}
      />
    );
    expect(screen.getByText("5/5")).toBeInTheDocument();
  });
});
