import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockDispatch = vi.fn();
const mockGetPlans = vi.fn();
const mockChangePlan = vi.fn();
const mockApiPost = vi.fn();
const mockHandlePay = vi.fn();
const mockInstantUpgrade = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn(), direct: vi.fn() };

let mockUser = null;

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector({ auth: { user: mockUser } }),
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

vi.mock("../api/axios", () => ({
  default: { post: (...args) => mockApiPost(...args) },
}));

vi.mock("../api/subscriptionApi", () => ({
  getSubscriptionPlans: (...args) => mockGetPlans(...args),
  changePlan: (...args) => mockChangePlan(...args),
}));

vi.mock("../hooks/useAutopayCheckout", () => ({
  useAutopayCheckout: () => ({
    loading: false,
    handlePay: mockHandlePay,
    handleInstantUpgrade: mockInstantUpgrade,
  }),
}));

vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: Object.assign(
    (...a) => mockToast.direct(...a),
    {
      success: (...a) => mockToast.success(...a),
      error: (...a) => mockToast.error(...a),
    }
  ),
}));

import ManagePlanPage from "../pages/payments/ManagePlanPage";
import { trackFeatureEvent } from "../telemetry/events";

const activeStandardUser = {
  id: "u1",
  fullname: "Test",
  autopay_enabled: true,
  autopay_status: "active",
  next_billing_at: new Date(Date.now() + 15 * 864e5).toISOString(),
  subscription_plan: "standard",
};

const PLANS_STD = {
  plans: [
    { key: "standard", label: "Standard", amountPaise: 9900, mayaMinutesPerDay: 10 },
    { key: "b2_plus", label: "Plus", amountPaise: 19900, mayaMinutesPerDay: 30 },
  ],
  current: "standard",
  currentPlan: { key: "standard", label: "Standard", amountPaise: 9900 },
  pendingPlan: null,
};

