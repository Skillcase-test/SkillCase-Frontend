/**
 * Frontend Tests — utils/lgMode.js (redux sync)
 *
 * Mode switches used to write only localStorage and fire the server call
 * without awaiting it, then navigate. Destination screens gate on the *redux*
 * mode (JobScreening bounces to the practice home when
 * user.lg_preferred_mode !== "job_screening"), so the candidate was thrown
 * straight back. syncModeIntoRedux patches the mode on optimistically.
 */
import { describe, test, expect, beforeEach, vi } from "vitest";

const mockSetLGMode = vi.fn().mockResolvedValue({ data: {} });
vi.mock("../api/learnGermanApi", () => ({
  setLGMode: (...args) => mockSetLGMode(...args),
}));

import { syncModeIntoRedux, switchLGMode } from "../utils/lgMode";
import { store } from "../redux/store";
import { setUser } from "../redux/auth/authSlice";

const currentUser = () => store.getState().auth.user;

describe("lgMode redux sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    store.dispatch(setUser({ user_id: "u1", lg_preferred_mode: "practice" }));
  });

  test("patches the new mode onto the redux user", () => {
    syncModeIntoRedux("job_screening");
    expect(currentUser().lg_preferred_mode).toBe("job_screening");
    // Everything else on the user survives the patch.
    expect(currentUser().user_id).toBe("u1");
  });

  test("is a no-op when the mode already matches", () => {
    const before = currentUser();
    syncModeIntoRedux("practice");
    expect(currentUser()).toBe(before);
  });

  test("does not throw when nobody is signed in", () => {
    store.dispatch(setUser(null));
    expect(() => syncModeIntoRedux("learn")).not.toThrow();
    expect(currentUser()).toBeNull();
  });

  test("switchLGMode syncs redux, localStorage and the server", () => {
    switchLGMode("learn");
    expect(currentUser().lg_preferred_mode).toBe("learn");
    expect(localStorage.getItem("lg_preferred_mode")).toBe("learn");
    expect(mockSetLGMode).toHaveBeenCalledWith("learn");
  });
});
