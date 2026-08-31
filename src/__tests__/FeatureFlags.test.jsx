import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import TopModeSwitcher from "../components/TopModeSwitcher";
import FeatureFlagsAdmin from "../dashboard-src/pages/FeatureFlagsAdmin";
import * as featureFlagApi from "../api/featureFlagApi";
import { _resetFlagsCache } from "../hooks/useFeatureFlags";

// Mock API calls
vi.mock("../api/featureFlagApi", () => ({
  getMyFeatureFlags: vi.fn(),
  adminGetFeatureFlags: vi.fn(),
  adminGetFeatureUsers: vi.fn(),
  adminUpdateFeatureConfig: vi.fn(),
  adminSetUserFeatureOverride: vi.fn(),
  adminResetUserFeatureOverride: vi.fn(),
  adminBulkFeatureOverride: vi.fn(),
}));

vi.mock("../api/learnGermanApi", () => ({
  getLGMode: vi.fn().mockResolvedValue({ data: { mode: "practice" } }),
  setLGMode: vi.fn().mockResolvedValue({ data: { success: true } }),
}));

vi.mock("../hooks/useUsageLimits", () => ({
  useUsageLimits: () => ({ eligible: false, getState: () => null }),
}));

vi.mock("../pages/exam/ExamCards", () => ({ default: () => null }));

import FeatureCardsGrid from "../pages/landing/components/FeatureCardsGrid";

function renderWithStore(ui, { initialState = {}, route = "/" } = {}) {
  const store = configureStore({
    reducer: {
      auth: (
        state = {
          user: {
            user_id: "test_user_a1",
            username: "Test User",
            user_prof_level: "A1",
            is_paid: false,
            ...initialState.user,
          },
        }
      ) => state,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>
  );
}

describe("TopModeSwitcher — Feature Flag Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetFlagsCache();
  });

  it("renders only 2 tabs (Exam & Practice, Guided German) when german_classes flag is disabled", async () => {
    featureFlagApi.getMyFeatureFlags.mockResolvedValueOnce({
      data: { flags: { german_classes: false } },
    });

    renderWithStore(<TopModeSwitcher />, { route: "/" });

    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Guided")).toBeInTheDocument();
    expect(screen.queryByText("Classes")).not.toBeInTheDocument();
  });

  it("renders 3 tabs (Exam & Practice, Guided German, German Classes) when german_classes flag is enabled for A1/A2", async () => {
    featureFlagApi.getMyFeatureFlags.mockResolvedValueOnce({
      data: { flags: { german_classes: true } },
    });

    renderWithStore(<TopModeSwitcher />, { route: "/" });

    await waitFor(() => {
      expect(screen.getByText("Classes")).toBeInTheDocument();
    });
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Guided")).toBeInTheDocument();
  });

  it("renders 2 tabs (Job Preparation, German Jobs) for B1 when german_classes flag is disabled", async () => {
    featureFlagApi.getMyFeatureFlags.mockResolvedValueOnce({
      data: { flags: { german_classes: false } },
    });

    renderWithStore(<TopModeSwitcher />, {
      initialState: { user: { user_prof_level: "B1" } },
      route: "/",
    });

    expect(screen.getByText("Job Preparation")).toBeInTheDocument();
    expect(screen.getByText("German Jobs")).toBeInTheDocument();
    expect(screen.queryByText("Classes")).not.toBeInTheDocument();
  });

  it("renders 3 tabs (Job Preparation, German Jobs, German Classes) for B1 when german_classes flag is enabled", async () => {
    featureFlagApi.getMyFeatureFlags.mockResolvedValueOnce({
      data: { flags: { german_classes: true } },
    });

    renderWithStore(<TopModeSwitcher />, {
      initialState: { user: { user_prof_level: "B1" } },
      route: "/",
    });

    await waitFor(() => {
      expect(screen.getByText("Classes")).toBeInTheDocument();
    });
    expect(screen.getByText("Job Preparation")).toBeInTheDocument();
    expect(screen.getByText("German Jobs")).toBeInTheDocument();
  });
});

