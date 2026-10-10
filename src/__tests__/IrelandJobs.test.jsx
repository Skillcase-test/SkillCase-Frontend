import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// jsdom lacks these — the lobby auto-scroll effect calls them.
Element.prototype.scrollTo = vi.fn();
Element.prototype.scrollBy = vi.fn();
window.scrollBy = vi.fn();

vi.mock("framer-motion", async () => {
  const ReactLib = await import("react");
  const MOTION_ONLY_PROPS = [
    "initial",
    "animate",
    "exit",
    "transition",
    "variants",
    "whileHover",
    "whileTap",
    "whileFocus",
    "whileInView",
    "layout",
    "layoutId",
  ];
  const makeMotionComponent = (tag) =>
    ReactLib.forwardRef((props, ref) => {
      const { onAnimationComplete, children, ...rest } = props;
      MOTION_ONLY_PROPS.forEach((k) => delete rest[k]);
      ReactLib.useEffect(() => {
        onAnimationComplete?.();
      }, []);
      return ReactLib.createElement(tag, { ...rest, ref }, children);
    });
  return {
    motion: new Proxy({}, { get: (_t, tag) => makeMotionComponent(tag) }),
    AnimatePresence: ({ children }) => children,
  };
});

const authState = { user: { user_id: "u-ire", fullname: "Test Candidate" } };
const mockNavigate = vi.fn();
let mockSearch = "";

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: authState }),
  useDispatch: () => vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/ireland-jobs", search: mockSearch }),
}));

vi.mock("../telemetry", () => ({ captureTelemetryError: vi.fn() }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));
vi.mock("../telemetry/flow", () => ({ trackFlowAction: vi.fn() }));
const toastSuccess = vi.fn();
vi.mock("react-hot-toast", () => ({
  toast: { success: (...a) => toastSuccess(...a), error: vi.fn() },
}));

const getIrelandProgress = vi.fn();
const markIrelandOpportunityInterest = vi.fn();
vi.mock("../api/irelandJobsApi", () => ({
  getIrelandProgress: (...args) => getIrelandProgress(...args),
  markIrelandOpportunityInterest: (...args) =>
    markIrelandOpportunityInterest(...args),
}));

// Step components are mocked to minimal stand-ins — this suite verifies the
// shell's commit/transition wiring, not each step's internals. MatchingScreen
// stays real because the terminal banner IS what's under test.
let welcomeOnComplete;
vi.mock("../pages/irelandJobs/components/IrelandWelcomeStep", () => ({
  default: ({ onComplete }) => {
    welcomeOnComplete = onComplete;
    return <div>MOCK_WELCOME</div>;
  },
}));
vi.mock("../pages/irelandJobs/components/ResumeProfileStep", () => ({
  default: () => <div>MOCK_RESUME_PROFILE</div>,
}));
vi.mock("../pages/irelandJobs/components/IrelandDocumentsStep", () => ({
  default: () => <div>MOCK_DOCUMENTS</div>,
}));
let roleOnBack;
vi.mock("../pages/irelandJobs/components/RoleSelectStep", () => ({
  default: ({ onBack }) => {
    roleOnBack = onBack;
    return <div>MOCK_ROLE_SELECT</div>;
  },
}));

import IrelandJobs from "../pages/irelandJobs/IrelandJobs";

const STEP = (id, status) => ({
  id,
  status,
  title: `T_${id}`,
  button_title: `Go ${id}`,
});

// getIrelandProgress resolves the axios response — its body is {success, data}.
const progressWith = (steps, currentStepId, extra = {}) => ({
  data: { success: true, data: { steps, currentStepId, isActive: true, ...extra } },
});

const TERMINAL = () =>
  progressWith(
    [
      STEP("welcome", "completed"),
      STEP("resume_profile", "completed"),
      STEP("documents", "completed"),
      STEP("role_select", "completed"),
      STEP("matching", "pending"),
    ],
    "matching",
    {
      role: "caregiver",
      opportunities: {
        caregiver: {
          header: { title: "Ireland Caregiver Opportunity" },
          sections: [],
          cta: { primaryLabel: "I'm Interested" },
        },
      },
    },
  );

