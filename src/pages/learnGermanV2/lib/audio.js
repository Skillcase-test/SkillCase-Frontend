// UI feedback audio for Guided German (v2) — blip/fanfare/tick are WebAudio
// chimes (ported verbatim from the reference: they are interface sounds, not
// speech). Speech itself goes through lg2Tts (server-side Azure voices);
// speak/narrate are re-exported so step components keep one import.
export { speak, narrate, speechAvailable, preloadLg2TTS, stopPlayback } from "./lg2Tts";

// A fresh AudioContext per call is the bug that made the app feel silent:
// browsers cap live contexts (~6 in Chrome). One shared context, created
// lazily and resumed on the first gesture.
let AC = null;
function ctx() {
  if (typeof window === "undefined") return null;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  if (!AC) AC = new C();
  if (AC.state === "suspended") AC.resume().catch(() => {});
  return AC;
}
if (typeof window !== "undefined") {
  const wake = () => { ctx(); };
  window.addEventListener("pointerdown", wake, { once: true, passive: true });
}

function note(freq, at, dur, peak = 0.14, type = "sine") {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + at);
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(peak, c.currentTime + at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.02);
}

// Right answers rise, wrong answers fall. `streak` walks the correct chime up
// a pentatonic scale so a run of right answers audibly climbs.
const STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
let runningStreak = 0;
export function resetStreak() { runningStreak = 0; }
export function blip(ok, streak) {
  try {
    if (!ok) {
      runningStreak = 0;
      note(320, 0, 0.16, 0.10, "triangle");
      note(232, 0.07, 0.24, 0.09, "triangle");
      return;
    }
    const n = streak === undefined ? runningStreak++ : streak;
    const semis = STEPS[Math.min(n, STEPS.length - 1)];
    const root = 587.33 * Math.pow(2, semis / 12);
    note(root, 0, 0.20, 0.13);
    note(root * 1.5, 0.075, 0.26, 0.10);
  } catch {
    /* audio is best-effort */
  }
}

export function fanfare() {
  try {
    [0, 4, 7, 12].forEach((s, i) =>
      note(587.33 * Math.pow(2, s / 12), i * 0.085, 0.42, 0.12));
  } catch {
    /* audio is best-effort */
  }
}

export function tick() {
  try {
    note(880, 0, 0.05, 0.045, "triangle");
  } catch {
    /* audio is best-effort */
  }
}
