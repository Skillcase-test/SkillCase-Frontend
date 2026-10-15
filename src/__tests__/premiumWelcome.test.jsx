import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { premiumIntroDue, premiumPlanName, premiumTier, PREMIUM_PREVIEW_EVENT } from "../utils/premium";

const mockPost = vi.fn(() => Promise.resolve({ data: {} }));
vi.mock("../api/axios", () => ({ default: { post: (...a) => mockPost(...a) } }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));
vi.mock("../utils/haptics", () => ({ hapticMedium: vi.fn() }));
let mockUser;
const mockDispatch = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (fn) => fn({ auth: { user: mockUser } }),
  useDispatch: () => mockDispatch,
}));

const pro = { autopay_enabled: true, subscription_plan: "b2_plus" };
const plus = { autopay_enabled: true, subscription_plan: "standard" };

describe("premium tiers", () => {
  it("names the ₹199 plan Career Pro, the ₹99 plan and admin access Career Plus", () => {
    expect(premiumPlanName(pro)).toBe("Career Pro");
    expect(premiumPlanName(plus)).toBe("Career Plus");
    expect(premiumPlanName({ is_paid: true })).toBe("Career Plus");
  });

  it("gives trial and free users no premium tier", () => {
    expect(premiumTier({ trial_active: true })).toBeNull();
    expect(premiumTier({})).toBeNull();
  });

  it("is due once per tier, and again on an upgrade to Pro", () => {
    expect(premiumIntroDue({ ...plus, premium_intro_tier: "" })).toBe("plus");
    expect(premiumIntroDue({ ...plus, premium_intro_tier: "plus" })).toBeNull();
    expect(premiumIntroDue({ ...pro, premium_intro_tier: "plus" })).toBe("pro");
    expect(premiumIntroDue({ ...plus, premium_intro_tier: "pro" })).toBeNull();
  });

  it("waits for /user/me to report the flag before deciding", () => {
    expect(premiumIntroDue(plus)).toBeNull();
  });
});

describe("PremiumWelcome", () => {
  let PremiumWelcome;
  beforeEach(async () => {
    vi.useFakeTimers();
    mockPost.mockClear();
    mockDispatch.mockClear();
    ({ default: PremiumWelcome } = await import("../components/premium/PremiumWelcome"));
  });
  afterEach(() => {
    vi.useRealTimers();
    delete document.documentElement.dataset.premiumReveal;
  });

  const renderAt = (path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <PremiumWelcome />
      </MemoryRouter>,
    );

  it("plays once on the home screen and saves that it was seen", async () => {
    mockUser = { ...pro, premium_intro_tier: "" };
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(1600));
    expect(screen.getByRole("dialog", { name: "Welcome to Career Pro" })).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith("/user/premium-intro-seen", { tier: "pro" });
    expect(document.documentElement.dataset.premiumReveal).toBe("pending");
    // The local user only updates once it's over
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ premium_intro_tier: "pro" }) }));
  });

  it("waits while another modal is open", async () => {
    mockUser = { ...plus, premium_intro_tier: "" };
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    modal.remove();
    await act(async () => vi.advanceTimersByTime(1400));
    expect(screen.getByRole("dialog", { name: "Welcome to Career Plus" })).toBeInTheDocument();
  });

  it("doesn't play off the home screens, or when already seen", async () => {
    mockUser = { ...pro, premium_intro_tier: "" };
    renderAt("/profile");
    await act(async () => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("the test button replays it without saving anything", async () => {
    mockUser = { ...pro, premium_intro_tier: "pro" };
    renderAt("/");
    await act(async () => window.dispatchEvent(new Event(PREMIUM_PREVIEW_EVENT)));
    expect(screen.getByRole("dialog", { name: "Welcome to Career Pro" })).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
    // No header pill to fly into here: it finishes and the header colours sweep in
    await act(async () => vi.advanceTimersByTime(2100));
    expect(document.documentElement.dataset.premiumReveal).toBe("sweep");
  });
});
