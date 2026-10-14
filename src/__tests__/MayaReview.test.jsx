import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MayaPage from "../pages/maya/MayaPage";

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("../api/axios", () => ({ default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }));
vi.mock("react-redux", () => ({ useSelector: (fn) => fn({ auth: { user: { user_prof_level: "a2" } } }) }));
vi.mock("../hooks/useUsageLimits", () => ({ useUsageLimitModule: vi.fn(), useUsageLimits: () => ({ getState: () => null }) }));
const mockTrack = vi.fn();
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: (...a) => mockTrack(...a) }));

// A finished call whose feedback is still being written.
const writing = (review) => ({
  data: {
    session: { id: "s1", level: "A2", mode: "talk", status: "completed", seconds: 400, transcript: [{ speaker: "candidate", text: "Hallo" }], feedback: null, review },
    best: {},
  },
});

const renderReport = () =>
  render(
    <MemoryRouter initialEntries={["/a2/maya?session=s1"]}>
      <MayaPage level="A2" />
    </MemoryRouter>,
  );

describe("Maya call rating", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockTrack.mockReset();
  });

  it("claims a showing, then sends the stars and note for this level", async () => {
    mockGet.mockResolvedValue(writing(true));
    mockPost.mockResolvedValue({ data: { ok: true } });
    renderReport();

    expect(await screen.findByText("How was your call with Maya?")).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith("/maya/a2/sessions/s1/review/shown");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    fireEvent.change(screen.getByPlaceholderText(/Anything we could do better/), { target: { value: "Bit fast" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.queryByText("How was your call with Maya?")).not.toBeInTheDocument());
    expect(mockPost).toHaveBeenCalledWith("/maya/a2/sessions/s1/review", { rating: 4, text: "Bit fast" });
    expect(mockTrack).toHaveBeenCalledWith("maya", "feedback_submitted", expect.objectContaining({ feature: "a2.maya.feedback" }));
  });

  it("skip closes the card without a rating", async () => {
    mockGet.mockResolvedValue(writing(true));
    mockPost.mockResolvedValue({ data: { ok: true } });
    renderReport();

    fireEvent.click(await screen.findByRole("button", { name: "Skip" }));
    expect(screen.queryByText("How was your call with Maya?")).not.toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith("/maya/a2/sessions/s1/review", { skip: true });
  });

  it("stays hidden when the level has no showings left", async () => {
    mockGet.mockResolvedValue(writing(true));
    mockPost.mockResolvedValue({ data: { ok: false } });
    renderReport();

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/maya/a2/sessions/s1/review/shown"));
    expect(screen.queryByText("How was your call with Maya?")).not.toBeInTheDocument();
  });

  it("isn't offered when the server says no", async () => {
    mockGet.mockResolvedValue(writing(false));
    renderReport();

    expect(await screen.findByText("Reviewing your German")).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("holds the finished report until the card is answered", async () => {
    mockGet.mockResolvedValueOnce(writing(true));
    mockPost.mockResolvedValue({ data: { ok: true } });
    renderReport();
    await screen.findByText("How was your call with Maya?");

    // The next poll brings the finished feedback; the card stays in front of it.
    mockGet.mockResolvedValue({ data: { ...writing(true).data, session: { ...writing(true).data.session, feedback: { ok: true, feedback: {} } } } });
    expect(await screen.findByText(/Your feedback is ready/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("How was your call with Maya?")).toBeInTheDocument();
  });
});
