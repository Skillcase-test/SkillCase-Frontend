import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// jsdom doesn't implement scrollTo/scrollIntoView — this component calls both.
Element.prototype.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// Framer Motion's spring physics run on requestAnimationFrame, which fake
// timers don't drive — so onAnimationComplete never fires in jsdom under
// vi.useFakeTimers(). Mock it to fire onAnimationComplete on mount instead,
// which is what actually verifies the wiring (the component's reaction to
// "animation done"), not Framer Motion's own animation timing.
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
      MOTION_ONLY_PROPS.forEach((key) => delete rest[key]);

      // Fire once per mount, matching a real completed animation.
      ReactLib.useEffect(() => {
        onAnimationComplete?.();
      }, []);

      return ReactLib.createElement(tag, { ...rest, ref }, children);
    });

  const motion = new Proxy(
    {},
    { get: (_target, tag) => makeMotionComponent(tag) },
  );

  return {
    motion,
    AnimatePresence: ({ children }) => children,
  };
});

const authState = {
  user: {
    user_id: "candidate-1",
    german_preference: "3",
    lg_preferred_mode: "job_screening",
  },
};

const mockNavigate = vi.fn();

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: authState }),
  useDispatch: () => vi.fn(),
}));

let mockLocationState = null;
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: "/job-screening",
    state: mockLocationState,
  }),
}));

vi.mock("../api/axios", () => ({
  default: { clearGetCache: vi.fn(), post: vi.fn() },
}));

vi.mock("../telemetry/events", () => ({
  trackFeatureEvent: vi.fn(),
  trackLearningEvent: vi.fn(),
}));

vi.mock("../telemetry", () => ({
  captureTelemetryError: vi.fn(),
}));

vi.mock("../telemetry/flow", () => ({
  trackFlowAction: vi.fn(),
}));

const getProgress = vi.fn();
const startAgreement = vi.fn();
vi.mock("../api/jobScreeningApi", () => ({
  getProgress: (...args) => getProgress(...args),
  startAgreement: (...args) => startAgreement(...args),
  checkAgreement: vi.fn(),
  createPaywallOrder: vi.fn(),
  verifyPaywallPayment: vi.fn(),
}));

// Every step is mocked to a minimal stand-in — this suite only verifies the
// JobScreening shell's own auto-advance wiring, not each step's real UI.
let nextWelcomePayload = null;
vi.mock("../pages/jobScreening/components/WelcomeStep", () => ({
  default: ({ onComplete }) => (
    <div>
      MOCK_WELCOME
      <button type="button" onClick={() => onComplete(nextWelcomePayload)}>
        Finish Welcome
      </button>
    </div>
  ),
}));
let nextCompletionPayload = null;
vi.mock("../pages/jobScreening/components/ProfileCompletionStep", () => ({
  default: ({ onComplete }) => (
    <div>
      MOCK_PROFILE_COMPLETION
      <button type="button" onClick={() => onComplete(nextCompletionPayload)}>
        Finish Profile
      </button>
    </div>
  ),
}));
vi.mock("../pages/jobScreening/components/InterviewStep", () => ({
  default: () => <div>MOCK_INTERVIEW</div>,
}));
vi.mock("../pages/jobScreening/components/RegistrationStep", () => ({
  default: () => <div>MOCK_REGISTRATION</div>,
}));
vi.mock("../pages/jobScreening/components/ReviewPendingStep", () => ({
  default: () => <div>MOCK_REVIEW_PENDING</div>,
}));
vi.mock("../pages/jobScreening/components/MeetingStep", () => ({
  default: () => <div>MOCK_MEETING</div>,
}));
vi.mock("../pages/jobScreening/components/OfferLetterStep", () => ({
  default: () => <div>MOCK_OFFER_LETTER</div>,
}));
vi.mock("../pages/jobScreening/components/AdditionalDocumentsStep", () => ({
  default: () => <div>MOCK_ADDITIONAL_DOCUMENTS</div>,
}));
vi.mock("../pages/jobScreening/components/RecruiterStatusStep", () => ({
  default: () => <div>MOCK_RECRUITER_STATUS</div>,
}));

import JobScreening from "../pages/jobScreening/JobScreening";

