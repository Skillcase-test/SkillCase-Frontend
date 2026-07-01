import { useRef, useState, useEffect, useCallback } from "react";
import api from "../../../../../api/axios";

const STORAGE_KEY = "maya_tts_muted";

// Blob cache: text -> Blob (persists for the lifetime of the module)
const _mayaTTSCache = new Map();
const _mayaTTSInFlight = new Map();
const MAYA_TTS_MAX_ITEMS = 120;

// Module-level audio tracking
let _currentAudio = null;
let _currentObjectUrl = null;
let _currentAbortController = null;
let _lastPlayedText = null;

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
          { responseType: "blob", ...config },
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
  if (_currentAbortController) {
    _currentAbortController.abort();
    _currentAbortController = null;
  }
  if (_currentAudio) {
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
  const [isMuted, setIsMuted] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );

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
    const handler = () => {
      revokeCurrentAudio();
      if (mountedRef.current) setIsSpeaking(false);
    };
    window.addEventListener("mayaTTSStop", handler);
    return () => window.removeEventListener("mayaTTSStop", handler);
  }, []);

  const stop = useCallback(() => {
    revokeCurrentAudio();
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  const _playBlob = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    _currentObjectUrl = url;
    const audio = new Audio(url);
    _currentAudio = audio;
    audio.onended = () => {
      revokeCurrentAudio();
      if (mountedRef.current) setIsSpeaking(false);
    };
    audio.onerror = () => {
      revokeCurrentAudio();
      if (mountedRef.current) setIsSpeaking(false);
    };
    audio.play().catch(() => {
      revokeCurrentAudio();
      if (mountedRef.current) setIsSpeaking(false);
    });
  }, []);

  const speak = useCallback(async (text, forcePlay = false) => {
    if (!text || isMutedRef.current) return;

    // Skip auto-play if it's the exact same text as the last playback
    if (!forcePlay && text === _lastPlayedText) return;
    _lastPlayedText = text;

    // Cancel any in-flight request and stop current audio
    revokeCurrentAudio();

    // Cache hit: play instantly
    const normalizedText = normalizeText(text);
    if (_mayaTTSCache.has(normalizedText)) {
      if (mountedRef.current) setIsSpeaking(true);
      _playBlob(_mayaTTSCache.get(normalizedText));
      return;
    }

    // Fetch from API
    const abortController = new AbortController();
    _currentAbortController = abortController;
    if (mountedRef.current) setIsSpeaking(true);

    try {
      const blob = await getMayaTTSBlob(normalizedText, {
        signal: abortController.signal,
      });

      if (isMutedRef.current || abortController.signal.aborted || !mountedRef.current) {
        if (mountedRef.current) setIsSpeaking(false);
        return;
      }

      _currentAbortController = null;
      _playBlob(blob);
    } catch (err) {
      if (
        err?.name === "AbortError" ||
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED"
      ) {
        return;
      }
      revokeCurrentAudio();
      if (mountedRef.current) setIsSpeaking(false);
    }
  }, [_playBlob]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      if (next) {
        revokeCurrentAudio();
        if (mountedRef.current) setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  return { speak, stop, isSpeaking, isMuted, toggleMute };
}
