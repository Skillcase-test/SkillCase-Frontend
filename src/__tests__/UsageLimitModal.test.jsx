import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UsageLimitModal from "../components/UsageLimitModal";

const mockNavigate = vi.fn();
const mockHandlePay = vi.fn();
const mockInstantUpgrade = vi.fn();
const mockGetPlans = vi.fn();
const mockChangePlan = vi.fn();

let mockUser = {
  id: 1,
  trial_taken: true,
  occupation: "nurse",
  autopay_status: "active",
};

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) =>
    selector({ auth: { user: mockUser } }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("framer-motion", async () => {
  const R = await import("react");
  const cache = new Map();
  const motion = new Proxy(
    {},
    {
      get: (_t, tag) => {
        if (typeof tag !== "string") return undefined;
        if (!cache.has(tag)) {
          const Comp = R.forwardRef((props, ref) => {
            const { children, initial, animate, exit, transition, variants, whileHover, whileTap, whileFocus, whileInView, viewport, drag, layout, layoutId, custom, ...rest } = props;
            return R.createElement(tag, { ...rest, ref }, children);
          });
          Comp.displayName = `motion.${tag}`;
          cache.set(tag, Comp);
        }
        return cache.get(tag);
      },
    },
  );
  return { motion, AnimatePresence: ({ children }) => children };
});

vi.mock("../hooks/useUsageLimits", () => ({
  useUsageLimits: () => ({ refresh: vi.fn() }),
}));

vi.mock("../hooks/useAutopayCheckout", () => ({
  useAutopayCheckout: () => ({
    loading: false,
    handlePay: mockHandlePay,
    handleInstantUpgrade: mockInstantUpgrade,
  }),
}));

vi.mock("../api/subscriptionApi", () => ({
  getSubscriptionPlans: (...args) => mockGetPlans(...args),
  changePlan: (...args) => mockChangePlan(...args),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../redux/auth/authSlice", () => ({
  setUser: (u) => ({ type: "auth/setUser", payload: u }),
}));

vi.mock("../utils/lgMode", () => ({ switchLGMode: vi.fn() }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));
vi.mock("../utils/mayaAvatars", () => ({ getMayaImage: () => "maya.webp" }));

const BOTH_PLANS = {
  plans: [
    { key: "standard", label: "Standard", amountPaise: 9900, mayaMinutesPerDay: 10 },
    { key: "b2_plus", label: "Plus", amountPaise: 19900, mayaMinutesPerDay: 30 },
  ],
  current: null,
};

const mayaLock = {
  module_key: "maya",
  level: "B2",
  limit_value: 0,
  msg: "Talk to Maya is a premium feature.",
};

const mayaDailyLimit = {
  module_key: "maya",
  level: "B2",
  limit_value: 0,
  lock_reason: "daily_limit",
  msg: "You've used your Maya minutes for today.",
};

function fireUsageLimit(detail) {
  act(() => {
    window.dispatchEvent(new CustomEvent("skillcase:usage-limit", { detail }));
  });
}

describe("UsageLimitModal — Maya premium lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 1,
      trial_taken: true,
      occupation: "nurse",
      autopay_status: "active",
      user_prof_level: "b2",
    };
    mockGetPlans.mockResolvedValue(BOTH_PLANS);
  });

  it("shows the picked plan's Maya minutes to a B2 learner", async () => {
    render(<UsageLimitModal />);
    fireUsageLimit(mayaLock);

    // Standard is preselected → the row shows its 10-minute pool.
    expect(await screen.findByText("Talk to Maya")).toBeInTheDocument();
    expect(screen.getByText("10 min/day")).toBeInTheDocument();

    // Picking Plus updates the row to the bigger pool.
    const plusOption = await screen.findByText(/Plus ₹199/);
    act(() => plusOption.closest("button").click());
    expect(screen.getByText("30 min/day")).toBeInTheDocument();
  });

  it("says Maya is Unlimited to a B1 learner instead of minutes", async () => {
    mockUser = { ...mockUser, user_prof_level: "b1" };
    render(<UsageLimitModal />);
    fireUsageLimit({ ...mayaLock, level: "B1" });

    const label = await screen.findByText("Talk to Maya");
    expect(label.closest("div").textContent).toContain("Unlimited");
  });

  it("omits the Maya row for levels without the feature", async () => {
    mockUser = { ...mockUser, user_prof_level: "a1" };
    render(<UsageLimitModal />);
    fireUsageLimit({ ...mayaLock, module_key: "flashcards", level: "A1" });

    await screen.findByText("Unlock Premium");
    expect(screen.queryByText("Talk to Maya")).not.toBeInTheDocument();
  });

  it("offers a B2 learner both plans and checks out the picked one", async () => {
    render(<UsageLimitModal />);
    fireUsageLimit(mayaLock);

    const plusOption = await screen.findByText(/Plus ₹199/);
    expect(screen.getByText(/Standard ₹99/)).toBeInTheDocument();

    act(() => plusOption.closest("button").click());
    act(() => screen.getByText("Unlock Premium").closest("button").click());
    expect(mockHandlePay).toHaveBeenCalledWith("b2_plus");
  });

  it("defaults to Standard when the learner does not pick a plan", async () => {
    render(<UsageLimitModal />);
    fireUsageLimit(mayaLock);
    await screen.findByText(/Plus ₹199/);

    act(() => screen.getByText("Unlock Premium").closest("button").click());
    expect(mockHandlePay).toHaveBeenCalledWith("standard");
  });

  it("does not fetch plans for a non-Maya limit", async () => {
    render(<UsageLimitModal />);
    fireUsageLimit({ ...mayaLock, module_key: "flashcards", level: "B1" });
    await screen.findByText("Unlock Premium");
    expect(mockGetPlans).not.toHaveBeenCalled();
  });
});

