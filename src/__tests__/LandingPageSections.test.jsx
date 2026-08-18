import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "../pages/landing/LandingPage";
import DemoClassSection from "../pages/landing/components/DemoClassSection";
import * as landingApi from "../api/landingPageApi";
import * as a1Api from "../api/a1Api";
import api from "../api/axios";

function renderWithStore(ui, { initialState } = {}) {
  const store = configureStore({
    reducer: {
      auth: (state = initialState?.auth || { user: null }) => state,
      practice: (state = { progress: {} }) => state,
      flashcard: (state = { chapters: [] }) => state,
      subscription: (state = {}) => state,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );
}

describe("DemoClassSection component", () => {
  it("renders revamped UI with heading, subtitle, CTA button link, and Maya illustration", () => {
    render(
      <DemoClassSection
        data={{
          heading: "Free German language demo",
          check_item_1: "11 June 2026",
          check_item_2: "7PM - 7:30 PM",
          button_text: "Register Now",
          button_link: "https://luma.com/Skillcase.in",
        }}
      />,
    );

    expect(screen.getByText("Free German language demo")).toBeInTheDocument();
    expect(screen.getByText("11 June 2026 | 7PM - 7:30 PM")).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: "Register Now" });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "https://luma.com/Skillcase.in");
    expect(cta).toHaveAttribute("target", "_blank");

    const img = screen.getByAltText("Free Demo");
    expect(img).toBeInTheDocument();
  });

  it("automatically formats 'Today' date string into current IST date", () => {
    const expectedToday = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    render(
      <DemoClassSection
        data={{
          heading: "Live Demo Today",
          check_item_1: "Today",
          check_item_2: "9:00 PM",
          button_link: "https://luma.com/live",
        }}
      />,
    );

    expect(screen.getByText("Live Demo Today")).toBeInTheDocument();
    expect(
      screen.getByText(`${expectedToday} | 9:00 PM`),
    ).toBeInTheDocument();
  });
});

describe("LandingPage dynamic sections and paid gating", () => {
  const mockSections = {
    demo_class: {
      heading: "Free German demo for A1",
      subtitle: "15 Aug 2026 | 8PM",
      button_text: "Register Now",
      button_link: "https://luma.com/test",
      is_visible: true,
    },
    salary_info: {
      heading: "Salary, Expenses and Savings in Germany",
      subtitle: "Get real answers in 30 minutes:",
      button_text: "Register Free",
      button_link: "https://luma.com/salary",
      is_visible: true,
    },
    talk_to_team: {
      heading: "Talk to our team",
      button_text: "Call us Now",
      phone_link: "tel:9731462667",
      is_visible: true,
    },
  };

  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ data: [] });

    vi.spyOn(a1Api, "getA1MigrationStatus").mockResolvedValue({
      data: { status: "revamp_opted_in", showModal: false },
    });

    vi.spyOn(landingApi, "fetchSectionsByLevel").mockResolvedValue({
      data: mockSections,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders promotional sections for unpaid/free user (is_paid: false)", async () => {
    await act(async () => {
      renderWithStore(<LandingPage />, {
        initialState: {
          auth: {
            user: {
              user_id: "u123",
              user_prof_level: "A1",
              is_paid: false,
            },
          },
        },
      });
    });

    expect(landingApi.fetchSectionsByLevel).toHaveBeenCalledWith("A1");
    expect(screen.getByText("Free German demo for A1")).toBeInTheDocument();
    expect(
      screen.getByText("Salary, Expenses and Savings in Germany"),
    ).toBeInTheDocument();
    expect(screen.getByText("Talk to our team")).toBeInTheDocument();
  });

  it("hides all promotional sections when user is paid (is_paid: true)", async () => {
    await act(async () => {
      renderWithStore(<LandingPage />, {
        initialState: {
          auth: {
            user: {
              user_id: "u456",
              user_prof_level: "A1",
              is_paid: true,
            },
          },
        },
      });
    });

    expect(
      screen.queryByText("Free German demo for A1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Salary, Expenses and Savings in Germany"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Talk to our team")).not.toBeInTheDocument();
  });

  it("fetches and renders correct sections for B1 practice level", async () => {
    await act(async () => {
      renderWithStore(<LandingPage />, {
        initialState: {
          auth: {
            user: {
              user_id: "u789",
              user_prof_level: "B1",
              is_paid: false,
            },
          },
        },
      });
    });

    expect(landingApi.fetchSectionsByLevel).toHaveBeenCalledWith("B1");
    expect(screen.getByText("Free German demo for A1")).toBeInTheDocument();
  });

  it("respects individual is_visible: false toggle from backend", async () => {
    vi.spyOn(landingApi, "fetchSectionsByLevel").mockResolvedValue({
      data: {
        ...mockSections,
        demo_class: { ...mockSections.demo_class, is_visible: false },
      },
    });

    await act(async () => {
      renderWithStore(<LandingPage />, {
        initialState: {
          auth: {
            user: {
              user_id: "u999",
              user_prof_level: "A2",
              is_paid: false,
            },
          },
        },
      });
    });

    expect(landingApi.fetchSectionsByLevel).toHaveBeenCalledWith("A2");
    expect(
      screen.queryByText("Free German demo for A1"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Talk to our team")).toBeInTheDocument();
  });
});
