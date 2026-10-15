import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canLearnerUpgradeToPro, premiumLook, premiumPlanName, premiumTier, premiumTransition, shownPremiumLook, trialPillLabel, PREMIUM_PREVIEW_EVENT } from "../utils/premium";

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
    expect(premiumTransition({ ...plus, premium_intro_tier: "" })).toEqual({ kind: "welcome", from: "", to: "plus" });
    expect(premiumTransition({ ...plus, premium_intro_tier: "plus" })).toBeNull();
    expect(premiumTransition({ ...pro, premium_intro_tier: "plus" })).toEqual({ kind: "upgrade", from: "plus", to: "pro" });
  });

  it("the trial gets the Plus look with its own entry, and buying after it is a welcome", () => {
    const trial = { trial_active: true, trial_end_at: new Date(Date.now() + 6.5 * 86400000).toISOString() };
    expect(premiumLook(trial)).toBe("trial");
    expect(premiumTransition({ ...trial, premium_intro_tier: "" })).toMatchObject({ kind: "trial", to: "trial" });
    expect(premiumTransition({ ...plus, premium_intro_tier: "trial" })).toMatchObject({ kind: "welcome", to: "plus" });
    expect(trialPillLabel(trial)).toBe("7d left");
    expect(trialPillLabel({ trial_end_at: new Date(Date.now() + 3600e3).toISOString() })).toBe("last day");
  });

  it("losing access is an exit, and the old look stays until it has played", () => {
    expect(premiumTransition({ premium_intro_tier: "trial" })).toEqual({ kind: "exit", from: "trial", to: "" });
    expect(premiumTransition({ premium_intro_tier: "pro" })).toEqual({ kind: "exit", from: "pro", to: "" });
    expect(premiumTransition({ ...plus, premium_intro_tier: "pro" })).toEqual({ kind: "exit", from: "pro", to: "plus" });
    expect(shownPremiumLook({ premium_intro_tier: "plus" })).toBe("plus");
    expect(shownPremiumLook({ premium_intro_tier: "" })).toBeNull();
  });

  it("learners whose access ended before this version get no exit", () => {
    expect(premiumTransition({ trial_taken: true, premium_intro_tier: "" })).toBeNull();
  });

  it("treats Pro given from the admin panel as Career Pro with no upgrade offer", () => {
    const adminPro = { is_paid: true, admin_pro: true, user_prof_level: "B1" };
    expect(premiumPlanName(adminPro)).toBe("Career Pro");
    expect(canLearnerUpgradeToPro(adminPro)).toBe(false);
    expect(canLearnerUpgradeToPro({ ...adminPro, admin_pro: false })).toBe(true);
    expect(premiumTransition({ ...adminPro, premium_intro_tier: "plus" })).toMatchObject({ kind: "upgrade" });
  });

  it("waits for /user/me to report the flag before deciding", () => {
    expect(premiumTransition(plus)).toBeNull();
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

  it("a Plus learner who moved to Pro gets the level-up, with the header left alone", async () => {
    mockUser = { ...pro, premium_intro_tier: "plus" };
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(1600));
    expect(screen.getByText("Levelling up")).toBeInTheDocument();
    expect(document.documentElement.dataset.premiumReveal).toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith("/user/premium-intro-seen", { tier: "pro" });
    await act(async () => vi.advanceTimersByTime(1300));
    expect(screen.getByText("You're now on")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1500));
    expect(document.documentElement.dataset.premiumReveal).toBe("pill");
  });

  it("a running trial gets the padlock that turns into the trophy", async () => {
    mockUser = { trial_active: true, premium_intro_tier: "" };
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(1600));
    expect(screen.getByRole("dialog", { name: "Welcome to your Career Plus trial" })).toBeInTheDocument();
    expect(screen.getByText("Your free trial")).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith("/user/premium-intro-seen", { tier: "trial" });
    await act(async () => vi.advanceTimersByTime(800));
    expect(screen.getByText("Unlocked for you")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ premium_intro_tier: "trial" }) }));
  });

  it("the trial test button replays it without saving", async () => {
    mockUser = { ...plus, premium_intro_tier: "plus" };
    renderAt("/");
    await act(async () => window.dispatchEvent(new CustomEvent(PREMIUM_PREVIEW_EVENT, { detail: { kind: "trial" } })));
    expect(screen.getByText("Your free trial")).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(4000));
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