describe("UsageLimitModal — Maya daily pool exhausted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 1,
      trial_taken: true,
      occupation: "nurse",
      autopay_status: "active",
    };
  });

  it("pitches Plus to a trial/is_paid user with no subscription", async () => {
    mockGetPlans.mockResolvedValue(BOTH_PLANS);
    render(<UsageLimitModal />);
    fireUsageLimit(mayaDailyLimit);

    const cta = await screen.findByText("Get Plus — ₹199/month");
    expect(screen.getByText("That's your Maya time for today")).toBeInTheDocument();
    expect(screen.queryByText("Unlock Premium")).not.toBeInTheDocument();
    expect(screen.queryByText("Manage my plan")).not.toBeInTheDocument();

    act(() => cta.closest("button").click());
    expect(mockHandlePay).toHaveBeenCalledWith("b2_plus");
  });

  it("lets a Standard subscriber upgrade to Plus in place, no checkout", async () => {
    mockGetPlans.mockResolvedValue({ ...BOTH_PLANS, current: "standard" });
    mockChangePlan.mockResolvedValue({ status: "activating", user: { id: 1 } });
    render(<UsageLimitModal />);
    fireUsageLimit(mayaDailyLimit);

    const upgrade = await screen.findByText(/Upgrade to Plus/);
    expect(screen.queryByText(/Get Plus/)).not.toBeInTheDocument();
    expect(screen.getByText(/only pay the difference/)).toBeInTheDocument();

    await act(async () => upgrade.closest("button").click());
    expect(mockChangePlan).toHaveBeenCalledWith("b2_plus");
    expect(mockHandlePay).not.toHaveBeenCalled();
  });

  it("offers a fresh Plus checkout to a cancelled-but-paid Standard user", async () => {
    mockUser = { ...mockUser, autopay_status: "cancelled" };
    mockGetPlans.mockResolvedValue({ ...BOTH_PLANS, current: "standard" });
    render(<UsageLimitModal />);
    fireUsageLimit(mayaDailyLimit);

    const cta = await screen.findByText("Get Plus — ₹199/month");
    expect(screen.queryByText(/Upgrade to Plus/)).not.toBeInTheDocument();

    act(() => cta.closest("button").click());
    expect(mockHandlePay).toHaveBeenCalledWith("b2_plus");
    expect(mockChangePlan).not.toHaveBeenCalled();
  });

  it("shows the refund breakdown then runs the instant upgrade when the Standard sub is UPI", async () => {
    mockUser = { ...mockUser, autopay_method: "upi" };
    mockGetPlans.mockResolvedValue({ ...BOTH_PLANS, current: "standard" });
    mockChangePlan.mockRejectedValue({
      response: { data: { code: "upi_plan_change", instant_upgrade: true, charge_amount_paise: 19900, refund_estimate_paise: 4950 } },
    });
    render(<UsageLimitModal />);
    fireUsageLimit(mayaDailyLimit);

    const upgrade = await screen.findByText(/Upgrade to Plus/);
    await act(async () => upgrade.closest("button").click());
    expect(mockChangePlan).toHaveBeenCalledWith("b2_plus");
    // Checkout waits for the refund-breakdown confirm.
    expect(mockInstantUpgrade).not.toHaveBeenCalled();
    expect(await screen.findByText(/Unused Standard days back/)).toBeInTheDocument();
    expect(screen.getByText("₹50")).toBeInTheDocument();
    const confirm = screen.getByText("Pay ₹199");
    await act(async () => confirm.click());
    expect(mockInstantUpgrade).toHaveBeenCalledWith("b2_plus");
    expect(mockHandlePay).not.toHaveBeenCalled();
  });

  it("shows no upsell at all to a Plus user who exhausted the Plus pool", async () => {
    mockGetPlans.mockResolvedValue({ ...BOTH_PLANS, current: "b2_plus" });
    render(<UsageLimitModal />);
    fireUsageLimit(mayaDailyLimit);

    await screen.findByText("That's your Maya time for today");
    expect(screen.queryByText(/Get Plus/)).not.toBeInTheDocument();
    expect(screen.queryByText("Manage my plan")).not.toBeInTheDocument();
    expect(screen.queryByText("Plus Plan")).not.toBeInTheDocument();
    expect(screen.getByText("Not now")).toBeInTheDocument();
  });
});
