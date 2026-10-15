import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MayaRoom from "../pages/maya/MayaRoom";
import { MayaLevel } from "../pages/maya/mayaLevel";
import { suggestedTopics } from "../pages/maya/topicSuggestions";

vi.mock("react-redux", () => ({ useSelector: (fn) => fn({ auth: { user: { user_prof_level: "b2", username: "Asha" } } }) }));
vi.mock("../hooks/useUsageLimits", () => ({ useUsageLimitModule: vi.fn(), useUsageLimits: () => ({ getState: () => null }) }));
vi.mock("../hooks/useLevelAccess", () => ({ default: () => () => true }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));

const ctxValue = { level: "B2", base: "/b2/maya", api: {}, talkName: "Talk", talkCopy: "", anyTopic: "Surprise me", interviewName: "Interview", interviewCopy: "", interviewNoun: "interview" };
const topics = [
  { id: "everyday", label: "Everyday life", german: "Alltag", icon: "coffee" },
  { id: "childhood", label: "Childhood memories", german: "Kindheitserinnerungen", icon: "smile" },
];
const baseMeta = { level: "B2", coachName: "Maya", consented: true, firstName: "Asha", modes: ["talk"], minutes: { talk: 10 }, plan: null, topics, words: [] };

function openTopics(meta = baseMeta) {
  render(
    <MemoryRouter>
      <MayaLevel.Provider value={ctxValue}>
        <MayaRoom meta={meta} />
      </MayaLevel.Provider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Let’s practise/ }));
  return screen.getByLabelText("Or bring your own topic");
}

const withTopicData = {
  ...baseMeta,
  topicPool: [...topics, { id: "films", label: "Films & series", icon: "film" }, { id: "music", label: "Music", icon: "music" }],
  popularTopics: [
    { id: "films", label: "Films & series", icon: "film" },
    { id: "everyday", label: "Everyday life", icon: "coffee" },
    { id: "music", label: "Music", icon: "music" },
  ],
};

describe("Maya topic picker", () => {
  it("shows the cards from /meta with their icons", () => {
    openTopics();
    const card = screen.getByRole("button", { name: "Childhood memories" });
    expect(card.querySelector("svg").dataset.icon).toBe("smile");
  });

  it("tapping the empty box lists the top 3 labelled Most spoken", () => {
    const input = openTopics(withTopicData);
    expect(screen.queryByRole("listbox", { name: "Most spoken topics" })).toBeNull();
    fireEvent.focus(input);
    const list = screen.getByRole("listbox", { name: "Most spoken topics" });
    const options = list.querySelectorAll('[role="option"]');
    expect([...options].map((o) => o.textContent)).toEqual(["Films & seriesMost spoken", "Everyday lifeMost spoken", "MusicMost spoken"]);
  });

  it("picking one that isn't a card fills the box; one that is selects the card", () => {
    const input = openTopics(withTopicData);
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: /Films & series/ }));
    expect(input.value).toBe("Films & series");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: /Everyday life/ }));
    expect(input.value).toBe("");
    expect(screen.getByRole("button", { name: "Everyday life" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("typing swaps Most spoken for search results, and blur hides the list", () => {
    const input = openTopics(withTopicData);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "mus" } });
    expect(screen.queryByRole("listbox", { name: "Most spoken topics" })).toBeNull();
    expect(screen.getByRole("listbox", { name: "Suggested topics" }).textContent).toContain("Music");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("an older backend without popularTopics shows no list on focus", () => {
    const input = openTopics();
    fireEvent.focus(input);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("suggestedTopics", () => {
  it("searches the level's pool too, without duplicates", () => {
    expect(suggestedTopics("garden", 3, ["Gardening & plants"])).toContain("Gardening & plants");
    const r = suggestedTopics("music", 8, ["Music"]);
    expect(r.filter((t) => t.toLowerCase() === "music")).toHaveLength(0);
    expect(new Set(r.map((t) => t.toLowerCase())).size).toBe(r.length);
  });
});
