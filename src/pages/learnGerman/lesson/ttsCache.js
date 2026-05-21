import api from "../../../api/axios";
import { preloadMayaTTSText } from "./screens/shared/useMayaTTS";

const GERMAN_TTS_MAX_ITEMS = 120;
const PRELOAD_CONCURRENCY = 2;
const germanTTSCache = new Map();
const germanTTSInFlight = new Map();
let preloadQueue = [];
let activePreloads = 0;

function normalizeText(text) {
  return typeof text === "string" ? text.trim().replace(/\s+/g, " ") : "";
}

function makeGermanKey(text, voiceName = "de-DE-KatjaNeural") {
  return `${voiceName}::${normalizeText(text).toLowerCase()}`;
}

function addUniqueText(target, text) {
  const normalized = normalizeText(text);
  if (normalized) target.add(normalized);
}

function addDialogueTexts(target, value) {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "string") addUniqueText(target, item);
      else {
        addUniqueText(target, item?.text);
        addUniqueText(target, item?.dialogue);
        addUniqueText(target, item?.line);
      }
    });
  } else {
    addUniqueText(target, value);
  }
}

function rememberGermanBlob(key, blob) {
  if (germanTTSCache.has(key)) germanTTSCache.delete(key);
  germanTTSCache.set(key, blob);
  while (germanTTSCache.size > GERMAN_TTS_MAX_ITEMS) {
    const oldestKey = germanTTSCache.keys().next().value;
    if (!oldestKey) break;
    germanTTSCache.delete(oldestKey);
  }
}

export function hasGermanTTS(text, voiceName) {
  return germanTTSCache.has(makeGermanKey(text, voiceName));
}

export async function getGermanTTSBlob(text, voiceName) {
  const normalized = normalizeText(text);
  if (!normalized) throw new Error("Text is required");

  const key = makeGermanKey(normalized, voiceName);
  if (germanTTSCache.has(key)) return germanTTSCache.get(key);

  if (!germanTTSInFlight.has(key)) {
    germanTTSInFlight.set(
      key,
      api
        .post(
          "/dynamic-lesson/tts",
          { text: normalized, voiceName },
          { responseType: "blob" },
        )
        .then((response) => {
          rememberGermanBlob(key, response.data);
          return response.data;
        })
        .finally(() => {
          germanTTSInFlight.delete(key);
        }),
    );
  }

  return germanTTSInFlight.get(key);
}

export function preloadGermanTTSText(text, voiceName) {
  const normalized = normalizeText(text);
  if (!normalized || hasGermanTTS(normalized, voiceName)) return;

  const key = makeGermanKey(normalized, voiceName);
  if (
    germanTTSInFlight.has(key) ||
    preloadQueue.some((item) => item.key === key)
  ) {
    return;
  }

  preloadQueue.push({ key, text: normalized, voiceName });
  runPreloadQueue();
}

function runPreloadQueue() {
  while (activePreloads < PRELOAD_CONCURRENCY && preloadQueue.length > 0) {
    const next = preloadQueue.shift();
    activePreloads += 1;
    getGermanTTSBlob(next.text, next.voiceName)
      .catch(() => {})
      .finally(() => {
        activePreloads -= 1;
        runPreloadQueue();
      });
  }
}

function scheduleIdle(callback) {
  if (typeof window === "undefined") return;
  const run = () => callback();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 300);
  }
}

function getGermanTextsForScreen(screen) {
  const texts = new Set();
  addUniqueText(texts, screen?.word);
  addUniqueText(texts, screen?.audioText);
  addUniqueText(texts, screen?.audioScript);

  if (["quiz", "grammar", "conversation"].includes(screen?.type)) {
    addUniqueText(texts, screen?.question);
  }

  if (screen?.type === "conversation") {
    addUniqueText(texts, screen?.characterDialogue);
    addUniqueText(texts, screen?.dialogue);
  }

  return [...texts];
}

function getMayaTextsForScreen(screen) {
  const texts = new Set();
  addUniqueText(texts, screen?.mayaDialogue);
  addUniqueText(texts, screen?.dialogue);
  addUniqueText(texts, screen?.characterDialogue);
  addDialogueTexts(texts, screen?.dialogues);
  return [...texts];
}

export function preloadLessonTTS(screens = [], startIndex = 0) {
  if (!Array.isArray(screens) || screens.length === 0) return;

  const prioritized = [startIndex, startIndex + 1, startIndex + 2]
    .filter((index) => index >= 0 && index < screens.length);
  const rest = screens
    .map((_, index) => index)
    .filter((index) => !prioritized.includes(index));

  const preloadScreen = (screen) => {
    getMayaTextsForScreen(screen).forEach((text) => preloadMayaTTSText(text));
    getGermanTextsForScreen(screen).forEach((text) => preloadGermanTTSText(text));
  };

  prioritized.forEach((index) => preloadScreen(screens[index]));
  scheduleIdle(() => rest.forEach((index) => preloadScreen(screens[index])));
}
