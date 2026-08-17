import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Regression guard for a hook placed after RecapScreen's `if (loading) return`
// early return: the hook count then grows when loading flips false and React
// throws "Rendered more hooks than during the previous render", which blanked
// both the chapter and global recap screens.

vi.mock("react-router-dom", () => ({
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
}));

vi.mock("../api/learnGermanApi", () => ({
  getVocabProgress: () =>
    Promise.resolve({
      data: {
        learnedWords: 2,
        learnedVocabList: [
          { word: "Hallo", translation: "Hello", image: null },
          { word: "Danke", translation: "Thanks", image: null },
        ],
      },
    }),
  getLessonById: () => Promise.resolve({ data: {} }),
}));

vi.mock("../telemetry/events", () => ({
  trackLearningEvent: vi.fn(),
  trackFeatureEvent: vi.fn(),
}));

import RecapScreen from "../pages/learnGerman/RecapScreen";
import { trackFeatureEvent } from "../telemetry/events";

describe("RecapScreen", () => {
  it("survives the loading -> loaded transition without a hook-order error", async () => {
    const errors = [];
    const spy = vi
      .spyOn(console, "error")
      .mockImplementation((...args) => errors.push(String(args[0])));

    render(<RecapScreen />);

    await waitFor(() => {
      expect(screen.getByText("Hallo")).toBeInTheDocument();
    });
    spy.mockRestore();

    expect(errors.join("\n")).not.toMatch(/Rendered (more|fewer) hooks/);
    expect(trackFeatureEvent).toHaveBeenCalledWith(
      "learning",
      "recap_viewed",
      expect.objectContaining({ entityId: "global", total: 2 }),
    );
  });
});
