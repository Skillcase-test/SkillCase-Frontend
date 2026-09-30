// TTS for Guided German (v2). The reference app speaks through the browser's
// speechSynthesis; Skillcase owns an Azure-backed TTS pipeline, so the German
// voice is /learn-german-v2/tts (same handler as v1's) and Maya's narration
// voice is /learn-german-v2/maya-tts. Blobs are cached in an LRU map with an
// in-flight dedupe and an idle preload queue — the same shape as v1's
// ttsCache.js, pointed at the v2 endpoints.
//
// Browser speechSynthesis remains only as a last-resort fallback when the
// request fails (offline, TTS outage): a step that says "tap to hear it" must
// not silently do nothing.
import { getLg2TTS, getLg2MayaTTS } from "../../../api/learnGermanV2Api";

const MAX_ITEMS = 120;
const PRELOAD_CONCURRENCY = 2;

const blobCache = new Map(); // key -> Blob
const inFlight = new Map();
let preloadQueue = [];
let activePreloads = 0;

function normalizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/_{2,}/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function makeKey(kind, text) {
  return `${kind}::${normalizeText(text).toLowerCase()}`;
}

function remember(key, blob) {
  if (blobCache.has(key)) blobCache.delete(key);
  blobCache.set(key, blob);
  while (blobCache.size > MAX_ITEMS) {
    const oldest = blobCache.keys().next().value;
    if (!oldest) break;
    blobCache.delete(oldest);
  }
}

async function getBlob(kind, text) {
  const normalized = normalizeText(text);
  if (!normalized) throw new Error("Text is required");

  const key = makeKey(kind, normalized);
  if (blobCache.has(key)) return blobCache.get(key);

  if (!inFlight.has(key)) {
    const fetcher = kind === "maya" ? getLg2MayaTTS : getLg2TTS;
    inFlight.set(
      key,
      fetcher(normalized)
        .then((res) => {
          remember(key, res.data);
          return res.data;
        })
        .finally(() => inFlight.delete(key)),
    );
  }
  return inFlight.get(key);
}

// Only one voice at a time — reference speak() cancels the current utterance;
// Audio playback needs the same so a rapid tap sequence doesn't overlap.
let activeAudio = null;
let activeUrl = null;

function stopPlayback() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.removeAttribute("src");
      activeAudio.load?.();
    } catch {
      /* already gone */
    }
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function speakFallback(text, lang, rate) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

async function play(kind, text, { fallbackLang, fallbackRate, playbackRate = 1 }) {
  const normalized = normalizeText(text);
  if (!normalized) return;
  stopPlayback();
  try {
    const blob = await getBlob(kind, normalized);
    activeUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeUrl);
    activeAudio.playbackRate = playbackRate;
    const url = activeUrl;
    const audio = activeAudio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (activeUrl === url) { activeUrl = null; activeAudio = null; }
    };
    audio.play().catch(() => {
      // Autoplay policy or a dead decode — fall back to the browser voice
      // rather than leaving the learner with silence.
      speakFallback(normalized, fallbackLang, fallbackRate * playbackRate);
    });
  } catch {
    speakFallback(normalized, fallbackLang, fallbackRate * playbackRate);
  }
}

// German words/sentences. `slow` plays the same Azure audio at a reduced
// playbackRate — the reference's rate drop, done client-side.
export function speak(text, slow = false) {
  return play("german", text, {
    fallbackLang: "de-DE",
    fallbackRate: 0.85,
    playbackRate: slow ? 0.6 : 1,
  });
}

// Maya's English narration (story beats, chat partner lines' gloss is never
// spoken — only her own lines).
export function narrate(text) {
  return play("maya", text, { fallbackLang: "en-US", fallbackRate: 0.95 });
}

export function speechAvailable() {
  // Server TTS means audio is effectively always available — the flag the
  // reference checks (no speechSynthesis in webviews) no longer applies.
  return true;
}

// Idle prefetch — the lesson page queues the next few steps' audio while the
// learner reads the current one, exactly like v1's preloadLessonTTS.
export function preloadLg2TTS(texts) {
  if (!Array.isArray(texts)) return;
  for (const raw of texts) {
    const normalized = normalizeText(raw);
    if (!normalized) continue;
    const key = makeKey("german", normalized);
    if (
      blobCache.has(key) ||
      inFlight.has(key) ||
      preloadQueue.some((item) => item.key === key)
    ) {
      continue;
    }
    preloadQueue.push({ key, text: normalized });
  }
  runPreloadQueue();
}

function runPreloadQueue() {
  while (activePreloads < PRELOAD_CONCURRENCY && preloadQueue.length > 0) {
    const next = preloadQueue.shift();
    activePreloads += 1;
    getBlob("german", next.text)
      .catch(() => {})
      .finally(() => {
        activePreloads -= 1;
        runPreloadQueue();
      });
  }
}
