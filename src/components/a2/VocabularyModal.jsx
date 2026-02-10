import React, { useState } from "react";
import { X, Volume2, Loader2 } from "lucide-react";

import api from "../../api/axios";

export default function VocabularyModal({ word, meaning, onClose }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const handleSpeak = async () => {
    if (isSpeaking) return;

    setIsSpeaking(true);
    try {
      const response = await api.post(
        "/tts/synthesize",
        { text: word, language: "de-DE" },
        { responseType: "arraybuffer" },
      );

      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
    }
  };
  
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* German Word */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-[#002856] mb-1">{word}</h3>
          <button
            onClick={handleSpeak}
            disabled={isSpeaking}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#edfaff] rounded-full text-[#002856] hover:bg-[#d4f1ff] transition-colors"
          >
            {isSpeaking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Listen</span>
          </button>
        </div>
        
        {/* Meaning */}
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Meaning</p>
          <p className="text-lg font-medium text-gray-800">{meaning}</p>
        </div>
      </div>
    </div>
  );
}
