import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";

const authState = { isAuthenticated: true };
let locationState = null;

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: authState }),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: "vpydr" }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: locationState, pathname: "/interview/vpydr" }),
}));

vi.mock("../api/interviewToolsApi", () => ({
  interviewToolsApi: {
    getPublicPosition: vi.fn(),
    resolveInvite: vi.fn(),
    restoreSubmission: vi.fn(),
    startSubmission: vi.fn(),
    getPublicUploadUrl: vi.fn(),
    saveAnswer: vi.fn(),
    finishSubmission: vi.fn(),
  },
}));

vi.mock("../api/jobScreeningApi", () => ({ checkInterview: vi.fn() }));

vi.mock("../telemetry/flow", () => ({
  trackFlowAction: vi.fn(),
  useFlowJourney: vi.fn(),
}));

// Exposes playback-ended as a click instead of firing it on mount: the page
// resets questionEnded in an effect that would otherwise clobber it, since
// child effects run before the parent's.
vi.mock("../pages/interviewTools/shared/InterviewVideoPlayer", () => ({
  default: ({ onEnded }) => (
    <button type="button" onClick={() => onEnded?.()}>
      END_VIDEO
    </button>
  ),
}));

const recorder = {
  stream: null,
  recordedBlob: null,
  isRecording: false,
  recordingSeconds: 12,
  recordingHasAudioSignal: true,
  error: null,
  requestStream: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  stopTracks: vi.fn(),
  resetRecording: vi.fn(),
};

vi.mock("../pages/interviewTools/shared/useInterviewRecorder", () => ({
  default: () => recorder,
}));

const { interviewToolsApi } = await import("../api/interviewToolsApi");
const PublicInterviewPage = (
  await import("../pages/interviewTools/PublicInterviewPage")
).default;

const QUESTION = {
  question_id: 100,
  title: "Tell us about yourself",
  short_description: "",
  video_url: "https://example/q.mp4",
};

function buildPosition(overrides = {}) {
  return {
    position_id: 18,
    slug: "vpydr",
    status: "published_open",
    interview_scope: "skillcase_interviews",
    questions: [QUESTION],
    allowed_retakes: 1,
    thinking_time_seconds: 3,
    answer_time_seconds: null,
    overall_time_limit_minutes: null,
    intro_video_url: null,
    farewell_video_url: null,
    ...overrides,
  };
}

const SUBMISSION = {
  submission_id: 233,
  session_token: "tok-123",
  status: "started",
  current_question_index: 0,
};

function mockBlob() {
  return new Blob(["video"], { type: "video/mp4" });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  authState.isAuthenticated = true;
  locationState = null;

  Object.assign(recorder, {
    stream: null,
    recordedBlob: null,
    isRecording: false,
    recordingSeconds: 12,
    recordingHasAudioSignal: true,
    error: null,
  });
  recorder.requestStream.mockResolvedValue(undefined);
  recorder.startRecording.mockResolvedValue(undefined);
  recorder.stopRecording.mockResolvedValue(mockBlob());

  interviewToolsApi.getPublicPosition.mockResolvedValue({
    data: { data: buildPosition() },
  });
  globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderPage() {
  render(<PublicInterviewPage />);
  await screen.findByPlaceholderText("Jane Doe");
}

// ── The candidate-blocking bug ────────────────────────────────────────────
describe("candidate detail fields", () => {
  test("stay editable while an authenticated candidate types (regression)", async () => {
    await renderPage();

    const name = screen.getByPlaceholderText("Jane Doe");
    const email = screen.getByPlaceholderText("jane@example.com");
    const phone = screen.getByPlaceholderText("9999999999");

    // The bug: one character used to satisfy the disable condition.
    fireEvent.change(name, { target: { value: "A" } });
    expect(name).toBeEnabled();
    fireEvent.change(name, { target: { value: "Aadil Khan" } });
    expect(name).toBeEnabled();
    expect(name).toHaveValue("Aadil Khan");

    fireEvent.change(email, { target: { value: "a" } });
    expect(email).toBeEnabled();
    fireEvent.change(phone, { target: { value: "9" } });
    expect(phone).toBeEnabled();
  });

  test("lock when the job-screening profile supplied them", async () => {
    locationState = {
      name: "Prefilled Person",
      email: "pre@example.com",
      phone: "9876543210",
    };
    await renderPage();

    // The prefill lands in an effect, so wait for it rather than assuming the
    // first paint already has it.
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Jane Doe")).toBeDisabled(),
    );
    expect(screen.getByPlaceholderText("jane@example.com")).toBeDisabled();
    expect(screen.getByPlaceholderText("9999999999")).toBeDisabled();
    expect(screen.getByPlaceholderText("Jane Doe")).toHaveValue(
      "Prefilled Person",
    );
  });

  test("lock only the fields the profile actually supplied", async () => {
    locationState = { name: "Only Name" };
    await renderPage();

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Jane Doe")).toBeDisabled(),
    );
    const email = screen.getByPlaceholderText("jane@example.com");
    expect(email).toBeEnabled();
    fireEvent.change(email, { target: { value: "typed@example.com" } });
    expect(email).toBeEnabled();
  });

  test("stay editable for an unauthenticated candidate", async () => {
    authState.isAuthenticated = false;
    await renderPage();

    const name = screen.getByPlaceholderText("Jane Doe");
    fireEvent.change(name, { target: { value: "X" } });
    expect(name).toBeEnabled();
  });

  test("do not wipe input typed before the position finishes loading", async () => {
    let resolvePosition;
    interviewToolsApi.getPublicPosition.mockReturnValue(
      new Promise((resolve) => {
        resolvePosition = resolve;
      }),
    );

    render(<PublicInterviewPage />);
    // Position still loading: isJobScreeningCandidate has not flipped yet.
    expect(screen.queryByPlaceholderText("Jane Doe")).toBeNull();

    await act(async () => {
      resolvePosition({ data: { data: buildPosition() } });
    });

    const name = await screen.findByPlaceholderText("Jane Doe");
    fireEvent.change(name, { target: { value: "Typed Early" } });
    expect(name).toHaveValue("Typed Early");
    expect(name).toBeEnabled();
  });
});

