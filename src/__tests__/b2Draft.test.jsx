import { useState } from "react";
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import useB2Draft from "../hooks/useB2Draft";
import { readB2Draft, writeB2Draft, findLatestB2PracticeDraft, removeB2Draft } from "../utils/b2Draft";
function useDraftHarness(key) {
  const [answers, setAnswers] = useState({}),
    [index, setIndex] = useState(0);
  const draft = useB2Draft({
    draftKey: key,
    answers,
    setAnswers,
    blockIndex: index,
    setBlockIndex: setIndex,
    loading: false,
    totalBlocks: 2,
  });
  return { answers, setAnswers, index, setIndex, draft };
}
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("B2 local answer recovery", () => {
  it("finds the latest answered practice for this learner, excluding tests, empty drafts and other learners", () => {
    const prefix = "b2-draft:v1:learner-a:practice:";
    writeB2Draft(`${prefix}1:reading`, { a: "A" }, 0);
    writeB2Draft(`${prefix}2:listening`, {}, 0);
    writeB2Draft(`${prefix}3:writing`, { a: "  " }, 0);
    writeB2Draft("b2-draft:v1:learner-a:assessment:2:1:reading", { a: "B" }, 0);
    writeB2Draft("b2-draft:v1:learner-b:practice:3:writing", { a: "Hello" }, 0);
    expect(findLatestB2PracticeDraft("learner-a")).toMatchObject({ exerciseId: "1", module: "reading" });
    localStorage.setItem(`${prefix}3:writing`, JSON.stringify({ answers: { a: "Hallo!" }, savedAt: Date.now() + 1 }));
    expect(findLatestB2PracticeDraft("learner-a")).toMatchObject({ exerciseId: "3", module: "writing" });
    removeB2Draft(`${prefix}3:writing`);
    expect(findLatestB2PracticeDraft("learner-a").exerciseId).toBe("1");
    expect(findLatestB2PracticeDraft(null)).toBeNull();
  });
  it("does not offer expired, malformed or unavailable practice drafts", () => {
    localStorage.setItem("b2-draft:v1:a:practice:1:reading", "broken");
    localStorage.setItem("b2-draft:v1:a:practice:2:listening", JSON.stringify({ answers: { a: "A" }, savedAt: Date.now() - 8 * 86400000 }));
    expect(findLatestB2PracticeDraft("a")).toBeNull();
    expect(findLatestB2PracticeDraft("a", { get length() { throw new Error("blocked"); } })).toBeNull();
  });
  it("restores answers and task position after remount", async () => {
    const first = renderHook(() => useDraftHarness("learner-a:attempt-1"));
    act(() => {
      first.result.current.setAnswers({ "1_0": "B" });
      first.result.current.setIndex(1);
    });
    await waitFor(() =>
      expect(readB2Draft("learner-a:attempt-1").answers).toEqual({
        "1_0": "B",
      }),
    );
    first.unmount();
    const second = renderHook(() => useDraftHarness("learner-a:attempt-1"));
    await waitFor(() =>
      expect(second.result.current.answers).toEqual({ "1_0": "B" }),
    );
    expect(second.result.current.index).toBe(1);
  });
  it("does not leak answers across learners or attempts", async () => {
    const hook = renderHook(({ key }) => useDraftHarness(key), {
      initialProps: { key: "learner-a:attempt-1" },
    });
    act(() => hook.result.current.setAnswers({ answer: "private response" }));
    hook.rerender({ key: "learner-b:attempt-1" });
    await waitFor(() => expect(hook.result.current.answers).toEqual({}));
    expect(readB2Draft("learner-a:attempt-1").answers.answer).toBe(
      "private response",
    );
    expect(readB2Draft("learner-b:attempt-1").answers).toEqual({});
  });
  it("clears a submitted draft without recreating it on later renders", async () => {
    const hook = renderHook(() => useDraftHarness("submitted"));
    act(() => hook.result.current.setAnswers({ answer: "A" }));
    act(() => hook.result.current.draft.clear());
    act(() => hook.result.current.setIndex(1));
    expect(localStorage.getItem("submitted")).toBeNull();
  });
  it("rejects expired and malformed drafts", () => {
    localStorage.setItem(
      "old",
      JSON.stringify({
        answers: { a: "B" },
        savedAt: Date.now() - 8 * 86400000,
      }),
    );
    localStorage.setItem("broken", "not JSON");
    expect(readB2Draft("old")).toBeNull();
    expect(readB2Draft("broken")).toBeNull();
  });
  it("reports unavailable storage without breaking the exercise", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full");
    });
    const hook = renderHook(() => useDraftHarness("blocked"));
    act(() => hook.result.current.setAnswers({ answer: "A" }));
    await waitFor(() =>
      expect(hook.result.current.draft.status).toBe("unavailable"),
    );
    expect(hook.result.current.answers).toEqual({ answer: "A" });
    expect(writeB2Draft("blocked", {}, 0)).toBe(false);
  });
});
