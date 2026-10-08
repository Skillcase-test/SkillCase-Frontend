import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import OpportunitySheet from "../pages/irelandJobs/components/OpportunitySheet";

const CONTENT = {
  header: {
    title: "Ireland Caregiver Opportunity 🇮🇪",
    subtitle: "Start your healthcare career in Ireland as a Caregiver.",
    status: "Eligible",
  },
  sections: [
    {
      id: "snapshot",
      title: "Opportunity Snapshot",
      kind: "table",
      rows: [
        { label: "Role", value: "Caregiver" },
        { label: "Total Service Charge", value: "₹8,00,000" },
      ],
    },
    {
      id: "process",
      title: "Your Ireland Journey",
      kind: "steps",
      steps: ["Skillcase Screening", "Visa", "Travel to Ireland"],
    },
    {
      id: "support",
      title: "Support Through Your Journey",
      kind: "cards",
      items: [{ title: "CV Support", text: "We review your CV." }],
    },
    {
      id: "progression",
      title: "Future Career Progression",
      kind: "text",
      body: "Caregivers may move into nursing.",
      list: ["Aptitude test"],
      note: "Subject to requirements.",
    },
  ],
  cta: {
    heading: "Interested?",
    subtext: "Start your application.",
    primaryLabel: "I'm Interested",
    secondaryLabel: "Not Now",
  },
};

describe("OpportunitySheet", () => {
  test("header + first section render open; later sections collapse", () => {
    render(<OpportunitySheet content={CONTENT} onPrimary={vi.fn()} />);
    expect(screen.getByText(/Ireland Caregiver Opportunity/)).toBeTruthy();
    expect(screen.getByText("Eligible")).toBeTruthy();
    // Snapshot table rows visible without interaction.
    expect(screen.getByText("₹8,00,000")).toBeTruthy();
    // Collapsed section content exists in DOM but inside closed <details>.
    const details = document.querySelectorAll("details");
    expect(details[0].hasAttribute("open")).toBe(true);
    expect(details[1].hasAttribute("open")).toBe(false);
  });

  test("expanding an accordion reveals its content kind", () => {
    render(<OpportunitySheet content={CONTENT} onPrimary={vi.fn()} />);
    const journeySummary = screen.getByText("Your Ireland Journey");
    const details = journeySummary.closest("details");
    expect(details.hasAttribute("open")).toBe(false);
    fireEvent.click(journeySummary);
    expect(details.hasAttribute("open")).toBe(true);
    expect(screen.getByText("Travel to Ireland")).toBeTruthy();
  });

  test("CTA wires primary + secondary; done state swaps the label", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    const { rerender } = render(
      <OpportunitySheet
        content={CONTENT}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "I'm Interested" }));
    expect(onPrimary).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Not Now" }));
    expect(onSecondary).toHaveBeenCalledOnce();

    rerender(
      <OpportunitySheet
        content={CONTENT}
        onPrimary={onPrimary}
        primaryDone
        doneLabel="Interest noted"
      />,
    );
    const btn = screen.getByRole("button", { name: "Interest noted" });
    expect(btn.disabled).toBe(true);
  });

  test("missing content renders nothing", () => {
    const { container } = render(<OpportunitySheet content={null} />);
    expect(container.innerHTML).toBe("");
  });
});