// ── Answer submission: retry, failure, and abort ──────────────────────────
describe("answer submission", () => {
  async function reachReviewlessStop(positionOverrides = {}) {
    localStorage.setItem("interview-tool-session:vpydr", "tok-123");
    interviewToolsApi.restoreSubmission.mockResolvedValue({
      data: {
        data: {
          submission: SUBMISSION,
          answers: [],
          position: buildPosition(positionOverrides),
        },
      },
    });

    render(<PublicInterviewPage />);

    // The page resets questionEnded in an effect when the question stage
    // mounts, which can land after this click. Retry until it sticks.
    await screen.findByText("END_VIDEO");
    await waitFor(() => {
      fireEvent.click(screen.getByText("END_VIDEO"));
      expect(screen.getByText("Proceed to Answer")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Proceed to Answer"));
    fireEvent.click(await screen.findByText("Start Answer Now"));
    fireEvent.click(await screen.findByText("Stop Recording"));
    await screen.findByText("Next question");
  }

  beforeEach(() => {
    // The real hook exposes the finished recording as state; the mock is static,
    // so hand it the blob up front.
    recorder.recordedBlob = mockBlob();
    interviewToolsApi.getPublicUploadUrl.mockResolvedValue({
      data: {
        data: {
          uploadUrl: "https://s3.example/put",
          key: "interview-submissions/18/233/100/answer.mp4",
        },
      },
    });
    interviewToolsApi.saveAnswer.mockResolvedValue({ data: {} });
    interviewToolsApi.finishSubmission.mockResolvedValue({ data: {} });
  });

  test("a clean submission shows no retry notice and saves once", async () => {
    await reachReviewlessStop();

    fireEvent.click(screen.getByText("Next question"));

    await waitFor(() =>
      expect(interviewToolsApi.saveAnswer).toHaveBeenCalledTimes(1),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Connection interrupted/)).toBeNull();
    expect(screen.queryByText(/Could not save/)).toBeNull();
  });

  test("recovers from a dropped connection without troubling the candidate", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.reject(new TypeError("Failed to fetch")),
      )
      .mockImplementation(() => Promise.resolve({ ok: true, status: 200 }));

    await reachReviewlessStop();
    fireEvent.click(screen.getByText("Next question"));

    await waitFor(() =>
      expect(interviewToolsApi.saveAnswer).toHaveBeenCalledTimes(1),
    );
    // Retried, saved exactly once, and never showed a failure.
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Could not save/)).toBeNull();
    expect(
      interviewToolsApi.saveAnswer.mock.calls[0][1].answer_video_key,
    ).toBe("interview-submissions/18/233/100/answer.mp4");
  });

  // Three attempts plus backoff needs more than the default 5s budget.
  test("keeps the recording after exhausting every attempt", { timeout: 20000 }, async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    );

    await reachReviewlessStop();
    fireEvent.click(screen.getByText("Next question"));

    expect(
      await screen.findByText(/connection kept dropping/, undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(interviewToolsApi.saveAnswer).not.toHaveBeenCalled();
    // Still on the review step, so the candidate can simply press it again.
    expect(screen.getByText("Next question")).toBeInTheDocument();
    expect(recorder.resetRecording).not.toHaveBeenCalledWith(
      expect.anything(),
    );
  });

  // The race this closes: the overall time limit expiring while a submission is
  // still retrying. The forced finish must own the outcome, and the cancelled
  // submission must not put a failure in front of the candidate.
  test(
    "a time limit expiring mid-retry finishes cleanly with no error shown",
    { timeout: 30000 },
    async () => {
      globalThis.fetch = vi.fn((url, init) => {
        if (init?.signal) {
          // The candidate's own submission: a slow upload still in flight when
          // the timer fires. Only the abort ends it, exactly like real fetch.
          return new Promise((_, reject) => {
            init.signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          });
        }
        // The timeout path runs uncancelled and gets the recording saved.
        return Promise.resolve({ ok: true, status: 200 });
      });
      // Budget generous enough that reaching the review step always wins the
      // race — otherwise a slow machine finishes the interview before the test
      // can click, and the flake looks like a product bug.
      localStorage.setItem(
        "interview_started_vpydr",
        String(Date.now() - 10 * 60 * 1000 + 6000),
      );

      await reachReviewlessStop({ overall_time_limit_minutes: 10 });
      const submit = screen.getByText("Next question");
      // The timer must still be pending, or this asserts nothing.
      expect(screen.queryByText(/Thank you for completing/)).toBeNull();
      fireEvent.click(submit);

      expect(
        await screen.findByText(
          /Thank you for completing the interview/,
          undefined,
          { timeout: 15000 },
        ),
      ).toBeInTheDocument();

      // The cancelled submission stayed silent; the timeout path finished.
      expect(screen.queryByText(/Could not save/)).toBeNull();
      expect(screen.queryByText(/connection kept dropping/)).toBeNull();
      expect(interviewToolsApi.finishSubmission).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem("interview-tool-session:vpydr")).toBeNull();
      // Saved exactly once: the aborted path bowed out, the timeout path wrote.
      expect(interviewToolsApi.saveAnswer).toHaveBeenCalledTimes(1);
    },
  );
});
