import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ListenAndChooseScreen from "../pages/learnGerman/lesson/screens/ListenAndChooseScreen";

function renderScreen(overrides = {}) {
  const props = {
    screen: {
      id: "listen-1",
      audioText: "Guten Morgen",
      question: "What did you hear?",
      options: ["Good morning", "Good evening"],
    },
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onSkip: vi.fn(),
    selectedOption: null,
    setSelectedOption: vi.fn(),
    onCheck: vi.fn(),
    speakWord: vi.fn(),
    isSpeaking: false,
    progressRatio: 0.5,
    title: "Listening",
    level: "A1",
    ...overrides,
  };
  render(<ListenAndChooseScreen {...props} />);
  return props;
}

describe("ListenAndChooseScreen", () => {
  it("skips through the dedicated cannot-listen action", () => {
    const props = renderScreen();

    fireEvent.click(screen.getByRole("button", { name: "Can't listen now" }));

    expect(props.onSkip).toHaveBeenCalledTimes(1);
    expect(props.onNext).not.toHaveBeenCalled();
    expect(props.onCheck).not.toHaveBeenCalled();
  });

  it("keeps Check disabled until an option is selected", () => {
    const { rerender } = render(
      <ListenAndChooseScreen
        screen={{ question: "Pick one", options: ["A", "B"] }}
        onSkip={vi.fn()}
        selectedOption={null}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        speakWord={vi.fn()}
        isSpeaking={false}
        progressRatio={0}
        title="Listening"
        level="A1"
      />,
    );

    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();

    rerender(
      <ListenAndChooseScreen
        screen={{ question: "Pick one", options: ["A", "B"] }}
        onSkip={vi.fn()}
        selectedOption={0}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        speakWord={vi.fn()}
        isSpeaking={false}
        progressRatio={0}
        title="Listening"
        level="A1"
      />,
    );

    expect(screen.getByRole("button", { name: "Check" })).toBeEnabled();
  });
});
