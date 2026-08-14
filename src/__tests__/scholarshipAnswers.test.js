/**
 * Frontend Tests — shared scholarship answer formatting
 *
 * Both the candidate result view and the admin submission review must resolve
 * stored answers identically. These tests pin the shared formatters:
 *   - formatAnswerValue  → candidate's stored answer → display text
 *   - formatCorrectAnswer → question data → correct-answer display text
 */
import { describe, test, expect } from "vitest";
import {
  toAlphaLabel,
  formatAnswerValue,
  formatCorrectAnswer,
} from "../utils/scholarshipAnswers";

describe("toAlphaLabel", () => {
  test("maps 0..25 to A..Z and continues past Z", () => {
    expect(toAlphaLabel(0)).toBe("A");
    expect(toAlphaLabel(1)).toBe("B");
    expect(toAlphaLabel(25)).toBe("Z");
    expect(toAlphaLabel(26)).toBe("AA");
    expect(toAlphaLabel(27)).toBe("AB");
  });
});

describe("formatAnswerValue", () => {
  test("empty / null answers render as an em dash", () => {
    expect(formatAnswerValue(null, "mcq_single", {})).toBe("—");
    expect(formatAnswerValue(undefined, "mcq_single", {})).toBe("—");
    expect(formatAnswerValue("", "mcq_single", {})).toBe("—");
  });

  test("JSON-encoded answers are parsed first", () => {
    expect(
      formatAnswerValue('"Apfel"', "mcq_single", { options: ["Apfel"] }),
    ).toBe("Apfel");
    expect(formatAnswerValue("[0,2]", "mcq_multi", { options: ["A", "B", "C"] })).toBe(
      "A, C",
    );
  });

  test("mcq_single resolves an index to its option text", () => {
    expect(
      formatAnswerValue(1, "mcq_single", { options: ["Apfel", "Banane"] }),
    ).toBe("Banane");
    expect(formatAnswerValue("Apfel", "mcq_single", { options: ["Apfel"] })).toBe(
      "Apfel",
    );
  });

  test("mcq_single with an image option renders [image]", () => {
    expect(
      formatAnswerValue(0, "mcq_single", {
        options: [{ type: "image", url: "x.png" }, "Text"],
      }),
    ).toBe("[image]");
  });

  test("mcq_multi resolves an array of indices to option text", () => {
    expect(
      formatAnswerValue([0, 2], "mcq_multi", {
        options: ["A", "B", "C"],
      }),
    ).toBe("A, C");
    expect(formatAnswerValue([], "mcq_multi", { options: ["A"] })).toBe("—");
  });

  test("true_false normalises booleans and strings", () => {
    expect(formatAnswerValue(true, "true_false", {})).toBe("True");
    expect(formatAnswerValue("false", "true_false", {})).toBe("False");
  });

  test("sentence_ordering joins the word array", () => {
    expect(
      formatAnswerValue(["Ich", "bin", "hier"], "sentence_ordering", {}),
    ).toBe("Ich → bin → hier");
  });

  test("sentence_correction shows the raw corrected sentence", () => {
    expect(
      formatAnswerValue("Ich bin hier.", "sentence_correction", {}),
    ).toBe("Ich bin hier.");
  });

  test("matching resolves index pairs to left ↔ right text", () => {
    expect(
      formatAnswerValue(
        [
          [0, 0],
          [1, 1],
        ],
        "matching",
        { left: ["Hund", "Katze"], right: ["dog", "cat"] },
      ),
    ).toBe("Hund ↔ dog, Katze ↔ cat");
  });

  test("fill_typing shows the typed text", () => {
    expect(formatAnswerValue("Berlin", "fill_typing", {})).toBe("Berlin");
  });

  test("fill_options resolves an index answer to option text", () => {
    expect(
      formatAnswerValue(2, "fill_options", { options: ["a", "b", "c"] }),
    ).toBe("c");
  });

  test("composite_question resolves each sub-answer, dropdown indices to text", () => {
    const qData = {
      items: [
        { type: "blank", correct: "Berlin" },
        { type: "dropdown", options: ["rot", "grün"], correct: 1 },
      ],
    };
    expect(
      formatAnswerValue({ 0: "Berlin", 1: 1 }, "composite_question", qData),
    ).toBe("(a). Berlin | (b). grün");
  });

  test("dialogue_dropdown resolves per-line option indices", () => {
    const qData = {
      dialogue: [
        { speaker: "A", options: ["Hallo", "Tschüss"], correct: 0 },
        { speaker: "B", options: ["Ja", "Nein"], correct: 1 },
      ],
    };
    expect(
      formatAnswerValue({ 0: 1, 1: 0 }, "dialogue_dropdown", qData),
    ).toBe("Tschüss / Ja");
  });

  test("unknown / raw values fall back to String()", () => {
    expect(formatAnswerValue(42, "weird_type", {})).toBe("42");
    expect(formatAnswerValue(["a", "b"], "weird_type", {})).toBe("a, b");
  });
});

