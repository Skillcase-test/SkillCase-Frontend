import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import CandidateList from "../pages/admin/components/CandidateList";

const defaultProps = {
  candidates: [],
  selectedCandidateId: null,
  onSelectCandidate: vi.fn(),
  searchVal: "",
  setSearchVal: vi.fn(),
  currentPage: 1,
  totalPages: 1,
  onPageChange: vi.fn(),
  loading: false,
  startDate: "",
  endDate: "",
  onStartDateChange: vi.fn(),
  onEndDateChange: vi.fn(),
  onClearDates: vi.fn(),
};

describe("CandidateList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("emits created date range changes and clears an active range", () => {
    const props = {
      ...defaultProps,
      startDate: "2026-07-01",
      endDate: "2026-07-15",
    };
    render(<CandidateList {...props} />);

    fireEvent.change(screen.getByLabelText("Created From"), {
      target: { value: "2026-07-02" },
    });
    fireEvent.change(screen.getByLabelText("Created To"), {
      target: { value: "2026-07-14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear Dates" }));

    expect(props.onStartDateChange).toHaveBeenCalledWith("2026-07-02");
    expect(props.onEndDateChange).toHaveBeenCalledWith("2026-07-14");
    expect(props.onClearDates).toHaveBeenCalledOnce();
  });

  test("marks inactive candidates and keeps them selectable", () => {
    const onSelectCandidate = vi.fn();
    render(
      <CandidateList
        {...defaultProps}
        onSelectCandidate={onSelectCandidate}
        candidates={[
          {
            user_id: "candidate-1",
            fullname: "Jane Candidate",
            email: "jane@example.com",
            is_active: false,
            current_step_id: "profile_completion",
            steps_config: [
              {
                id: "profile_completion",
                title: "Profile Updated",
                status: "pending",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Inactive")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Jane Candidate/i }));
    expect(onSelectCandidate).toHaveBeenCalledWith("candidate-1");
  });
});
