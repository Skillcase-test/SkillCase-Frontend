import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { getMyUsageLimitState } from "../api/usageLimitApi";

const UsageLimitContext = createContext({
  eligible: false,
  states: [],
  getState: () => null,
  guardUsage: () => true,
  refresh: () => {},
});

export function UsageLimitProvider({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [eligible, setEligible] = useState(false);
  const [states, setStates] = useState([]);
  const fetchedForUserId = useRef(null);
  // Optimistic increments applied since the last /me refresh, keyed by
  // "level:moduleKey" — lets a rapid swipe/next-card action be blocked the
  // instant it would exceed a cap, without waiting on a network round trip.
  // Cleared whenever refresh() lands, since that brings the real used count.
  const localIncrements = useRef({});
  // Last-seen states, kept outside React state so `refresh` can diff against
  // it without depending on (and re-creating itself on) every state update.
  const prevStatesRef = useRef([]);
  // Whether we've ever completed a fetch for the current user — a module
  // that's already locked when the app first loads is NOT a "just got
  // locked" event, so the diff below must not fire on that first fetch, or
  // every reload with any locked module would pop the subscribe modal
  // out of nowhere.
  const hasFetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.user_id) {
      prevStatesRef.current = [];
      hasFetchedRef.current = false;
      setEligible(false);
      setStates([]);
      return;
    }
    try {
      const res = await getMyUsageLimitState();
      localIncrements.current = {};
      const nextStates = res.data?.states || [];

      // An admin can lock a module while the learner is already mid-session
      // on it — nothing was blocking them locally, so without this they'd
      // stay free to keep going until they happen to leave and come back to
      // the home hub (where a fresh fetch on mount would finally show it
      // locked). Firing the same event a live 402 fires pops the modal right
      // where they are, the moment the next periodic/focus refresh notices.
      if (hasFetchedRef.current) {
        const prevByKey = new Map(prevStatesRef.current.map((s) => [`${s.level}:${s.module_key}`, s]));
        const newlyLocked = nextStates.find(
          (s) => s.locked && !prevByKey.get(`${s.level}:${s.module_key}`)?.locked,
        );
        if (newlyLocked) {
          window.dispatchEvent(
            new CustomEvent("skillcase:usage-limit", {
              detail: {
                locked: true,
                reason: "usage_limit",
                module_key: newlyLocked.module_key,
                level: newlyLocked.level,
                limit_value: newlyLocked.limit_value,
                reset_at: newlyLocked.reset_at,
                periods: newlyLocked.periods,
                msg: newlyLocked.hard_locked
                  ? "This feature is currently locked."
                  : "Your limit for this feature has been reached.",
              },
            }),
          );
        }
      }
      hasFetchedRef.current = true;
      prevStatesRef.current = nextStates;

      setEligible(Boolean(res.data?.eligible));
      setStates(nextStates);
    } catch (err) {
      hasFetchedRef.current = false;
      // Fail closed on the client — the server-side middleware is the real
      // authority; a fetch failure here just means no badges/pre-emptive
      // modals, not a security hole.
      console.error("Failed to fetch usage limit state:", err);
      prevStatesRef.current = [];
      setEligible(false);
      setStates([]);
    }
  }, [isAuthenticated, user?.user_id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) {
      fetchedForUserId.current = null;
      setEligible(false);
      setStates([]);
      return;
    }
    if (fetchedForUserId.current === user.user_id) return;
    fetchedForUserId.current = user.user_id;
    refresh();
  }, [isAuthenticated, user?.user_id, refresh]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();
    const onUsageLimitHit = () => refresh();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("skillcase:usage-limit", onUsageLimitHit);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("skillcase:usage-limit", onUsageLimitHit);
    };
  }, [isAuthenticated, refresh]);

  // Catches an admin lock landing while the learner stays on one screen with
  // no focus/visibility change to trigger a refetch (e.g. reading a chapter
  // already loaded in the browser, not making any new requests).
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, refresh]);

  const getState = useCallback(
    (level, moduleKey) => {
      if (!eligible) return null;
      return states.find((s) => s.level === level && s.module_key === moduleKey) || null;
    },
    [eligible, states],
  );

  // Call before locally advancing to the next card/question. Returns false
  // if this action would exceed an already-known cap — the caller should
  // just skip the local advance and stop; it must NOT fire a network call
  // of its own to "provoke" a 402 for the modal. (An earlier version relied
  // on exactly that — a passive, non-incrementing save sent purely to get
  // 402'd — which broke the instant passive saves were made lock-exempt to
  // fix a different bug: swipe position falling behind and snapping
  // backward. The two concerns are unrelated and must not share one
  // request.) refresh() below is the real mechanism: the increment that
  // actually reached the cap already succeeded and armed the lock
  // server-side before this guard ever returns false, so a fresh /me read
  // has the real, accurate reset_at — and refresh() already dispatches the
  // lock-modal event itself the moment it sees a module go from unlocked to
  // locked, with no need for any caller to touch the network.
  const guardUsage = useCallback(
    (level, moduleKey) => {
      const state = getState(level, moduleKey);
      // TEMP DEBUG: pinpointing the flashcard-position-loss report — remove
      // once confirmed fixed. Shows exactly what guardUsage saw and decided.
      console.log("[usageLimitDebug] guardUsage", {
        at: Date.now(),
        level,
        moduleKey,
        state,
        localIncrements: { ...localIncrements.current },
      });
      if (!state) return true; // unconfigured/unlimited/ineligible
      if (state.locked) {
        console.log("[usageLimitDebug] guardUsage: already locked, blocking + refreshing", { at: Date.now() });
        refresh();
        return false;
      }

      const key = `${level}:${moduleKey}`;
      const local = localIncrements.current[key] || 0;
      const wouldExceed = (state.periods || []).some(
        (p) => p.limit_value > 0 && p.used + local >= p.limit_value,
      );
      if (wouldExceed) {
        console.log("[usageLimitDebug] guardUsage: would exceed, blocking + refreshing", {
          at: Date.now(),
          key,
          local,
        });
        refresh();
        return false;
      }

      localIncrements.current[key] = local + 1;
      console.log("[usageLimitDebug] guardUsage: allowed", { at: Date.now(), key, newLocal: local + 1 });
      return true;
    },
    [getState, refresh],
  );

  const value = useMemo(
    () => ({ eligible, states, getState, guardUsage, refresh }),
    [eligible, states, getState, guardUsage, refresh],
  );

  return <UsageLimitContext.Provider value={value}>{children}</UsageLimitContext.Provider>;
}