describe("JobScreening — auto-advance into the next unlocked step", () => {
  beforeEach(() => {
    mockLocationState = null;
  });

  test("finishing a step opens the newly-unlocked step immediately, without a manual tap", async () => {
    getProgress.mockResolvedValue({
      data: {
        success: true,
        data: {
          current_step_id: "profile_completion",
          candidate_name: "Test Candidate",
          candidate_email: "test@example.com",
          candidate_phone: "9876543210",
          steps_config: [
            { id: "welcome", title: "Welcome", status: "completed" },
            {
              id: "profile_completion",
              title: "Profile Completion",
              status: "pending",
            },
            {
              id: "additional_documents",
              title: "Additional Documents",
              status: "locked",
            },
          ],
        },
      },
    });

    nextCompletionPayload = {
      current_step_id: "additional_documents",
      candidate_name: "Test Candidate",
      candidate_email: "test@example.com",
      candidate_phone: "9876543210",
      steps_config: [
        { id: "welcome", title: "Welcome", status: "completed" },
        {
          id: "profile_completion",
          title: "Profile Completion",
          status: "completed",
        },
        {
          id: "additional_documents",
          title: "Additional Documents",
          status: "pending",
        },
      ],
    };

    render(<JobScreening />);

    // Land on the progress lobby, open the (only) active step.
    const startButton = await screen.findByRole("button", {
      name: /start this step/i,
    });
    fireEvent.click(startButton);

    const finishButton = await screen.findByRole("button", {
      name: "Finish Profile",
    });
    fireEvent.click(finishButton);

    // No further click needed — the newly-unlocked step should open on its own.
    await waitFor(() => {
      expect(screen.getByText("MOCK_ADDITIONAL_DOCUMENTS")).toBeInTheDocument();
    });
    expect(screen.queryByText("MOCK_PROFILE_COMPLETION")).not.toBeInTheDocument();
  });

  test("auto-advancing into a navigate-away step (interview) uses the freshly-completed data, not stale state", async () => {
    getProgress.mockResolvedValue({
      data: {
        success: true,
        data: {
          current_step_id: "profile_completion",
          candidate_name: "Test Candidate",
          candidate_email: "test@example.com",
          candidate_phone: "9876543210",
          // Deliberately absent here — only present in the completion payload,
          // so a bug reading stale `progress` instead of the fresh data would
          // fail to navigate at all.
          assigned_interview_slug: undefined,
          steps_config: [
            { id: "welcome", title: "Welcome", status: "completed" },
            {
              id: "profile_completion",
              title: "Profile Completion",
              status: "pending",
            },
            {
              id: "interview_attempt",
              title: "Interview",
              status: "locked",
            },
          ],
        },
      },
    });

    nextCompletionPayload = {
      current_step_id: "interview_attempt",
      candidate_name: "Test Candidate",
      candidate_email: "test@example.com",
      candidate_phone: "9876543210",
      assigned_interview_slug: "brand-new-slug",
      steps_config: [
        { id: "welcome", title: "Welcome", status: "completed" },
        {
          id: "profile_completion",
          title: "Profile Completion",
          status: "completed",
        },
        {
          id: "interview_attempt",
          title: "Interview",
          status: "pending",
        },
      ],
    };

    render(<JobScreening />);

    const startButton = await screen.findByRole("button", {
      name: /start this step/i,
    });
    fireEvent.click(startButton);

    const finishButton = await screen.findByRole("button", {
      name: "Finish Profile",
    });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/job-screening/interview/brand-new-slug",
        expect.objectContaining({
          state: expect.objectContaining({
            email: "test@example.com",
          }),
        }),
      );
    });
  });

  test("finishing the welcome animation auto-advances into the next step (regression: the animation's own state change must not cancel its own completion timer)", async () => {
    getProgress.mockResolvedValue({
      data: {
        success: true,
        data: {
          current_step_id: "welcome",
          candidate_name: "Test Candidate",
          candidate_email: "test@example.com",
          candidate_phone: "9876543210",
          steps_config: [
            { id: "welcome", title: "Welcome", status: "pending" },
            {
              id: "profile_completion",
              title: "Profile Completion",
              status: "locked",
            },
          ],
        },
      },
    });

    nextWelcomePayload = {
      current_step_id: "profile_completion",
      candidate_name: "Test Candidate",
      candidate_email: "test@example.com",
      candidate_phone: "9876543210",
      steps_config: [
        { id: "welcome", title: "Welcome", status: "completed" },
        {
          id: "profile_completion",
          title: "Profile Completion",
          status: "pending",
        },
      ],
    };

    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<JobScreening />);

      const finishWelcomeButton = await screen.findByRole("button", {
        name: "Finish Welcome",
      });
      fireEvent.click(finishWelcomeButton);

      // Only the idle -> welcome_active -> welcome_complete hop (350ms) is
      // timer-based now; the actual advance is triggered by the checkmark's
      // onAnimationComplete (mocked to fire on mount), asserted below.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
    } finally {
      vi.useRealTimers();
    }

    await waitFor(() => {
      expect(screen.getByText("MOCK_PROFILE_COMPLETION")).toBeInTheDocument();
    });
    expect(screen.queryByText("MOCK_WELCOME")).not.toBeInTheDocument();
  });

  test("returning from an external page (interview submission, agreement signing) after finishing a step still auto-advances", async () => {
    mockLocationState = { justCompletedStepId: "interview_attempt" };

    getProgress.mockResolvedValue({
      data: {
        success: true,
        data: {
          current_step_id: "additional_documents",
          candidate_name: "Test Candidate",
          candidate_email: "test@example.com",
          candidate_phone: "9876543210",
          steps_config: [
            { id: "welcome", title: "Welcome", status: "completed" },
            {
              id: "interview_attempt",
              title: "Interview",
              status: "completed",
            },
            {
              id: "additional_documents",
              title: "Additional Documents",
              status: "pending",
            },
          ],
        },
      },
    });

    render(<JobScreening />);

    await waitFor(() => {
      expect(
        screen.getByText("MOCK_ADDITIONAL_DOCUMENTS"),
      ).toBeInTheDocument();
    });

    // The router state must be consumed (cleared) so a page refresh on
    // /job-screening doesn't replay this same auto-advance indefinitely.
    expect(mockNavigate).toHaveBeenCalledWith("/job-screening", {
      replace: true,
      state: null,
    });
  });
});
