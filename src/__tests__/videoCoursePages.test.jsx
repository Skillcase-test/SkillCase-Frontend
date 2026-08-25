/**
 * Frontend Tests — Video Course learner pages
 *
 * CourseSelectPage: renders the course grid + progress, navigates on click.
 * VideoPlayerPage:  renders video metadata + description accordion, drives the
 *                   settings-menu audio language, opens the chat drawer.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    cachedGet: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

vi.mock("../api/videoCourseApi", () => ({
  getVideoCourses: vi.fn(),
  getVideoCourse: vi.fn(),
  getVideoCourseVideo: vi.fn(),
  updateVideoCourseProgress: vi.fn(),
  chatWithVideo: vi.fn(),
  getSuggestedVideoQuestions: vi.fn(),
  searchVideoCourseVideos: vi.fn(),
}));

vi.mock("../hooks/useUsageLimits", () => ({
  useUsageLimitGate: vi.fn(),
  useUsageLimits: () => ({ getState: () => null }),
}));

vi.mock("../telemetry/events", () => ({
  trackLearningEvent: vi.fn(),
  trackFeatureEvent: vi.fn(),
}));

vi.mock("react-redux", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSelector: vi.fn(() => ({ user: { user_id: "u1" } })),
    useDispatch: vi.fn(() => vi.fn()),
  };
});

vi.mock("../pages/notes/components/PdfViewer", () => ({
  default: () => <div data-testid="pdf-viewer-mock">PDF preview</div>,
}));

import {
  getVideoCourses,
  getVideoCourse,
  getVideoCourseVideo,
  getSuggestedVideoQuestions,
  updateVideoCourseProgress,
} from "../api/videoCourseApi";
import { useUsageLimitGate } from "../hooks/useUsageLimits";
import { trackFeatureEvent } from "../telemetry/events";
import CourseSelectPage from "../pages/videoCourses/CourseSelectPage";
import VideoPlayerPage from "../pages/videoCourses/VideoPlayerPage";

const course = {
  course_id: 1,
  name: "German Basics",
  description: "Start here",
  difficulty: "Easy",
  proficiency_level: "A1",
  thumbnail_url: null,
  total_hours: 2,
  display_order: 0,
  video_count: 4,
  completed_count: 1,
};

const video = {
  video_id: 10,
  course_id: 1,
  course_name: "German Basics",
  title: "Greetings",
  description: "How to say hello",
  transcript: "Hallo, wie geht es dir?",
  thumbnail_url: null,
  video_url: "https://s3.example/signed.mp4",
  video_duration: 300,
  proficiency_level: "A1",
  display_order: 0,
  completed: false,
  watch_time_seconds: 0,
};

describe("CourseSelectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateVideoCourseProgress.mockResolvedValue({ data: {} });
  });

  test("renders each course with its progress summary", async () => {
    getVideoCourses.mockResolvedValueOnce({ data: { data: [course] } });

    render(
      <MemoryRouter>
        <CourseSelectPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("German Basics")).toBeInTheDocument();
    expect(screen.getByText("1/4 videos completed")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  test("calls the usage-limit gate for the video_courses module", async () => {
    getVideoCourses.mockResolvedValueOnce({ data: { data: [] } });

    render(
      <MemoryRouter>
        <CourseSelectPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getVideoCourses).toHaveBeenCalled());
    expect(useUsageLimitGate).toHaveBeenCalledWith("ALL", "video_courses");
  });

  test("navigates to the course video list and records the event", async () => {
    getVideoCourses.mockResolvedValueOnce({ data: { data: [course] } });

    render(
      <MemoryRouter initialEntries={["/video-courses"]}>
        <Routes>
          <Route path="/video-courses" element={<CourseSelectPage />} />
          <Route path="/video-courses/:courseId" element={<p>video list</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("German Basics"));

    expect(await screen.findByText("video list")).toBeInTheDocument();
    expect(trackFeatureEvent).toHaveBeenCalledWith(
      "video_courses",
      "course_opened",
      expect.objectContaining({ entityId: 1 }),
    );
  });

  test("shows the empty state when there are no courses", async () => {
    getVideoCourses.mockResolvedValueOnce({ data: { data: [] } });

    render(
      <MemoryRouter>
        <CourseSelectPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No courses available yet/i)).toBeInTheDocument();
  });
});

describe("VideoPlayerPage", () => {
  const renderPlayer = () =>
    render(
      <MemoryRouter initialEntries={["/video-course/10"]}>
        <Routes>
          <Route path="/video-course/:videoId" element={<VideoPlayerPage />} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    updateVideoCourseProgress.mockResolvedValue({ data: {} });
    getVideoCourse.mockResolvedValue({ data: { data: { course, videos: [video] } } });
    getSuggestedVideoQuestions.mockResolvedValue({
      data: { data: { questions: ["Was bedeutet hallo?"] } },
    });
  });

  test("renders the video, its metadata and description accordion", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [
            { timestamp_id: 1, video_id: 10, label: "Intro", time_seconds: 30, display_order: 0 },
          ],
        },
      },
    });

    renderPlayer();

    expect(await screen.findByText("Greetings")).toBeInTheDocument();
    expect(screen.getByTestId("course-video")).toHaveAttribute(
      "src",
      "https://s3.example/signed.mp4",
    );
    expect(useUsageLimitGate).toHaveBeenCalledWith("ALL", "video_courses");

    // The description lives in a collapsed accordion.
    const descToggle = screen.getByText("Video Description");
    const descDetails = descToggle.closest("details");
    expect(descDetails.open).toBe(false);

    fireEvent.click(descToggle);
    expect(descDetails.open).toBe(true);
    expect(screen.getByText("How to say hello")).toBeInTheDocument();
  });

  test("opens and closes the notes section", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [],
          notes: [{ language_code: "en", file_url: "https://example.com/notes.pdf" }],
        },
      },
    });

    renderPlayer();

    const heading = await screen.findByText("Video Notes");
    const details = heading.closest("details");

    expect(details).not.toBeNull();
    expect(details.open).toBe(false);

    fireEvent.click(heading);

    expect(details.open).toBe(true);

    fireEvent.click(heading);

    expect(details.open).toBe(false);
  });

  test("switches note language with the custom dropdown", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [],
          notes: [
            { language_code: "en", file_url: "https://example.com/notes-en.pdf" },
            { language_code: "hi", file_url: "https://example.com/notes-hi.pdf" },
          ],
        },
      },
    });

    renderPlayer();

    const langToggle = await screen.findByRole("button", { name: /English/i });
    expect(langToggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(langToggle);
    expect(langToggle.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(await screen.findByRole("button", { name: /Hindi/i }));

    const toggleAfter = await screen.findByRole("button", { name: /Hindi/i });
    expect(toggleAfter.getAttribute("aria-expanded")).toBe("false");
  });

  test("persists the chosen note language across reloads", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [],
          notes: [
            { language_code: "en", file_url: "https://example.com/notes-en.pdf" },
            { language_code: "hi", file_url: "https://example.com/notes-hi.pdf" },
          ],
        },
      },
    });

    const { unmount } = renderPlayer();

    const toggle = await screen.findByRole("button", { name: /English/i });
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: /Hindi/i }));

    // Simulate leaving the page and coming back — the choice must survive.
    unmount();
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [],
          notes: [
            { language_code: "en", file_url: "https://example.com/notes-en.pdf" },
            { language_code: "hi", file_url: "https://example.com/notes-hi.pdf" },
          ],
        },
      },
    });
    renderPlayer();

    expect(await screen.findByRole("button", { name: /Hindi/i })).toBeInTheDocument();
  });

  // Audio language moved into the player's settings gear → "Audio language"
  // submenu. This drives the full flow and returns the row's current value.
  const chooseAudioLanguage = async (label) => {
    await screen.findByText("Greetings");
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    fireEvent.click(await screen.findByText("Audio language"));
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^${label}$`, "i") }));
  };

  const readAudioLanguageRow = async () => {
    await screen.findByText("Greetings");
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    const row = (await screen.findByText("Audio language")).closest("button");
    return row.textContent;
  };

  test("persists the chosen audio language across reloads", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [],
          audio_tracks: [
            { language_code: "en", audio_url: "https://example.com/en.mp3" },
            { language_code: "hi", audio_url: "https://example.com/hi.mp3" },
          ],
        },
      },
    });

    const { unmount } = renderPlayer();
    await chooseAudioLanguage("Hindi");

    unmount();
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [],
          audio_tracks: [
            { language_code: "en", audio_url: "https://example.com/en.mp3" },
            { language_code: "hi", audio_url: "https://example.com/hi.mp3" },
          ],
        },
      },
    });
    renderPlayer();

    const row = await readAudioLanguageRow();
    expect(row).toContain("Hindi");
  });

  test("switches the audio language through the settings menu", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: {
        data: {
          video,
          timestamps: [],
          audio_tracks: [
            { language_code: "en", audio_url: "https://example.com/en.mp3" },
            { language_code: "hi", audio_url: "https://example.com/hi.mp3" },
          ],
        },
      },
    });

    renderPlayer();
    await chooseAudioLanguage("Hindi");

    expect(await readAudioLanguageRow()).toContain("Hindi");
  });

  test("opens the chat drawer with suggested questions", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: { data: { video, timestamps: [] } },
    });

    renderPlayer();

    fireEvent.click(
      await screen.findByRole("button", { name: /ask anything about this video/i }),
    );

    expect(await screen.findByText("Was bedeutet hallo?")).toBeInTheDocument();
    expect(trackFeatureEvent).toHaveBeenCalledWith(
      "video_courses",
      "chat_opened",
      expect.objectContaining({ entityId: "10" }),
    );
  });

  test("shows a not-found message when the video is missing", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({ data: { data: null } });

    renderPlayer();

    expect(await screen.findByText("Video not found.")).toBeInTheDocument();
  });
});