export function useUsageLimits() {
  return useContext(UsageLimitContext);
}

// A1/A2/B1 features get their entry gate for free from FeatureCard (it
// checks getState() before rendering a clickable tile at all). Features
// with no such tile — Learn German is entered via a top-level mode switch,
// not a FeatureCard — need the same check done explicitly. Call this at the
// top of that feature's landing screen; it fires the same modal a live 402
// would, right where the user already is.
//
// Deliberately does NOT navigate away on its own: for a learner whose
// preferred mode IS Learn German, "/" immediately redirects straight back
// to "/learn-german" (see LandingPage.jsx's prefersLearnMode effect) — if
// this hook also force-navigated to "/", the two effects would fight over
// the route every render and the screen would flicker between them forever.
// The modal's own "Wait it out" / "Keep using free features" buttons are a
// single deliberate user click, not a competing effect, so they're the only
// thing allowed to move the user off this screen.
export function useUsageLimitGate(level, moduleKey) {
  const { getState } = useUsageLimits();
  const state = getState(level, moduleKey);
  const locked = Boolean(state?.locked);

  useEffect(() => {
    if (!locked) return;
    window.dispatchEvent(
      new CustomEvent("skillcase:usage-limit", {
        detail: {
          locked: true,
          reason: "usage_limit",
          module_key: moduleKey,
          level,
          limit_value: state.limit_value,
          reset_at: state.reset_at,
          periods: state.periods,
          msg: state.hard_locked
            ? "This feature is currently locked."
            : "Your limit for this feature has been reached.",
        },
      }),
    );
    // Only re-run when the locked verdict itself flips — not on every
    // getState/state identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, level, moduleKey]);
}
