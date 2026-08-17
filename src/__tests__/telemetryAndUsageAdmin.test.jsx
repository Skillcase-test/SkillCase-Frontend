import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock telemetry events module
const mockTrackFeatureEvent = vi.fn();
const mockTrackLearningEvent = vi.fn();

vi.mock("../telemetry/events", () => ({
  trackFeatureEvent: (...args) => mockTrackFeatureEvent(...args),
  trackLearningEvent: (...args) => mockTrackLearningEvent(...args),
}));

// Mock redux
const mockUser = {
  user_id: "u-123",
  role: "user",
  is_paid: false,
  autopay_enabled: false,
  trial_active: true,
  trial_days_left: 2,
  trial_taken: true,
  trial_created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  proficiency_level: "A1",
  coins: 50,
};

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: { user: mockUser } }),
  useDispatch: () => vi.fn(),
}));

vi.mock("../hooks/useAutopayCheckout", () => ({
  useAutopayCheckout: () => ({ loading: false, handlePay: vi.fn() }),
}));

vi.mock("../hooks/useUsageLimits", () => ({
  useUsageLimits: () => ({ refresh: vi.fn() }),
}));

vi.mock("../api/streakApi", () => ({
  getStreakData: () => Promise.resolve({ data: { streak: 5 } }),
}));

vi.mock("../api/axios", () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { user: {} } }) },
}));

vi.mock("../api/learnGermanApi", () => ({
  getVocabProgress: () => Promise.resolve({ data: { learnedWords: 10, totalWords: 50 } }),
  getLessonById: () => Promise.resolve({ data: { title: "Lesson 1", screens: [] } }),
  setLGMode: vi.fn().mockResolvedValue({}),
}));

import UsageLimitModal from "../components/UsageLimitModal";
import TrialCountdownModal from "../components/TrialCountdownModal";
import TrialEndedModal from "../components/TrialEndedModal";
import PremiumActivatedModal from "../components/PremiumActivatedModal";
import StreakCelebrationModal from "../components/StreakCelebrationModal";
import DailyGoalModal from "../pages/learnGerman/DailyGoalModal";
import DailyGoalCompletedModal from "../pages/learnGerman/DailyGoalCompletedModal";
import BottomTabBar from "../components/BottomTabBar";

