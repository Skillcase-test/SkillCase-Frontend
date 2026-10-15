import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import MayaPage from "../pages/maya/MayaPage";

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("../api/axios", () => ({ default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }));
vi.mock("react-redux", () => ({ useSelector: (fn) => fn({ auth: { user: { user_prof_level: "b1" } } }) }));
vi.mock("../hooks/useUsageLimits", () => ({ useUsageLimitModule: vi.fn(), useUsageLimits: () => ({ getState: () => null }) }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));

const practice = (feedback) => ({
  data: {
    session: { id: "s1", status: "ended", level: "B1", mode: "talk", transcript: [{ speaker: "candidate", text: "Hallo" }], feedback, review: { asked: false } },
    best: {},
  },
});

it("keeps polling after 'Try feedback again' until the new feedback lands", async () => {
  mockGet.mockResolvedValue(practice({ ok: false, reason: "failed", message: "x" }));
  mockPost.mockResolvedValue({ data: { ok: true } });
  render(
    <MemoryRouter initialEntries={["/b1/maya?session=s1"]}>
      <MayaPage level="B1" />
    </MemoryRouter>,
  );
  const retry = await screen.findByText("Try feedback again");
  // The server cleared the failed feedback and is writing it again
  mockGet.mockResolvedValue(practice(null));
  await act(async () => fireEvent.click(retry));
  expect(mockPost).toHaveBeenCalledWith("/maya/b1/sessions/s1/retry-feedback");
  const calls = mockGet.mock.calls.length;
  await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(calls + 1), { timeout: 4000 });
});
