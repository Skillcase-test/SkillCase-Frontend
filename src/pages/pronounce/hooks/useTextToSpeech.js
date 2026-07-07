import { useState, useRef, useEffect, useCallback } from "react";
import api from "../../../api/axios";

async function getBlobErrorMessage(blob) {
  if (!blob || typeof blob.text !== "function") return "";

  try {
    const raw = await blob.text();
    const parsed = JSON.parse(raw);
    return parsed?.details || parsed?.error || parsed?.message || raw;
  } catch {
    return "";
  }
}

const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const activeAudioRef = useRef(null);
  const activeAudioUrlRef = useRef(null);
  const requestIdRef = useRef(0);

  const stopCurrentPlayback = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.removeAttribute("src");
      activeAudioRef.current.load?.();
      activeAudioRef.current = null;
    }

    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakWithBrowserTTS = useCallback((text, language, requestId) => {
    if (requestIdRef.current !== requestId) return false;
    if (!("speechSynthesis" in window)) return false;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.onstart = () => {
      if (requestIdRef.current !== requestId) return;
      setIsLoadingAudio(false);
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      if (requestIdRef.current !== requestId) return;
      setIsSpeaking(false);
      setIsLoadingAudio(false);
    };
    utterance.onerror = () => {
      if (requestIdRef.current !== requestId) return;
      setIsSpeaking(false);
      setIsLoadingAudio(false);
    };

    setIsLoadingAudio(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
    return true;
  }, []);

  const cancelSpeech = useCallback(() => {
    requestIdRef.current += 1;
    stopCurrentPlayback();
    setIsSpeaking(false);
    setIsLoadingAudio(false);
  }, [stopCurrentPlayback]);

  const speakText = useCallback(async (text, language = "de-DE") => {
    const normalizedText = String(text || "").trim();
    if (!normalizedText) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    stopCurrentPlayback();
    setIsLoadingAudio(true);
    setIsSpeaking(false);

    try {
      const response = await api.post(
        "/tts/speak",
        { text: normalizedText, language },
        { responseType: "blob" }
      );

      if (requestIdRef.current !== requestId) return;

      const contentType = response.headers?.["content-type"] || "";
      if (contentType.includes("application/json")) {
        const message = await getBlobErrorMessage(response.data);
        throw new Error(message || "TTS returned an error response");
      }

      const audioBlob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      activeAudioUrlRef.current = audioUrl;

      const clearAudio = () => {
        if (requestIdRef.current !== requestId) return;
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        activeAudioRef.current = null;
        if (activeAudioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          activeAudioUrlRef.current = null;
        }
      };

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      activeAudioRef.current = audio;
      audio.onended = clearAudio;
      audio.onerror = () => {
        clearAudio();
        speakWithBrowserTTS(normalizedText, language, requestId);
      };

      setIsSpeaking(true);
      await audio.play();

      if (requestIdRef.current !== requestId) {
        audio.pause();
        URL.revokeObjectURL(audioUrl);
        return;
      }

      setIsLoadingAudio(false);
    } catch (err) {
      console.error("TTS Error:", err);
      if (requestIdRef.current !== requestId) return;

      setIsSpeaking(false);
      setIsLoadingAudio(false);
      activeAudioRef.current = null;

      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
        activeAudioUrlRef.current = null;
      }

      speakWithBrowserTTS(normalizedText, language, requestId);
    }
  }, [speakWithBrowserTTS, stopCurrentPlayback]);

  useEffect(() => {
    return cancelSpeech;
  }, [cancelSpeech]);

  return {
    isSpeaking,
    isLoadingAudio,
    speakText,
    cancelSpeech,
  };
};
export default useTextToSpeech;
