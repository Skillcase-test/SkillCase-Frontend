import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREMIUM_PREVIEW_EVENT } from "../utils/premium";

const mockPost = vi.fn(() => Promise.resolve({ data: {} }));
vi.mock("../api/axios", () => ({ default: { post: (...a) => mockPost(...a) } }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));
vi.mock("../utils/haptics", () => ({ hapticMedium: vi.fn() }));
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({ ...(await orig()), useNavigate: () => mockNavigate }));
let mockUser;
const mockDispatch = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (fn) => fn({ auth: { user: mockUser } }),
  useDispatch: () => mockDispatch,
}));

const plus = { autopay_enabled: true, subscription_plan: "standard" };

describe("PremiumExit", () => {
  let PremiumExit;
  let pill;
  beforeEach(async () => {
    vi.useFakeTimers();
    mockPost.mockClear();
    mockDispatch.mockClear();
    mockNavigate.mockClear();
    ({ default: PremiumExit } = await import("../components/premium/PremiumExit"));
    pill = document.createElement("a");
    pill.setAttribute("data-premium-pill", "");
    pill.textContent = "Career Plus";
    document.body.appendChild(pill);
  });
  afterEach(() => {
    vi.useRealTimers();
    pill.remove();
    delete document.documentElement.dataset.premiumExit;
  });

  const renderAt = (path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <PremiumExit />
      </MemoryRouter>,
    );

  it("a plan that ended cracks, drains, then shows what's gone", async () => {
    mockUser = { premium_intro_tier: "plus" };
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(1600));
    expect(document.documentElement.dataset.premiumExit).toBe("crack");
    expect(mockPost).toHaveBeenCalledWith("/user/premium-intro-seen", { tier: "" });
    // Header keeps its look until the drain is over
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(700));
    expect(document.documentElement.dataset.premiumExit).toBe("fall");
    await act(async () => vi.advanceTimersByTime(700));
    expect(document.documentElement.dataset.premiumExit).toBe("drain");
    await act(async () => vi.advanceTimersByTime(1200));
    expect(document.documentElement.dataset.premiumExit).toBeUndefined();
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ premium_intro_tier: "" }) }));
    expect(screen.getByRole("dialog", { name: "Your Career Plus has ended" })).toBeInTheDocument();
    expect(screen.getByText("Unlimited German lessons")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Get it back"));
    expect(mockNavigate).toHaveBeenCalledWith("/profile/upgrade");
  });

  it("a trial that ended stands in for the trial-ended modal", async () => {
    mockUser = { trial_taken: true, premium_intro_tier: "trial" };
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("dialog", { name: "Your free trial has ended" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Continue with free"));
    expect(mockPost).toHaveBeenCalledWith("/user/dismiss-trial-ended");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Pro → Plus keeps the premium header and only breaks the pill", async () => {
    mockUser = { ...plus, premium_intro_tier: "pro" };
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("dialog", { name: "Career Pro has ended" })).toBeInTheDocument();
    expect(screen.getByText("You're on Career Plus now.")).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith("/user/premium-intro-seen", { tier: "plus" });
  });

  it("does nothing off the home screens, or for access that ended before this version", async () => {
    mockUser = { premium_intro_tier: "plus" };
    renderAt("/profile");
    await act(async () => vi.advanceTimersByTime(4000));
    expect(mockPost).not.toHaveBeenCalled();
    mockUser = { trial_taken: true, premium_intro_tier: "" };
    renderAt("/");
    await act(async () => vi.advanceTimersByTime(4000));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("the test buttons replay it without saving anything", async () => {
    mockUser = { ...plus, premium_intro_tier: "plus" };
    renderAt("/");
    await act(async () => window.dispatchEvent(new CustomEvent(PREMIUM_PREVIEW_EVENT, { detail: { kind: "plan-exit" } })));
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("dialog", { name: "Your Career Plus has ended" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Continue with free"));
    await act(async () => window.dispatchEvent(new CustomEvent(PREMIUM_PREVIEW_EVENT, { detail: { kind: "trial-exit" } })));
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("dialog", { name: "Your free trial has ended" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Continue with free"));
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
