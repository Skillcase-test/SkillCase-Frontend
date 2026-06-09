import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Volume2 } from "lucide-react";
import recapGermanFlag from "../../assets/recapGermanFlag.webp";
import { getVocabProgress, getLessonById } from "../../api/learnGermanApi";
import ProgressBar from "./lesson/screens/shared/ProgressBar";
import { getGermanTTSBlob } from "./lesson/ttsCache";
import { hapticMedium } from "../../utils/haptics";

export default function RecapScreen() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingText, setCurrentlySpeakingText] = useState("");
  const currentSpeakAudioRef = useRef(null);
  const currentSpeakObjectUrlRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (currentSpeakAudioRef.current) {
        currentSpeakAudioRef.current.pause();
        currentSpeakAudioRef.current.src = "";
        currentSpeakAudioRef.current = null;
      }
      if (currentSpeakObjectUrlRef.current) {
        URL.revokeObjectURL(currentSpeakObjectUrlRef.current);
        currentSpeakObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [loading, chapterId]);

  const speakWord = async (text) => {
    hapticMedium();
    if (currentSpeakAudioRef.current) {
      currentSpeakAudioRef.current.pause();
      currentSpeakAudioRef.current.src = "";
      currentSpeakAudioRef.current = null;
    }
    if (currentSpeakObjectUrlRef.current) {
      URL.revokeObjectURL(currentSpeakObjectUrlRef.current);
      currentSpeakObjectUrlRef.current = null;
    }
    setIsSpeaking(true);
    setCurrentlySpeakingText(text);

    try {
      const blob = await getGermanTTSBlob(text);
      const audioUrl = URL.createObjectURL(blob);
      currentSpeakObjectUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      currentSpeakAudioRef.current = audio;
      const cleanupAudio = () => {
        setIsSpeaking(false);
        setCurrentlySpeakingText("");
        if (currentSpeakAudioRef.current === audio) {
          currentSpeakAudioRef.current = null;
        }
        if (currentSpeakObjectUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          currentSpeakObjectUrlRef.current = null;
        }
      };
      audio.onended = cleanupAudio;
      audio.onerror = cleanupAudio;
      audio.play();
    } catch (err) {
      console.error(
        "TTS playback failed, falling back to browser synthesis",
        err,
      );
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "de-DE";
        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentlySpeakingText("");
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setCurrentlySpeakingText("");
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        setCurrentlySpeakingText("");
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (chapterId) {
          const res = await getLessonById(chapterId);
          setData(res.data);
        } else {
          const res = await getVocabProgress();
          setData(res.data);
        }
      } catch (err) {
        console.error("Error loading recap data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chapterId]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-blue-100 to-sky-100 flex justify-center items-center">
        <span className="text-blue-950 font-semibold">Loading Recap...</span>
      </div>
    );
  }

  const isGlobal = !chapterId;
  const pageTitle = isGlobal ? "German words learned" : data?.title || "Recap";

  const vocabList = isGlobal
    ? data?.learnedVocabList || []
    : (() => {
        // Primary source: vocab-type screens (normal lessons)
        const fromScreens = (data?.screens || [])
          .filter((s) => s?.type === "vocab")
          .map((s) => ({ word: s.word, translation: s.translation, image: s.image }));
        if (fromScreens.length > 0) return fromScreens;

        // Fallback: vocab_words array on the lesson (grammar lessons)
        // Supports both plain strings ["der", "die"] and objects [{ word, translation }]
        return (data?.vocab_words || []).map((entry) =>
          typeof entry === "string"
            ? { word: entry, translation: "", image: null }
            : { word: entry.word || "", translation: entry.translation || "", image: null }
        );
      })();

  const mainCount = isGlobal ? data?.learnedWords || 0 : vocabList.length;

  return (
    <div className="w-full min-h-screen bg-[#D3E5FF] flex flex-col items-center">
      {/* Header bar */}
      <div className="w-full max-w-[500px]">
        <ProgressBar
          isHost
          title={pageTitle}
          hideProgress={true}
          onBackClick={() => navigate("/learn-german")}
        />
      </div>

      {/* Main Container */}
      <div
        ref={containerRef}
        className="w-full max-w-[500px] flex-1 flex flex-col px-5 pt-8 pb-32 overflow-y-auto"
      >
        {/* Top Hero Section */}
        <div className="w-full flex flex-col items-center gap-4 mb-8">
          {isGlobal ? (
            <div className="size-24 relative overflow-hidden rounded-xl p-1 flex items-center justify-center">
              <img
                className="w-full h-full object-cover rounded-lg"
                src={recapGermanFlag}
                alt="German flag"
              />
            </div>
          ) : (
            <div className="w-86 h-42 relative overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src={
                  data?.chapter_image ||
                  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778253329/99ee50b94881e4e072cc6de5dde475531353120d_f100ew.webp"
                }
                alt={data?.title}
              />
            </div>
          )}

          <div className="w-full flex flex-col items-center text-center">
            {isGlobal ? (
              <>
                <div className="text-blue-950 text-4xl font-extrabold tracking-tight leading-none mb-1">
                  {mainCount}
                </div>
                <div className="text-blue-950/80 text-sm font-semibold mb-3">
                  German words learnt
                </div>
                <div className="px-3 py-1 bg-[#EBF3FF] backdrop-blur-sm rounded-full inline-flex items-center justify-center">
                  <span className="text-blue-950 text-[10px] font-medium">
                    +{data?.wordsLearntThisWeek || 0} learnt this week
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-blue-950 text-2xl font-bold tracking-tight leading-snug px-4 mb-2">
                  {data?.title}
                </div>
                <div className="px-3 py-1 bg-[#EBF3FF] backdrop-blur-sm rounded-full inline-flex items-center justify-center">
                  <span className="text-blue-950 text-[10px] font-medium">
                    +{vocabList.length} German words learnt
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Word Cards List */}
        <div className="w-full flex flex-col gap-2">
          {vocabList.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/80 p-6">
              No words learned yet. Start studying lessons to build your
              vocabulary!
            </div>
          ) : (
            vocabList.map((item, idx) => (
              <div
                key={`${item.word}-${idx}`}
                className="w-full p-4 bg-white rounded-2xl border-4 border-[#FFE4A4] flex flex-col justify-start items-start shadow-md/30"
              >
                <div className="w-full flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {/* Checkmark in green circle matching completed chapter cards */}
                    <div className="size-8 bg-[#00c853] rounded-full border-2 border-white flex items-center justify-center shadow-md shrink-0">
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                    <div className="flex flex-col justify-center items-start">
                      <div className="text-blue-950 text-base font-medium leading-tight">
                        {item.word}
                      </div>
                      <div className="opacity-60 text-blue-950 text-xs font-normal mt-0.5">
                        {item.translation}
                      </div>
                    </div>
                  </div>
                  {/* Speaker icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(item.word);
                    }}
                    disabled={isSpeaking && currentlySpeakingText === item.word}
                    className={`size-6 relative flex items-center justify-center text-blue-950 hover:scale-105 active:scale-95 transition-all ${
                      isSpeaking && currentlySpeakingText === item.word
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Button Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-22 px-3 pt-2 pb-4 bg-white rounded-tl-[40px] rounded-tr-[40px] shadow-[0px_-1px_25px_0px_rgba(0,0,0,0.25)] flex items-center justify-center z-10 border-t border-slate-100">
        <button
          onClick={() => navigate("/learn-german")}
          className="w-full py-4 bg-gradient-to-r from-blue-900 to-blue-950 text-white rounded-[40px] shadow-[0px_3px_8px_0px_rgba(0,0,0,0.25)] font-semibold text-center hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
