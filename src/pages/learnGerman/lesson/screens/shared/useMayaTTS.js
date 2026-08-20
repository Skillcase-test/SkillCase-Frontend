import { useRef, useState, useEffect, useCallback } from "react";
import api from "../../../../../api/axios";
import { isTTSMuted, setTTSMuted, subscribeTTSMute } from "./ttsMutePreference";

// Blob cache: text -> Blob (persists for the lifetime of the module)
const _mayaTTSCache = new Map();
const _mayaTTSInFlight = new Map();
const MAYA_TTS_MAX_ITEMS = 120;

// Module-level audio tracking
let _currentAudio = null;
let _currentObjectUrl = null;
// Monotonic token — a pending speak() whose token is stale has been superseded
// (by a newer speak, a stop, or navigation) and must never start playing.
let _speakToken = 0;

// Tracks the last played dialogue text across screen transitions
let _lastPlayedDialogueText = null;

export function resetLastPlayedDialogue() {
  _lastPlayedDialogueText = null;
}

function normalizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/_{2,}/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function rememberMayaBlob(text, blob) {
  const key = normalizeText(text);
  if (!key) return;
  if (_mayaTTSCache.has(key)) _mayaTTSCache.delete(key);
  _mayaTTSCache.set(key, blob);
  while (_mayaTTSCache.size > MAYA_TTS_MAX_ITEMS) {
    const oldestKey = _mayaTTSCache.keys().next().value;
    if (!oldestKey) break;
    _mayaTTSCache.delete(oldestKey);
  }
}

function getMayaTTSBlob(text, config = {}) {
  const key = normalizeText(text);
  if (!key) return Promise.reject(new Error("Text is required"));
  if (_mayaTTSCache.has(key)) return Promise.resolve(_mayaTTSCache.get(key));
  if (!_mayaTTSInFlight.has(key)) {
    _mayaTTSInFlight.set(
      key,
      api
        .post(
          "/dynamic-lesson/maya-tts",
          { text: key },
          {
            responseType: "blob",
            ...config,
            meta: { skipCacheInvalidation: true, ...(config.meta || {}) },
          },
        )
        .then((response) => {
          rememberMayaBlob(key, response.data);
          return response.data;
        })
        .finally(() => {
          _mayaTTSInFlight.delete(key);
        }),
    );
  }
  return _mayaTTSInFlight.get(key);
}

function revokeCurrentAudio() {
  if (_currentAudio) {
    // Detach handlers before teardown: clearing `src` makes the element fire a
    // stray `error` event asynchronously, which would otherwise land after the
    // next screen's audio has started and tear *that* one down instead.
    _currentAudio.onended = null;
    _currentAudio.onerror = null;
    _currentAudio.pause();
    _currentAudio.src = "";
    _currentAudio = null;
  }
  if (_currentObjectUrl) {
    URL.revokeObjectURL(_currentObjectUrl);
    _currentObjectUrl = null;
  }
}

// Preload a text blob into the cache without playing it.
// Call this ahead-of-time for upcoming screen dialogues.
export async function preloadMayaTTSText(text) {
  const key = normalizeText(text);
  if (!key || _mayaTTSCache.has(key) || _mayaTTSInFlight.has(key)) return;
  try {
    await getMayaTTSBlob(key);
  } catch {
    // Silently ignore -- preload failures degrade gracefully
  }
}

export default function useMayaTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => isTTSMuted());

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setIsSpeaking(false);
    };
  }, []);

  useEffect(() => {
    return subscribeTTSMute((muted) => {
      isMutedRef.current = muted;
      if (mountedRef.current) {
        setIsMuted(muted);
        if (muted) {
          setIsSpeaking(false);
        }
      }
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      _speakToken++;
      revokeCurrentAudio();
      if (mountedRef.current) setIsSpeaking(false);
    };
    window.addEventListener("mayaTTSStop", handler);
    return () => window.removeEventListener("mayaTTSStop", handler);
  }, []);

  const stop = useCallback(() => {
    _speakToken++;
    revokeCurrentAudio();
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  const _playBlob = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    _currentObjectUrl = url;
    const audio = new Audio(url);
    _currentAudio = audio;
    // Only act if this element is still the one in charge — a superseded
    // element's events must not tear down its replacement.
    const finish = () => {
      if (_currentAudio !== audio) return;
      revokeCurrentAudio();
      if (mountedRef.current) setIsSpeaking(false);
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  }, []);

  const speak = useCallback(
    async (text, opts = {}) => {
      const { force = false, skipSuppression = false } = opts;
      if (!text) return;

      const normalizedText = normalizeText(text);
      if (!normalizedText) return;

      // Duplicate suppression: if this text is identical to the last played
      // dialogue and this is an auto-play (not manual click / forced), skip.
      if (!force && !skipSuppression && normalizedText === _lastPlayedDialogueText) {
        return;
      }

      if (isMutedRef.current) return;

      const token = ++_speakToken;

      // Stop any other audio playing (including German speech)
      revokeCurrentAudio();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("germanTTSStop"));
      }

      _lastPlayedDialogueText = normalizedText;

      // Cache hit: play instantly
      if (_mayaTTSCache.has(normalizedText)) {
        if (mountedRef.current) setIsSpeaking(true);
        _playBlob(_mayaTTSCache.get(normalizedText));
        return;
      }

      // Fetch from API
      if (mountedRef.current) setIsSpeaking(true);

      try {
        const blob = await getMayaTTSBlob(normalizedText);

        // Superseded while the fetch was in flight — whoever won owns the state.
        if (token !== _speakToken) return;

        if (isMutedRef.current || !mountedRef.current) {
          if (mountedRef.current) setIsSpeaking(false);
          return;
        }

        _playBlob(blob);
      } catch (err) {
        if (
          err?.name === "AbortError" ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }
        if (token !== _speakToken) return;
        revokeCurrentAudio();
        if (mountedRef.current) setIsSpeaking(false);
      }
    },
    [_playBlob],
  );

  const toggleMute = useCallback(
    (currentTextToPlay = null) => {
      const next = !isMutedRef.current;
      setTTSMuted(next);
      if (next) {
        revokeCurrentAudio();
        if (mountedRef.current) setIsSpeaking(false);
      } else if (currentTextToPlay) {
        speak(currentTextToPlay, { force: true });
      }
      return next;
    },
    [speak],
  );

  return { speak, stop, isSpeaking, isMuted, toggleMute };
}
