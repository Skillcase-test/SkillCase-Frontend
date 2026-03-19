import { useRef, useState, useEffect } from "react";
import api from "../../../api/axios";

const buildStructuredSpeechText = ({
  title,
  newsText,
  language,
  fallbackText,
}) => {
  const isGerman = language === "de-DE";
  const titleLabel = isGerman ? "Titel" : "Title";
  const newsLabel = isGerman ? "Nachricht" : "News";

  const safeTitle = String(title || "").trim();
  const safeNews = String(newsText || fallbackText || "").trim();

  if (!safeTitle) {
    return `${newsLabel}. ${safeNews}`;
  }

  return `${titleLabel}. ${safeTitle}. ... ${newsLabel}. ${safeNews}`;
};

const useNewsTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [activeSpeed, setActiveSpeed] = useState(null);
  const audioRef = useRef(null);

  const speakText = async (text, language = "de-DE", options = {}) => {
    const speed = options?.speed || "normal";
    const hasStructured =
      options?.structured === true ||
      String(options?.title || "").trim().length > 0 ||
      String(options?.newsText || "").trim().length > 0;

    const speechText = hasStructured
      ? buildStructuredSpeechText({
          title: options?.title,
          newsText: options?.newsText,
          language,
          fallbackText: text,
        })
      : text;

    try {
      setIsLoadingAudio(true);
      setIsSpeaking(true);
      setActiveSpeed(speed);

      const response = await api.post(
        "/tts/speak",
        {
          text: speechText,
          language,
          speed,
          structured: hasStructured,
          title: options?.title || "",
          newsText: options?.newsText || text || "",
        },
        { responseType: "blob" },
      );

      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        setActiveSpeed(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        setActiveSpeed(null);
        audioRef.current = null;
      };

      await audio.play();
      setIsLoadingAudio(false);
    } catch (err) {
      console.error("News TTS Error:", err);
      setIsSpeaking(false);
      setIsLoadingAudio(false);
      setActiveSpeed(null);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = language;
        utterance.rate = speed === "slow" ? 0.8 : 0.9;
        utterance.onend = () => {
          setIsSpeaking(false);
          setActiveSpeed(null);
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const cancelSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current.src && audioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoadingAudio(false);
    setActiveSpeed(null);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current || ("speechSynthesis" in window && window.speechSynthesis.speaking)) {
        cancelSpeech();
      }
    };
  }, []);

  return {
    isSpeaking,
    isLoadingAudio,
    activeSpeed,
    speakText,
    cancelSpeech,
  };
};

export default useNewsTextToSpeech;