describe("FeatureFlagsAdmin Control Panel", () => {
  const mockFeatures = [
    {
      feature_key: "german_classes",
      name: "German Classes",
      description: "Video courses",
      eligible_levels: ["A1", "A2"],
      global_enabled: false,
      paid_enabled: true,
      unpaid_enabled: false,
      total_overrides: 1,
    },
  ];

  const mockUsersData = {
    feature: mockFeatures[0],
    stats: {
      total_eligible: 150,
      total_paid: 50,
      total_unpaid: 100,
      total_overrides: 1,
      total_enabled: 50,
      paid_enabled: 50,
      unpaid_enabled: 0,
    },
    pagination: {
      page: 1,
      limit: 25,
      total: 2,
      total_pages: 1,
    },
    users: [
      {
        user_id: "usr_paid_1",
        username: "rahul_paid",
        fullname: "Rahul Sharma",
        phone: "9876543210",
        email: "rahul@example.com",
        level: "A1",
        is_paid: true,
        trial_active: false,
        override_status: null,
        effective_status: true,
        effective_reason: "cohort_paid_on",
      },
      {
        user_id: "usr_free_1",
        username: "sneha_free",
        fullname: "Sneha Patel",
        phone: "9876543211",
        email: "sneha@example.com",
        level: "A2",
        is_paid: false,
        trial_active: false,
        override_status: null,
        effective_status: false,
        effective_reason: "cohort_unpaid_off",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagApi.adminGetFeatureFlags.mockResolvedValue({ data: { features: mockFeatures } });
    featureFlagApi.adminGetFeatureUsers.mockResolvedValue({ data: mockUsersData });
    featureFlagApi.adminUpdateFeatureConfig.mockResolvedValue({
      data: {
        feature: {
          ...mockFeatures[0],
          unpaid_enabled: true,
        },
      },
    });
    featureFlagApi.adminSetUserFeatureOverride.mockResolvedValue({
      data: { message: "User override set to ENABLED" },
    });
    featureFlagApi.adminResetUserFeatureOverride.mockResolvedValue({
      data: { message: "User override removed" },
    });
  });

  it("renders feature flags header, summary stats, and student list", async () => {
    renderWithStore(<FeatureFlagsAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Feature Flags Control Center")).toBeInTheDocument();
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText("Sneha Patel")).toBeInTheDocument();
    });

    expect(screen.getByText("150")).toBeInTheDocument(); // total eligible
  });

  it("toggles student individual override when action button is clicked", async () => {
    renderWithStore(<FeatureFlagsAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Sneha Patel")).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByTitle(/Click to (ENABLE|DISABLE) for this user/i);
    fireEvent.click(toggleButtons[1]); // Sneha (disabled) -> toggle to enabled

    await waitFor(() => {
      expect(featureFlagApi.adminSetUserFeatureOverride).toHaveBeenCalledWith(
        "german_classes",
        "usr_free_1",
        true
      );
    });
  });

  it("saves cohort release rules when Save Rollout Rules is clicked", async () => {
    renderWithStore(<FeatureFlagsAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Save Rollout Rules")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save Rollout Rules"));

    await waitFor(() => {
      expect(featureFlagApi.adminUpdateFeatureConfig).toHaveBeenCalledWith(
        "german_classes",
        expect.objectContaining({
          paid_enabled: true,
          unpaid_enabled: false,
          eligible_levels: ["A1", "A2"],
        })
      );
    });
  });

  it("toggles target proficiency levels and includes them when saving rollout rules", async () => {
    renderWithStore(<FeatureFlagsAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Target Proficiency Levels")).toBeInTheDocument();
    });

    // Toggle B1 on
    const b1Button = screen.getByRole("button", { name: "B1" });
    fireEvent.click(b1Button);

    fireEvent.click(screen.getByText("Save Rollout Rules"));

    await waitFor(() => {
      expect(featureFlagApi.adminUpdateFeatureConfig).toHaveBeenCalledWith(
        "german_classes",
        expect.objectContaining({
          eligible_levels: ["A1", "A2", "B1"],
        })
      );
    });
  });

  it("disables mutation controls and shows Read-Only badge when canEdit is false", async () => {
    renderWithStore(<FeatureFlagsAdmin canEdit={false} />);

    await waitFor(() => {
      expect(screen.getByText(/Read-Only Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Read-Only Mode:/i)).toBeInTheDocument();
    });

    const readOnlyControls = screen.getAllByTitle(/Read-only mode: contact Super Admin to edit/i);
    expect(readOnlyControls.length).toBeGreaterThan(0);
    readOnlyControls.forEach((control) => {
      expect(control).toBeDisabled();
    });
  });

  it("displays formatted cohort reasons in the table", async () => {
    renderWithStore(<FeatureFlagsAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Paid Cohort Rule")).toBeInTheDocument();
      expect(screen.getByText("Free Cohort (Disabled)")).toBeInTheDocument();
    });
  });
});