describe("Telemetry & Modal Events Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("UsageLimitModal Telemetry", () => {
    it("tracks modal_presented when usage limit event is triggered", () => {
      render(
        <MemoryRouter>
          <UsageLimitModal />
        </MemoryRouter>
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent("skillcase:usage-limit", {
            detail: {
              locked: true,
              module_key: "flashcard",
              level: "A1",
              limit_value: 20,
              reset_at: new Date(Date.now() + 60000).toISOString(),
            },
          })
        );
      });

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "usage_limits",
        "modal_presented",
        expect.objectContaining({
          entityId: "flashcard",
          attributes: expect.objectContaining({ level: "A1" }),
        })
      );
    });

    it("tracks modal_dismissed when close is clicked", () => {
      render(
        <MemoryRouter>
          <UsageLimitModal />
        </MemoryRouter>
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent("skillcase:usage-limit", {
            detail: {
              locked: true,
              module_key: "flashcard",
              level: "A1",
              limit_value: 20,
              reset_at: new Date(Date.now() + 60000).toISOString(),
            },
          })
        );
      });

      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "usage_limits",
        "modal_dismissed",
        expect.objectContaining({ entityId: "flashcard" })
      );
    });
  });

  describe("TrialCountdownModal Telemetry", () => {
    it("tracks trial_countdown_presented when rendered with <= 2 days left", () => {
      // 5 days past on 7 day trial = 2 days left
      render(
        <MemoryRouter>
          <TrialCountdownModal />
        </MemoryRouter>
      );

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "payments",
        "trial_countdown_presented",
        expect.objectContaining({
          attributes: expect.objectContaining({ days_left: 2 }),
        })
      );
    });

    it("tracks trial_countdown_dismissed on close click", () => {
      render(
        <MemoryRouter>
          <TrialCountdownModal />
        </MemoryRouter>
      );

      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "payments",
        "trial_countdown_dismissed",
        expect.objectContaining({
          attributes: expect.objectContaining({ days_left: 2 }),
        })
      );
    });
  });

  describe("PremiumActivatedModal Telemetry", () => {
    it("tracks presentation and dismissal", () => {
      render(
        <PremiumActivatedModal open={true} onClose={vi.fn()} onGoHome={vi.fn()} />
      );

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "payments",
        "premium_activated_modal_presented"
      );

      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "payments",
        "premium_activated_modal_dismissed"
      );
    });
  });

  describe("StreakCelebrationModal Telemetry", () => {
    it("tracks streak celebration presentation", () => {
      render(
        <StreakCelebrationModal
          showStreakCelebration={true}
          setShowStreakCelebration={vi.fn()}
          streakInfo={{ currentStreak: 7 }}
        />
      );

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "streak",
        "celebration_presented",
        expect.objectContaining({
          attributes: { streak: 7 },
        })
      );
    });
  });

  describe("DailyGoalModal Telemetry", () => {
    it("tracks daily goal modal presentation and start action", () => {
      render(
        <MemoryRouter>
          <DailyGoalModal
            isOpen={true}
            onClose={vi.fn()}
            nextLesson={{ lesson_id: "lesson-101", title: "Greeting" }}
            vocabWordCount={12}
          />
        </MemoryRouter>
      );

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "learning",
        "daily_goal_presented",
        expect.objectContaining({
          entityId: "lesson-101",
          attributes: { vocab_word_count: 12 },
        })
      );

      const continueBtn = screen.getByText(/Continue my goal/i);
      fireEvent.click(continueBtn);

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "learning",
        "daily_goal_started",
        expect.objectContaining({
          entityId: "lesson-101",
        })
      );
    });
  });

  describe("DailyGoalCompletedModal Telemetry", () => {
    it("tracks daily goal completed modal presentation", () => {
      render(
        <MemoryRouter>
          <DailyGoalCompletedModal
            isOpen={true}
            onClose={vi.fn()}
            nextLesson={{ lesson_id: "lesson-102" }}
            coinsAwarded={25}
            streakUpdated={true}
            vocabWordCount={15}
          />
        </MemoryRouter>
      );

      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "learning",
        "daily_goal_completed_presented",
        expect.objectContaining({
          entityId: "lesson-102",
          attributes: {
            coins_awarded: 25,
            streak_updated: true,
            vocab_word_count: 15,
          },
        })
      );
    });
  });

  // Regression: this modal is mounted on every shell route for every user, so a
  // render-time crash here is a white screen for the whole app. It has to be
  // actually rendered — importing it proves nothing.
  describe("TrialEndedModal", () => {
    it("renders the expired-trial state and tracks it", () => {
      mockUser.trial_active = false;
      try {
        render(
          <MemoryRouter>
            <TrialEndedModal />
          </MemoryRouter>,
        );
        expect(screen.getByText(/Premium trial has ended/i)).toBeInTheDocument();
        expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
          "payments",
          "trial_ended_presented",
        );
      } finally {
        mockUser.trial_active = true;
      }
    });
  });

  describe("BottomTabBar Telemetry", () => {
    it("tracks bottom tab click on navigation items", () => {
      render(
        <MemoryRouter>
          <BottomTabBar mode="practice" />
        </MemoryRouter>
      );

      const homeLink = screen.getByText("Home");
      fireEvent.click(homeLink);
      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "navigation",
        "bottom_tab_clicked",
        { entityId: "home" }
      );

      const jobsLink = screen.getByText("Jobs");
      fireEvent.click(jobsLink);
      expect(mockTrackFeatureEvent).toHaveBeenCalledWith(
        "navigation",
        "bottom_tab_clicked",
        { entityId: "jobs" }
      );
    });
  });
});