describe("IrelandJobs lobby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = "";
    welcomeOnComplete = undefined;
    roleOnBack = undefined;
  });

  test("welcome completion commits the fresh payload — no progress refetch", async () => {
    const lobby = progressWith(
      [
        STEP("welcome", "completed"),
        STEP("resume_profile", "pending"),
        STEP("documents", "locked"),
        STEP("role_select", "locked"),
        STEP("matching", "locked"),
      ],
      "resume_profile",
    );
    getIrelandProgress.mockResolvedValue(
      progressWith([STEP("welcome", "pending"), STEP("resume_profile", "locked")], "welcome"),
    );
    render(<IrelandJobs />);
    await waitFor(() => expect(screen.getByText("MOCK_WELCOME")).toBeTruthy());

    // Step components call onComplete(data.data) — the inner progress payload.
    welcomeOnComplete(lobby.data.data);

    await waitFor(() =>
      expect(screen.getByText("Your Ireland progress")).toBeTruthy(),
    );
    expect(screen.getByText("T_resume_profile")).toBeTruthy();
    // The only GET was the initial load — the mutation payload committed directly.
    expect(getIrelandProgress).toHaveBeenCalledTimes(1);
  });

  test("terminal state keeps the completed timeline and shows a slim banner — no full-screen takeover", async () => {
    getIrelandProgress.mockResolvedValue(TERMINAL());
    render(<IrelandJobs />);
    await waitFor(() =>
      expect(screen.getByText("Your Ireland progress")).toBeTruthy(),
    );

    // All four real steps render as cards on the home screen.
    expect(screen.getByText("T_welcome")).toBeTruthy();
    expect(screen.getByText("T_role_select")).toBeTruthy();
    expect(screen.getByText("T_matching")).toBeTruthy();

    // The matching card reads "in progress", not "pending".
    expect(screen.getByText("in progress")).toBeTruthy();

    // Slim banner below the timeline.
    expect(
      screen.getByText("Our team is working on your request"),
    ).toBeTruthy();
    expect(screen.getByText(/looking for the best/)).toBeTruthy();
    expect(screen.getByText("Change opportunity")).toBeTruthy();

    // No eager CTA on the terminal card / no "Continue with Next Step".
    expect(screen.queryByText("Continue with Next Step")).toBeNull();
  });

  test("Change opportunity reopens role_select for reselection", async () => {
    getIrelandProgress.mockResolvedValue(TERMINAL());
    render(<IrelandJobs />);
    await waitFor(() =>
      expect(screen.getByText("Change opportunity")).toBeTruthy(),
    );

    fireEvent.click(
      screen.getByText("Change opportunity"),
    );
    await waitFor(() =>
      expect(screen.getByText("MOCK_ROLE_SELECT")).toBeTruthy(),
    );

    // Back returns to the lobby without a refetch loop.
    roleOnBack();
    await waitFor(() =>
      expect(screen.getByText("Your Ireland progress")).toBeTruthy(),
    );
    expect(getIrelandProgress).toHaveBeenCalledTimes(1);
  });

  test("skipped steps render as done and count toward the ring", async () => {
    getIrelandProgress.mockResolvedValue(
      progressWith(
        [
          STEP("welcome", "completed"),
          STEP("resume_profile", "skipped"),
          STEP("documents", "pending"),
          STEP("role_select", "locked"),
          STEP("matching", "locked"),
        ],
        "documents",
      ),
    );
    render(<IrelandJobs />);
    await waitFor(() =>
      expect(screen.getByText("Your Ireland progress")).toBeTruthy(),
    );
    expect(screen.getByText("skipped")).toBeTruthy();
    expect(screen.getByText("2/5")).toBeTruthy();
  });

  const REVIEW = () =>
    progressWith(
      [
        STEP("welcome", "completed"),
        STEP("resume_profile", "completed"),
        STEP("documents", "completed"),
        STEP("role_select", "review"),
        STEP("matching", "locked"),
      ],
      "role_select",
      { role: "nurse" },
    );

  test("Check status after approval stays on the lobby with an Approved toast", async () => {
    getIrelandProgress
      .mockResolvedValueOnce(REVIEW())
      .mockResolvedValueOnce(TERMINAL());
    render(<IrelandJobs />);
    fireEvent.click(await screen.findByRole("button", { name: /Check status/ }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalledWith("/ireland-jobs?step=role_select");
    expect(screen.queryByText("MOCK_ROLE_SELECT")).toBeNull();
  });

  test("Check status after a rejection opens the step to re-upload", async () => {
    const rejected = REVIEW();
    rejected.data.data.steps[3] = STEP("role_select", "pending");
    getIrelandProgress
      .mockResolvedValueOnce(REVIEW())
      .mockResolvedValueOnce(rejected);
    render(<IrelandJobs />);
    fireEvent.click(await screen.findByRole("button", { name: /Check status/ }));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/ireland-jobs?step=role_select"),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
