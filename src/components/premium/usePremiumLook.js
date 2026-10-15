import { useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import { shownPremiumLook, trialPillLabel } from "../../utils/premium";

// A look forced by the test buttons while their animation plays ("" = free)
let preview = null;
const listeners = new Set();
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function setLookPreview(look) {
  preview = look;
  listeners.forEach((fn) => fn());
}

/** The header look to draw ("trial" | "plus" | "pro" | null) and the trial pill text. */
export function usePremiumLook() {
  const user = useSelector((state) => state.auth.user);
  const forced = useSyncExternalStore(subscribe, () => preview);
  const look = forced ?? shownPremiumLook(user);
  return { look: look || null, trialLabel: forced === "trial" ? "7d left" : trialPillLabel(user) };
}

// Open while the exit card is up, so the trial-ended modal doesn't stack on top of it
let exitCardOpen = false;
const exitListeners = new Set();
export function setExitCardOpen(open) {
  exitCardOpen = open;
  exitListeners.forEach((fn) => fn());
}
export function useExitCardOpen() {
  return useSyncExternalStore(
    (fn) => {
      exitListeners.add(fn);
      return () => exitListeners.delete(fn);
    },
    () => exitCardOpen,
  );
}
