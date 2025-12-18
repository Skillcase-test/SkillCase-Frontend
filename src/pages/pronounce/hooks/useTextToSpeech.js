import { useState } from "react";
import api from "../../../api/axios";
const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
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
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
      };
      await audio.play();
      setIsLoadingAudio(false);
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
      setIsLoadingAudio(false);
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
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };
  return {
    isSpeaking,
    isLoadingAudio,
    speakText,
    cancelSpeech,
  };
};
export default useTextToSpeech;
