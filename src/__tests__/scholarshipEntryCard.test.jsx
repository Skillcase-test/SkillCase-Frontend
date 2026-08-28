// The card is the only re-entry point into the exam funnel for admin-added
// candidates, and it must stay hidden from everyone else — both gates matter.
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ScholarshipEntryCard, {
  hasScholarshipAccess,
} from "../components/ScholarshipEntryCard";

const renderCard = (props) =>
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<ScholarshipEntryCard {...props} />} />
        <Route path="/scholarship" element={<div>EXAM_HUB</div>} />
      </Routes>
    </MemoryRouter>,
  );

const candidate = { scholarship_candidate_at: "2026-08-01T00:00:00Z" };
const adminAdded = { has_scholarship_access: true };

describe("hasScholarshipAccess", () => {
  test("onboarded candidates and admin-added users are in the audience", () => {
    expect(hasScholarshipAccess(candidate)).toBe(true);
    expect(hasScholarshipAccess(adminAdded)).toBe(true);
  });

  test("everyone else is out, including missing users", () => {
    expect(hasScholarshipAccess(undefined)).toBe(false);
    expect(hasScholarshipAccess({})).toBe(false);
    // Truthy-but-not-true must not open the gate.
    expect(hasScholarshipAccess({ has_scholarship_access: "yes" })).toBe(false);
  });
});

describe("ScholarshipEntryCard", () => {
  test("renders for a candidate when the admin surface is on", () => {
    renderCard({ visible: true, user: candidate });
    expect(screen.getByText("Scholarship Exam")).toBeInTheDocument();
  });

  test("hidden when the admin turned the surface off", () => {
    renderCard({ visible: false, user: candidate });
    expect(screen.queryByText("Scholarship Exam")).not.toBeInTheDocument();
  });

  test("hidden for a user outside the audience even when the surface is on", () => {
    renderCard({ visible: true, user: { user_id: "u9" } });
    expect(screen.queryByText("Scholarship Exam")).not.toBeInTheDocument();
  });

  test("the CTA navigates to the exam hub", () => {
    renderCard({ visible: true, user: adminAdded });
    fireEvent.click(screen.getByRole("button", { name: /Open Scholarship Exam/ }));
    expect(screen.getByText("EXAM_HUB")).toBeInTheDocument();
  });
});
