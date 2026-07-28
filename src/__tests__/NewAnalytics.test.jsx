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
        modules: [
          {
            feature: "flashcards",
            level: "A1",
            module_key: "flash_card_set:12",
            module_kind: "flash_card_set",
            module_id: "12",
            module_label: "Der Körper",
            items_used: 14,
            furthest_item: 14,
            total_items: 20,
            events: 4,
            errors: 0,
            friction: 0,
            completed: true,
            first_at: "2026-07-20T05:00:00Z",
            last_at: "2026-07-20T05:20:00Z",
          },
        ],
        timeline: [
          {
            label: "Flipped a flashcard to reveal the answer",
            detail: "Card 5 of 20",
            feature: "flashcards",
            module_key: "flash_card_set:12",
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
    expect(await screen.findAllByText("40%")).not.toHaveLength(0);
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

  it("disables quick ranges that reach past the start of analytics", async () => {
    // Mirrors production: telemetry began 17 Jul, latest complete day 22 Jul,
    // so a 7-day window would need 16 Jul and cannot be offered.
    newAnalyticsApi.catalog.mockResolvedValue({
      data: { ...catalog, available_from: "2026-07-17", default_date: "2026-07-22" },
    });
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "admin" }} />
      </MemoryRouter>,
    );
    await screen.findAllByText("40%");

    expect(screen.getByRole("button", { name: "Day" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "7 days" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "30 days" })).toBeDisabled();

    // A disabled chip must not be able to request an out-of-bounds window.
    newAnalyticsApi.metrics.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "7 days" }));
    await waitFor(() =>
      expect(newAnalyticsApi.metrics).not.toHaveBeenCalledWith(
        expect.objectContaining({ date_from: "2026-07-16" }),
      ),
    );
  });

  it("enables a quick range once enough history exists and sends the window", async () => {
    newAnalyticsApi.catalog.mockResolvedValue({
      data: { ...catalog, available_from: "2026-06-01", default_date: "2026-07-22" },
    });
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "admin" }} />
      </MemoryRouter>,
    );
    await screen.findAllByText("40%");

    const sevenDays = screen.getByRole("button", { name: "7 days" });
    expect(sevenDays).toBeEnabled();
    fireEvent.click(sevenDays);

    await waitFor(() =>
      expect(newAnalyticsApi.metrics).toHaveBeenLastCalledWith(
        expect.objectContaining({
          date_from: "2026-07-16",
          date_to: "2026-07-22",
        }),
      ),
    );
  });

  it("clamps an out-of-bounds bookmarked range to the available window", async () => {
    newAnalyticsApi.catalog.mockResolvedValue({
      data: { ...catalog, available_from: "2026-07-17", default_date: "2026-07-22" },
    });
    render(
      <MemoryRouter
        initialEntries={["/?tab=features&date_from=2026-01-01&date_to=2026-12-31"]}
      >
        <NewAnalytics me={{ role: "admin" }} />
      </MemoryRouter>,
    );
    await screen.findAllByText("40%");

    await waitFor(() =>
      expect(newAnalyticsApi.metrics).toHaveBeenLastCalledWith(
        expect.objectContaining({
          date_from: "2026-07-17",
          date_to: "2026-07-22",
        }),
      ),
    );
  });

  it("repairs stale journey filter values instead of rendering blank selects", async () => {
    render(<MemoryRouter initialEntries={["/?tab=features&feature=all&level=all"]}><NewAnalytics me={{ role: "admin" }} /></MemoryRouter>);
    expect(await screen.findAllByText("40%")).not.toHaveLength(0);
    expect(screen.getByLabelText("Feature")).toHaveTextContent("Flashcards");
    expect(screen.getByLabelText("Level")).toHaveTextContent("All levels");
    // The overview table fires one call per feature after this one, so assert
    // the drill-down request rather than whichever call happened to land last.
    expect(newAnalyticsApi.metrics.mock.calls[0][0]).toEqual(
      expect.objectContaining({ feature: "flashcards", level: "ALL" }),
    );
  });

  it("shows only features available for the selected level", async () => {
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "admin" }} />
      </MemoryRouter>,
    );
    await screen.findAllByText("40%");
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
    await screen.findAllByText("40%");
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
    // One summary row per chapter, not a dump of every event.
    const chapter = await screen.findByText("Der Körper");
    expect(chapter).toBeInTheDocument();
    expect(screen.getByText("14 of 20 cards")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(
      screen.queryByText("Flipped a flashcard to reveal the answer"),
    ).not.toBeInTheDocument();

    // The raw events stay one click away.
    fireEvent.click(chapter);
    expect(
      await screen.findByText("Flipped a flashcard to reveal the answer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Card 5 of 20")).toBeInTheDocument();
  });

  it("summarises a day rolled up before modules were stored", async () => {
    newAnalyticsApi.journey.mockResolvedValue({
      data: {
        subject_id: "7",
        name: "Adil",
        event_count: 4,
        diagnostics: { errors: 0, rage_points: 0 },
        modules: [],
        timeline: [
          {
            label: "Flipped a flashcard to reveal the answer",
            detail: "Item 14 of 20",
            feature: "flashcards",
            kind: "content",
            count: 4,
            started_at: "2026-07-20T05:00:00Z",
          },
        ],
      },
    });
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "super_admin" }} />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "User journeys" }),
    );
    await screen.findByText("Adil");
    fireEvent.click(screen.getByRole("button", { name: "View journey" }));
    await waitFor(() =>
      expect(newAnalyticsApi.journey).toHaveBeenCalledWith("7", "2026-07-20"),
    );
    expect(await screen.findByText("1 of 20 cards")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("requires confirmation before rebuilding an analytics day", async () => {
    newAnalyticsApi.refresh.mockResolvedValue({ data: { ok: true } });
    render(
      <MemoryRouter>
        <NewAnalytics me={{ role: "super_admin" }} />
      </MemoryRouter>,
    );

    await screen.findAllByText("40%");
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
