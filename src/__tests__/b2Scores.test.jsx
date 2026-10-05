import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { getB2ScoreBand, normalizeB2Score } from "../utils/b2Scores";
import { B2ScoreBar, B2ScoreRing } from "../components/b2/B2UI";

afterEach(cleanup);
describe("B2 learning score interpretation", () => {
  it.each([[0, "practice"], [41, "practice"], [42, "developing"], [61, "developing"], [62, "good"], [100, "good"]])(
    "keeps the existing assessment band for %s", (score, band) => {
      expect(getB2ScoreBand(score).key).toBe(band);
    },
  );
  it("uses the displayed rounded score consistently at band boundaries", () => {
    expect(normalizeB2Score("61.7")).toBe(62);
    expect(getB2ScoreBand("61.7").key).toBe("good");
  });
  it.each([null, undefined, "", " ", "not a score", NaN, Infinity, false])(
    "does not turn an unscored value (%s) into a failed score", (score) => {
      expect(normalizeB2Score(score)).toBeNull();
      expect(getB2ScoreBand(score).key).toBe("pending");
    },
  );
  it("labels a measured score independently of its colour", () => {
    render(<B2ScoreBar label="Listening" score={33} />);
    expect(screen.getByText("Needs practice")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
  });
  it("keeps zero distinct from pending scores in the accessible chart", () => {
    const { rerender } = render(<B2ScoreRing score={null} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Score not available");
    rerender(<B2ScoreRing score={0} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Score 0 percent, Needs practice");
  });
});