describe("FeatureFlagsAdmin — global_only features", () => {
  const globalOnlyFeature = {
    feature_key: "scholarship_onboarding",
    name: "Scholarship Exam Onboarding",
    description: 'Shows the "I am here for the scholarship exam" option during onboarding',
    eligible_levels: ["ALL"],
    global_enabled: true,
    paid_enabled: false,
    unpaid_enabled: false,
    global_only: true,
    total_overrides: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagApi.adminGetFeatureFlags.mockResolvedValue({
      data: { features: [globalOnlyFeature] },
    });
    featureFlagApi.adminGetFeatureUsers.mockResolvedValue({
      data: {
        feature: globalOnlyFeature,
        stats: { total_eligible: 150 },
        pagination: { page: 1, limit: 25, total: 1, total_pages: 1 },
        users: [
          {
            user_id: "usr_1",
            fullname: "Rahul Sharma",
            level: "A1",
            is_paid: true,
            override_status: null,
            effective_status: true,
            effective_reason: "global_on",
          },
        ],
      },
    });
    featureFlagApi.adminUpdateFeatureConfig.mockResolvedValue({
      data: { feature: { ...globalOnlyFeature, global_enabled: false } },
    });
  });

  it("hides cohort cards, stats and the per-student table", async () => {
    renderWithStore(<FeatureFlagsAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Global Feature Release")).toBeInTheDocument();
    });

    expect(screen.queryByText("Paid Students Cohort")).not.toBeInTheDocument();
    expect(screen.queryByText("Free / Unpaid Students Cohort")).not.toBeInTheDocument();
    expect(screen.queryByText("Rahul Sharma")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search by student name/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Eligible Students")).not.toBeInTheDocument();
  });

  it("saves only global_enabled, never the cohort fields", async () => {
    renderWithStore(<FeatureFlagsAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Save Rollout Rules")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save Rollout Rules"));

    await waitFor(() => {
      expect(featureFlagApi.adminUpdateFeatureConfig).toHaveBeenCalledWith(
        "scholarship_onboarding",
        { global_enabled: true }
      );
    });
  });
});

describe("FeatureCardsGrid — study_notes gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetFlagsCache();
  });

  it("hides the Study Notes card when study_notes is off", async () => {
    featureFlagApi.getMyFeatureFlags.mockResolvedValue({
      data: { flags: { study_notes: false } },
    });

    renderWithStore(<FeatureCardsGrid />);

    await waitFor(() => {
      expect(screen.getByText("Flashcards")).toBeInTheDocument();
    });
    expect(screen.queryByText("Study Notes")).not.toBeInTheDocument();
  });

  it("shows the Study Notes card when study_notes is on", async () => {
    featureFlagApi.getMyFeatureFlags.mockResolvedValue({
      data: { flags: { study_notes: true } },
    });

    renderWithStore(<FeatureCardsGrid />);

    await waitFor(() => {
      expect(screen.getByText("Study Notes")).toBeInTheDocument();
    });
  });
});
