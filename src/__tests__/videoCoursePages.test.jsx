/**
 * Frontend Tests — Video Course learner pages
 *
 * CourseSelectPage: renders the course grid + progress, navigates on click.
 * VideoPlayerPage:  renders video metadata/chapters, opens the chat drawer.
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
    updateVideoCourseProgress.mockResolvedValue({ data: {} });
    getVideoCourse.mockResolvedValue({ data: { data: { course, videos: [video] } } });
    getSuggestedVideoQuestions.mockResolvedValue({
      data: { data: { questions: ["Was bedeutet hallo?"] } },
    });
  });

  test("renders the video, its chapters and transcript", async () => {
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
    expect(screen.getByText("0:30 - Intro")).toBeInTheDocument();
    expect(screen.getByText("How to say hello")).toBeInTheDocument();
    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(screen.getByTestId("course-video")).toHaveAttribute(
      "src",
      "https://s3.example/signed.mp4",
    );
    expect(useUsageLimitGate).toHaveBeenCalledWith("ALL", "video_courses");
  });

  test("opens the chat drawer with suggested questions", async () => {
    getVideoCourseVideo.mockResolvedValueOnce({
      data: { data: { video, timestamps: [] } },
    });

    renderPlayer();

    fireEvent.click(await screen.findByText("Ask about this video"));

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
