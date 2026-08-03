import { setLGMode } from "../api/learnGermanApi";

// Same sequence BottomModeSwitcher.jsx uses when the user taps "Practice" —
// factored out so anywhere else that needs to move a user OFF Learn German
// (not just the switcher) can do it consistently. Without this, LandingPage's
// prefersLearnMode redirect (based on this same localStorage key) sends them
// straight back to /learn-german the instant they land on "/".
export function switchLGMode(mode) {
  localStorage.setItem("lg_preferred_mode", mode);
  localStorage.setItem("lg_mode_switched_at", String(Date.now()));
  window.dispatchEvent(new CustomEvent("lgModeChange", { detail: { mode } }));
  setLGMode(mode).catch((err) => console.error("Failed to set mode:", err));
}
