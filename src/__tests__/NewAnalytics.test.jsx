import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/newAnalyticsApi", () => ({
  newAnalyticsApi: {
    catalog: vi.fn(),
    metrics: vi.fn(),
    journeys: vi.fn(),
    journey: vi.fn(),
    refresh: vi.fn(),
    refreshStatus: vi.fn(),
  },
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { newAnalyticsApi } from "../api/newAnalyticsApi";
import NewAnalytics from "../dashboard-src/pages/NewAnalytics";

const catalog = {
  default_date: "2026-07-20",
  available_from: "2026-07-01",
  refreshed_through: "2026-07-20",
  levels: ["ALL", "LEARN_GERMAN", "A1", "A2", "B1"],
  features: [
    {
      key: "flashcards",
      label: "Flashcards",
      levels: ["A1", "A2", "B1"],
      metric: "cards",
      completion: "20 distinct cards",
      funnel: ["Opened", "Started", "Quiz", "Completed"],
    },
    {
      key: "grammar",
      label: "Grammar",
      levels: ["A1", "A2"],
      metric: "answers",
      completion: "topic completed",
      funnel: ["Opened", "Started", "Answered", "Completed"],
    },
    {
      key: "news",
      label: "News",
      levels: ["B1"],
      metric: "articles",
      completion: "engaged",
      funnel: ["Opened", "Article", "Detail", "Engaged"],
    },
    {
      key: "hardcore_exams",
      label: "Hardcore Exams",
      levels: ["A1", "A2", "B1"],
      metric: "questions",
      completion: "exam submitted",
      funnel: ["Opened", "Started", "Answered", "Submitted"],
    },
    {
      key: "learn_german",
      label: "Guided Lessons",
      levels: ["LEARN_GERMAN"],
      metric: "screens",
      completion: "lesson completed",
      funnel: ["Opened", "Started", "Viewed", "Completed"],
    },
  ],
};
const metrics = {
  eligible_users: 100,
  users: 40,
  adoption_percentage: 40,
  completion_percentage: 50,
  feature: catalog.features[0],
  averages: {
    units: 24,
    session_minutes: 8.5,
    progress_percentage: 70,
    accuracy_percentage: 80,
  },
  funnel: [
    { label: "Opened", users: 40 },
    { label: "Started", users: 35 },
    { label: "Quiz", users: 28 },
    { label: "Completed", users: 20 },
  ],
};

describe("NewAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    newAnalyticsApi.catalog.mockResolvedValue({ data: catalog });
    newAnalyticsApi.metrics.mockResolvedValue({ data: metrics });
    newAnalyticsApi.journeys.mockResolvedValue({
      data: {
        total: 1,
        page: 1,
        limit: 20,
        users: [
          {
            subject_id: "7",
            name: "Adil",
            phone: "9999999999",
            first_event_at: "2026-07-20T05:00:00Z",
            last_event_at: "2026-07-20T06:00:00Z",
            event_count: 12,
            platforms: ["app"],
            features: ["flashcards"],
            diagnostics: { errors: 1, rage_points: 0 },
          },
        ],
      },
    });
    newAnalyticsApi.journey.mockResolvedValue({
      data: {
        subject_id: "7",
        name: "Adil",
        phone: "9999999999",
        event_count: 12,
        diagnostics: { errors: 1, rage_points: 0 },
        timeline: [
          {
            label: "Flipped a flashcard to reveal the answer",
            detail: "Card 5 of 20",
            feature: "flashcards",
            count: 4,
            started_at: "2026-07-20T05:00:00Z",
          },
        ],
      },
    });
  });

  it("loads daily feature metrics with the required filters and funnel", async () => {
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "admin" }} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("40%")).toBeInTheDocument();
    expect(screen.getByText("Conversion Funnel")).toBeInTheDocument();
    expect(screen.getByLabelText("Feature")).toHaveTextContent("Flashcards");
    expect(newAnalyticsApi.metrics).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-07-20",
        feature: "flashcards",
        platform: "all",
      }),
    );
  });

  it("repairs stale journey filter values instead of rendering blank selects", async () => {
    render(<MemoryRouter initialEntries={["/?tab=features&feature=all&level=all"]}><NewAnalytics me={{ role: "admin" }} /></MemoryRouter>);
    expect(await screen.findByText("40%")).toBeInTheDocument();
    expect(screen.getByLabelText("Feature")).toHaveTextContent("Flashcards");
    expect(screen.getByLabelText("Level")).toHaveTextContent("All levels");
    expect(newAnalyticsApi.metrics).toHaveBeenLastCalledWith(expect.objectContaining({ feature: "flashcards", level: "ALL" }));
  });

  it("shows only features available for the selected level", async () => {
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "admin" }} />
      </MemoryRouter>,
    );
    await screen.findByText("40%");
    fireEvent.click(screen.getByLabelText("Level"));
    fireEvent.click(screen.getByRole("option", { name: "A1" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Level")).toHaveTextContent("A1"),
    );
    const feature = screen.getByLabelText("Feature");
    expect(feature).toHaveTextContent("Flashcards");
    fireEvent.click(feature);
    expect(screen.getByRole("option", { name: "Grammar" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Hardcore Exams" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "News" }),
    ).not.toBeInTheDocument();
  });

  it("treats Learn German as a level and Guided Lessons as its feature", async () => {
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "admin" }} />
      </MemoryRouter>,
    );
    await screen.findByText("40%");
    fireEvent.click(screen.getByLabelText("Level"));
    fireEvent.click(screen.getByRole("option", { name: "Learn German" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Feature")).toHaveTextContent("Guided Lessons"),
    );
    fireEvent.click(screen.getByLabelText("Feature"));
    expect(screen.getByRole("option", { name: "Guided Lessons" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Flashcards" }),
    ).not.toBeInTheDocument();
  });

  it("shows a named daily journey on demand", async () => {
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "super_admin" }} />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "User journeys" }),
    );
    expect(await screen.findByText("Adil")).toBeInTheDocument();
    expect(screen.queryByLabelText("Feature")).not.toBeInTheDocument();
    expect(newAnalyticsApi.journeys).toHaveBeenCalledWith({
      date: "2026-07-20",
      page: 1,
      limit: 20,
    });
    fireEvent.click(screen.getByRole("button", { name: "View journey" }));
    await waitFor(() =>
      expect(newAnalyticsApi.journey).toHaveBeenCalledWith("7", "2026-07-20"),
    );
    expect(
      await screen.findByText("Flipped a flashcard to reveal the answer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Card 5 of 20")).toBeInTheDocument();
    expect(screen.getAllByText("Flashcards").length).toBeGreaterThan(0);
  });

  it("requires confirmation before rebuilding an analytics day", async () => {
    newAnalyticsApi.refresh.mockResolvedValue({ data: { ok: true } });
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "super_admin" }} />
      </MemoryRouter>,
    );

    await screen.findByText("40%");
    fireEvent.click(screen.getByRole("button", { name: "Rebuild day" }));

    expect(newAnalyticsApi.refresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", {
        name: "Rebuild this analytics day?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/heavy load on the database/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Rebuild analytics" }),
    );
    await waitFor(() =>
      expect(newAnalyticsApi.refresh).toHaveBeenCalledWith("2026-07-20"),
    );
  });
});
