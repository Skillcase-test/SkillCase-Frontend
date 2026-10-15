import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHaptic = vi.fn();
vi.mock("../utils/haptics", () => ({ hapticLight: (...a) => mockHaptic(...a) }));
vi.mock("../hooks/useUsageLimits", () => ({
  useUsageLimits: () => ({ eligible: true, getState: () => null }),
}));

import FeatureCard from "../pages/landing/components/FeatureCard";

const card = () =>
  render(
    <MemoryRouter>
      <FeatureCard title="Flashcards" description="Practice" image="x.png" link="/flash" enabled />
    </MemoryRouter>,
  );
const el = () => screen.getByText("Flashcards").closest("a");

beforeEach(() => mockHaptic.mockReset());

describe("FeatureCard haptics", () => {
  it("doesn't buzz on touch, only on the tap itself", () => {
    card();
    fireEvent.touchStart(el(), { touches: [{ clientX: 10, clientY: 10 }] });
    expect(mockHaptic).not.toHaveBeenCalled();
    fireEvent.touchEnd(el());
    fireEvent.click(el());
    expect(mockHaptic).toHaveBeenCalledTimes(1);
  });

  it("a scroll that starts on the card releases the press", () => {
    card();
    fireEvent.touchStart(el(), { touches: [{ clientX: 10, clientY: 10 }] });
    expect(el().className).toMatch(/scale-\[0\.85\]/);
    fireEvent.touchMove(el(), { touches: [{ clientX: 10, clientY: 40 }] });
    expect(el().className).not.toMatch(/scale-\[0\.85\]/);
    expect(mockHaptic).not.toHaveBeenCalled();
  });

  it("a tiny finger wobble still counts as pressing", () => {
    card();
    fireEvent.touchStart(el(), { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(el(), { touches: [{ clientX: 12, clientY: 13 }] });
    expect(el().className).toMatch(/scale-\[0\.85\]/);
  });
});
