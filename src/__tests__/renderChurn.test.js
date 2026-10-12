import { describe, expect, it } from "vitest";
import authReducer, { setUser } from "../redux/auth/authSlice";
import { setOtaProgress } from "../utils/otaProgress";

describe("setUser", () => {
  const base = { user: { user_id: 1, coins: 5, prefs: { a: 1 } }, token: "t", isAuthenticated: true };

  it("keeps the same user object when the profile didn't change", () => {
    const next = authReducer(base, setUser({ user_id: 1, coins: 5, prefs: { a: 1 } }));
    expect(next).toBe(base);
    expect(next.user).toBe(base.user);
  });

  it("still applies real changes", () => {
    const next = authReducer(base, setUser({ user_id: 1, coins: 6, prefs: { a: 1 } }));
    expect(next.user.coins).toBe(6);
    expect(authReducer(base, setUser(null)).user).toBeNull();
  });
});

describe("otaProgress store", () => {
  it("accepts updater functions like setState", () => {
    setOtaProgress(10);
    setOtaProgress((prev) => Math.max(prev, 5));
    let seen;
    setOtaProgress((prev) => {
      seen = prev;
      return prev;
    });
    expect(seen).toBe(10);
    setOtaProgress(0);
  });
});
