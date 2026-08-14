import { setLGMode } from "../api/learnGermanApi";
import { store } from "../redux/store";
import { setUser } from "../redux/auth/authSlice";

// Same sequence BottomModeSwitcher.jsx uses when the user taps "Practice" —
// factored out so anywhere else that needs to move a user OFF Learn German
// (not just the switcher) can do it consistently. Without this, LandingPage's
// prefersLearnMode redirect (based on this same localStorage key) sends them
// straight back to /learn-german the instant they land on "/".
export function switchLGMode(mode) {
  localStorage.setItem("lg_preferred_mode", mode);
  localStorage.setItem("lg_mode_switched_at", String(Date.now()));
  syncModeIntoRedux(mode);
  window.dispatchEvent(new CustomEvent("lgModeChange", { detail: { mode } }));
  setLGMode(mode).catch((err) => console.error("Failed to set mode:", err));
}

/**
 * Patch the new mode onto the redux user immediately, before the server call
 * resolves. Destination screens gate on the redux mode — JobScreening bounces
 * to the practice home when `user.lg_preferred_mode !== "job_screening"` — so
 * navigating on a stale user sends the candidate straight back where they came
 * from. The /user/lg-mode response reconciles this shortly after.
 */
export function syncModeIntoRedux(mode) {
  const current = store.getState().auth?.user;
  if (!current || current.lg_preferred_mode === mode) return;
  store.dispatch(setUser({ ...current, lg_preferred_mode: mode }));
}

/**
 * Scholarship candidates pick a level when they leave the exam funnel and
 * move into learning/practicing mode. The mode + level are persisted together
 * server-side (same /user/lg-mode endpoint, extended to accept `level`) so the
 * practice hub immediately sees the right proficiency level.
 *
 * @param {"learn"|"practice"} mode target mode after leaving scholarship
 * @param {"A1"|"A2"|"B1"|"B2"} level level the candidate selected
 * @returns {Promise<object|null>} the refreshed user payload, or null if the
 *   server call failed (the local switch has still happened, so the candidate
 *   is never stuck on the scholarship screen).
 */
export async function switchScholarshipToMode(mode, level) {
  localStorage.setItem("lg_preferred_mode", mode);
  localStorage.setItem("lg_mode_switched_at", String(Date.now()));
  syncModeIntoRedux(mode);
  window.dispatchEvent(new CustomEvent("lgModeChange", { detail: { mode } }));
  try {
    const res = await setLGMode(mode, level);
    const user = res?.data?.user || null;
    // Routing (LandingPage, ProfilePage, App shell) keys off the redux user, so
    // it has to see the new mode without waiting for a reload.
    if (user) store.dispatch(setUser(user));
    return user;
  } catch (err) {
    console.error("Failed to set mode + level:", err);
    return null;
  }
}
