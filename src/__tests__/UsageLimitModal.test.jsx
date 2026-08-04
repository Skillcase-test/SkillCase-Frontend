import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHandlePay = vi.fn();
const mockRefresh = vi.fn();

vi.mock("react-redux", () => ({
  useSelector: () => ({ user_id: "u-1" }),
  useDispatch: () => vi.fn(),
}));
vi.mock("../hooks/useAutopayCheckout", () => ({
  useAutopayCheckout: () => ({ loading: false, handlePay: mockHandlePay }),
}));
vi.mock("../hooks/useUsageLimits", () => ({
  useUsageLimits: () => ({ refresh: mockRefresh }),
}));
const mockSwitchLGMode = vi.fn();
vi.mock("../utils/lgMode", () => ({
  switchLGMode: (...a) => mockSwitchLGMode(...a),
}));

import UsageLimitModal from "../components/UsageLimitModal";

function dispatchUsageLimitEvent(detail) {
  act(() => {
    window.dispatchEvent(new CustomEvent("skillcase:usage-limit", { detail }));
  });
}

describe("UsageLimitModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing until a usage-limit event fires", () => {
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/limit reached/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/feature locked/i)).not.toBeInTheDocument();
  });

  it("renders the hard-lock copy and CTAs when limit_value is 0", () => {
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "grammar",
      level: "A1",
      limit_value: 0,
      used: 0,
      remaining: 0,
      reset_at: null,
      msg: "This feature is currently locked.",
    });

    expect(screen.getByText("Feature locked")).toBeInTheDocument();
    expect(screen.getByText("This feature is subscriber-only")).toBeInTheDocument();
    expect(screen.getByText("Subscribe for unlimited access")).toBeInTheDocument();
    expect(screen.getByText("Keep using free features")).toBeInTheDocument();
    // No countdown UI for a permanent lock.
    expect(screen.queryByText(/until this feature is free again/i)).not.toBeInTheDocument();
  });

  it("renders the countdown copy when limit_value > 0 and counts down", () => {
    vi.useFakeTimers();
    const resetAt = new Date(Date.now() + 61_000).toISOString();
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      limit_value: 20,
      used: 20,
      remaining: 0,
      reset_at: resetAt,
      periods: [{ period: "day", limit_value: 20, used: 20, remaining: 0, locked_until: resetAt, locked: true }],
      msg: "Daily limit reached for Flashcards.",
    });

    expect(screen.getByText("Limit reached")).toBeInTheDocument();
    expect(screen.getByText("You've hit today's free limit")).toBeInTheDocument();
    expect(screen.getByText("00:01:01")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText("00:00:31")).toBeInTheDocument();
  });

  it("flips to the reset state once the countdown reaches the reset_at instant", () => {
    vi.useFakeTimers();
    const resetAt = new Date(Date.now() + 2_000).toISOString();
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      limit_value: 20,
      used: 20,
      remaining: 0,
      reset_at: resetAt,
      periods: [{ period: "day", limit_value: 20, used: 20, remaining: 0, locked_until: resetAt, locked: true }],
      msg: "Daily limit reached for Flashcards.",
    });

    expect(screen.getByText("You've hit today's free limit")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByText("You're free to continue!")).toBeInTheDocument();
    expect(screen.getByText(/limit has reset/i)).toBeInTheDocument();
  });

  it("refreshes the shared usage-limit context once the countdown expires — home hub tiles must not stay locked until a hard refresh", () => {
    vi.useFakeTimers();
    mockRefresh.mockClear();
    const resetAt = new Date(Date.now() + 2_000).toISOString();
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      reset_at: resetAt,
      periods: [{ period: "day", limit_value: 20, used: 20, remaining: 0, locked_until: resetAt, locked: true }],
    });

    expect(mockRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("phrases the header by whichever period(s) actually locked — week only", () => {
    const resetAt = new Date(Date.now() + 60_000).toISOString();
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      reset_at: resetAt,
      periods: [
        { period: "day", limit_value: 20, used: 10, remaining: 10, locked_until: null, locked: false },
        { period: "week", limit_value: 100, used: 100, remaining: 0, locked_until: resetAt, locked: true },
      ],
    });

    expect(screen.getByText("You've hit this week's free limit")).toBeInTheDocument();
  });

  it("phrases the header by whichever period(s) actually locked — month only", () => {
    const resetAt = new Date(Date.now() + 60_000).toISOString();
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      reset_at: resetAt,
      periods: [{ period: "month", limit_value: 500, used: 500, remaining: 0, locked_until: resetAt, locked: true }],
    });

    expect(screen.getByText("You've hit this month's free limit")).toBeInTheDocument();
  });

  it("names only the period driving the countdown when multiple periods are locked at once — not every locked period", () => {
    const dayResetAt = new Date(Date.now() + 60_000).toISOString();
    const weekResetAt = new Date(Date.now() + 120_000).toISOString();
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      reset_at: weekResetAt, // the later of the two, same as backend's resolveModuleState
      periods: [
        { period: "day", limit_value: 20, used: 20, remaining: 0, locked_until: dayResetAt, locked: true },
        { period: "week", limit_value: 100, used: 100, remaining: 0, locked_until: weekResetAt, locked: true },
      ],
    });

    expect(screen.getByText("You've hit this week's free limit")).toBeInTheDocument();
    expect(screen.queryByText(/today's and/)).not.toBeInTheDocument();
  });

  it('"Wait it out" navigates back to the home hub instead of leaving the user stranded on the locked page', () => {
    const resetAt = new Date(Date.now() + 60_000).toISOString();
    render(
      <MemoryRouter initialEntries={["/a1/flashcard"]}>
        <Routes>
          <Route path="/" element={<div>HOME HUB</div>} />
          <Route path="/a1/flashcard" element={<UsageLimitModal />} />
        </Routes>
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "flashcard",
      level: "A1",
      reset_at: resetAt,
      periods: [{ period: "day", limit_value: 20, used: 20, remaining: 0, locked_until: resetAt, locked: true }],
    });

    act(() => {
      screen.getByText("Wait it out").click();
    });

    expect(screen.getByText("HOME HUB")).toBeInTheDocument();
    expect(screen.queryByText("You've hit today's free limit")).not.toBeInTheDocument();
    expect(mockSwitchLGMode).not.toHaveBeenCalled();
  });

  it('leaving a locked Learn German switches the saved mode to "practice" first — otherwise LandingPage\'s own redirect immediately bounces the user right back to /learn-german and the "Wait it out"/"Keep using free features" buttons never actually work', () => {
    render(
      <MemoryRouter initialEntries={["/learn-german"]}>
        <Routes>
          <Route path="/" element={<div>HOME HUB</div>} />
          <Route path="/learn-german" element={<UsageLimitModal />} />
        </Routes>
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "learn_german",
      level: "ALL",
      limit_value: 0,
      reset_at: null,
      periods: [],
      msg: "This feature is currently locked.",
    });

    act(() => {
      screen.getByText("Keep using free features").click();
    });

    expect(mockSwitchLGMode).toHaveBeenCalledWith("practice");
    expect(screen.getByText("HOME HUB")).toBeInTheDocument();
  });

  it("clicking Subscribe triggers the shared autopay checkout flow", () => {
    render(
      <MemoryRouter>
        <UsageLimitModal />
      </MemoryRouter>,
    );
    dispatchUsageLimitEvent({
      locked: true,
      reason: "usage_limit",
      module_key: "grammar",
      level: "A1",
      limit_value: 0,
      reset_at: null,
    });

    screen.getByText("Subscribe for unlimited access").click();
    expect(mockHandlePay).toHaveBeenCalledTimes(1);
  });
});
