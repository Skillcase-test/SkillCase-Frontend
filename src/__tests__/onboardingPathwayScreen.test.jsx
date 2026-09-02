/**
 * Frontend Tests — the new onboarding "What are you here for?" pathway screen
 * (step 6 of OnboardingFlow).
 *
 * Covers the three behaviours the pathway model introduces:
 *  - the screen renders with the built-in "Jobs in Germany" card selected by
 *    default, alongside any admin-added pathways;
 *  - picking a real pathway and pressing Continue enrols the candidate
 *    (POST /user/complete-onboarding-profile with pathwayId) and routes them to
 *    /scholarship;
 *  - when NO other pathways exist the screen is skipped entirely and onboarding
 *    flows straight into the German-status question (Jobs in Germany implied).
 *
 * framer-motion and the Capacitor SMS plugin are mocked to pass-through/no-ops
 * so the flow renders synchronously and can be driven step by step.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, test, expect, beforeEach, vi } from "vitest";

const { mockNavigate, mockPost, mockGetPublicPathways } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockPost: vi.fn(),
  mockGetPublicPathways: vi.fn(),
}));

// Keep MemoryRouter etc. intact; only stub the navigate spy.
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// framer-motion → plain DOM. Component identity is cached per tag so React does
// not remount the subtree on every render (which would drop input focus/value).
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
            const {
              children,
              initial,
              animate,
              exit,
              transition,
              variants,
              whileHover,
              whileTap,
              whileFocus,
              whileInView,
              viewport,
              drag,
              layout,
              layoutId,
              custom,
              ...rest
            } = props;
            return R.createElement(tag, { ...rest, ref }, children);
          });
          Comp.displayName = `motion.${tag}`;
          cache.set(tag, Comp);
        }
        return cache.get(tag);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }) => R.createElement(R.Fragment, null, children),
  };
});

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
    startSmsUserConsent: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock("../api/axios", () => ({
  default: { post: (...args) => mockPost(...args) },
}));

vi.mock("../api/scholarshipExamApi", () => ({
  getPublicPathways: (...args) => mockGetPublicPathways(...args),
}));

vi.mock("../telemetry/flow", () => ({
  trackFlowAction: vi.fn(),
  useFlowJourney: vi.fn(),
}));

vi.mock("../observability/clarity", () => ({
  setClarityTag: vi.fn(),
  trackClarityEvent: vi.fn(),
}));

vi.mock("../utils/haptics", () => ({ hapticLight: vi.fn() }));

vi.mock("../pages/learnGerman/lgFirstTimeGuide", () => ({
  setLgFirstLandingMarker: vi.fn(),
}));

vi.mock(
  "../pages/learnGerman/lesson/screens/shared/TypewriterText",
  async () => {
    const R = await import("react");
    return { default: ({ text }) => R.createElement("span", null, text) };
  },
);

import OnboardingFlow from "../pages/onboarding/OnboardingFlow";

const JIG = {
  id: 1,
  title: "Jobs in Germany",
  description: "Learn German and find a job",
  image_url: "",
  badge: "popular",
  is_builtin: true,
  sort_order: 0,
};

const NURSING = {
  id: 2,
  title: "Nursing Scholarship",
  description: "Sit the nursing scholarship exam",
  image_url: "",
  badge: null,
  is_builtin: false,
  sort_order: 100,
};

function renderFlow() {
  const store = configureStore({
    reducer: { auth: (state = {}, _action) => state },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <OnboardingFlow />
      </MemoryRouter>
    </Provider>,
  );
}

// Drives splash → phone → OTP → name → occupation and selects an occupation,
// leaving the flow one "Next" click away from the branch (step 6 or 7).
async function driveToOccupation(container) {
  // Splash auto-advances to the phone step after a 3s timer.
  const phoneInput = await waitFor(
    () => {
      const el = container.querySelector('input[type="tel"]');
      if (!el) throw new Error("phone input not rendered yet");
      return el;
    },
    { timeout: 4000 },
  );
  fireEvent.change(phoneInput, { target: { value: "9876543210" } });
  fireEvent.click(screen.getByRole("button", { name: /Send OTP/i }));

  // OTP step: six single-char tel inputs. Typing a 6-digit sequence into the
  // first auto-fills the rest and fires verification.
  await waitFor(() =>
    expect(container.querySelectorAll('input[type="tel"]').length).toBe(6),
  );
  const otpInputs = container.querySelectorAll('input[type="tel"]');
  fireEvent.change(otpInputs[0], { target: { value: "123456" } });

  // Name step.
  await screen.findByText("Enter your name");
  const textInputs = container.querySelectorAll('input[type="text"]');
  fireEvent.change(textInputs[0], { target: { value: "Test" } });
  fireEvent.change(textInputs[1], { target: { value: "User" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  // Occupation step.
  await screen.findByText("Select your current occupation");
  fireEvent.click(screen.getByText("Student (learning nursing)"));
}

describe("OnboardingFlow — pathway screen (step 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPost.mockImplementation((url) => {
      if (url === "/user/send-otp") return Promise.resolve({ data: { msg: "sent" } });
      if (url === "/user/verify-otp")
        return Promise.resolve({ data: { isNewUser: true } });
      if (url === "/user/complete-onboarding-profile")
        return Promise.resolve({
          data: { token: "t1", user: { user_id: "u1", trial_taken: true } },
        });
      return Promise.resolve({ data: {} });
    });
  });

  test("shows Jobs in Germany selected by default plus other pathways", async () => {
    mockGetPublicPathways.mockResolvedValue({
      data: { pathways: [JIG, NURSING] },
    });
    const { container } = renderFlow();

    await driveToOccupation(container);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("What are you here for?");
    expect(screen.getByText("Language learning and jobs")).toBeInTheDocument();
    expect(screen.getByText("Other pathways")).toBeInTheDocument();
    expect(screen.getByText("Jobs in Germany")).toBeInTheDocument();
    expect(screen.getByText("Nursing Scholarship")).toBeInTheDocument();

    // JIG is pre-selected: its card carries the selected style and Continue is
    // enabled without any interaction.
    const jigCard = screen.getByText("Jobs in Germany").closest("button");
    expect(jigCard.className).toContain("bg-blue-50");
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  test("selecting a pathway enrols and routes to /scholarship", async () => {
    mockGetPublicPathways.mockResolvedValue({
      data: { pathways: [JIG, NURSING] },
    });
    const { container } = renderFlow();

    await driveToOccupation(container);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("What are you here for?");

    fireEvent.click(screen.getByText("Nursing Scholarship").closest("button"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/user/complete-onboarding-profile",
        expect.objectContaining({
          phone: "9876543210",
          firstName: "Test",
          lastName: "User",
          occupation: "Student (learning nursing)",
          pathwayId: 2,
        }),
      ),
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/scholarship", { replace: true }),
    );
    expect(localStorage.getItem("lg_preferred_mode")).toBe("scholarship");
  });

  test("skips the screen when there are no other pathways (JIG implied)", async () => {
    mockGetPublicPathways.mockResolvedValue({ data: { pathways: [JIG] } });
    const { container } = renderFlow();

    await driveToOccupation(container);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Lands directly on the German-status question; the pathway screen never shows.
    await screen.findByText("Select your German level");
    expect(screen.queryByText("What are you here for?")).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
