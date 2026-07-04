import { useState, useRef, useEffect } from "react";
import api from "../../../api/axios";
const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const activeAudioRef = useRef(null);
  const speakText = async (text, language = "de-DE") => {
    try {
      setIsLoadingAudio(true);
      setIsSpeaking(true);
      const response = await api.post(
        "/tts/speak",
        { text, language },
        { responseType: "blob" }
      );
      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        activeAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        activeAudioRef.current = null;
      };
      await audio.play();
      setIsLoadingAudio(false);
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
      setIsLoadingAudio(false);
      activeAudioRef.current = null;
      // Fallback to browser TTS
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };
  const cancelSpeech = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  return {
    isSpeaking,
    isLoadingAudio,
    speakText,
    cancelSpeech,
  };
};
export default useTextToSpeech;