describe("ManagePlanPage — Standard→Plus upgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { ...activeStandardUser };
    mockGetPlans.mockResolvedValue(PLANS_STD);
  });
  afterEach(() => vi.useRealTimers());

  it("offers a live Standard B2 subscriber the in-place upgrade", async () => {
    render(<ManagePlanPage />);
    expect(await screen.findByText(/Upgrade to Plus/)).toBeInTheDocument();
    expect(screen.getByText(/only pay the difference/)).toBeInTheDocument();
  });

  it("calls the plan-change endpoint and toasts the scheduled state", async () => {
    mockChangePlan.mockResolvedValue({
      status: "scheduled",
      msg: "Plus starts on your next billing date — no charge today.",
      user: { ...activeStandardUser, pending_plan: "b2_plus" },
    });
    render(<ManagePlanPage />);
    const btn = await screen.findByText(/Upgrade to Plus/);
    await act(async () => btn.closest("button").click());
    expect(mockChangePlan).toHaveBeenCalledWith("b2_plus");
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringMatching(/next billing date/)
    );
    // 'scheduled' returns immediately — the poll loop must not fire.
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("polls /user/me after an 'activating' response until the tier flips", async () => {
    mockChangePlan.mockResolvedValue({
      status: "activating",
      msg: "charging",
      user: { ...activeStandardUser },
    });
    mockApiPost.mockResolvedValue({
      data: { user: { ...activeStandardUser, subscription_plan: "b2_plus" } },
    });
    render(<ManagePlanPage />);
    const btn = await screen.findByText(/Upgrade to Plus/);
    await act(async () => btn.closest("button").click());
    expect(mockChangePlan).toHaveBeenCalledWith("b2_plus");
    expect(mockToast.success).toHaveBeenCalledWith("charging");
    // The poll waits a real 2s between tries — waitFor rides it out.
    await vi.waitFor(
      () => expect(mockApiPost).toHaveBeenCalled(),
      { timeout: 4000, interval: 50 }
    );
    expect(mockApiPost).toHaveBeenCalledWith(
      "/user/me",
      null,
      expect.objectContaining({ meta: { skipPaywallRefresh: true } })
    );
    expect(mockDispatch).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringMatching(/on Plus/)
    );
  });

  it("shows the refund breakdown then runs the instant upgrade for UPI subscribers", async () => {
    mockChangePlan.mockRejectedValue({
      response: { data: { code: "upi_plan_change", msg: "one ₹199 payment", instant_upgrade: true, charge_amount_paise: 19900, refund_estimate_paise: 4950 } },
    });
    render(<ManagePlanPage />);
    const btn = await screen.findByText(/Upgrade to Plus/);
    await act(async () => btn.closest("button").click());
    expect(mockChangePlan).toHaveBeenCalledWith("b2_plus");
    // The sheet must NOT open until the user sees what comes back — the
    // confirm panel carries the refund math.
    expect(mockInstantUpgrade).not.toHaveBeenCalled();
    expect(await screen.findByText(/Unused Standard days back/)).toBeInTheDocument();
    expect(screen.getByText(/You effectively pay/)).toBeInTheDocument();
    expect(screen.getByText("₹50")).toBeInTheDocument();
    const confirm = screen.getByText("Pay ₹199");
    await act(async () => confirm.click());
    expect(mockInstantUpgrade).toHaveBeenCalledWith("b2_plus");
    expect(mockHandlePay).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
    // The whole funnel fires: click → confirm presented → confirmed.
    expect(trackFeatureEvent).toHaveBeenCalledWith("payments", "upgrade_clicked", expect.objectContaining({ entityId: "b2_plus" }));
    expect(trackFeatureEvent).toHaveBeenCalledWith("payments", "upgrade_confirm_presented", expect.objectContaining({
      attributes: expect.objectContaining({ charge_paise: 19900, refund_paise: 4950 }),
    }));
    expect(trackFeatureEvent).toHaveBeenCalledWith("payments", "upgrade_confirm_confirmed", expect.anything());
  });

  it("dismisses the upgrade confirmation without opening checkout", async () => {
    mockChangePlan.mockRejectedValue({
      response: { data: { code: "upi_plan_change", instant_upgrade: true, charge_amount_paise: 19900, refund_estimate_paise: 4950 } },
    });
    render(<ManagePlanPage />);
    const btn = await screen.findByText(/Upgrade to Plus/);
    await act(async () => btn.closest("button").click());
    expect(await screen.findByText(/You effectively pay/)).toBeInTheDocument();
    await act(async () => screen.getByText("Not now").click());
    expect(screen.queryByText(/You effectively pay/)).not.toBeInTheDocument();
    expect(mockInstantUpgrade).not.toHaveBeenCalled();
    expect(trackFeatureEvent).toHaveBeenCalledWith("payments", "upgrade_confirm_dismissed", expect.anything());
  });

  it("shows the breakdown even with no refund due near cycle end", async () => {
    mockChangePlan.mockRejectedValue({
      response: { data: { code: "upi_plan_change", charge_amount_paise: 19900, refund_estimate_paise: 0 } },
    });
    render(<ManagePlanPage />);
    const btn = await screen.findByText(/Upgrade to Plus/);
    await act(async () => btn.closest("button").click());
    expect(screen.getByText("Pay ₹199")).toBeInTheDocument();
    expect(mockHandlePay).not.toHaveBeenCalled();
  });

  it("tells a UPI subscriber the difference activates Plus instantly", async () => {
    mockUser = { ...activeStandardUser, autopay_method: "upi" };
    render(<ManagePlanPage />);
    expect(
      await screen.findByText(/activates instantly/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/no new checkout needed/)).not.toBeInTheDocument();
  });

  it("offers to resume an abandoned replacement checkout when pending on a released sub", async () => {
    mockUser = { ...activeStandardUser, autopay_status: "cancelled" };
    mockGetPlans.mockResolvedValue({
      ...PLANS_STD,
      pendingPlan: { key: "b2_plus", label: "Plus" },
    });
    render(<ManagePlanPage />);

    const resume = await screen.findByText(/Finish setting up Plus/);
    act(() => resume.closest("button").click());
    // Routes through the upgrade path so the pending subscription is resumed
    // (mandate_resume), not a second subscription created via /create-subscription.
    expect(mockInstantUpgrade).toHaveBeenCalledWith("b2_plus");
    expect(mockHandlePay).not.toHaveBeenCalled();
  });

  it("offers to finish an unpaid upgrade with the refund breakdown — never 'next month'", async () => {
    mockGetPlans.mockResolvedValue({
      ...PLANS_STD,
      pendingPlan: { key: "b2_plus", label: "Plus", unpaid: true, refund_estimate_paise: 4950 },
    });
    render(<ManagePlanPage />);

    // An abandoned payment must NOT claim Plus is coming on its own.
    expect(screen.queryByText(/starts on your next billing date/)).not.toBeInTheDocument();
    const resume = await screen.findByText(/Finish your Plus upgrade/);
    expect(screen.getByText(/₹50 of unused Standard days comes back/)).toBeInTheDocument();
    act(() => resume.closest("button").click());
    // Same refund-breakdown confirm as a fresh upgrade, then the sheet.
    expect(await screen.findByText(/You effectively pay/)).toBeInTheDocument();
    await act(async () => screen.getByText("Pay ₹199").click());
    expect(mockInstantUpgrade).toHaveBeenCalledWith("b2_plus");
  });

  it("shows the pending-plan note and no button when a switch is queued", async () => {
    mockGetPlans.mockResolvedValue({
      ...PLANS_STD,
      pendingPlan: { key: "b2_plus", label: "Plus" },
    });
    render(<ManagePlanPage />);
    expect(
      await screen.findByText(/Plus starts on your next billing date/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Plus —/)).not.toBeInTheDocument();
  });

  it("never offers a Plus user the upgrade", async () => {
    mockUser = { ...activeStandardUser, subscription_plan: "b2_plus" };
    mockGetPlans.mockResolvedValue({
      ...PLANS_STD,
      current: "b2_plus",
      currentPlan: { key: "b2_plus", label: "Plus", amountPaise: 19900 },
    });
    render(<ManagePlanPage />);
    await screen.findByText(/Plus membership fee/);
    expect(screen.queryByText(/Upgrade to Plus/)).not.toBeInTheDocument();
  });

  it("never offers the upgrade on a cancelled subscription", async () => {
    mockUser = { ...activeStandardUser, autopay_status: "cancelled" };
    render(<ManagePlanPage />);
    await screen.findByText(/Resume Premium/);
    expect(screen.queryByText(/Upgrade to Plus/)).not.toBeInTheDocument();
  });
});