describe("formatCorrectAnswer", () => {
  test("mcq_single resolves an index correct to option text", () => {
    expect(
      formatCorrectAnswer(
        { correct: 1, options: ["Apfel", "Banane"] },
        "mcq_single",
      ),
    ).toBe("Banane");
    expect(
      formatCorrectAnswer({ correct: "Apfel", options: ["Apfel"] }, "mcq_single"),
    ).toBe("Apfel");
  });

  test("mcq_multi resolves correct indices to option text", () => {
    expect(
      formatCorrectAnswer(
        { correct: [0, 2], options: ["A", "B", "C"] },
        "mcq_multi",
      ),
    ).toBe("A, C");
  });

  test("true_false normalises the correct boolean", () => {
    expect(formatCorrectAnswer({ correct: true }, "true_false")).toBe("True");
    expect(formatCorrectAnswer({ correct: false }, "truefalse")).toBe("False");
  });

  test("fill_options with image options shows [image] for index corrects", () => {
    expect(
      formatCorrectAnswer(
        { correct: 1, options: [{ type: "image", url: "a.png" }, { type: "image", url: "b.png" }] },
        "fill_options",
      ),
    ).toBe("[image]");
  });

  test("sentence_ordering joins correct_order", () => {
    expect(
      formatCorrectAnswer({ correct_order: ["a", "b", "c"] }, "sentence_ordering"),
    ).toBe("a → b → c");
  });

  test("sentence_correction uses correct_sentence", () => {
    expect(
      formatCorrectAnswer({ correct_sentence: "Ich bin hier." }, "sentence_correction"),
    ).toBe("Ich bin hier.");
  });

  test("matching resolves correct_pairs to left ↔ right text", () => {
    expect(
      formatCorrectAnswer(
        {
          left: ["Hund", "Katze"],
          right: ["dog", "cat"],
          correct_pairs: [
            [0, 0],
            [1, 1],
          ],
        },
        "matching",
      ),
    ).toBe("Hund ↔ dog, Katze ↔ cat");
  });

  test("fill_typing falls back to correct_answer", () => {
    expect(formatCorrectAnswer({ correct_answer: "Berlin" }, "fill_typing")).toBe(
      "Berlin",
    );
  });

  test("composite_question resolves per-item corrects, dropdown indices to text", () => {
    const qData = {
      items: [
        { type: "blank", correct: "Berlin" },
        { type: "option", options: ["rot", "grün"], correct: 1 },
      ],
    };
    expect(formatCorrectAnswer(qData, "composite_question")).toBe(
      "(a). Berlin | (b). grün",
    );
  });

  test("dialogue_dropdown resolves per-line corrects", () => {
    const qData = {
      dialogue: [
        { speaker: "A", options: ["Hallo", "Tschüss"], correct: 0 },
        { speaker: "B", options: ["Ja", "Nein"], correct: 1 },
      ],
    };
    expect(formatCorrectAnswer(qData, "dialogue_dropdown")).toBe(
      "(a). Hallo | (b). Nein",
    );
  });

  test("paragraph and unknown types return null (no auto correct to show)", () => {
    expect(formatCorrectAnswer({ correct: "x" }, "paragraph")).toBeNull();
    expect(formatCorrectAnswer({}, "weird_type")).toBeNull();
  });
});
