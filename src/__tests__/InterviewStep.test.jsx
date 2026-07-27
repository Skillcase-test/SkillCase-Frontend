import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api/jobScreeningApi", () => ({
  getProgress: vi.fn(),
}));

vi.mock("../telemetry/flow", () => ({
  trackFlowAction: vi.fn(),
}));

import InterviewStep from "../pages/jobScreening/components/InterviewStep";

describe("InterviewStep — 'Move to next step' must actually advance", () => {
  test("clicking 'Move to next step' on the completed screen calls onComplete(progress, true), not onBack", () => {
    const progress = {
      candidate_email: "test@example.com",
      candidate_name: "Test Candidate",
      candidate_phone: "9876543210",
      steps_config: [
        { id: "interview_attempt", title: "Interview", status: "completed" },
      ],
    };
    const onComplete = vi.fn();
    const onBack = vi.fn();

    render(
      <InterviewStep
        progress={progress}
        onComplete={onComplete}
        onBack={onBack}
      />,
    );

    const moveButton = screen.getByRole("button", {
      name: "Move to next step",
    });
    fireEvent.click(moveButton);

    expect(onComplete).toHaveBeenCalledWith(progress, true);
    expect(onBack).not.toHaveBeenCalled();
  });

  test("the 'Back' button on the completed screen still calls onBack, not onComplete", () => {
    const progress = {
      candidate_email: "test@example.com",
      steps_config: [
        { id: "interview_attempt", title: "Interview", status: "completed" },
      ],
    };
    const onComplete = vi.fn();
    const onBack = vi.fn();

    render(
      <InterviewStep
        progress={progress}
        onComplete={onComplete}
        onBack={onBack}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
