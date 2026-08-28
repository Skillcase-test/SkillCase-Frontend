import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TiersTab from "../dashboard-src/pages/exam/scholarship/TiersTab";

const mockListTiers = vi.fn();
const mockCreateTier = vi.fn();
const mockDeleteTier = vi.fn();
const mockUpdateTier = vi.fn();
const mockGetSubs = vi.fn();
const mockUpdateExam = vi.fn();

vi.mock("../api/scholarshipExamApi", () => ({
  listTiers: (...a) => mockListTiers(...a),
  createTier: (...a) => mockCreateTier(...a),
  deleteTier: (...a) => mockDeleteTier(...a),
  updateTier: (...a) => mockUpdateTier(...a),
  getExamSubmissions: (...a) => mockGetSubs(...a),
  updateExam: (...a) => mockUpdateExam(...a),
}));

let mockSelectedExam = { test_id: 1, results_visible: false };

vi.mock("../dashboard-src/pages/exam/scholarship/index", () => ({
  useScholarshipWorkspace: () => ({ selectedExam: mockSelectedExam }),
}));

describe("TiersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedExam = { test_id: 1, results_visible: false };
    mockListTiers.mockResolvedValue({ data: { tiers: [] } });
    mockGetSubs.mockResolvedValue({ data: { submissions: [] } });
    mockCreateTier.mockResolvedValue({ data: { tier: { tier_id: 1 } } });
    mockDeleteTier.mockResolvedValue({ data: {} });
    mockUpdateExam.mockResolvedValue({ data: {} });
  });

  test("empty state shows add tier prompt", async () => {
    render(<TiersTab />);
    expect(await screen.findByText(/No tiers yet/)).toBeInTheDocument();
    expect(screen.getByText(/Add at least one tier before you can release results/)).toBeInTheDocument();
  });

  test("locked state shows banner and disables add", async () => {
    mockSelectedExam = { test_id: 1, results_visible: true };
    mockListTiers.mockResolvedValue({ data: { tiers: [{ tier_id: 1, min_score: 50, scholarship_pct: 10 }] } });
    render(<TiersTab />);
    expect(await screen.findByText(/Tiers are locked because results are visible/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add tier/ })).toBeDisabled();
  });

  test("live preview computes bucket counts", async () => {
    mockListTiers.mockResolvedValue({
      data: { tiers: [{ tier_id: 1, min_score: 50, scholarship_pct: 10 }, { tier_id: 2, min_score: 80, scholarship_pct: 20 }] },
    });
    mockGetSubs.mockResolvedValue({
      data: {
        submissions: [
          { status: "completed", score: 30 },
          { status: "completed", score: 60 },
          { status: "completed", score: 85 },
          { status: "completed", score: 90 },
        ],
      },
    });
    render(<TiersTab />);
    await waitFor(() => expect(screen.getByText(/Live preview/)).toBeInTheDocument());
    // 30 -> none, 60 -> 50 tier, 85 and 90 -> 80 tier
    expect(screen.getByText(/No scholarship:/)).toBeInTheDocument();
  });

  test("add tier calls createTier", async () => {
    render(<TiersTab />);
    await screen.findByText(/No tiers yet/);
    const inputs = screen.getAllByPlaceholderText(/e\.g\./);
    fireEvent.change(inputs[0], { target: { value: "70" } });
    fireEvent.change(inputs[1], { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /Add tier/ }));
    await waitFor(() => expect(mockCreateTier).toHaveBeenCalledWith(1, { min_score: 70, scholarship_pct: 15 }));
  });

  // ─── Redemption window ──────────────────────────────────────────────────
  // The Save button was wired as onClick={handleSaveExpiry}, so React handed it
  // a click event as the "override value" and every save died in date parsing —
  // the redemption deadline could not be set at all. These pin the wiring.
  describe("redemption window", () => {
    const typeExpiry = async (value) => {
      render(<TiersTab />);
      await screen.findByText(/No tiers yet/);
      const input = document.querySelector('input[type="datetime-local"]');
      fireEvent.change(input, { target: { value } });
      return input;
    };

    test("Save sends the input as a UTC ISO string read from IST", async () => {
      await typeExpiry("2026-09-15T14:30");
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      // 14:30 IST == 09:00Z — not the CI machine's local time.
      await waitFor(() =>
        expect(mockUpdateExam).toHaveBeenCalledWith(1, {
          redemption_expires_at: "2026-09-15T09:00:00.000Z",
        }),
      );
    });

    test("Clear sends null", async () => {
      await typeExpiry("2026-09-15T14:30");
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() =>
        expect(mockUpdateExam).toHaveBeenCalledWith(1, { redemption_expires_at: null }),
      );
    });

    test("Save is disabled and writes nothing once results are visible", async () => {
      mockSelectedExam = { test_id: 1, results_visible: true, redemption_expires_at: null };
      mockListTiers.mockResolvedValue({ data: { tiers: [{ tier_id: 1, min_score: 50, scholarship_pct: 10 }] } });
      render(<TiersTab />);
      await screen.findByText(/Tiers are locked/);

      const save = screen.getByRole("button", { name: "Save" });
      expect(save).toBeDisabled();
      fireEvent.click(save);
      expect(mockUpdateExam).not.toHaveBeenCalled();
    });

    test("an existing deadline prefills the input in IST", async () => {
      mockSelectedExam = {
        test_id: 1,
        results_visible: false,
        redemption_expires_at: "2026-09-15T09:00:00.000Z",
      };
      render(<TiersTab />);
      await screen.findByText(/No tiers yet/);
      expect(document.querySelector('input[type="datetime-local"]').value).toBe(
        "2026-09-15T14:30",
      );
    });
  });
});
